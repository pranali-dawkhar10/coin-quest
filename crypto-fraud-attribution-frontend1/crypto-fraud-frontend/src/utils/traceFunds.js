
const EPSILON = 1e-10;

function millis(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric = Number(value);

  if (Number.isFinite(numeric)) {
    return numeric < 1e12 ? numeric * 1000 : numeric;
  }

  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeAddress(address, chain) {
  const value = String(address || "").trim();

  // EVM addresses are case-insensitive. Do not lowercase TRON/BTC.
  if (/ethereum|polygon|bsc|evm/i.test(chain || "")) {
    return value.toLowerCase();
  }

  return value;
}

function matchesSelection(actual, selected) {
  if (!actual || !selected) return true;

  const a = String(actual).toLowerCase();
  const b = String(selected).toLowerCase();

  return a === b || a.includes(b) || b.includes(a);
}

export function buildFundTrace({
  suspectAddress,
  scamAmount,
  asset,
  chain,
  sourceTxHash = null,
  maxHops = 3,
  transactions = [],
  walletLabels = {},
  walletSignals = {}
}) {
  const root = normalizeAddress(suspectAddress, chain);
  const reportedAmount = Number(scamAmount);
  const hopLimit = Math.max(1, Math.min(Number(maxHops) || 3, 6));

  if (!root || !Number.isFinite(reportedAmount) || reportedAmount <= 0) {
    throw new Error("A valid suspect address and scam amount are required.");
  }

  const warnings = [];
  const nodes = new Map();
  const edges = [];
  const seenEdgeIds = new Set();
  const vaspEntities = new Map();

  function findRecord(map, address) {
    const target = normalizeAddress(address, chain);

    if (map[target]) return map[target];

    const match = Object.entries(map).find(
      ([key]) => normalizeAddress(key, chain) === target
    );

    return match ? match[1] : null;
  }

  function getLabel(address) {
    const value = findRecord(walletLabels, address);
    if (!value) return null;

    // A plain string can represent a verified entity label.
    if (typeof value === "string") {
      return { type: "vasp", name: value, confidence: "unknown" };
    }

    return value;
  }

  function isVasp(label) {
    return Boolean(
      label &&
      (label.isVasp ||
        /vasp|exchange/i.test(String(label.type || "")))
    );
  }

  function upsertWallet(address, hop, addedTrackedAmount = 0) {
    const normalized = normalizeAddress(address, chain);
    const id = `wallet:${normalized}`;
    const label = getLabel(normalized);
    const signal = findRecord(walletSignals, normalized);

    const isRoot = normalized === root;
    const isBurner =
      !isRoot &&
      (signal?.possibleBurner === true ||
        Number(signal?.burnerScore) >= 70);

    let node = nodes.get(id);

    if (!node) {
      node = {
        id,
        type: isRoot ? "suspect" : isBurner ? "burner" : "wallet",
        label: isRoot
          ? "Suspect wallet"
          : isBurner
            ? "Possible burner wallet"
            : "Wallet",
        address: normalized,
        hop,
        trackedAmount: 0,
        asset,
        vaspName: isVasp(label) ? label.name || label.entity || "Known VASP" : null,
        vaspConfidence: label?.confidence || null,
        burnerReasons: signal?.reasons || []
      };

      nodes.set(id, node);
    } else {
      node.hop = Math.min(node.hop, hop);

      if (isBurner) {
        node.type = "burner";
        node.label = "Possible burner wallet";
        node.burnerReasons = signal?.reasons || [];
      }

      if (isVasp(label)) {
        node.vaspName = label.name || label.entity || "Known VASP";
        node.vaspConfidence = label.confidence || null;
      }
    }

    node.trackedAmount += addedTrackedAmount;
    return node;
  }

  const normalizedTxs = transactions
    .map((tx, index) => {
      const from = normalizeAddress(tx.from, chain);
      const to = normalizeAddress(tx.to, chain);
      const amount = Number(tx.amount);
      const timestamp = millis(tx.timestamp ?? tx.blockTime ?? tx.timeStamp);
      const hash = String(
        tx.hash ?? tx.transactionHash ?? `${from}-${to}-${timestamp}-${index}`
      );

      return {
        ...tx,
        from,
        to,
        amount,
        timestamp,
        hash,
        asset: tx.asset || asset
      };
    })
    .filter(tx =>
      tx.from &&
      tx.to &&
      tx.amount > 0 &&
      Number.isFinite(tx.amount) &&
      matchesSelection(tx.asset, asset) &&
      matchesSelection(tx.chain, chain)
    );

  const sourceTx = sourceTxHash
    ? normalizedTxs.find(
        tx => tx.hash === sourceTxHash && tx.to === root
      )
    : null;

  if (sourceTxHash && !sourceTx) {
    warnings.push(
      "The supplied source transaction was not found as an incoming transfer to the suspect wallet. The trace may be less precise."
    );
  }

  if (normalizedTxs.length === 0) {
    warnings.push("No usable transactions were returned by the blockchain API.");
  }

  const outgoingByWallet = new Map();

  for (const tx of normalizedTxs) {
    if (!outgoingByWallet.has(tx.from)) {
      outgoingByWallet.set(tx.from, []);
    }

    outgoingByWallet.get(tx.from).push(tx);
  }

  for (const list of outgoingByWallet.values()) {
    list.sort((a, b) => {
      return (a.timestamp ?? 0) - (b.timestamp ?? 0);
    });
  }

  upsertWallet(root, 0, reportedAmount);

  const seenDepth = new Map([[root, 0]]);
  const trackedByWallet = new Map([[root, reportedAmount]]);
  const arrivalTime = new Map([
    [root, sourceTx ? sourceTx.timestamp : null]
  ]);

  let layer = [root];
  let amountReachedVasp = 0;

  for (let depth = 0; depth < hopLimit && layer.length; depth += 1) {
    const nextLayerSet = new Set();

    for (const from of layer) {
      let remaining = trackedByWallet.get(from) || 0;

      if (remaining <= EPSILON) continue;

      // Stop following funds once the destination is a known VASP.
      if (from !== root && isVasp(getLabel(from))) continue;

      const minimumTime = arrivalTime.get(from);

      const outgoing = (outgoingByWallet.get(from) || []).filter(tx => {
        if (
          minimumTime !== null &&
          minimumTime !== undefined &&
          tx.timestamp !== null &&
          tx.timestamp < minimumTime
        ) {
          return false;
        }

        return true;
      });

      for (const tx of outgoing) {
        if (remaining <= EPSILON) break;

        // Track only the portion of this transaction covered by the
        // scam-linked amount. The full transaction amount remains visible.
        const trackedAmount = Math.min(remaining, tx.amount);

        if (trackedAmount <= EPSILON) continue;

        remaining -= trackedAmount;

        const sourceNode = upsertWallet(from, depth);
        const destinationNode = upsertWallet(tx.to, depth + 1, trackedAmount);

        const edgeId = `tx:${tx.hash}`;

        if (!seenEdgeIds.has(edgeId)) {
          seenEdgeIds.add(edgeId);

          edges.push({
            id: edgeId,
            kind: "transfer",
            source: sourceNode.id,
            target: destinationNode.id,
            hash: tx.hash,
            timestamp: tx.timestamp,
            amount: tx.amount,
            trackedAmount,
            asset: tx.asset || asset
          });
        }

        const destinationLabel = getLabel(tx.to);

        if (isVasp(destinationLabel)) {
          amountReachedVasp += trackedAmount;

          const vaspName =
            destinationLabel.name ||
            destinationLabel.entity ||
            "Known VASP";

          const vaspId = `vasp:${vaspName}`;
          destinationNode.vaspName = vaspName;
          destinationNode.vaspConfidence =
            destinationLabel.confidence || "unknown";

          if (!vaspEntities.has(vaspId)) {
            vaspEntities.set(vaspId, {
              id: vaspId,
              type: "vasp",
              label: vaspName,
              confidence: destinationLabel.confidence || "unknown"
            });

            nodes.set(vaspId, vaspEntities.get(vaspId));
          }

          const attributionId = `attribution:${destinationNode.id}:${vaspId}`;

          if (!seenEdgeIds.has(attributionId)) {
            seenEdgeIds.add(attributionId);

            edges.push({
              id: attributionId,
              kind: "attribution",
              source: destinationNode.id,
              target: vaspId,
              confidence: destinationLabel.confidence || "unknown"
            });
          }

          continue;
        }

        // At max depth, show the destination but do not expand it.
        if (depth + 1 >= hopLimit) continue;

        const existingDepth = seenDepth.get(tx.to);

        // Aggregate incoming tracked funds before processing the next layer.
        // Don't recurse into previously visited nodes, avoiding graph cycles.
        if (existingDepth === undefined) {
          seenDepth.set(tx.to, depth + 1);
          trackedByWallet.set(tx.to, trackedAmount);

          arrivalTime.set(tx.to, tx.timestamp);
          nextLayerSet.add(tx.to);
        } else if (existingDepth === depth + 1) {
          trackedByWallet.set(
            tx.to,
            (trackedByWallet.get(tx.to) || 0) + trackedAmount
          );

          const oldTime = arrivalTime.get(tx.to);
          if (
            tx.timestamp !== null &&
            (oldTime === null || oldTime === undefined || tx.timestamp < oldTime)
          ) {
            arrivalTime.set(tx.to, tx.timestamp);
          }

          nextLayerSet.add(tx.to);
        }
      }
    }

    layer = [...nextLayerSet];
  }

  const notYetAttributed = Math.max(
    0,
    reportedAmount - amountReachedVasp
  );

  if (amountReachedVasp === 0) {
    warnings.push(
      "No tracked funds reached a labeled VASP within this trace. This does not prove the funds remain in the suspect wallet."
    );
  }

  return {
    nodes: [...nodes.values()],
    edges,
    stats: {
      asset,
      chain,
      reportedAmount,
      amountReachedVasp,
      amountNotYetAttributed: notYetAttributed,
      maxHops: hopLimit
    },
    warnings
  };
}

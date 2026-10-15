
const validAddress = (value) =>
  typeof value === 'string' &&
  /^0x[a-fA-F0-9]{40}$/.test(value);

export function analyzeTransactions(graphData, walletAddress) {
  const edges = Array.isArray(graphData?.edges)
    ? graphData.edges
    : [];

  const nodes = Array.isArray(graphData?.nodes)
    ? graphData.nodes
    : [];

  const wallet = (walletAddress || '').toLowerCase();

  const transfers = edges
    .filter(
      (tx) =>
        validAddress(tx.from_address) &&
        validAddress(tx.to_address) &&
        Number.isFinite(Number(tx.amount_token)) &&
        Number(tx.amount_token) > 0
    )
    .map((tx) => ({
      ...tx,
      from_address: tx.from_address.toLowerCase(),
      to_address: tx.to_address.toLowerCase(),
      amount: Number(tx.amount_token),
      token: String(tx.token || '').toUpperCase(),
      timestamp: Number(tx.timestamp) || 0,
    }));

  const incoming = transfers.filter(
    (tx) => tx.to_address === wallet
  );

  const outgoing = transfers.filter(
    (tx) => tx.from_address === wallet
  );

  const totals = {};
  const incomingTotals = {};
  const outgoingTotals = {};

  const addAmount = (container, tx) => {
    container[tx.token] =
      (container[tx.token] || 0) + tx.amount;
  };

  transfers.forEach((tx) => addAmount(totals, tx));
  incoming.forEach((tx) => addAmount(incomingTotals, tx));
  outgoing.forEach((tx) => addAmount(outgoingTotals, tx));

  const walletAddresses = new Set([wallet]);

  transfers.forEach((tx) => {
    walletAddresses.add(tx.from_address);
    walletAddresses.add(tx.to_address);
  });

  const counterparties = new Set();

  [...incoming, ...outgoing].forEach((tx) => {
    const other =
      tx.from_address === wallet
        ? tx.to_address
        : tx.from_address;

    if (other !== wallet) counterparties.add(other);
  });

  const largestByToken = {};

  transfers.forEach((tx) => {
    if (
      !largestByToken[tx.token] ||
      tx.amount > largestByToken[tx.token].amount
    ) {
      largestByToken[tx.token] = tx;
    }
  });

  const sortedByTime = [...transfers]
    .filter((tx) => tx.timestamp > 0)
    .sort((a, b) => a.timestamp - b.timestamp);

  const firstTransaction = sortedByTime[0] || null;
  const lastTransaction =
    sortedByTime[sortedByTime.length - 1] || null;

  return {
    nodes,
    transfers,
    totalTransfers: transfers.length,
    walletCount: walletAddresses.size,
    incoming,
    outgoing,
    incomingCount: incoming.length,
    outgoingCount: outgoing.length,
    counterpartyCount: counterparties.size,
    totals,
    incomingTotals,
    outgoingTotals,
    largestByToken,
    firstTransaction,
    lastTransaction,
    walletAddress: wallet,
    sampled: graphData?.data_mode === 'live_sample',
  };
}

export function formatAmount(value) {
  return Number(value).toLocaleString('en-US', {
    maximumFractionDigits: 8,
  });
}

export function shortAddress(value) {
  if (!value) return 'Unknown';
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

export function formatDate(timestamp) {
  if (!timestamp) return 'Unknown';

  return new Date(timestamp * 1000)
    .toLocaleString('en-IN', {
      timeZone: 'UTC',
      dateStyle: 'medium',
      timeStyle: 'short',
    }) + ' UTC';
}

export function formatTokenTotals(totals) {
  const entries = Object.entries(totals);

  if (entries.length === 0) {
    return 'No token transfers found';
  }

  return entries
    .map(([token, amount]) =>
      `${formatAmount(amount)} ${token}`
    )
    .join(', ');
}


import { useState } from "react";

export default function ScamCaseForm({ onTrace, loading = false }) {
  const [suspectAddress, setSuspectAddress] = useState("");
  const [scamAmount, setScamAmount] = useState("");
  const [chain, setChain] = useState("TRON");
  const [asset, setAsset] = useState("USDT");
  const [sourceTxHash, setSourceTxHash] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const amount = Number(scamAmount);

    if (!suspectAddress.trim()) {
      setError("Enter the suspect wallet address.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a scam amount greater than zero.");
      return;
    }

    const evmChain = ["Ethereum", "Polygon", "BSC"].includes(chain);

    const validAddress =
      chain === "TRON"
        ? /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(suspectAddress.trim())
        : chain === "Bitcoin"
          ? /^(bc1[a-z0-9]{11,71}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/i.test(suspectAddress.trim())
          : evmChain
            ? /^0x[a-fA-F0-9]{40}$/.test(suspectAddress.trim())
            : false;

    if (!validAddress) {
      setError(`The address format does not match ${chain}.`);
      return;
    }

    try {
      await onTrace({
        suspectAddress: suspectAddress.trim(),
        scamAmount: amount,
        asset: asset.trim().toUpperCase(),
        chain,
        sourceTxHash: sourceTxHash.trim() || null,
        maxHops: 3
      });
    } catch (err) {
      setError(err.message || "Unable to trace this case.");
    }
  }

  return (
    <form className="case-form" onSubmit={handleSubmit}>
      <h2>Trace reported crypto fraud</h2>

      <label>
        Blockchain
        <select value={chain} onChange={e => setChain(e.target.value)}>
          <option value="TRON">TRON</option>
          <option value="Ethereum">Ethereum</option>
          <option value="Polygon">Polygon</option>
          <option value="BSC">BNB Smart Chain</option>
          <option value="Bitcoin">Bitcoin</option>
        </select>
      </label>

      <label>
        Suspect wallet address
        <input
          value={suspectAddress}
          onChange={e => setSuspectAddress(e.target.value)}
          placeholder="Enter reported suspect address"
          required
        />
      </label>

      <div className="form-row">
        <label>
          Reported scam amount
          <input
            type="number"
            min="0"
            step="any"
            value={scamAmount}
            onChange={e => setScamAmount(e.target.value)}
            placeholder="e.g. 2500"
            required
          />
        </label>

        <label>
          Asset / token
          <input
            value={asset}
            onChange={e => setAsset(e.target.value)}
            placeholder="USDT"
            required
          />
        </label>
      </div>

      <label>
        Victim-to-suspect transaction hash (optional)
        <input
          value={sourceTxHash}
          onChange={e => setSourceTxHash(e.target.value)}
          placeholder="Transaction hash for stronger trace starting point"
        />
      </label>

      {error && <p className="form-error">{error}</p>}

      <button type="submit" disabled={loading}>
        {loading ? "Tracing funds..." : "Trace reported amount"}
      </button>
    </form>
  );
}

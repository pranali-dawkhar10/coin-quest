
import React from 'react';

export default function GraphFilter({
  chain,
  onChainChange,
  maxHops,
  onMaxHopsChange,
  token,
  onTokenChange,
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 14,
      }}
    >
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        Blockchain

        <select
          className="input"
          value={chain}
          onChange={(e) =>
            onChainChange(e.target.value)
          }
        >
          <option value="ETHEREUM">Ethereum</option>
          <option value="TRON">TRON</option>
          <option value="BITCOIN">Bitcoin</option>
        </select>
      </label>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        Max hops

        <select
          className="input"
          value={maxHops}
          onChange={(e) =>
            onMaxHopsChange(Number(e.target.value))
          }
        >
          <option value={1}>1</option>
          <option value={2}>2</option>
          <option value={3}>3</option>
          <option value={4}>4</option>
        </select>
      </label>

      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        Token

        <select
          className="input"
          value={token}
          onChange={(e) =>
            onTokenChange(e.target.value)
          }
        >
          <option value="ALL">All tokens</option>
          <option value="USDT">USDT</option>
          <option value="ETH">ETH</option>
          <option value="TRX">TRX</option>
          <option value="BTC">BTC</option>
        </select>
      </label>
    </div>
  );
}

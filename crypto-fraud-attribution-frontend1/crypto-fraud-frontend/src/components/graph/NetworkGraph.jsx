
import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import { Network } from 'vis-network/standalone';

export default function NetworkGraph({
  graphData,
  onSelectNode,
}) {
  const containerRef = useRef(null);

  const [selectedTx, setSelectedTx] = useState(null);

  const isLive = graphData?.data_mode === 'live_sample';

  useEffect(() => {
    setSelectedTx(null);

    if (!containerRef.current || !graphData) {
      return;
    }

    const nodes = graphData.nodes.map((node) => ({
      id: node.id,
      label: node.label || node.address,
      shape: 'dot',

      size: node.is_suspect
        ? 28
        : node.is_vasp
          ? 26
          : 19,

      color: node.is_suspect
        ? {
            background: '#2563eb',
            border: '#93c5fd',
          }
        : node.is_vasp
          ? {
              background: '#b45309',
              border: '#fbbf24',
            }
          : {
              background: '#334155',
              border: '#94a3b8',
            },

      font: {
        color: '#e2e8f0',
        size: 12,
      },

      borderWidth: 2,
      title: node.address,
    }));

    const edges = graphData.edges.map((tx, index) => {
      const amount = isLive
        ? `${tx.amount_token} ${tx.token}`
        : `$${Number(tx.amount_usd).toLocaleString()} ${tx.token}`;

      return {
        id: index,
        from: tx.from_address,
        to: tx.to_address,

        arrows: {
          to: {
            enabled: true,
            scaleFactor: 0.8,
          },
        },

        label: amount,

        title: [
          `Amount: ${amount}`,
          `Transaction: ${tx.tx_hash || 'N/A'}`,
          `From: ${tx.from_address}`,
          `To: ${tx.to_address}`,
        ].join('\n'),

        color: {
          color: '#64748b',
          highlight: '#38bdf8',
          hover: '#38bdf8',
        },

        font: {
          color: '#cbd5e1',
          size: 10,
          strokeWidth: 0,
          align: 'middle',
        },

        width: 2,

        smooth: {
          enabled: true,
          type: 'dynamic',
        },
      };
    });

    const network = new Network(
      containerRef.current,
      { nodes, edges },
      {
        autoResize: true,

        interaction: {
          hover: true,
          navigationButtons: true,
          keyboard: true,
          multiselect: false,
        },

        physics: {
          stabilization: {
            enabled: true,
            iterations: 120,
          },
        },

        layout: {
          improvedLayout: true,
        },
      }
    );

    network.on('click', (params) => {
      if (params.nodes.length > 0) {
        const node = graphData.nodes.find(
          (item) => item.id === params.nodes[0]
        );

        onSelectNode(node || null);
        setSelectedTx(null);
        return;
      }

      if (params.edges.length > 0) {
        const index = Number(params.edges[0]);

        setSelectedTx(graphData.edges[index] || null);
        onSelectNode(null);
        return;
      }

      setSelectedTx(null);
      onSelectNode(null);
    });

    return () => network.destroy();
  }, [graphData, isLive, onSelectNode]);

  if (!graphData) {
    return <p>No transaction graph loaded.</p>;
  }

  const explorerUrl =
    selectedTx?.tx_hash &&
    /^0x[a-fA-F0-9]{64}$/.test(selectedTx.tx_hash)
      ? `https://etherscan.io/tx/${selectedTx.tx_hash}`
      : null;

  return (
    <div>
      <div
        style={{
          marginBottom: 12,
          padding: '10px 12px',
          borderRadius: 8,
          background: isLive ? '#052e24' : '#422006',
          color: isLive ? '#86efac' : '#fde68a',
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        {isLive
          ? 'ETHEREUM MAINNET — REAL TRANSACTION RECORDS (LIMITED SAMPLE)'
          : 'DEMO MODE — SIMULATED TRANSACTIONS'}
      </div>

      <div
        ref={containerRef}
        style={{
          height: 460,
          width: '100%',
          border: '1px solid #334155',
          borderRadius: 8,
          background: '#0b0f19',
        }}
      />

      <div
        style={{
          marginTop: 12,
          color: '#94a3b8',
          fontSize: 12,
        }}
      >
        {graphData.nodes.length} wallets •{' '}
        {graphData.filtered_tx_count} transfers
        <p>
          Click a wallet to inspect it. Click an arrow
          to view the transfer. Drag to reposition.
          Scroll to zoom.
        </p>
      </div>

      {selectedTx && (
        <div
          style={{
            marginTop: 14,
            background: '#111827',
            color: '#e2e8f0',
            padding: 16,
            border: '1px solid #334155',
            borderRadius: 10,
            overflowWrap: 'anywhere',
          }}
        >
          <h3>Transaction Details</h3>

          <p>
            <strong>From:</strong>{' '}
            {selectedTx.from_address}
          </p>

          <p>
            <strong>To:</strong>{' '}
            {selectedTx.to_address}
          </p>

          <p>
            <strong>Amount:</strong>{' '}
            {isLive
              ? `${selectedTx.amount_token} ${selectedTx.token}`
              : `$${Number(selectedTx.amount_usd).toLocaleString()} ${selectedTx.token}`}
          </p>

          <p>
            <strong>Transaction Hash:</strong>{' '}
            {selectedTx.tx_hash || 'Not available'}
          </p>

          {isLive && selectedTx.block_number != null && (
            <p>
              <strong>Block:</strong>{' '}
              {selectedTx.block_number}
            </p>
          )}

          {isLive && selectedTx.timestamp && (
            <p>
              <strong>Timestamp:</strong>{' '}
              {new Date(
                selectedTx.timestamp * 1000
              ).toLocaleString()}
            </p>
          )}

          {isLive && explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#38bdf8' }}
            >
              Verify on Etherscan ↗
            </a>
          )}
        </div>
      )}

      {graphData.warnings?.length > 0 && (
        <div
          style={{
            marginTop: 14,
            color: '#cbd5e1',
            background: '#1f2937',
            padding: 14,
            borderRadius: 8,
            fontSize: 12,
          }}
        >
          <strong>Data limitations</strong>
          <ul style={{ paddingLeft: 20 }}>
            {graphData.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {isLive && (
        <p
          style={{
            color: '#94a3b8',
            fontSize: 11,
            marginTop: 10,
          }}
        >
          Powered by Etherscan.io APIs.
          Wallet connections do not establish fraud,
          beneficial ownership, or fund provenance.
        </p>
      )}
    </div>
  );
}

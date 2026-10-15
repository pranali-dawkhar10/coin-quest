
import React from 'react';

export default function NodeDetails({ node }) {
  if (!node) {
    return (
      <p style={{ color: '#94a3b8' }}>
        Click a wallet in the graph to inspect it.
      </p>
    );
  }

  return (
    <div
      style={{
        overflowWrap: 'anywhere',
      }}
    >
      <h4 style={{ color: '#38bdf8' }}>
        Node Inspector
      </h4>

      <p>
        <strong>Label:</strong> {node.label}
      </p>

      <p>
        <strong>Address / Demo ID:</strong>
        {' '}{node.address}
      </p>

      <p>
        <strong>Type:</strong>
        {' '}
        {node.is_suspect
          ? 'Reported wallet'
          : node.is_vasp
            ? 'Demo VASP destination'
            : 'Intermediary'}
      </p>

      <p>
        <strong>Hop:</strong> {node.hop}
      </p>

      {node.vasp_name && (
        <p>
          <strong>Exchange:</strong>
          {' '}{node.vasp_name}
        </p>
      )}

      <p
        style={{
          fontSize: 12,
          color: '#94a3b8',
        }}
      >
        Risk and attribution have not been
        verified from blockchain data.
      </p>
    </div>
  );
}

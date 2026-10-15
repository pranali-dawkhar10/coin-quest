import React from 'react';

export default function Navbar() {
  return (
    <header style={{ height: '60px', background: '#111827', borderBottom: '1px solid #1f2937', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
      <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#38bdf8' }}>TraceChain LEA</div>
      <div style={{ color: '#9ca3af', fontSize: '0.9rem' }}>NCRP / SAHYOG Portal Active Integration[cite: 2]</div>
    </header>
  );
}
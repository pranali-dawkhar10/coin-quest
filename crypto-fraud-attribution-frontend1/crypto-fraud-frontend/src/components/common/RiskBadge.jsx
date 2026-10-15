import React from 'react';

export default function RiskBadge({ score }) {
  const getColor = () => {
    if (score > 80) return { bg: '#7f1d1d', text: '#fca5a5', label: 'CRITICAL' };
    if (score > 50) return { bg: '#78350f', text: '#fcd34d', label: 'HIGH' };
    return { bg: '#064e3b', text: '#6ee7b7', label: 'MEDIUM' };
  };

  const conf = getColor();

  return (
    <span style={{ background: conf.bg, color: conf.text, padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold' }}>
      {score}/100 - {conf.label}
    </span>
  );
}
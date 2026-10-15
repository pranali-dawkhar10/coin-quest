import React from 'react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const menu = [
    { id: 'intake', label: 'Complaint Intake' },
    { id: 'dashboard', label: 'Active Dashboard' },
    { id: 'case', label: 'Case Workspace' },
    { id: 'vasp', label: 'VASP Directory' },
    { id: 'verify', label: 'Report Validator' }
  ];

  return (
    <aside style={{ width: '220px', background: '#0f172a', borderRight: '1px solid #1f2937', padding: '20px 10px' }}>
      {menu.map(item => (
        <div
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          style={{
            padding: '12px',
            marginBottom: '4px',
            borderRadius: '6px',
            cursor: 'pointer',
            background: activeTab === item.id ? '#1e293b' : 'transparent',
            color: activeTab === item.id ? '#38bdf8' : '#94a3b8'
          }}
        >
          {item.label}
        </div>
      ))}
    </aside>
  );
}
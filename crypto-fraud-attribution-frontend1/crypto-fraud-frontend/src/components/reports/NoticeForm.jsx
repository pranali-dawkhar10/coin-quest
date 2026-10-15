
import React, { useState } from 'react';
import { jsPDF } from 'jspdf';

export default function NoticeForm({
  caseId = 'DEMO-CASE',
  walletAddress = '',
  chain = 'ETHEREUM',
  category = 'Not specified',
}) {
  const [recipient, setRecipient] = useState('');
  const [officerName, setOfficerName] = useState('');
  const [department, setDepartment] = useState('');
  const [reference, setReference] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const generateNotice = () => {
    setError('');
    setSuccess('');

    if (!recipient.trim()) {
      setError('Enter the recipient compliance department.');
      return;
    }

    if (!walletAddress.trim()) {
      setError('No investigated wallet is selected.');
      return;
    }

    if (chain !== 'ETHEREUM') {
      setError('This draft currently supports Ethereum cases.');
      return;
    }

    try {
      const doc = new jsPDF();
      const margin = 18;
      const width = doc.internal.pageSize.getWidth();
      let y = 22;

      const addText = (value, fontSize = 10, gap = 8) => {
        doc.setFontSize(fontSize);

        const lines = doc.splitTextToSize(
          String(value),
          width - margin * 2
        );

        if (y + lines.length * 5 > 270) {
          doc.addPage();
          y = 22;
        }

        doc.text(lines, margin, y);
        y += lines.length * 5 + gap;
      };

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('COINQUEST', margin, y);
      y += 12;

      doc.setTextColor(180, 40, 40);
      doc.setFontSize(12);
      doc.text(
        'DRAFT - NOT SIGNED - NOT SERVED',
        margin,
        y
      );
      y += 12;

      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');

      addText(
        'Proposed Request for Review / Preservation of Records',
        12,
        12
      );

      addText(`Case Reference: ${caseId}`);
      addText(`Complaint Category: ${category}`);
      addText(`Blockchain: ${chain}`);
      addText(`Reported Wallet: ${walletAddress}`);
      addText(`Recipient: ${recipient}`);

      if (reference.trim()) {
        addText(`Additional Reference: ${reference}`);
      }

      y += 5;

      doc.setFont('helvetica', 'bold');
      addText('Subject: Request for Compliance Review', 11);

      doc.setFont('helvetica', 'normal');

      addText(
        'This document is a draft prepared for review by an authorized investigator. The wallet address above was reported in connection with a complaint. CoinQuest has not independently established the identity of the wallet owner or that the recipient controls the address.',
        10,
        10
      );

      addText(
        'The proposed recipient is requested to review the matter through its established compliance and lawful-request procedures. Any preservation, disclosure, restriction or freezing of assets must be considered only by authorized parties under applicable law and valid legal process.',
        10,
        10
      );

      if (remarks.trim()) {
        doc.setFont('helvetica', 'bold');
        addText('Additional Case Notes:', 10, 5);
        doc.setFont('helvetica', 'normal');
        addText(remarks, 10, 10);
      }

      addText(
        'This draft does not constitute a binding order, completed service, confirmed exchange attribution, or evidence that any assets have been frozen.',
        10,
        12
      );

      addText(`Prepared By: ${officerName || 'Not specified'}`);
      addText(`Department: ${department || 'Not specified'}`);
      addText(`Generated UTC: ${new Date().toISOString()}`);

      doc.setTextColor(180, 40, 40);
      doc.setFontSize(9);
      doc.text(
        'UNSIGNED DRAFT - REQUIRES AUTHORIZED LEGAL REVIEW',
        margin,
        282
      );

      const safeId = String(caseId).replace(
        /[^a-zA-Z0-9_-]/g,
        '_'
      );

      doc.save(`CoinQuest_${safeId}_Notice_DRAFT.pdf`);

      setSuccess('Draft notice PDF generated.');

    } catch (err) {
      setError(err.message || 'Failed to generate draft.');
    }
  };

  const inputStyle = {
    width: '100%',
    marginBottom: 10,
  };

  return (
    <div style={{ color: '#e2e8f0' }}>
      <h4 style={{ marginBottom: 12 }}>
        Compliance Request Draft
      </h4>

      <p
        style={{
          color: '#94a3b8',
          fontSize: 11,
          marginBottom: 12,
        }}
      >
        Generate an unsigned draft for authorized
        investigation review. No request is sent.
      </p>

      <label style={{ fontSize: 12 }}>
        Recipient Compliance Department
      </label>

      <input
        className="input"
        style={inputStyle}
        value={recipient}
        onChange={(e) => setRecipient(e.target.value)}
        placeholder="e.g. Exchange Compliance Team"
      />

      <label style={{ fontSize: 12 }}>
        Investigator Name
      </label>

      <input
        className="input"
        style={inputStyle}
        value={officerName}
        onChange={(e) => setOfficerName(e.target.value)}
        placeholder="Name (optional)"
      />

      <label style={{ fontSize: 12 }}>
        Department / Organization
      </label>

      <input
        className="input"
        style={inputStyle}
        value={department}
        onChange={(e) => setDepartment(e.target.value)}
        placeholder="Department (optional)"
      />

      <label style={{ fontSize: 12 }}>
        Complaint / Reference Number
      </label>

      <input
        className="input"
        style={inputStyle}
        value={reference}
        onChange={(e) => setReference(e.target.value)}
        placeholder="Optional official reference"
      />

      <label style={{ fontSize: 12 }}>
        Additional Notes
      </label>

      <textarea
        className="input"
        rows={3}
        style={{
          ...inputStyle,
          resize: 'vertical',
        }}
        value={remarks}
        onChange={(e) => setRemarks(e.target.value)}
        placeholder="Relevant verified information..."
      />

      <div
        style={{
          background: '#422006',
          borderRadius: 7,
          padding: 10,
          fontSize: 11,
          color: '#fde68a',
          marginBottom: 12,
        }}
      >
        Draft only. This does not identify a VASP,
        issue a legal order, or freeze any assets.
      </div>

      <button
        type="button"
        className="btn btn-primary"
        style={{ width: '100%' }}
        onClick={generateNotice}
      >
        Download Unsigned Draft PDF
      </button>

      {error && (
        <p style={{ color: '#fca5a5', marginTop: 10 }}>
          {error}
        </p>
      )}

      {success && (
        <p style={{ color: '#86efac', marginTop: 10 }}>
          {success}
        </p>
      )}
    </div>
  );
}

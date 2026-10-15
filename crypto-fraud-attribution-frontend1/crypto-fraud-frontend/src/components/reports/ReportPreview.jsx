
import React, { useState } from 'react';
import apiClient from '../../services/api';

export default function ReportPreview({
  caseId,
  walletAddress,
  chain = 'ETHEREUM',
  category = 'Not specified',
  maxHops = 1,
  graphData,
  loading = false,
}) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isLive =
    chain === 'ETHEREUM' &&
    graphData?.data_mode === 'live_sample';

  const nodes = graphData?.nodes || [];
  const edges = graphData?.edges || [];

  // ===================================================
  // DOWNLOAD PDF FROM FASTAPI BACKEND
  // ===================================================

  const downloadReport = async () => {
    if (!isLive || loading || generating) {
      setError('Load live Ethereum transactions first.');
      return;
    }

    setGenerating(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        case_id: caseId || 'DEMO-CASE',
        wallet_address: walletAddress,
        chain,
        category,
        max_hops: Number(maxHops),
        data_mode: graphData.data_mode,
        source: graphData.source || 'Etherscan API V2',

        nodes: nodes.map((node) => ({
          id: node.id,
          address: node.address,
          label: node.label || '',
        })),

        edges: edges.map((tx) => ({
          from_address: tx.from_address,
          to_address: tx.to_address,
          amount_token: String(tx.amount_token),
          token: tx.token,
          tx_hash: tx.tx_hash,
          timestamp: Number(tx.timestamp),
          block_number: Number(tx.block_number),
        })),
      };

      const response = await apiClient.post(
        '/reports/generate',
        payload,
        {
          responseType: 'blob',
        }
      );

      // Convert backend response to downloadable PDF.
      const pdfBlob = new Blob(
        [response.data],
        { type: 'application/pdf' }
      );

      const url = URL.createObjectURL(pdfBlob);

      const link = document.createElement('a');

      const safeCaseId = String(
        caseId || 'DEMO-CASE'
      ).replace(/[^a-zA-Z0-9_-]/g, '_');

      link.href = url;
      link.download = `CoinQuest_${safeCaseId}_Report.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setSuccess('PDF report downloaded successfully.');

    } catch (err) {
      console.error('Report download error:', err);

      let message = 'Unable to generate report.';

      const responseData = err.response?.data;

      // Axios receives errors as blobs because
      // responseType is set to "blob".
      if (responseData instanceof Blob) {
        try {
          const text = await responseData.text();
          const json = JSON.parse(text);

          message =
            typeof json.detail === 'string'
              ? json.detail
              : JSON.stringify(json.detail);
        } catch {
          message = err.message || message;
        }
      } else {
        message = err.message || message;
      }

      setError(message);

    } finally {
      setGenerating(false);
    }
  };

  // ===================================================
  // REPORT PREVIEW UI
  // ===================================================

  return (
    <div className="card" style={{ marginTop: 18 }}>

      <h3 style={{ marginBottom: 16 }}>
        Investigation Evidence Report
      </h3>

      <div
        style={{
          background: '#0f172a',
          border: '1px solid #334155',
          borderRadius: 10,
          padding: 18,
          color: '#e2e8f0',
        }}
      >
        <h4 style={{ marginBottom: 14 }}>
          COINQUEST — INVESTIGATION SUMMARY
        </h4>

        <p>
          <strong>Case ID:</strong> {caseId || 'DEMO-CASE'}
        </p>

        <p style={{ overflowWrap: 'anywhere' }}>
          <strong>Wallet Address:</strong>{' '}
          {walletAddress || 'Not selected'}
        </p>

        <p>
          <strong>Blockchain:</strong> {chain}
        </p>

        <p>
          <strong>Crime Category:</strong> {category}
        </p>

        <p>
          <strong>Tracing Depth:</strong> {maxHops} Hops
        </p>

        <p>
          <strong>Wallets:</strong> {nodes.length}
        </p>

        <p>
          <strong>Transactions:</strong> {edges.length}
        </p>

        <p>
          <strong>Data Source:</strong>{' '}
          {isLive
            ? 'Etherscan API V2 (real sampled transactions)'
            : 'Live Ethereum data not loaded'}
        </p>

        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 8,
            background: isLive ? '#052e24' : '#422006',
            color: isLive ? '#86efac' : '#fde68a',
            fontSize: 12,
          }}
        >
          {isLive
            ? 'Ethereum transaction snapshot ready for reporting.'
            : 'Load the live Ethereum graph to enable PDF generation.'}
        </div>

        <button
          className="btn btn-primary"
          type="button"
          onClick={downloadReport}
          disabled={!isLive || loading || generating}
          style={{ marginTop: 16 }}
        >
          {generating
            ? 'Generating PDF...'
            : 'Download Investigation Report (PDF)'}
        </button>

        {success && (
          <p style={{ color: '#86efac', marginTop: 12 }}>
            {success}
          </p>
        )}

        {error && (
          <p style={{ color: '#fca5a5', marginTop: 12 }}>
            {error}
          </p>
        )}

      </div>

      <p
        style={{
          fontSize: 12,
          color: '#94a3b8',
          marginTop: 12,
        }}
      >
        Reports contain a limited client-submitted transaction
        snapshot. They do not independently establish fraud,
        wallet ownership or verified exchange attribution.
      </p>

    </div>
  );
}

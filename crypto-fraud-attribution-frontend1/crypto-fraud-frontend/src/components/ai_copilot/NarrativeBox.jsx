
import React, { useMemo } from 'react';

import {
  analyzeTransactions,
  formatTokenTotals,
  formatDate,
} from '../../utils/transactionAnalysis';

export default function NarrativeBox({
  graphData,
  walletAddress,
  loading = false,
}) {
  const analysis = useMemo(
    () => analyzeTransactions(graphData, walletAddress),
    [graphData, walletAddress]
  );

  const boxStyle = {
    background: '#1e293b',
    padding: 18,
    borderRadius: 8,
    borderLeft: '4px solid #38bdf8',
    marginBottom: 15,
    marginTop: 15,
    color: '#cbd5e1',
  };

  if (loading) {
    return (
      <div style={boxStyle}>
        <h4 style={{ color: '#38bdf8' }}>
          Investigation Analysis
        </h4>
        <p>Analyzing blockchain transactions...</p>
      </div>
    );
  }

  if (!analysis.sampled) {
    return (
      <div style={boxStyle}>
        <h4 style={{ color: '#38bdf8' }}>
          Investigation Analysis
        </h4>
        <p>
          Load real Ethereum transactions to generate
          a transaction-based investigation narrative.
        </p>
      </div>
    );
  }

  const {
    totalTransfers,
    walletCount,
    incomingCount,
    outgoingCount,
    counterpartyCount,
    totals,
    firstTransaction,
    lastTransaction,
  } = analysis;

  return (
    <div style={boxStyle}>
      <h4
        style={{
          color: '#38bdf8',
          marginBottom: 12,
        }}
      >
        Automated Investigation Narrative
      </h4>

      <div
        style={{
          fontSize: 13,
          lineHeight: 1.7,
        }}
      >
        <p>
          <strong>Transaction Overview:</strong>{' '}
          The sampled Ethereum graph contains{' '}
          <strong>{totalTransfers}</strong> token or ETH
          transfer records involving{' '}
          <strong>{walletCount}</strong> wallet addresses.
        </p>

        <p style={{ marginTop: 10 }}>
          <strong>Reported Wallet Activity:</strong>{' '}
          Within the displayed sample, the reported wallet
          participated in{' '}
          <strong>{incomingCount}</strong> incoming
          transfers and{' '}
          <strong>{outgoingCount}</strong> outgoing
          transfers, with{' '}
          <strong>{counterpartyCount}</strong> distinct
          direct counterparties.
        </p>

        <p style={{ marginTop: 10 }}>
          <strong>Observed Transfer Volumes:</strong>{' '}
          {formatTokenTotals(totals)}.
          These are sums across displayed transfers,
          not balances, losses or proven fund movements.
        </p>

        {firstTransaction && lastTransaction && (
          <p style={{ marginTop: 10 }}>
            <strong>Observed Time Range:</strong>{' '}
            {formatDate(firstTransaction.timestamp)}
            {' to '}
            {formatDate(lastTransaction.timestamp)}.
          </p>
        )}

        <p style={{ marginTop: 12 }}>
          <strong>Investigation Assessment:</strong>{' '}
          The observed connections can help prioritize
          transaction review. However, the limited
          sample does not establish fraud, asset
          ownership, exchange attribution or the
          onward movement of particular funds.
        </p>
      </div>

      <div
        style={{
          marginTop: 14,
          padding: 10,
          borderRadius: 6,
          background: '#0f172a',
          fontSize: 11,
          color: '#94a3b8',
        }}
      >
        Source: Etherscan-derived transaction snapshot.
        This is automated rule-based analysis, not
        an LLM-generated or independently verified
        forensic conclusion.
      </div>
    </div>
  );
}

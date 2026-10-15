import React, { useEffect, useState } from 'react';

import NetworkGraph from '../components/graph/NetworkGraph';
import NodeDetails from '../components/graph/NodeDetails';
import GraphFilter from '../components/graph/GraphFilter';

import NarrativeBox from '../components/ai_copilot/NarrativeBox';
import ChatPanel from '../components/ai_copilot/ChatPanel';

import ReportPreview from '../components/reports/ReportPreview';
import NoticeForm from '../components/reports/NoticeForm';

import useGraphData from '../hooks/useGraphData';

// =====================================================
// DEFAULT TEST WALLET
// =====================================================

const DEFAULT_WALLET =
  '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';

export default function CaseDetailPage({ activeCase }) {

  // =====================================================
  // WALLET STATE
  // =====================================================

  const [walletInput, setWalletInput] = useState(
    activeCase?.walletAddress || DEFAULT_WALLET
  );

  const [walletAddress, setWalletAddress] = useState(
    activeCase?.walletAddress || DEFAULT_WALLET
  );

  // =====================================================
  // BLOCKCHAIN FILTERS
  // =====================================================

  const [chain, setChain] = useState(
    activeCase?.chain || 'ETHEREUM'
  );

  const [maxHops, setMaxHops] = useState(1);
  const [token, setToken] = useState('ALL');

  // =====================================================
  // GRAPH INSPECTOR
  // =====================================================

  const [selectedNode, setSelectedNode] = useState(null);

  // =====================================================
  // RECEIVE CASE FROM COMPLAINT INTAKE
  // =====================================================

  useEffect(() => {
    if (!activeCase?.walletAddress) return;

    setWalletInput(activeCase.walletAddress);
    setWalletAddress(activeCase.walletAddress);

    setChain(activeCase.chain || 'ETHEREUM');
    setMaxHops(1);
    setToken('ALL');
    setSelectedNode(null);

  }, [activeCase]);

  // =====================================================
  // FETCH GRAPH DATA
  // =====================================================

  const {
    graphData,
    loading,
    error,
  } = useGraphData({
    walletAddress,
    chain,
    maxHops,
    token,
  });

  // =====================================================
  // MANUAL WALLET SEARCH
  // =====================================================

  const applyWallet = (event) => {
    event.preventDefault();

    const wallet = walletInput.trim();

    if (!wallet) return;

    if (
      chain === 'ETHEREUM' &&
      !/^0x[a-fA-F0-9]{40}$/.test(wallet)
    ) {
      alert('Enter a valid Ethereum wallet address.');
      return;
    }

    setSelectedNode(null);
    setWalletAddress(wallet);
  };

  // =====================================================
  // GRAPH FILTER HANDLERS
  // =====================================================

  const handleChainChange = (value) => {
    setChain(value);
    setToken('ALL');
    setSelectedNode(null);
  };

  const handleHopsChange = (value) => {
    setMaxHops(Number(value));
    setSelectedNode(null);
  };

  const handleTokenChange = (value) => {
    setToken(value);
    setSelectedNode(null);
  };

  // =====================================================
  // CASE INFORMATION
  // =====================================================

  const caseId = activeCase?.id || 'DEMO-CASE';

  const caseCategory =
    activeCase?.category || 'Not specified';

  const isLiveGraph =
    chain === 'ETHEREUM' &&
    graphData?.data_mode === 'live_sample';

  const nodesCount = graphData?.nodes?.length || 0;
  const transfersCount = graphData?.edges?.length || 0;

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="container">

      {/* CASE HEADER */}

      <h2>
        Case Workspace: {caseId}
      </h2>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 20,
          marginTop: 10,
          marginBottom: 20,
          color: '#94a3b8',
          fontSize: 13,
        }}
      >
        <span>
          <strong>Crime Category:</strong>{' '}
          {caseCategory}
        </span>

        <span>
          <strong>Blockchain:</strong>{' '}
          {chain}
        </span>

        <span>
          <strong>Status:</strong>{' '}
          Under Review
        </span>
      </div>

      {/* CASE METRICS */}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div className="card">
          <p style={{ color: '#94a3b8' }}>
            Wallets Identified
          </p>
          <h2>{nodesCount}</h2>
        </div>

        <div className="card">
          <p style={{ color: '#94a3b8' }}>
            Transfers Displayed
          </p>
          <h2>{transfersCount}</h2>
        </div>

        <div className="card">
          <p style={{ color: '#94a3b8' }}>
            Tracing Depth
          </p>
          <h2>{maxHops} Hops</h2>
        </div>

        <div className="card">
          <p style={{ color: '#94a3b8' }}>
            Data Source
          </p>
          <h3
            style={{
              color: isLiveGraph
                ? '#4ade80'
                : '#fbbf24',
            }}
          >
            {loading
              ? 'Loading'
              : isLiveGraph
                ? 'Ethereum Live'
                : 'Demo / Unavailable'}
          </h3>
        </div>
      </div>

      {/* MAIN WORKSPACE */}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'minmax(0, 2fr) minmax(250px, 1fr)',
          gap: 20,
          marginTop: 20,
        }}
      >

        {/* LEFT COLUMN */}

        <div style={{ minWidth: 0 }}>

          <div className="card">

            <h3 style={{ marginBottom: 14 }}>
              Blockchain Transaction Graph
            </h3>

            {/* WALLET SEARCH */}

            <form
              onSubmit={applyWallet}
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 15,
              }}
            >
              <input
                className="input"
                style={{
                  flex: '1 1 260px',
                  minWidth: 0,
                }}
                value={walletInput}
                onChange={(event) =>
                  setWalletInput(event.target.value)
                }
                placeholder="Enter Ethereum wallet address"
                aria-label="Wallet address"
              />

              <button
                className="btn btn-primary"
                type="submit"
              >
                Show Graph
              </button>
            </form>

            {/* GRAPH FILTERS */}

            <GraphFilter
              chain={chain}
              onChainChange={handleChainChange}
              maxHops={maxHops}
              onMaxHopsChange={handleHopsChange}
              token={token}
              onTokenChange={handleTokenChange}
            />

            {/* GRAPH DATA SOURCE */}

            {graphData && (
              <p
                style={{
                  fontSize: 12,
                  marginBottom: 12,
                  color: isLiveGraph
                    ? '#4ade80'
                    : '#fbbf24',
                }}
              >
                {isLiveGraph
                  ? 'Ethereum Mainnet — Etherscan API (sampled transactions)'
                  : 'Demonstration data — not blockchain evidence'}
              </p>
            )}

            {/* GRAPH DISPLAY */}

            {loading ? (

              <div
                style={{
                  textAlign: 'center',
                  padding: 35,
                  color: '#94a3b8',
                }}
              >
                <h4>Fetching Blockchain Transactions...</h4>
                <p>
                  Retrieving wallet transaction records
                  from the backend.
                </p>
              </div>

            ) : error ? (

              <div
                style={{
                  background: '#450a0a',
                  color: '#fca5a5',
                  padding: 16,
                  borderRadius: 8,
                }}
              >
                <h4>Graph Loading Failed</h4>
                <p>{error}</p>
                <p>
                  Check FastAPI and your Etherscan API key.
                </p>
              </div>

            ) : graphData ? (

              <NetworkGraph
                graphData={graphData}
                onSelectNode={setSelectedNode}
              />

            ) : (

              <p>
                Enter a wallet address to load the graph.
              </p>

            )}

          </div>

          {/* AI NARRATIVE - UPDATED COMPONENT */}

          <NarrativeBox
            graphData={graphData}
            walletAddress={walletAddress}
            loading={loading}
          />

          {/* LIVE INVESTIGATION REPORT */}

          <ReportPreview
            caseId={caseId}
            walletAddress={walletAddress}
            chain={chain}
            category={caseCategory}
            maxHops={maxHops}
            graphData={graphData}
            loading={loading}
          />

        </div>

        {/* RIGHT COLUMN */}

        <div style={{ minWidth: 0 }}>

          <div className="card">
            <h4 style={{ marginBottom: 12 }}>
              Wallet Inspector
            </h4>

            <NodeDetails node={selectedNode} />
          </div>

          <div className="card">
            <h4>AI Investigator Copilot</h4>
            <ChatPanel
              graphData={graphData}
              walletAddress={walletAddress}
              loading={loading}
            />
          </div>

          <div className="card">
            <NoticeForm
              caseId={caseId}
              walletAddress={walletAddress}
              chain={chain}
              category={caseCategory}
            />
          </div>

        </div>

      </div>

    </div>
  );
}
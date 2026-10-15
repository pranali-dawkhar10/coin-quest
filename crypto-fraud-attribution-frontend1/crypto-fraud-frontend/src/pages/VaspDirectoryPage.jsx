
import React, { useState } from 'react';

const VASP_DIRECTORY = [
  {
    id: 'binance',
    name: 'Binance',
    category: 'Centralized Cryptocurrency Exchange',
    website: 'https://www.binance.com',
    jurisdiction: 'Multiple jurisdictions',
    status: 'Directory listing only',
  },
  {
    id: 'htx',
    name: 'HTX',
    category: 'Centralized Cryptocurrency Exchange',
    website: 'https://www.htx.com',
    jurisdiction: 'Multiple jurisdictions',
    status: 'Directory listing only',
  },
  {
    id: 'coinbase',
    name: 'Coinbase',
    category: 'Centralized Cryptocurrency Exchange',
    website: 'https://www.coinbase.com',
    jurisdiction: 'United States and other jurisdictions',
    status: 'Directory listing only',
  },
  {
    id: 'kraken',
    name: 'Kraken',
    category: 'Centralized Cryptocurrency Exchange',
    website: 'https://www.kraken.com',
    jurisdiction: 'Multiple jurisdictions',
    status: 'Directory listing only',
  },
  {
    id: 'okx',
    name: 'OKX',
    category: 'Centralized Cryptocurrency Exchange',
    website: 'https://www.okx.com',
    jurisdiction: 'Multiple jurisdictions',
    status: 'Directory listing only',
  },
];

export default function VaspDirectoryPage() {
  const [search, setSearch] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [walletError, setWalletError] = useState('');
  const [lookupResult, setLookupResult] = useState(null);

  const filteredExchanges = VASP_DIRECTORY.filter(
    (vasp) => {
      const text = (
        `${vasp.name} ${vasp.category} ${vasp.jurisdiction}`
      ).toLowerCase();

      return text.includes(search.toLowerCase());
    }
  );

  const inspectWallet = (event) => {
    event.preventDefault();

    setWalletError('');
    setLookupResult(null);

    const address = walletAddress.trim();

    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setWalletError(
        'Enter a valid Ethereum wallet address.'
      );
      return;
    }

    setLookupResult({
      address,
      status: 'Ownership not verified',
      explorer:
        `https://etherscan.io/address/${address}`,
    });
  };

  return (
    <div className="container">

      <h2>VASP Directory & Wallet Attribution</h2>

      <p
        style={{
          color: '#94a3b8',
          marginTop: 8,
          marginBottom: 20,
          fontSize: 13,
        }}
      >
        Reference directory of cryptocurrency exchanges.
        Exchange listings do not establish ownership
        of any blockchain wallet.
      </p>

      {/* WALLET LOOKUP */}

      <div
        className="card"
        style={{ marginBottom: 20 }}
      >
        <h3 style={{ marginBottom: 12 }}>
          Ethereum Wallet Attribution Lookup
        </h3>

        <form
          onSubmit={inspectWallet}
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <input
            className="input"
            value={walletAddress}
            onChange={(e) =>
              setWalletAddress(e.target.value)
            }
            placeholder="Enter Ethereum wallet address"
            style={{
              flex: '1 1 300px',
              minWidth: 0,
            }}
          />

          <button
            type="submit"
            className="btn btn-primary"
          >
            Inspect Wallet
          </button>
        </form>

        {walletError && (
          <p
            style={{
              color: '#fca5a5',
              marginTop: 12,
            }}
          >
            {walletError}
          </p>
        )}

        {lookupResult && (
          <div
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              padding: 16,
              borderRadius: 8,
              marginTop: 16,
              color: '#e2e8f0',
              overflowWrap: 'anywhere',
            }}
          >
            <p>
              <strong>Wallet:</strong>{' '}
              {lookupResult.address}
            </p>

            <p style={{ marginTop: 8 }}>
              <strong>Attribution Status:</strong>{' '}
              <span style={{ color: '#fbbf24' }}>
                {lookupResult.status}
              </span>
            </p>

            <p
              style={{
                fontSize: 12,
                color: '#94a3b8',
                marginTop: 8,
              }}
            >
              CoinQuest has not established a verified
              exchange owner for this address.
              Open the blockchain explorer to review
              available public information.
            </p>

            <a
              href={lookupResult.explorer}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#38bdf8',
                display: 'inline-block',
                marginTop: 12,
              }}
            >
              Inspect on Etherscan ↗
            </a>
          </div>
        )}
      </div>

      {/* EXCHANGE DIRECTORY */}

      <div className="card">
        <h3 style={{ marginBottom: 14 }}>
          Cryptocurrency Exchange Directory
        </h3>

        <input
          className="input"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          placeholder="Search exchange name or jurisdiction..."
          style={{
            width: '100%',
            marginBottom: 16,
          }}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {filteredExchanges.map((vasp) => (
            <div
              key={vasp.id}
              style={{
                background: '#0f172a',
                border: '1px solid #334155',
                borderRadius: 10,
                padding: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div>
                <h4
                  style={{
                    color: '#f8fafc',
                    marginBottom: 6,
                  }}
                >
                  {vasp.name}
                </h4>

                <p
                  style={{
                    color: '#94a3b8',
                    fontSize: 12,
                  }}
                >
                  {vasp.category}
                </p>

                <p
                  style={{
                    color: '#94a3b8',
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  Jurisdiction: {vasp.jurisdiction}
                </p>

                <p
                  style={{
                    color: '#fbbf24',
                    fontSize: 11,
                    marginTop: 7,
                  }}
                >
                  {vasp.status}
                </p>
              </div>

              <a
                href={vasp.website}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: '#1e293b',
                  border: '1px solid #475569',
                  padding: '9px 13px',
                  borderRadius: 7,
                  fontSize: 12,
                  color: '#e2e8f0',
                  textDecoration: 'none',
                }}
              >
                Official Website ↗
              </a>
            </div>
          ))}

          {filteredExchanges.length === 0 && (
            <p style={{ color: '#94a3b8' }}>
              No matching exchange listings found.
            </p>
          )}
        </div>
      </div>

      <p
        style={{
          marginTop: 14,
          color: '#94a3b8',
          fontSize: 11,
        }}
      >
        Directory entries are general reference information,
        not verified wallet clusters or official law-enforcement
        contact channels. This lookup does not independently
        query an exchange-label database.
      </p>
    </div>
  );
}

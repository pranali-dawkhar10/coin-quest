
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

const API_URL = "http://127.0.0.1:8000/api/v1/cases";

const C = {
  card: "#111827",
  inner: "#0b1220",
  border: "#273449",
  text: "#f1f5f9",
  muted: "#94a3b8",
  cyan: "#38bdf8",
  green: "#34d399",
  yellow: "#fbbf24",
  red: "#f87171",
};

const cardStyle = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 13,
  padding: 20,
};

const inputStyle = {
  background: C.inner,
  color: C.text,
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: "11px 13px",
  outline: "none",
  fontSize: 12,
  boxSizing: "border-box",
};

function shortWallet(wallet) {
  if (!wallet) return "—";
  return wallet.length > 20
    ? wallet.slice(0, 10) + "..." + wallet.slice(-8)
    : wallet;
}

function dateFormat(value) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : parsed.toLocaleString();
}

function statusColor(status) {
  if (status === "ACTIVE") return C.green;
  if (status === "UNDER_REVIEW") return C.yellow;
  return C.muted;
}

function MetricCard({ label, value, accent }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 12, color: C.muted }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 750,
          marginTop: 12,
          color: accent || C.text,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function DashboardPage({ onOpenCase }) {
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState("");
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [casesResponse, statsResponse] =
        await Promise.all([
          fetch(API_URL, { cache: "no-store" }),
          fetch(`${API_URL}/stats`, {
            cache: "no-store",
          }),
        ]);

      if (!casesResponse.ok || !statsResponse.ok) {
        throw new Error(
          "Could not retrieve investigation data."
        );
      }

      const caseData = await casesResponse.json();
      const statsData = await statsResponse.json();

      setCases(
        Array.isArray(caseData.cases) ? caseData.cases : []
      );
      setStats(statsData);
    } catch (err) {
      setError(err.message || "Dashboard request failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const filteredCases = useMemo(() => {
    const term = search.trim().toLowerCase();

    return cases.filter((item) => {
      const matchesStatus =
        filter === "ALL" || item.status === filter;

      const matchesSearch =
        !term ||
        [
          item.caseId,
          item.walletAddress,
          item.category,
          item.chain,
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);

      return matchesStatus && matchesSearch;
    });
  }, [cases, filter, search]);

  const updateStatus = async (caseId, status) => {
    setUpdating(caseId);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/${encodeURIComponent(caseId)}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Could not update investigation status."
        );
      }

      await loadDashboard();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating("");
    }
  };

  const openCase = (item) => {
    if (typeof onOpenCase !== "function") {
      setError(
        "Case Workspace navigation is not connected in App.jsx."
      );
      return;
    }

    onOpenCase(item);
  };

  return (
    <div
      style={{
        maxWidth: 1350,
        margin: "0 auto",
        padding: 20,
        color: C.text,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 24,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 25,
              fontWeight: 750,
              margin: 0,
            }}
          >
            Active Cybercrime Investigations
          </h2>

          <p
            style={{
              color: C.muted,
              fontSize: 13,
              marginTop: 8,
            }}
          >
            Case management and Ethereum wallet investigations
          </p>
        </div>

        <button
          type="button"
          onClick={loadDashboard}
          disabled={loading}
          style={{
            background: "#164e63",
            color: "#e0f2fe",
            border: "1px solid #155e75",
            borderRadius: 8,
            padding: "11px 16px",
            cursor: "pointer",
            fontWeight: 650,
          }}
        >
          {loading ? "Refreshing..." : "↻ Refresh Dashboard"}
        </button>
      </div>

      {/* METRICS */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(175px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <MetricCard
          label="Total Investigations"
          value={stats?.totalInvestigations ?? "—"}
          accent={C.cyan}
        />

        <MetricCard
          label="Active Cases"
          value={stats?.activeCases ?? "—"}
          accent={C.green}
        />

        <MetricCard
          label="Under Review"
          value={stats?.underReview ?? "—"}
          accent={C.yellow}
        />

        <MetricCard
          label="Closed Cases"
          value={stats?.closedCases ?? "—"}
        />

        <MetricCard
          label="Unique Reported Wallets"
          value={stats?.uniqueWallets ?? "—"}
          accent={C.cyan}
        />
      </div>

      {/* INVESTIGATIONS */}

      <section style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 14,
            marginBottom: 20,
          }}
        >
          <div>
            <h3 style={{ fontSize: 17, margin: 0 }}>
              Investigation Registry
            </h3>

            <p
              style={{
                fontSize: 12,
                color: C.muted,
                marginTop: 6,
              }}
            >
              {filteredCases.length} matching investigations
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search case ID or wallet..."
              style={{
                ...inputStyle,
                minWidth: 230,
              }}
            />

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={inputStyle}
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>

        {error && (
          <div
            style={{
              background: "#450a0a",
              color: "#fecaca",
              padding: 13,
              borderRadius: 8,
              marginBottom: 16,
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 12,
              textAlign: "left",
            }}
          >
            <thead>
              <tr
                style={{
                  color: C.muted,
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                {[
                  "Case ID",
                  "Reported Wallet",
                  "Blockchain",
                  "Category",
                  "Created",
                  "Status",
                  "Action",
                ].map((label) => (
                  <th
                    key={label}
                    style={{
                      padding: "13px 12px",
                      whiteSpace: "nowrap",
                      fontWeight: 600,
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredCases.map((item) => (
                <tr
                  key={item.caseId}
                  style={{
                    borderBottom: `1px solid ${C.border}`,
                  }}
                >
                  <td
                    style={{
                      padding: 12,
                      color: C.cyan,
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.caseId}
                  </td>

                  <td
                    style={{
                      padding: 12,
                      fontFamily: "monospace",
                      color: "#cbd5e1",
                    }}
                    title={item.walletAddress}
                  >
                    {shortWallet(item.walletAddress)}
                  </td>

                  <td style={{ padding: 12 }}>
                    {item.chain}
                  </td>

                  <td style={{ padding: 12 }}>
                    {item.category}
                  </td>

                  <td
                    style={{
                      padding: 12,
                      whiteSpace: "nowrap",
                      color: C.muted,
                    }}
                  >
                    {dateFormat(item.createdAt)}
                  </td>

                  <td style={{ padding: 12 }}>
                    <select
                      value={item.status}
                      disabled={updating === item.caseId}
                      onChange={(e) =>
                        updateStatus(
                          item.caseId,
                          e.target.value
                        )
                      }
                      style={{
                        ...inputStyle,
                        color: statusColor(item.status),
                        fontSize: 11,
                        padding: "8px 9px",
                      }}
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="UNDER_REVIEW">
                        UNDER REVIEW
                      </option>
                      <option value="CLOSED">CLOSED</option>
                    </select>
                  </td>

                  <td style={{ padding: 12 }}>
                    <button
                      type="button"
                      onClick={() => openCase(item)}
                      style={{
                        border: "1px solid #155e75",
                        background: "#083344",
                        color: "#67e8f9",
                        borderRadius: 7,
                        padding: "9px 12px",
                        cursor: "pointer",
                        fontSize: 11,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Open Case →
                    </button>
                  </td>
                </tr>
              ))}

              {!loading && filteredCases.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: "45px 18px",
                      textAlign: "center",
                      color: C.muted,
                    }}
                  >
                    {cases.length === 0
                      ? "No investigations yet. Register your first case through Complaint Intake."
                      : "No investigations match your search."}
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      padding: 30,
                      textAlign: "center",
                      color: C.muted,
                    }}
                  >
                    Loading investigations...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p
        style={{
          fontSize: 11,
          color: C.muted,
          marginTop: 16,
          lineHeight: 1.6,
        }}
      >
        Case statuses describe investigator workflow only.
        A reported wallet is not automatically a confirmed
        suspect. Exchange ownership and risk ratings are not
        inferred without supporting evidence.
      </p>
    </div>
  );
}

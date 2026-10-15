
import React, { useState } from "react";

const API_URL =
  "http://127.0.0.1:8000/api/v1/validator/verify";

const colors = {
  bg: "#0b1020",
  card: "#111827",
  inner: "#0b1220",
  border: "#273449",
  text: "#f1f5f9",
  muted: "#94a3b8",
  cyan: "#22d3ee",
  green: "#34d399",
  yellow: "#fbbf24",
  red: "#f87171",
};

const styles = {
  page: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "24px",
    color: colors.text,
    fontFamily: "Inter, system-ui, sans-serif",
  },
  card: {
    background: colors.card,
    border: `1px solid ${colors.border}`,
    borderRadius: 14,
    padding: 24,
    marginTop: 22,
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#cbd5e1",
    marginBottom: 9,
  },
  input: {
    width: "100%",
    background: colors.inner,
    color: colors.text,
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    padding: "13px 14px",
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
  },
  meta: {
    fontSize: 12,
    color: colors.muted,
    lineHeight: 1.7,
  },
  button: {
    background: "#0891b2",
    color: "#fff",
    border: "none",
    padding: "13px 22px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },
};

function Detail({ label, value, mono = false }) {
  return (
    <div
      style={{
        padding: "14px 16px",
        background: colors.inner,
        border: `1px solid ${colors.border}`,
        borderRadius: 9,
        minWidth: 0,
      }}
    >
      <div
        style={{
          color: colors.muted,
          fontSize: 11,
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          overflowWrap: "anywhere",
          fontFamily: mono ? "monospace" : "inherit",
        }}
      >
        {value ?? "—"}
      </div>
    </div>
  );
}

export default function VerificationPage() {
  const [file, setFile] = useState(null);
  const [expectedHash, setExpectedHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const verifyFile = async (event) => {
    event.preventDefault();
    setError("");
    setResult(null);
    setCopied(false);

    if (!file) {
      setError("Select an investigation PDF first.");
      return;
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are accepted.");
      return;
    }

    if (file.size === 0 || file.size > 15 * 1024 * 1024) {
      setError("PDF must be between 1 byte and 15 MB.");
      return;
    }

    const hash = expectedHash.trim();

    if (hash && !/^[a-fA-F0-9]{64}$/.test(hash)) {
      setError("Reference SHA-256 must be 64 hexadecimal characters.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file, file.name);
      formData.append("expected_hash", hash);

      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        const detail = data.detail;

        const message =
          typeof detail === "string"
            ? detail
            : Array.isArray(detail)
            ? detail
                .map((item) => {
                  const location = (item.loc || []).join(" → ");
                  return `${location}: ${item.msg}`;
                })
                .join("\n")
            : `Verification failed (HTTP ${response.status}).`;

        throw new Error(message);
      }

      setResult(data);
    } catch (err) {
      setError(err.message || "Unable to reach the backend.");
    } finally {
      setLoading(false);
    }
  };

  const statusConfig = {
    VERIFIED: {
      title: "Integrity Verified",
      color: colors.green,
      symbol: "✓",
      description:
        "The uploaded PDF exactly matches a report registered by CoinQuest.",
    },
    MISMATCH: {
      title: "Hash Mismatch",
      color: colors.red,
      symbol: "!",
      description:
        "The uploaded PDF differs from the supplied reference hash.",
    },
    NOT_REGISTERED: {
      title: "Report Not Registered",
      color: colors.yellow,
      symbol: "!",
      description:
        "This PDF was not found in the local report registry.",
    },
  };

  const status = result
    ? statusConfig[result.status] || {
        title: result.status,
        color: colors.yellow,
        symbol: "?",
        description: result.message,
      }
    : null;

  const copyHash = async () => {
    if (!result?.calculated_sha256) return;

    try {
      await navigator.clipboard.writeText(
        result.calculated_sha256
      );
      setCopied(true);
    } catch {
      setError("Could not copy the SHA-256 hash.");
    }
  };

  return (
    <div style={styles.page}>
      {/* HEADER */}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            background: "#083344",
            border: "1px solid #155e75",
            color: colors.cyan,
            borderRadius: 12,
            height: 50,
            width: 50,
            display: "grid",
            placeItems: "center",
            fontSize: 24,
          }}
        >
          ◈
        </div>

        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 25,
              fontWeight: 750,
              color: colors.text,
            }}
          >
            Report Integrity Validator
          </h2>
          <p style={{ ...styles.meta, marginTop: 5 }}>
            Digital evidence verification · SHA-256
          </p>
        </div>
      </div>

      <p style={{ ...styles.meta, fontSize: 13 }}>
        Validate an investigation report against the
        CoinQuest PDF registry using cryptographic hashing.
      </p>

      {/* UPLOAD CARD */}

      <section style={styles.card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: 22,
          }}
        >
          <div>
            <h3
              style={{
                fontSize: 17,
                fontWeight: 700,
                margin: 0,
              }}
            >
              Document Verification
            </h3>
            <p style={{ ...styles.meta, marginTop: 6 }}>
              Upload a generated CoinQuest report to
              check its registered fingerprint.
            </p>
          </div>

          <span
            style={{
              border: `1px solid ${colors.border}`,
              background: colors.inner,
              borderRadius: 30,
              padding: "7px 12px",
              color: colors.muted,
              fontSize: 11,
            }}
          >
            SHA-256 · PDF · 15 MB max
          </span>
        </div>

        <form onSubmit={verifyFile}>
          <label style={styles.label}>
            Investigation Report
          </label>

          <label
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              gap: 9,
              border: `1px dashed ${
                file ? colors.cyan : "#475569"
              }`,
              borderRadius: 12,
              background: colors.inner,
              minHeight: 160,
              padding: 20,
              cursor: "pointer",
              boxSizing: "border-box",
            }}
          >
            <div style={{ fontSize: 28, color: colors.cyan }}>
              ↑
            </div>

            <strong style={{ fontSize: 14 }}>
              {file ? file.name : "Click to select a PDF"}
            </strong>

            <span style={styles.meta}>
              {file
                ? `${(file.size / 1024).toFixed(2)} KB selected`
                : "Investigation reports generated by CoinQuest"}
            </span>

            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(event) => {
                setFile(event.target.files?.[0] || null);
                setResult(null);
                setError("");
              }}
              style={{ display: "none" }}
            />
          </label>

          <div style={{ marginTop: 22 }}>
            <label style={styles.label}>
              Reference SHA-256
              <span
                style={{
                  color: colors.muted,
                  fontWeight: 400,
                }}
              >
                {" "}(Optional)
              </span>
            </label>

            <input
              style={{
                ...styles.input,
                fontFamily: "monospace",
              }}
              value={expectedHash}
              onChange={(event) => {
                setExpectedHash(event.target.value);
                setResult(null);
              }}
              placeholder="Paste the 64-character reference hash"
              spellCheck={false}
            />

            <p style={{ ...styles.meta, marginTop: 9 }}>
              Leave this blank to search for the uploaded
              PDF's hash in the CoinQuest registry.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              style={{
                background: "#450a0a",
                border: "1px solid #991b1b",
                borderRadius: 9,
                color: "#fecaca",
                padding: 14,
                fontSize: 12,
                whiteSpace: "pre-wrap",
                marginTop: 17,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !file}
            style={{
              ...styles.button,
              marginTop: 22,
              width: "100%",
              opacity: loading || !file ? 0.55 : 1,
              cursor: loading || !file
                ? "not-allowed"
                : "pointer",
            }}
          >
            {loading
              ? "Verifying document..."
              : "Verify Report Integrity →"}
          </button>
        </form>
      </section>

      {/* RESULTS */}

      {result && (
        <section style={styles.card}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 20,
              paddingBottom: 20,
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                display: "grid",
                placeItems: "center",
                background: colors.inner,
                border: `1px solid ${status.color}`,
                borderRadius: 12,
                color: status.color,
                fontSize: 20,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {status.symbol}
            </div>

            <div>
              <h3
                style={{
                  margin: 0,
                  color: status.color,
                  fontSize: 18,
                }}
              >
                {status.title}
              </h3>

              <p style={{ ...styles.meta, marginTop: 5 }}>
                {result.message || status.description}
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
            }}
          >
            <Detail
              label="Report Filename"
              value={result.filename}
            />
            <Detail
              label="Case Reference"
              value={result.case_id || "Not registered"}
            />
            <Detail
              label="Document Size"
              value={`${(
                (result.file_size_bytes || 0) / 1024
              ).toFixed(2)} KB`}
            />
            <Detail
              label="Registration Time (UTC)"
              value={
                result.registered_at
                  ? new Date(
                      result.registered_at
                    ).toLocaleString()
                  : "Not available"
              }
            />
          </div>

          <div style={{ marginTop: 18 }}>
            <label style={styles.label}>
              Calculated Document Fingerprint
            </label>

            <div
              style={{
                background: colors.inner,
                border: `1px solid ${colors.border}`,
                padding: 16,
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <code
                style={{
                  color: colors.cyan,
                  fontSize: 12,
                  overflowWrap: "anywhere",
                  flex: "1 1 280px",
                }}
              >
                {result.calculated_sha256}
              </code>

              <button
                type="button"
                onClick={copyHash}
                style={{
                  background: "#1e293b",
                  border: "1px solid #334155",
                  color: colors.text,
                  padding: "9px 13px",
                  borderRadius: 7,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {copied ? "Copied ✓" : "Copy Hash"}
              </button>
            </div>
          </div>

          {result.expected_sha256 && (
            <div style={{ marginTop: 18 }}>
              <Detail
                label="Supplied Reference Hash"
                value={result.expected_sha256}
                mono
              />
            </div>
          )}

          <div
            style={{
              background: colors.inner,
              borderLeft: `3px solid ${colors.cyan}`,
              padding: "13px 16px",
              borderRadius: 6,
              marginTop: 22,
            }}
          >
            <p style={styles.meta}>
              A matching hash confirms byte-level consistency
              with the registered PDF. It does not establish
              the correctness of the investigation, blockchain
              ownership, or legal validity.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

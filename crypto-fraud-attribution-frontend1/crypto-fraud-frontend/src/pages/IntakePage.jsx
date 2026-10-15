
import React, { useState } from "react";

const API_URL = "http://127.0.0.1:8000/api/v1/cases";

export default function IntakePage({ onStartTracing }) {
  const [walletAddress, setWalletAddress] = useState("");
  const [chain, setChain] = useState("ETHEREUM");
  const [category, setCategory] = useState("Investment Scam");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (loading) return;

    const wallet = walletAddress.trim();

    if (!wallet) {
      setError("Please enter a wallet address.");
      return;
    }

    if (chain !== "ETHEREUM") {
      setError(
        "Only live Ethereum investigations are available."
      );
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
      setError(
        "Enter a valid Ethereum wallet address."
      );
      return;
    }

    if (typeof onStartTracing !== "function") {
      setError("Case Workspace is not connected.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress: wallet,
          chain,
          category,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Failed to create investigation."
        );
      }

      // Pass the REAL saved case, including its case ID,
      // to the existing App.jsx navigation callback.
      onStartTracing(data);

    } catch (err) {
      setError(
        err.message || "Could not connect to the backend."
      );
    } finally {
      setLoading(false);
    }
  };

  const labelStyle = {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#cbd5e1",
    marginBottom: 9,
  };

  const inputStyle = {
    width: "100%",
    padding: "13px 14px",
    marginBottom: 20,
    background: "#0b1220",
    border: "1px solid #334155",
    borderRadius: 8,
    color: "#f1f5f9",
    fontSize: 13,
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        maxWidth: 1000,
        padding: 20,
        margin: "0 auto",
        color: "#f1f5f9",
      }}
    >
      <h2 style={{ fontSize: 25, fontWeight: 750 }}>
        Cybercrime Complaint Intake
      </h2>

      <p
        style={{
          color: "#94a3b8",
          fontSize: 13,
          marginTop: 10,
          lineHeight: 1.7,
        }}
      >
        Register a reported cryptocurrency wallet,
        save an investigation, and initiate live
        Ethereum transaction analysis.
      </p>

      <div
        style={{
          maxWidth: 780,
          marginTop: 24,
          background: "#111827",
          border: "1px solid #273449",
          borderRadius: 14,
          padding: 26,
        }}
      >
        <h3
          style={{
            fontSize: 17,
            fontWeight: 700,
            marginBottom: 22,
          }}
        >
          New Investigation
        </h3>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>
            Reported Ethereum Wallet Address
          </label>

          <input
            type="text"
            value={walletAddress}
            onChange={(e) => {
              setWalletAddress(e.target.value);
              setError("");
            }}
            placeholder="0x..."
            style={{
              ...inputStyle,
              fontFamily: "monospace",
            }}
          />

          <label style={labelStyle}>
            Blockchain Network
          </label>

          <select
            value={chain}
            onChange={(e) => setChain(e.target.value)}
            style={inputStyle}
          >
            <option value="ETHEREUM">
              Ethereum Mainnet (Live)
            </option>
            <option value="TRON">
              TRON (Not Integrated)
            </option>
            <option value="BITCOIN">
              Bitcoin (Not Integrated)
            </option>
          </select>

          <label style={labelStyle}>
            Crime Category
          </label>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={inputStyle}
          >
            <option value="Investment Scam">
              Investment Scam
            </option>
            <option value="Task-Based Fraud">
              Task-Based Fraud
            </option>
            <option value="Ransomware / Extortion">
              Ransomware / Extortion
            </option>
            <option value="Other Cybercrime">
              Other Cybercrime
            </option>
          </select>

          {error && (
            <div
              style={{
                padding: 13,
                background: "#450a0a",
                color: "#fecaca",
                borderRadius: 8,
                marginBottom: 18,
                fontSize: 12,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              background: "#0891b2",
              color: "white",
              padding: "14px 16px",
              border: "none",
              borderRadius: 8,
              cursor: loading ? "wait" : "pointer",
              opacity: loading ? 0.6 : 1,
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {loading
              ? "Registering Investigation..."
              : "Register Case & Start Tracing →"}
          </button>
        </form>
      </div>

      <p
        style={{
          marginTop: 17,
          color: "#94a3b8",
          fontSize: 11,
          lineHeight: 1.7,
        }}
      >
        Each submission creates a saved case in the
        local investigation database. Ethereum transaction
        analysis is retrieved separately from the blockchain
        API. Wallet reporting alone does not establish
        criminal activity or wallet ownership.
      </p>
    </div>
  );
}

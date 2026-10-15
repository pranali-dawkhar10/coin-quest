
import { useState } from "react";

import ScamCaseForm from "../components/ScamCaseForm";
import FundFlowGraph from "../components/FundFlowGraph";
import { buildFundTrace } from "../utils/traceFunds";

export default function TraceCasePage() {
  const [loading, setLoading] = useState(false);
  const [graph, setGraph] = useState(null);

  async function handleTrace(caseInput) {
    setLoading(true);
    setGraph(null);

    try {
      const response = await fetch("/api/trace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(caseInput)
      });

      if (!response.ok) {
        throw new Error(`Trace API failed: HTTP ${response.status}`);
      }

      // Expected backend response:
      // {
      //   transactions: [{ hash, from, to, amount, timestamp, asset, chain }],
      //   walletLabels: {
      //     "wallet-address": {
      //       type: "vasp",
      //       name: "Exchange name",
      //       confidence: "high"
      //     }
      //   },
      //   walletSignals: {
      //     "wallet-address": {
      //       possibleBurner: true,
      //       reasons: ["Rapid sweep pattern"]
      //     }
      //   }
      // }

      const data = await response.json();

      const result = buildFundTrace({
        ...caseInput,
        transactions: data.transactions || [],
        walletLabels: data.walletLabels || {},
        walletSignals: data.walletSignals || {}
      });

      setGraph(result);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <ScamCaseForm onTrace={handleTrace} loading={loading} />

      {graph && <FundFlowGraph graph={graph} />}
    </main>
  );
}


import { useMemo } from "react";
import "./FundFlowGraph.css";

const NODE_W = 190;
const NODE_H = 74;
const COLUMN_GAP = 310;
const ROW_GAP = 190;

function shortAddress(address = "") {
  if (address.length < 18) return address;
  return `${address.slice(0, 9)}...${address.slice(-6)}`;
}

function amount(value, asset = "") {
  const number = Number(value || 0);

  return `${new Intl.NumberFormat("en", {
    maximumFractionDigits: 6
  }).format(number)} ${asset}`.trim();
}

export default function FundFlowGraph({ graph }) {
  const nodes = graph?.nodes || [];
  const edges = graph?.edges || [];

  const layout = useMemo(() => {
    const walletNodes = nodes.filter(node => node.type !== "vasp");
    const entityNodes = nodes.filter(node => node.type === "vasp");
    const positions = {};
    const walletById = new Map(walletNodes.map(node => [node.id, node]));

    // Place wallets in columns ordered by transaction hop.
    const columns = new Map();

    for (const node of walletNodes) {
      if (!columns.has(node.hop)) columns.set(node.hop, []);
      columns.get(node.hop).push(node);
    }

    for (const [hop, column] of columns.entries()) {
      column.sort((a, b) => a.address.localeCompare(b.address));

      column.forEach((node, index) => {
        positions[node.id] = {
          x: 40 + Number(hop) * COLUMN_GAP,
          y: 55 + index * ROW_GAP
        };
      });
    }

    // Place VASP nodes beneath their associated wallet nodes.
    // The dashed edge indicates attribution, NOT a money transfer.
    const attributionEdges = edges.filter(
      edge => edge.kind === "attribution"
    );

    for (const edge of attributionEdges) {
      if (positions[edge.target]) continue;

      const walletPosition = positions[edge.source];
      if (!walletPosition) continue;

      positions[edge.target] = {
        x: walletPosition.x,
        y: walletPosition.y + 100
      };
    }

    const maxX = Math.max(
      0,
      ...Object.values(positions).map(point => point.x)
    );

    const maxY = Math.max(
      0,
      ...Object.entries(positions).map(([id, point]) => {
        const node = nodes.find(item => item.id === id);
        return point.y + (node?.type === "vasp" ? 56 : NODE_H);
      })
    );

    return {
      positions,
      walletById,
      width: maxX + NODE_W + 80,
      height: maxY + 80
    };
  }, [nodes, edges]);

  if (!nodes.length) {
    return <p>No fund-flow data available yet.</p>;
  }

  function renderNode(node) {
    const point = layout.positions[node.id];
    if (!point) return null;

    const isVasp = node.type === "vasp";
    const cssClass = `flow-node flow-${node.type}`;
    const height = isVasp ? 56 : NODE_H;

    return (
      <g key={node.id} className={cssClass}>
        <title>
          {node.label}
          {node.address ? `\n${node.address}` : ""}
          {node.vaspName ? `\nAttributed to: ${node.vaspName}` : ""}
        </title>

        {node.type === "suspect" ? (
          <polygon
            points={[
              `${point.x + 12},${point.y}`,
              `${point.x + NODE_W - 12},${point.y}`,
              `${point.x + NODE_W},${point.y + height / 2}`,
              `${point.x + NODE_W - 12},${point.y + height}`,
              `${point.x + 12},${point.y + height}`,
              `${point.x},${point.y + height / 2}`
            ].join(" ")}
          />
        ) : node.type === "burner" ? (
          <polygon
            points={[
              `${point.x + 16},${point.y}`,
              `${point.x + NODE_W - 16},${point.y}`,
              `${point.x + NODE_W},${point.y + 14}`,
              `${point.x + NODE_W},${point.y + height - 14}`,
              `${point.x + NODE_W - 16},${point.y + height}`,
              `${point.x + 16},${point.y + height}`,
              `${point.x},${point.y + height - 14}`,
              `${point.x},${point.y + 14}`
            ].join(" ")}
          />
        ) : (
          <rect
            x={point.x}
            y={point.y}
            width={NODE_W}
            height={height}
            rx={isVasp ? 10 : 8}
          />
        )}

        {isVasp ? (
          <>
            <text x={point.x + 10} y={point.y + 17} className="node-kicker">
              VASP / EXCHANGE
            </text>
            <text x={point.x + 10} y={point.y + 34} className="node-title">
              {node.label.slice(0, 24)}
            </text>
            <text x={point.x + 10} y={point.y + 48} className="node-small">
              Confidence: {node.confidence || "unknown"}
            </text>
          </>
        ) : (
          <>
            <text x={point.x + 10} y={point.y + 19} className="node-title">
              {node.label}
            </text>
            <text x={point.x + 10} y={point.y + 37} className="node-address">
              {shortAddress(node.address)}
            </text>
            <text x={point.x + 10} y={point.y + 56} className="node-small">
              Tracked: {amount(node.trackedAmount, node.asset)}
            </text>
            {node.vaspName && (
              <text x={point.x + 10} y={point.y + 68} className="node-small">
                VASP match: {node.vaspName}
              </text>
            )}
          </>
        )}
      </g>
    );
  }

  function renderEdge(edge) {
    const { positions, walletById } = layout;
    const source = positions[edge.source];
    const target = positions[edge.target];

    if (!source || !target) return null;

    if (edge.kind === "attribution") {
      const sourceNode = walletById.get(edge.source);

      if (!sourceNode) return null;

      const x = source.x + NODE_W / 2;
      const startY = source.y + NODE_H;
      const endY = target.y;

      return (
        <g key={edge.id} className="attribution-edge">
          <title>
            Attribution relationship only; not a transaction.
          </title>
          <path d={`M ${x} ${startY} L ${x} ${endY}`} />
        </g>
      );
    }

    const sourceNode = walletById.get(edge.source);
    const targetNode = walletById.get(edge.target);

    if (!sourceNode || !targetNode) return null;

    // Hide backward/cycle edges from the left-to-right tree view.
    // They should still be retained in the underlying trace data.
    if (targetNode.hop <= sourceNode.hop) return null;

    const startX = source.x + NODE_W;
    const startY = source.y + NODE_H / 2;
    const endX = target.x;
    const endY = target.y + NODE_H / 2;
    const controlX = (startX + endX) / 2;
    const labelX = (startX + endX) / 2;
    const labelY = (startY + endY) / 2 - 10;

    return (
      <g key={edge.id} className="transfer-edge">
        <title>
          Transaction: {edge.hash}
          {"\n"}Full transfer: {amount(edge.amount, edge.asset)}
          {"\n"}Estimated scam-linked amount: {
            amount(edge.trackedAmount, edge.asset)
          }
        </title>

        <path
          d={`M ${startX} ${startY} C ${controlX} ${startY}, ${controlX} ${endY}, ${endX} ${endY}`}
          markerEnd="url(#flow-arrow)"
        />

        <text x={labelX} y={labelY} className="edge-label" textAnchor="middle">
          {amount(edge.trackedAmount, edge.asset)}
        </text>

        <text
          x={labelX}
          y={labelY + 14}
          className="edge-sub-label"
          textAnchor="middle"
        >
          of {amount(edge.amount, edge.asset)}
        </text>
      </g>
    );
  }

  return (
    <section className="fund-flow-panel">
      <h2>Scam-linked fund flow</h2>
      <p className="graph-note">
        Arrows represent transfers. Dashed connections represent VASP
        attribution. Burner labels are heuristic flags, not proof of wrongdoing.
      </p>

      <div className="flow-legend">
        <span className="legend-suspect">Suspect wallet</span>
        <span className="legend-burner">Possible burner</span>
        <span className="legend-wallet">Wallet</span>
        <span className="legend-vasp">VASP / Exchange</span>
      </div>

      <div className="flow-canvas">
        <svg
          width={layout.width}
          height={layout.height}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          role="img"
          aria-label="Left-to-right cryptocurrency fund trace"
        >
          <defs>
            <marker
              id="flow-arrow"
              markerWidth="9"
              markerHeight="9"
              refX="7"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L0,6 L8,3 z" fill="#60a5fa" />
            </marker>
          </defs>

          {edges.map(renderEdge)}
          {nodes.map(renderNode)}
        </svg>
      </div>

      <div className="trace-summary">
        <div>
          <span>Reported scam amount</span>
          <strong>
            {amount(graph.stats?.reportedAmount, graph.stats?.asset)}
          </strong>
        </div>
        <div>
          <span>Reached labeled VASP</span>
          <strong>
            {amount(graph.stats?.amountReachedVasp, graph.stats?.asset)}
          </strong>
        </div>
        <div>
          <span>Not yet attributed to VASP</span>
          <strong>
            {amount(graph.stats?.amountNotYetAttributed, graph.stats?.asset)}
          </strong>
        </div>
      </div>

      {graph.warnings?.length > 0 && (
        <div className="trace-warnings">
          <strong>Investigator notes</strong>
          {graph.warnings.map((warning, index) => (
            <p key={index}>{warning}</p>
          ))}
        </div>
      )}
    </section>
  );
}

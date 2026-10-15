export const transformGraphData = (rawNodes, rawEdges) => {
  return {
    nodes: rawNodes.map(n => ({
      id: n.id,
      label: n.label || n.id,
      shape: 'dot',
      size: n.isVasp ? 25 : 15,
      color: n.isVasp ? '#f59e0b' : '#3b82f6'
    })),
    edges: rawEdges.map(e => ({
      from: e.from,
      to: e.to,
      label: `${e.amount} ETH`,
      arrows: 'to'
    }))
  };
};
import logging
from typing import Dict, List, Set, Tuple
import networkx as nx

from app.schemas.trace import GraphTraceResult, TransactionEdge, WalletNode
from app.services.indexer.base import BaseChainIndexer
from app.services.tracing.pattern_detector import ObfuscationPatternDetector

logger = logging.getLogger(__name__)


class MultiChainGraphTracingEngine:
    """
    Executes automated Breadth-First Search (BFS) graph traversal 
    across multi-chain ecosystems to map fund flows up to N hops.
    """

    def __init__(
        self,
        indexers: Dict[str, BaseChainIndexer],
        max_hops: int = 3,
        min_tx_amount: float = 1.0,
    ):
        self.indexers = indexers
        self.max_hops = max_hops
        self.min_tx_amount = min_tx_amount

    async def trace_wallet(self, start_address: str, chain: str) -> GraphTraceResult:
        chain_key = chain.upper()
        indexer = self.indexers.get(chain_key)

        if not indexer:
            raise ValueError(f"No indexer configured for blockchain: {chain}")

        nx_graph = nx.DiGraph()
        visited_addresses: Set[str] = set()
        queue: List[Tuple[str, int]] = [(start_address, 0)]

        nodes_dict: Dict[str, WalletNode] = {
            start_address: WalletNode(
                address=start_address, chain=chain_key, hop_level=0
            )
        }
        edges_list: List[TransactionEdge] = []

        while queue:
            current_addr, current_hop = queue.pop(0)

            if current_addr in visited_addresses or current_hop >= self.max_hops:
                continue

            visited_addresses.add(current_addr)

            try:
                raw_txs = await indexer.get_outgoing_transactions(current_addr)
            except Exception as e:
                logger.error(
                    f"Failed fetching transactions for {current_addr} on {chain_key}: {e}"
                )
                continue

            current_node_outgoing: List[TransactionEdge] = []

            for raw in raw_txs:
                amount = float(raw.get("amount", 0.0))
                if amount < self.min_tx_amount:
                    continue

                dest_addr = raw["to_address"]
                tx_edge = TransactionEdge(
                    tx_hash=raw["tx_hash"],
                    from_address=current_addr,
                    to_address=dest_addr,
                    amount=amount,
                    asset=raw.get("asset", "USDT"),
                    timestamp=raw.get("timestamp", 0),
                    chain=chain_key,
                    hop_level=current_hop + 1,
                )

                edges_list.append(tx_edge)
                current_node_outgoing.append(tx_edge)

                nodes_dict[current_addr].total_outflow += amount

                if dest_addr not in nodes_dict:
                    nodes_dict[dest_addr] = WalletNode(
                        address=dest_addr, chain=chain_key, hop_level=current_hop + 1
                    )
                nodes_dict[dest_addr].total_inflow += amount

                nx_graph.add_edge(
                    current_addr, dest_addr, weight=amount, tx_hash=tx_edge.tx_hash
                )

                if (current_hop + 1) < self.max_hops and dest_addr not in visited_addresses:
                    queue.append((dest_addr, current_hop + 1))

            if ObfuscationPatternDetector.is_peel_chain(current_node_outgoing):
                nodes_dict[current_addr].is_peel_chain = True

            if ObfuscationPatternDetector.is_fan_out(current_node_outgoing):
                nodes_dict[current_addr].is_fan_out = True

        return GraphTraceResult(
            root_address=start_address,
            chain=chain_key,
            max_hops_requested=self.max_hops,
            total_nodes=len(nodes_dict),
            total_edges=len(edges_list),
            nodes=list(nodes_dict.values()),
            edges=edges_list,
        )
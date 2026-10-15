import asyncio
import logging
import sys
from pathlib import Path

# Add backend directory to Python path
sys.path.append(str(Path(__file__).parent.parent))

from app.services.indexer.tron import TronGridIndexer
from app.services.tracing.graph_builder import MultiChainGraphTracingEngine
from app.services.attribution.attribution_service import VaspAttributionService
from app.schemas.vasp import ConfidenceLevel

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")


async def test_tracing_engine():
    print("\n==================================================")
    print("TEST 1: Multi-Chain Graph Tracing Engine")
    print("==================================================")

    # Initialize Indexers & Tracing Engine
    indexers = {"TRON": TronGridIndexer()}
    engine = MultiChainGraphTracingEngine(indexers=indexers, max_hops=3)

    suspect_address = "T_suspect_wallet_9988"
    print(f"[*] Ingesting Suspect Address: {suspect_address} (Chain: TRON, Max Hops: 3)")

    result = await engine.trace_wallet(start_address=suspect_address, chain="TRON")

    # Verification Checks
    assert result.total_nodes > 0, "FAILED: No nodes generated in trace graph"
    assert result.total_edges > 0, "FAILED: No transaction edges generated"
    assert result.root_address == suspect_address, "FAILED: Root address mismatch"

    print(f"[SUCCESS] Tracing Complete!")
    print(f" -> Total Discovered Nodes: {result.total_nodes}")
    print(f" -> Total Transaction Edges: {result.total_edges}")

    peel_nodes = [n for n in result.nodes if n.is_peel_chain]
    print(f" -> Peel Chains Identified: {len(peel_nodes)}")

    for node in result.nodes:
        print(f"    - Address: {node.address} | Hop: {node.hop_level} | Inflow: ${node.total_inflow} | Outflow: ${node.total_outflow}")

    return result


async def test_vasp_attribution():
    print("\n==================================================")
    print("TEST 2: Instant VASP & Exchange Attribution System")
    print("==================================================")

    attribution_service = VaspAttributionService()

    # Scenario A: Known Seed Address Match
    known_address = "0x_suspect_layer_1a_cex_deposit"
    print(f"[*] Scenario A: Testing Exact Address Match for {known_address}")
    res_a = attribution_service.attribute_address(address=known_address, chain="TRON")

    assert res_a.is_attributed == True, "FAILED: Expected direct match attribution"
    assert res_a.confidence == ConfidenceLevel.HIGH, "FAILED: Expected HIGH confidence"
    print(f"[SUCCESS] Direct Match Found!")
    print(f" -> VASP Name: {res_a.vasp.name}")
    print(f" -> Category: {res_a.vasp.category}")
    print(f" -> Confidence: {res_a.confidence} ({res_a.confidence_score}%)")

    # Scenario B: Unlabeled Wallet Sweep Heuristics
    unlabeled_address = "T_unlabeled_sweep_deposit_7711"
    print(f"\n[*] Scenario B: Testing Heuristic Clustering on Unlabeled Sweep Node {unlabeled_address}")
    res_b = attribution_service.attribute_address(
        address=unlabeled_address,
        chain="TRON",
        in_degree=15,
        out_degree=1,
        total_inflow=10000.0,
        total_outflow=9990.0,  # >99% sweep
        has_immediate_sweep=True
    )

    assert res_b.is_attributed == True, "FAILED: Heuristic sweep pattern was not detected"
    assert res_b.confidence == ConfidenceLevel.MEDIUM, "FAILED: Expected MEDIUM confidence"
    print(f"[SUCCESS] Heuristic Sweep Cluster Identified!")
    print(f" -> Identified Pattern: {res_b.matched_via}")
    print(f" -> Reasoning: {res_b.reasoning}")
    print(f" -> Confidence: {res_b.confidence} ({res_b.confidence_score}%)")


async def run_all_tests():
    try:
        await test_tracing_engine()
        await test_vasp_attribution()
        print("\n==================================================")
        print("ALL TESTS PASSED SUCCESSFULLY! BOTH FEATURES WORK PROPERLY.")
        print("==================================================\n")
    except AssertionError as e:
        print(f"\n[X] TEST FAILED: {str(e)}\n")
    except Exception as e:
        print(f"\n[X] UNEXPECTED ERROR: {str(e)}\n")


if __name__ == "__main__":
    asyncio.run(run_all_tests())
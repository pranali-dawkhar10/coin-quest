from app.schemas.vasp import AttributionResult, ConfidenceLevel
from app.services.attribution.lookup import DirectVaspLookup
from app.services.attribution.clustering import HeuristicVaspClusterer


class VaspAttributionService:
    """Unified service combining direct address matching and heuristic clustering."""

    def __init__(self):
        self.direct_lookup = DirectVaspLookup()
        self.heuristic_clusterer = HeuristicVaspClusterer()

    def attribute_address(
        self,
        address: str,
        chain: str,
        in_degree: int = 1,
        out_degree: int = 1,
        total_inflow: float = 0.0,
        total_outflow: float = 0.0,
        has_immediate_sweep: bool = True,
    ) -> AttributionResult:
        
        # Step 1: Direct Tag Matching
        direct_match = self.direct_lookup.lookup(address, chain)
        if direct_match:
            return AttributionResult(
                wallet_address=address,
                chain=chain.upper(),
                is_attributed=True,
                confidence=ConfidenceLevel.HIGH,
                confidence_score=100.0,
                matched_via="DIRECT_LABEL_MATCH",
                vasp=direct_match,
                reasoning=f"Exact match found in master VASP database for {direct_match.name}."
            )

        # Step 2: Fallback to Heuristic Clustering for Unlabeled Nodes
        cluster_result = self.heuristic_clusterer.evaluate_unlabeled_wallet(
            address=address,
            chain=chain,
            in_degree=in_degree,
            out_degree=out_degree,
            total_inflow=total_inflow,
            total_outflow=total_outflow,
            has_immediate_sweep=has_immediate_sweep
        )

        return AttributionResult(
            wallet_address=address,
            chain=chain.upper(),
            is_attributed=cluster_result["is_attributed"],
            confidence=cluster_result["confidence"],
            confidence_score=cluster_result["confidence_score"],
            matched_via=cluster_result["matched_via"],
            vasp=cluster_result["vasp"],
            reasoning=cluster_result["reasoning"]
        )
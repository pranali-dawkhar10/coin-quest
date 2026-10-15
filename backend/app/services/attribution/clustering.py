from typing import Dict, Any
from app.schemas.vasp import ConfidenceLevel, VaspCategory, VaspInfo


class HeuristicVaspClusterer:
    """
    Applies behavioral heuristics to classify unlabeled cash-out nodes as 
    Exchange Deposit Wallets based on deposit-sweep patterns and node connectivity.
    """

    @staticmethod
    def evaluate_unlabeled_wallet(
        address: str,
        chain: str,
        in_degree: int,
        out_degree: int,
        total_inflow: float,
        total_outflow: float,
        has_immediate_sweep: bool = False,
    ) -> Dict[str, Any]:
        """
        Calculates likelihood that an unlabeled wallet is an Exchange Deposit Wallet:
        - Rule 1: Sweeps ~100% of received funds to a central omnibus wallet within minutes.
        - Rule 2: High in-degree with low out-degree (Fan-In behavior).
        """
        score = 0.0
        reasoning_steps = []

        # Rule 1: Sweeping behavior (Standard CEX deposit architecture)
        if total_inflow > 0 and total_outflow > 0:
            sweep_ratio = total_outflow / total_inflow
            if 0.95 <= sweep_ratio <= 1.05 and has_immediate_sweep:
                score += 55.0
                reasoning_steps.append("Automated deposit-sweep pattern detected (>95% funds swept out immediately)")

        # Rule 2: High In-Degree Fan-In
        if in_degree >= 10 and out_degree <= 2:
            score += 30.0
            reasoning_steps.append(f"High-density deposit aggregation node (In-Degree: {in_degree}, Out-Degree: {out_degree})")

        # Threshold evaluation
        if score >= 75.0:
            predicted_vasp = VaspInfo(
                vasp_id="VASP_UNLABELED_CEX",
                name="Probable Centralized Exchange (Unidentified CEX)",
                category=VaspCategory.CEX,
                jurisdiction="Unknown / Pending Legal Notice",
                compliance_email=None
            )
            return {
                "is_attributed": True,
                "confidence": ConfidenceLevel.MEDIUM,
                "confidence_score": score,
                "matched_via": "HEURISTIC_SWEEP_SWEEP",
                "vasp": predicted_vasp,
                "reasoning": "; ".join(reasoning_steps)
            }

        return {
            "is_attributed": False,
            "confidence": ConfidenceLevel.UNKNOWN,
            "confidence_score": score,
            "matched_via": "NONE",
            "vasp": None,
            "reasoning": "Insufficent exchange deposit behavioral signals detected."
        }
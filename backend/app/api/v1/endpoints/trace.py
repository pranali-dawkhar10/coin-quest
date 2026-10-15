
import asyncio
import os
import re
from collections import deque
from decimal import Decimal, InvalidOperation

import httpx
from fastapi import APIRouter, HTTPException, Query

from app.schemas.trace import (
    GraphFilterParams,
    FundFlowGraphResponse,
)

router = APIRouter()

ETHERSCAN_URL = "https://api.etherscan.io/v2/api"

ADDRESS_RE = re.compile(r"^0x[a-fA-F0-9]{40}$")

# Conservative exploration limits
MAX_EXPANDED_WALLETS = 6
MAX_TRANSACTIONS_PER_QUERY = 20
MAX_GRAPH_EDGES = 80

# A delay between API calls helps reduce rate-limit errors.
REQUEST_DELAY_SECONDS = 0.5


def normalize_address(address):
    return address.strip().lower()


def valid_address(address):
    return bool(ADDRESS_RE.fullmatch(address))


def token_amount(value, decimals):
    try:
        precision = int(decimals)
        if precision < 0 or precision > 36:
            raise ValueError("Unsupported token precision")
        return Decimal(str(value)) / (Decimal(10) ** precision)
    except (ValueError, TypeError, InvalidOperation):
        raise HTTPException(
            status_code=502,
            detail="Invalid transaction amount from provider",
        )


def decimal_string(value):
    result = format(value, "f")
    if "." in result:
        result = result.rstrip("0").rstrip(".")
    return result or "0"

async def etherscan_request(client, key, action, address):
    await asyncio.sleep(REQUEST_DELAY_SECONDS)

    params = {
        "chainid": "1",
        "module": "account",
        "action": action,
        "address": address,
        "startblock": 0,
        "endblock": 99999999,
        "page": 1,
        "offset": MAX_TRANSACTIONS_PER_QUERY,
        "sort": "desc",
        "apikey": key,
    }

    try:
        response = await client.get(
            ETHERSCAN_URL,
            params=params,
        )
        response.raise_for_status()
        data = response.json()

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Etherscan request timed out",
        )

    except (httpx.HTTPError, ValueError):
        raise HTTPException(
            status_code=502,
            detail="Unable to contact Etherscan",
        )

    if not isinstance(data, dict):
        raise HTTPException(
            status_code=502,
            detail="Unexpected Etherscan response",
        )

    result = data.get("result")
    status = str(data.get("status", "0"))

    if status == "1" and isinstance(result, list):
        return result

    message = str(result or data.get("message", ""))

    if (
        isinstance(result, list)
        and len(result) == 0
    ):
        return []

    if "No transactions found" in message:
        return []

    lowered = message.lower()

    if "rate limit" in lowered or "max calls" in lowered:
        raise HTTPException(
            status_code=429,
            detail="Etherscan rate limit reached. Try again shortly.",
        )

    if "invalid api key" in lowered or "missing/invalid api key" in lowered:
        raise HTTPException(
            status_code=502,
            detail="Invalid Etherscan API key configured on backend",
        )

    raise HTTPException(
        status_code=502,
        detail=f"Etherscan API error: {message[:200]}",
    )


def extract_native_transactions(records):
    transfers = []

    for tx in records:
        if str(tx.get("isError", "0")) != "0":
            continue

        source = normalize_address(tx.get("from", ""))
        target = normalize_address(tx.get("to", ""))

        if not valid_address(source) or not valid_address(target):
            continue

        amount = token_amount(tx.get("value", "0"), 18)

        if amount <= 0:
            continue

        transfers.append({
            "from_address": source,
            "to_address": target,
            "amount": decimal_string(amount),
            "amount_usd": None,
            "token": "ETH",
            "tx_hash": tx.get("hash", ""),
            "timestamp": int(tx.get("timeStamp", 0)),
            "block_number": int(tx.get("blockNumber", 0)),
            "token_contract": None,
        })

    return transfers


def extract_erc20_transactions(records):
    transfers = []

    for tx in records:
        source = normalize_address(tx.get("from", ""))
        target = normalize_address(tx.get("to", ""))

        if not valid_address(source) or not valid_address(target):
            continue

        amount = token_amount(
            tx.get("value", "0"),
            tx.get("tokenDecimal", "18"),
        )

        if amount <= 0:
            continue

        contract = normalize_address(
            tx.get("contractAddress", "")
        )

        symbol = str(
            tx.get("tokenSymbol") or "ERC20"
        )[:32]

        transfers.append({
            "from_address": source,
            "to_address": target,
            "amount": decimal_string(amount),
            "amount_usd": None,
            "token": symbol,
            "tx_hash": tx.get("hash", ""),
            "timestamp": int(tx.get("timeStamp", 0)),
            "block_number": int(tx.get("blockNumber", 0)),
            "token_contract": (
                contract if valid_address(contract) else None
            ),
        })

    return transfers


def filter_transfer(tx, params, selected_tokens):
    if selected_tokens:
        if tx["token"].upper() not in selected_tokens:
            return False

    if (
        params.start_timestamp is not None
        and tx["timestamp"] < params.start_timestamp
    ):
        return False

    if (
        params.end_timestamp is not None
        and tx["timestamp"] > params.end_timestamp
    ):
        return False

    return True


async def build_live_graph(params):
    api_key = os.getenv("ETHERSCAN_API_KEY", "").strip()

    if not api_key:
        raise HTTPException(
            status_code=503,
            detail=(
                "ETHERSCAN_API_KEY is not configured. "
                "Set it in the backend terminal and restart."
            ),
        )

    if params.chain.upper() != "ETHEREUM":
        raise HTTPException(
            status_code=400,
            detail=(
                "Live tracing currently supports Ethereum mainnet only."
            ),
        )

    if (params.min_amount_usd or 0) > 0:
        raise HTTPException(
            status_code=400,
            detail=(
                "USD filtering is unavailable without "
                "a verified historical pricing service."
            ),
        )

    root = normalize_address(params.wallet_address)

    if not valid_address(root):
        raise HTTPException(
            status_code=422,
            detail="Enter a valid 42-character Ethereum address",
        )

    selected_tokens = {
        token.upper()
        for token in (params.tokens or [])
        if token.upper() != "ALL"
    }

    nodes = {
        root: {
            "id": root,
            "address": root,
            "label": "Reported wallet",
            "hop": 0,
            "is_suspect": True,
            "is_vasp": False,
            "risk_score": 0,
        }
    }

    edges = []
    seen_events = set()
    expanded = set()

    queue = deque([(root, 0)])

    async with httpx.AsyncClient(timeout=20.0) as client:
        while (
            queue
            and len(expanded) < MAX_EXPANDED_WALLETS
            and len(edges) < MAX_GRAPH_EDGES
        ):
            address, hop = queue.popleft()

            if address in expanded:
                continue

            if hop >= params.max_hops:
                continue

            expanded.add(address)

            native_records = await etherscan_request(
                client, api_key, "txlist", address
            )

            token_records = await etherscan_request(
                client, api_key, "tokentx", address
            )

            transfers = (
                extract_native_transactions(native_records)
                + extract_erc20_transactions(token_records)
            )

            # Explore newer transfers first.
            transfers.sort(
                key=lambda item: item["timestamp"],
                reverse=True,
            )

            for tx in transfers:
                if not filter_transfer(
                    tx, params, selected_tokens
                ):
                    continue

                # Follow outbound transfers only.
                if tx["from_address"] != address:
                    continue

                target = tx["to_address"]

                # A token transfer is distinct from a
                # native transfer in the same transaction.
                event_key = (
                    tx["tx_hash"],
                    tx["from_address"],
                    tx["to_address"],
                    tx["token_contract"],
                    tx["amount"],
                )

                if event_key in seen_events:
                    continue

                seen_events.add(event_key)

                if target not in nodes:
                    nodes[target] = {
                        "id": target,
                        "address": target,
                        "label": (
                            target[:8] + "..." + target[-6:]
                        ),
                        "hop": hop + 1,
                        "is_suspect": False,
                        "is_vasp": False,
                        "risk_score": 0,
                    }

                edges.append(tx)

                if (
                    hop + 1 < params.max_hops
                    and target not in expanded
                    and len(expanded) + len(queue)
                    < MAX_EXPANDED_WALLETS
                ):
                    queue.append((target, hop + 1))

                if len(edges) >= MAX_GRAPH_EDGES:
                    break

    # The values are summed per asset, not converted to USD.
    breakdown = {}

    for edge in edges:
        token = edge["token"]
        breakdown[token] = (
            breakdown.get(token, 0.0)
            + float(edge["amount"])
        )

    return {
        "nodes": list(nodes.values()),
        "edges": edges,
        "token_breakdown": breakdown,
        "filtered_tx_count": len(edges),
        "source": "Etherscan V2 - Ethereum mainnet",
        "is_live": True,
        "truncated": True,
        "notice": (
            "Verified on-chain transfer records from a limited "
            "recent sample. Graph is incomplete, not proof of "
            "fund provenance, ownership, fraud, or VASP identity. "
            "Contract/internal ETH movements are not fully covered."
        ),
    }


@router.post(
    "/graph",
    response_model=FundFlowGraphResponse,
)
async def get_fund_flow_graph(params: GraphFilterParams):
    return await build_live_graph(params)


@router.post("/")
async def trace_wallet(
    wallet_address: str = Query(...),
    chain: str = Query("ETHEREUM"),
    max_hops: int = Query(3, ge=1, le=4),
):
    """Legacy tracing route, now using live graph data."""
    result = await build_live_graph(
        GraphFilterParams(
            wallet_address=wallet_address,
            chain=chain,
            max_hops=max_hops,
        )
    )

    return {
        "status": "live_limited",
        "wallet_address": wallet_address,
        "chain": chain,
        "max_hops": max_hops,
        "trace_data": result,
    }


import asyncio
import os
import re
from collections import defaultdict, deque
from decimal import Decimal

import httpx
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

load_dotenv()

router = APIRouter()

API_URL = "https://api.etherscan.io/v2/api"
USDT_CONTRACT = "0xdac17f958d2ee523a2206206994597c13d831ec7"
ADDRESS_PATTERN = re.compile(r"^0x[a-fA-F0-9]{40}$")

MAX_WALLETS = 5
MAX_EDGES = 100
PAGE_SIZE = 100


class GraphRequest(BaseModel):
    wallet_address: str
    chain: str = "ETHEREUM"
    max_hops: int = Field(1, ge=1, le=3)
    tokens: list[str] = Field(
        default_factory=lambda: ["ETH", "USDT"]
    )


async def fetch_transactions(
    client,
    api_key,
    wallet,
    action,
):
    params = {
        "chainid": "1",
        "module": "account",
        "action": action,
        "address": wallet,
        "startblock": 0,
        "endblock": 99999999,
        "page": 1,
        "offset": PAGE_SIZE,
        "sort": "desc",
        "apikey": api_key,
    }

    if action == "tokentx":
        params["contractaddress"] = USDT_CONTRACT

    try:
        response = await client.get(
            API_URL,
            params=params,
        )
        response.raise_for_status()
        data = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(
            502,
            f"Etherscan request failed: {exc}",
        ) from exc

    if data.get("status") == "1":
        result = data.get("result", [])

        if isinstance(result, list):
            return result

        raise HTTPException(
            502,
            "Invalid transaction response from Etherscan.",
        )

    message = str(
        data.get("result") or data.get("message") or ""
    )

    if "No transactions found" in message:
        return []

    if "rate limit" in message.lower():
        raise HTTPException(429, message)

    raise HTTPException(
        502,
        f"Etherscan error: {message}",
    )


def parse_transaction(row, action):
    source = str(row.get("from") or "").lower()
    destination = str(row.get("to") or "").lower()

    if (
        not ADDRESS_PATTERN.fullmatch(source)
        or not ADDRESS_PATTERN.fullmatch(destination)
    ):
        return None

    if source == destination:
        return None

    if action == "txlist":
        if str(row.get("isError", "0")) != "0":
            return None

        if str(row.get("txreceipt_status", "1")) == "0":
            return None

        token = "ETH"
        decimals = 18
    else:
        contract = str(
            row.get("contractAddress") or ""
        ).lower()

        if contract != USDT_CONTRACT:
            return None

        token = "USDT"
        decimals = 6

    try:
        amount = Decimal(
            int(row.get("value") or 0)
        ) / Decimal(10 ** decimals)

        timestamp = int(row.get("timeStamp") or 0)
        block = int(row.get("blockNumber") or 0)

    except (ValueError, TypeError, ArithmeticError):
        return None

    if amount <= 0:
        return None

    tx_hash = str(row.get("hash") or "")

    if not re.fullmatch(
        r"0x[a-fA-F0-9]{64}", tx_hash
    ):
        return None

    return {
        "from_address": source,
        "to_address": destination,
        "amount_token": format(amount, "f"),
        "amount_usd": 0.0,
        "token": token,
        "tx_hash": tx_hash,
        "timestamp": timestamp,
        "block_number": block,
    }


@router.post("/ethereum/live")
async def get_live_graph(request: GraphRequest):
    if request.chain.upper() != "ETHEREUM":
        raise HTTPException(
            400,
            "Only Ethereum mainnet is supported.",
        )

    wallet = request.wallet_address.strip().lower()

    if not ADDRESS_PATTERN.fullmatch(wallet):
        raise HTTPException(
            422,
            "Invalid Ethereum address.",
        )

    api_key = os.getenv(
        "ETHERSCAN_API_KEY", ""
    ).strip()

    if not api_key:
        raise HTTPException(
            503,
            "ETHERSCAN_API_KEY missing from backend/.env",
        )

    selected_tokens = {
        token.upper()
        for token in request.tokens
    } & {"ETH", "USDT"}

    if not selected_tokens:
        raise HTTPException(
            422,
            "Select ETH or USDT.",
        )

    queue = deque([wallet])
    depths = {wallet: 0}
    scanned = set()
    transfers = []
    seen = set()

    actions = []

    if "ETH" in selected_tokens:
        actions.append("txlist")

    if "USDT" in selected_tokens:
        actions.append("tokentx")

    async with httpx.AsyncClient(
        timeout=25.0
    ) as client:

        while (
            queue
            and len(scanned) < MAX_WALLETS
            and len(transfers) < MAX_EDGES
        ):
            current = queue.popleft()
            depth = depths[current]

            if current in scanned:
                continue

            if depth >= request.max_hops:
                continue

            scanned.add(current)
            records = []

            for action in actions:
                rows = await fetch_transactions(
                    client,
                    api_key,
                    current,
                    action,
                )

                for row in rows:
                    tx = parse_transaction(row, action)

                    if tx:
                        records.append(tx)

                await asyncio.sleep(0.5)

            records.sort(
                key=lambda tx: tx["timestamp"],
                reverse=True,
            )

            neighbors = []

            for tx in records:
                if len(transfers) >= MAX_EDGES:
                    break

                source = tx["from_address"]
                destination = tx["to_address"]

                # Include BOTH incoming and outgoing.
                if source == current:
                    neighbor = destination
                elif destination == current:
                    neighbor = source
                else:
                    continue

                if neighbor not in depths:
                    depths[neighbor] = depth + 1

                key = (
                    tx["tx_hash"],
                    source,
                    destination,
                    tx["token"],
                    tx["amount_token"],
                )

                if key in seen:
                    continue

                seen.add(key)
                transfers.append(tx)

                if neighbor not in neighbors:
                    neighbors.append(neighbor)

            # Expand at most two neighboring wallets.
            # This explores graph connections;
            # it does not prove onward fund movement.
            if depth + 1 < request.max_hops:
                for neighbor in neighbors[:2]:
                    if (
                        neighbor not in scanned
                        and neighbor not in queue
                    ):
                        queue.append(neighbor)

    visible = {wallet}

    for tx in transfers:
        visible.add(tx["from_address"])
        visible.add(tx["to_address"])

    nodes = []

    for address in sorted(visible):
        nodes.append({
            "id": address,
            "address": address,
            "label": (
                "Input Wallet"
                if address == wallet
                else f"{address[:8]}...{address[-5:]}"
            ),
            "hop": depths.get(address, 0),
            "is_suspect": address == wallet,
            "is_vasp": False,
            "vasp_name": None,
            "risk_score": 0,
        })

    breakdown = defaultdict(Decimal)

    for tx in transfers:
        breakdown[tx["token"]] += Decimal(
            tx["amount_token"]
        )

    print(
        f"[ETHEREUM] Wallet: {wallet} | "
        f"Scanned: {len(scanned)} | "
        f"Nodes: {len(nodes)} | "
        f"Edges: {len(transfers)}"
    )

    return {
        "nodes": nodes,
        "edges": transfers,
        "token_breakdown": {
            token: format(total, "f")
            for token, total in breakdown.items()
        },
        "filtered_tx_count": len(transfers),
        "data_mode": "live_sample",
        "source": "Etherscan V2 - Ethereum mainnet",
        "scanned_wallets": len(scanned),
        "warnings": [
            "Real on-chain transfers; latest 100 records per type sampled.",
            "Both incoming and outgoing transfers are displayed.",
            "Hop traversal represents wallet connections, not proven fund provenance.",
            "Internal ETH transfers are not included.",
            "Maximum five wallets scanned and 100 edges displayed.",
            "No exchange attribution or fraud scoring is verified.",
            "Amounts are token quantities, not USD prices.",
        ],
    }

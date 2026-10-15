
import re
import sqlite3
import uuid

from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field


router = APIRouter()

BASE_DIR = Path(__file__).resolve().parent
DATABASE = BASE_DIR / "coinquest_cases.db"

ETHEREUM_REGEX = re.compile(r"^0x[a-fA-F0-9]{40}$")


# ============================================================
# DATABASE
# ============================================================

def get_db():
    connection = sqlite3.connect(
        DATABASE,
        timeout=15,
    )
    connection.row_factory = sqlite3.Row

    connection.execute("""
        CREATE TABLE IF NOT EXISTS investigations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            case_id TEXT NOT NULL UNIQUE,
            wallet_address TEXT NOT NULL,
            chain TEXT NOT NULL,
            category TEXT NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    connection.commit()
    return connection


def as_dict(row):
    return {
        "caseId": row["case_id"],
        "walletAddress": row["wallet_address"],
        "chain": row["chain"],
        "category": row["category"],
        "status": row["status"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


# ============================================================
# SCHEMAS
# ============================================================

class CreateCaseRequest(BaseModel):
    walletAddress: str
    chain: str = "ETHEREUM"
    category: str = Field(
        default="Other Cybercrime",
        max_length=100,
    )


class UpdateCaseRequest(BaseModel):
    status: Literal[
        "ACTIVE",
        "UNDER_REVIEW",
        "CLOSED",
    ]


# ============================================================
# CREATE INVESTIGATION
# POST /api/v1/cases
# ============================================================

@router.post("", status_code=201)
def create_case(request: CreateCaseRequest):
    wallet = request.walletAddress.strip()
    chain = request.chain.strip().upper()
    category = request.category.strip()

    if chain != "ETHEREUM":
        raise HTTPException(
            status_code=400,
            detail="Only live Ethereum investigations are supported.",
        )

    if not ETHEREUM_REGEX.fullmatch(wallet):
        raise HTTPException(
            status_code=422,
            detail="Invalid Ethereum wallet address.",
        )

    if not category:
        raise HTTPException(
            status_code=422,
            detail="Crime category is required.",
        )

    case_id = "CASE-" + (
        datetime.now(timezone.utc).strftime("%Y%m%d")
    ) + "-" + uuid.uuid4().hex[:8].upper()

    now = datetime.now(timezone.utc).isoformat()

    with get_db() as db:
        db.execute(
            """
            INSERT INTO investigations (
                case_id,
                wallet_address,
                chain,
                category,
                status,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                case_id,
                wallet,
                chain,
                category,
                "ACTIVE",
                now,
                now,
            ),
        )

        db.commit()

    return {
        "caseId": case_id,
        "walletAddress": wallet,
        "chain": chain,
        "category": category,
        "status": "ACTIVE",
        "createdAt": now,
        "updatedAt": now,
    }


# ============================================================
# LIST INVESTIGATIONS
# GET /api/v1/cases
# ============================================================

@router.get("")
def list_cases():
    with get_db() as db:
        rows = db.execute(
            """
            SELECT *
            FROM investigations
            ORDER BY created_at DESC, id DESC
            """
        ).fetchall()

    cases = [as_dict(row) for row in rows]

    return {
        "total": len(cases),
        "cases": cases,
    }


# ============================================================
# DASHBOARD STATISTICS
# GET /api/v1/cases/stats
# ============================================================

@router.get("/stats")
def case_statistics():
    with get_db() as db:
        total = db.execute(
            "SELECT COUNT(*) FROM investigations"
        ).fetchone()[0]

        active = db.execute(
            """
            SELECT COUNT(*)
            FROM investigations
            WHERE status = 'ACTIVE'
            """
        ).fetchone()[0]

        under_review = db.execute(
            """
            SELECT COUNT(*)
            FROM investigations
            WHERE status = 'UNDER_REVIEW'
            """
        ).fetchone()[0]

        closed = db.execute(
            """
            SELECT COUNT(*)
            FROM investigations
            WHERE status = 'CLOSED'
            """
        ).fetchone()[0]

        unique_wallets = db.execute(
            """
            SELECT COUNT(DISTINCT LOWER(wallet_address))
            FROM investigations
            """
        ).fetchone()[0]

    return {
        "totalInvestigations": total,
        "activeCases": active,
        "underReview": under_review,
        "closedCases": closed,
        "uniqueWallets": unique_wallets,
    }


# ============================================================
# VIEW ONE INVESTIGATION
# GET /api/v1/cases/{case_id}
# ============================================================

@router.get("/{case_id}")
def get_case(case_id: str):
    with get_db() as db:
        row = db.execute(
            """
            SELECT *
            FROM investigations
            WHERE case_id = ?
            """,
            (case_id,),
        ).fetchone()

    if not row:
        raise HTTPException(
            status_code=404,
            detail="Investigation not found.",
        )

    return as_dict(row)


# ============================================================
# UPDATE INVESTIGATION STATUS
# PATCH /api/v1/cases/{case_id}
# ============================================================

@router.patch("/{case_id}")
def update_case(
    case_id: str,
    request: UpdateCaseRequest,
):
    now = datetime.now(timezone.utc).isoformat()

    with get_db() as db:
        cursor = db.execute(
            """
            UPDATE investigations
            SET status = ?, updated_at = ?
            WHERE case_id = ?
            """,
            (
                request.status,
                now,
                case_id,
            ),
        )

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=404,
                detail="Investigation not found.",
            )

        db.commit()

    return get_case(case_id)

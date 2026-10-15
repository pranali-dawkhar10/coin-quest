
import hashlib
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

# ============================================================
# COINQUEST - REPORT INTEGRITY VALIDATOR
# ============================================================

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "coinquest_reports.db"

MAX_FILE_SIZE = 15 * 1024 * 1024  # 15 MB


# ============================================================
# DATABASE CONNECTION
# ============================================================

def connect_db():
    conn = sqlite3.connect(DB_PATH, timeout=15)
    conn.row_factory = sqlite3.Row

    conn.execute("""
        CREATE TABLE IF NOT EXISTS registered_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            case_id TEXT NOT NULL,
            pdf_sha256 TEXT NOT NULL UNIQUE,
            generated_at TEXT NOT NULL
        )
    """)

    conn.commit()
    return conn


# ============================================================
# REGISTER A GENERATED REPORT
# Called by report_api.py after generating a PDF.
# ============================================================

def register_report(case_id: str, pdf_bytes: bytes):
    """
    Calculate and register the SHA-256 hash
    of a generated investigation PDF.

    Returns:
        The PDF SHA-256 hash as a hexadecimal string.
    """

    if not isinstance(pdf_bytes, bytes):
        raise ValueError("PDF data must be bytes.")

    if not pdf_bytes.startswith(b"%PDF-"):
        raise ValueError("Invalid PDF data.")

    if not case_id or not str(case_id).strip():
        raise ValueError("A case ID is required.")

    pdf_hash = hashlib.sha256(pdf_bytes).hexdigest()

    generated_at = datetime.now(
        timezone.utc
    ).isoformat()

    with connect_db() as conn:
        conn.execute(
            """
            INSERT OR IGNORE INTO registered_reports
                (case_id, pdf_sha256, generated_at)
            VALUES (?, ?, ?)
            """,
            (
                str(case_id),
                pdf_hash,
                generated_at,
            ),
        )

        conn.commit()

    return pdf_hash


# ============================================================
# VERIFY A PDF REPORT
# POST /api/v1/validator/verify
# ============================================================

@router.post("/verify")
async def verify_report(
    file: UploadFile = File(...),
    expected_hash: str = Form(""),
):
    """
    Verify the SHA-256 hash of an uploaded PDF.

    Possible statuses:
        VERIFIED
        MISMATCH
        NOT_REGISTERED
    """

    # --------------------------------------------------------
    # STEP 1: VALIDATE FILE
    # --------------------------------------------------------

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Please select a PDF report.",
        )

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported.",
        )

    try:
        pdf_bytes = await file.read(MAX_FILE_SIZE + 1)
    finally:
        await file.close()

    if not pdf_bytes:
        raise HTTPException(
            status_code=400,
            detail="The uploaded PDF is empty.",
        )

    if len(pdf_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="PDF exceeds the 15 MB size limit.",
        )

    if not pdf_bytes.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=400,
            detail="The uploaded file has an invalid PDF header.",
        )

    # --------------------------------------------------------
    # STEP 2: CALCULATE SHA-256
    # --------------------------------------------------------

    calculated_hash = hashlib.sha256(
        pdf_bytes
    ).hexdigest()

    expected_hash = (expected_hash or "").strip().lower()

    if expected_hash and not re.fullmatch(
        r"[a-f0-9]{64}",
        expected_hash,
    ):
        raise HTTPException(
            status_code=422,
            detail=(
                "Expected SHA-256 must contain exactly "
                "64 hexadecimal characters."
            ),
        )

    # --------------------------------------------------------
    # STEP 3: SEARCH REGISTERED REPORTS
    # --------------------------------------------------------

    with connect_db() as conn:

        registered = conn.execute(
            """
            SELECT case_id, pdf_sha256, generated_at
            FROM registered_reports
            WHERE pdf_sha256 = ?
            """,
            (calculated_hash,),
        ).fetchone()

        reference = None

        if expected_hash:
            reference = conn.execute(
                """
                SELECT case_id, pdf_sha256, generated_at
                FROM registered_reports
                WHERE pdf_sha256 = ?
                """,
                (expected_hash,),
            ).fetchone()

    # --------------------------------------------------------
    # STEP 4: DETERMINE VERIFICATION RESULT
    # --------------------------------------------------------

    if expected_hash and expected_hash != calculated_hash:

        status = "MISMATCH"

        message = (
            "The uploaded PDF SHA-256 does not match "
            "the supplied reference hash."
        )

        case_id = (
            reference["case_id"]
            if reference else None
        )

        registered_at = (
            reference["generated_at"]
            if reference else None
        )

    elif registered:

        status = "VERIFIED"

        message = (
            "Integrity verified. The uploaded PDF "
            "exactly matches a report registered "
            "by this CoinQuest backend."
        )

        case_id = registered["case_id"]
        registered_at = registered["generated_at"]

    else:

        status = "NOT_REGISTERED"

        message = (
            "No matching report was found in the "
            "local CoinQuest report registry."
        )

        case_id = None
        registered_at = None

    # --------------------------------------------------------
    # STEP 5: RETURN VERIFICATION DETAILS
    # --------------------------------------------------------

    return {
        "status": status,
        "message": message,
        "filename": Path(file.filename).name,
        "file_size_bytes": len(pdf_bytes),
        "calculated_sha256": calculated_hash,
        "expected_sha256": expected_hash or None,
        "reference_matches_uploaded": (
            calculated_hash == expected_hash
            if expected_hash
            else None
        ),
        "case_id": case_id,
        "registered_at": registered_at,
    }


# ============================================================
# VALIDATOR HEALTH CHECK
# GET /api/v1/validator/health
# ============================================================

@router.get("/health")
async def validator_health():

    with connect_db() as conn:
        count = conn.execute(
            """
            SELECT COUNT(*)
            FROM registered_reports
            """
        ).fetchone()[0]

    return {
        "status": "online",
        "service": "CoinQuest Report Integrity Validator",
        "registered_reports": count,
        "database": "SQLite",
        "hash_algorithm": "SHA-256",
    }

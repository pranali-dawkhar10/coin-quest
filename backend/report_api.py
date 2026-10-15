import hashlib
import json
import re

from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from io import BytesIO
from xml.sax.saxutils import escape

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
)

from validator_api import register_report

router = APIRouter()

ETH_ADDRESS = re.compile(r"^0x[a-fA-F0-9]{40}$")
TX_HASH = re.compile(r"^0x[a-fA-F0-9]{64}$")


# =====================================================
# REQUEST MODELS
# =====================================================

class GraphEdge(BaseModel):
    from_address: str
    to_address: str
    amount_token: str
    token: str
    tx_hash: str
    timestamp: int
    block_number: int


class GraphNode(BaseModel):
    id: str
    address: str
    label: str = ""


class ReportRequest(BaseModel):
    case_id: str = Field(max_length=100)
    wallet_address: str
    chain: str = "ETHEREUM"
    category: str = Field(default="Not specified", max_length=120)
    max_hops: int = Field(default=1, ge=1, le=3)
    data_mode: str
    source: str = Field(default="Etherscan API V2", max_length=120)
    nodes: list[GraphNode] = Field(max_length=200)
    edges: list[GraphEdge] = Field(max_length=100)


# =====================================================
# HELPERS
# =====================================================

def safe_text(value):
    return escape(str(value))


def shorten(value, length=13):
    value = str(value)
    if len(value) <= length * 2:
        return value

    return value[:length] + "..." + value[-length:]


def format_timestamp(timestamp):
    try:
        return datetime.fromtimestamp(
            timestamp,
            tz=timezone.utc,
        ).strftime("%Y-%m-%d %H:%M:%S UTC")
    except (ValueError, OverflowError, OSError):
        return "Invalid timestamp"


def validate_report(data: ReportRequest):
    if data.chain.upper() != "ETHEREUM":
        raise HTTPException(
            400,
            "Live PDF reports support Ethereum only.",
        )

    if data.data_mode != "live_sample":
        raise HTTPException(
            400,
            "Load the live Ethereum graph first.",
        )

    if not ETH_ADDRESS.fullmatch(data.wallet_address):
        raise HTTPException(
            422,
            "Invalid Ethereum wallet address.",
        )

    for node in data.nodes:
        if not ETH_ADDRESS.fullmatch(node.address):
            raise HTTPException(
                422,
                "Graph contains an invalid wallet address.",
            )

    for edge in data.edges:
        if not (
            ETH_ADDRESS.fullmatch(edge.from_address)
            and ETH_ADDRESS.fullmatch(edge.to_address)
            and TX_HASH.fullmatch(edge.tx_hash)
        ):
            raise HTTPException(
                422,
                "Graph contains an invalid transaction reference.",
            )

        if edge.token not in ("ETH", "USDT"):
            raise HTTPException(
                422,
                "Unsupported token in report data.",
            )

        try:
            amount = Decimal(edge.amount_token)
            if not amount.is_finite() or amount <= 0:
                raise ValueError("Invalid amount")
        except (InvalidOperation, ValueError):
            raise HTTPException(
                422,
                "Invalid token amount in transaction.",
            )


# =====================================================
# PDF BUILDER
# =====================================================

def build_pdf(data: ReportRequest):
    generated_at = datetime.now(
        timezone.utc
    ).strftime("%Y-%m-%d %H:%M:%S UTC")

    # Digest of the submitted data snapshot.
    # This is NOT the SHA-256 of the PDF itself.
    canonical = json.dumps(
        data.model_dump(),
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")

    snapshot_hash = hashlib.sha256(
        canonical
    ).hexdigest()

    output = BytesIO()

    doc = SimpleDocTemplate(
        output,
        pagesize=A4,
        rightMargin=17 * mm,
        leftMargin=17 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
        title="CoinQuest Blockchain Investigation Report",
        author="CoinQuest",
    )

    styles = getSampleStyleSheet()

    styles.add(
        ParagraphStyle(
            name="CQTitle",
            parent=styles["Heading1"],
            fontSize=20,
            leading=24,
            textColor=colors.HexColor("#0f172a"),
            spaceAfter=8,
        )
    )

    styles.add(
        ParagraphStyle(
            name="CQHeading",
            parent=styles["Heading2"],
            fontSize=12,
            textColor=colors.HexColor("#1d4ed8"),
            spaceBefore=15,
            spaceAfter=9,
        )
    )

    styles.add(
        ParagraphStyle(
            name="CQBody",
            parent=styles["Normal"],
            fontSize=8,
            leading=12,
            wordWrap="CJK",
        )
    )

    styles.add(
        ParagraphStyle(
            name="CQSmall",
            parent=styles["Normal"],
            fontSize=6.5,
            leading=9,
            wordWrap="CJK",
        )
    )

    story = []

    def text(value, style="CQBody"):
        return Paragraph(
            safe_text(value),
            styles[style],
        )

    def section(title):
        story.append(
            Paragraph(
                safe_text(title),
                styles["CQHeading"],
            )
        )

    def add_table(headers, rows, widths=None):
        table_data = [
            [text(h, "CQSmall") for h in headers]
        ]

        for row in rows:
            table_data.append([
                text(value, "CQSmall")
                for value in row
            ])

        table = Table(
            table_data,
            colWidths=widths,
            repeatRows=1,
            hAlign="LEFT",
        )

        table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0),
                 colors.HexColor("#1e293b")),
                ("TEXTCOLOR", (0, 0), (-1, 0),
                 colors.white),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1),
                 [
                     colors.white,
                     colors.HexColor("#f1f5f9"),
                 ]),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LINEBELOW", (0, -1), (-1, -1),
                 0.4, colors.lightgrey),
            ])
        )

        # Set header text to white using a special
        # ParagraphStyle. Table TEXTCOLOR alone does
        # not override Paragraph font colors.
        white_style = ParagraphStyle(
            "CQHeaderWhite",
            parent=styles["CQSmall"],
            textColor=colors.white,
        )

        table._cellvalues[0] = [
            Paragraph(safe_text(h), white_style)
            for h in headers
        ]

        story.append(table)

    # =====================================================
    # REPORT HEADER
    # =====================================================

    story.append(
        Paragraph(
            "COINQUEST",
            styles["CQTitle"],
        )
    )

    story.append(
        text("BLOCKCHAIN TRANSACTION INVESTIGATION REPORT")
    )

    story.append(
        text("Ethereum Mainnet | Sampled On-Chain Records")
    )

    story.append(Spacer(1, 12))

    # =====================================================
    # CASE DETAILS
    # =====================================================

    section("1. Case Information")

    add_table(
        ["Field", "Value"],
        [
            ("Case ID", data.case_id),
            ("Reported Wallet", data.wallet_address),
            ("Crime Category (Reported)", data.category),
            ("Blockchain", "Ethereum Mainnet"),
            ("Tracing Depth", str(data.max_hops)),
            ("Generated At", generated_at),
            ("Data Source (Client Label)", data.source),
            ("Evidence Status", "Unverified client-submitted snapshot"),
        ],
        widths=[48 * mm, 128 * mm],
    )

    # =====================================================
    # TRANSACTION SUMMARY
    # =====================================================

    totals = {}

    for edge in data.edges:
        totals.setdefault(edge.token, Decimal(0))
        totals[edge.token] += Decimal(edge.amount_token)

    section("2. Transaction Summary")

    add_table(
        ["Metric", "Value"],
        [
            ("Wallets Displayed", str(len(data.nodes))),
            ("Transfers Displayed", str(len(data.edges))),
            ("Tracing Depth", str(data.max_hops)),
            ("ETH Total", f"{totals.get('ETH', 0)} ETH"),
            ("USDT Total", f"{totals.get('USDT', 0)} USDT"),
            (
                "Interpretation",
                "Sum of displayed transfers; not wallet balance or net flow",
            ),
        ],
        widths=[65 * mm, 111 * mm],
    )

    # =====================================================
    # TRANSACTION EVIDENCE
    # =====================================================

    section("3. Observed Transaction Records")

    tx_rows = []

    for i, edge in enumerate(data.edges, 1):
        tx_rows.append([
            str(i),
            shorten(edge.from_address, 10),
            shorten(edge.to_address, 10),
            f"{edge.amount_token} {edge.token}",
            str(edge.block_number),
        ])

    if not tx_rows:
        tx_rows.append([
            "-", "-", "-", "No displayed transfers", "-"
        ])

    add_table(
        ["#", "From", "To", "Amount", "Block"],
        tx_rows,
        widths=[
            9 * mm,
            43 * mm,
            43 * mm,
            52 * mm,
            29 * mm,
        ],
    )

    # =====================================================
    # TRANSACTION HASHES
    # =====================================================

    section("4. Transaction Verification References")

    hash_rows = []

    for i, edge in enumerate(data.edges, 1):
        hash_rows.append([
            str(i),
            edge.tx_hash,
            f"https://etherscan.io/tx/{edge.tx_hash}",
        ])

    if not hash_rows:
        hash_rows.append(["-", "No transfers", "-"])

    add_table(
        ["#", "Transaction Hash", "Explorer Reference"],
        hash_rows,
        widths=[
            9 * mm,
            82 * mm,
            85 * mm,
        ],
    )

    # =====================================================
    # INTEGRITY DETAILS
    # =====================================================

    section("5. Snapshot Integrity")

    story.append(
        text(
            "SHA-256 of the canonical JSON request body:"
        )
    )

    story.append(Spacer(1, 5))
    story.append(text(snapshot_hash, "CQSmall"))
    story.append(Spacer(1, 5))

    story.append(
        text(
            "The digest applies only to the JSON snapshot "
            "received by this reporting service. "
            "It is not the PDF file hash and does not "
            "authenticate the source of the submitted data."
        )
    )

    # =====================================================
    # LIMITATIONS
    # =====================================================

    section("6. Investigation Limitations")

    limitations = [
        "This report uses data submitted by the CoinQuest frontend.",
        "The report service does not independently query or verify Etherscan.",
        "The transaction graph is a limited sample, not complete blockchain history.",
        "Token totals may include repeated movements of funds.",
        "A wallet connection does not prove beneficial ownership or fraud.",
        "Incoming and outgoing wallet connections do not necessarily demonstrate onward movement of the same funds.",
        "Exchange attribution and fraud risk scores are not verified.",
        "This document is not an official asset-freezing order or court-certified evidence.",
    ]

    for item in limitations:
        story.append(
            Paragraph(
                "- " + safe_text(item),
                styles["CQBody"],
            )
        )
        story.append(Spacer(1, 4))

    # =====================================================
    # FOOTERS
    # =====================================================

    def page_footer(canvas, document):
        canvas.saveState()

        width, height = A4

        canvas.setStrokeColor(
            colors.HexColor("#cbd5e1")
        )
        canvas.line(
            17 * mm,
            16 * mm,
            width - 17 * mm,
            16 * mm,
        )

        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(
            colors.HexColor("#64748b")
        )

        canvas.drawString(
            17 * mm,
            11 * mm,
            "CoinQuest | Blockchain Transaction Analysis",
        )

        canvas.drawRightString(
            width - 17 * mm,
            11 * mm,
            f"Page {document.page}",
        )

        canvas.restoreState()

    doc.build(
        story,
        onFirstPage=page_footer,
        onLaterPages=page_footer,
    )

    return output.getvalue()


# =====================================================
# REPORT ENDPOINT
# =====================================================

@router.post("/generate")
async def generate_investigation_report(
    request: ReportRequest,
):
    validate_report(request)

    try:
        # Generate the investigation PDF.
        pdf_bytes = build_pdf(request)

        # Register SHA-256 of the actual PDF bytes.
        pdf_hash = register_report(
            request.case_id,
            pdf_bytes,
        )

        print(
            f"[COINQUEST REPORT] "
            f"Case: {request.case_id} | "
            f"PDF SHA-256: {pdf_hash}"
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"PDF generation failed: {exc}",
        ) from exc

    safe_case_id = re.sub(
        r"[^a-zA-Z0-9_-]",
        "_",
        request.case_id,
    )

    filename = f"CoinQuest_{safe_case_id}_Report.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition":
                f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
            "X-Report-SHA256": pdf_hash,
            "Access-Control-Expose-Headers":
                "X-Report-SHA256",
        },
    )
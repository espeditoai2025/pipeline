"""
Pipely Lead Enricher — Vercel Python Serverless Function
Endpoint: POST /api/enrich

Cerca email e telefono di un'azienda tramite:
1. Scraping del sito web aziendale (homepage + /contatti)
2. DuckDuckGo search per info mancanti
"""
import re
from typing import Optional

import httpx
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from pydantic import BaseModel

app = FastAPI()

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "it-IT,it;q=0.9,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

SKIP_EMAILS_RE = re.compile(
    r"^(noreply|no-reply|donotreply|support|webmaster|admin|postmaster|"
    r"privacy|cookie|dpo@|seo@|marketing@|newsletter@)",
    re.I,
)
SKIP_EMAIL_DOMAINS = re.compile(
    r"@(example|test|acme|placeholder|domain|sampleemail|duckduckgo|google|"
    r"facebook|linkedin|twitter|instagram|w3\.org|schema\.org|adobe|microsoft|"
    r"apple|cloudflare|jquery|bootstrap)\.",
    re.I,
)
EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")

PHONE_RE = re.compile(
    r"(?:"
    r"\b(?:\+39[\s.\-]?)?0\d{1,3}[\s.\-]\d{3,8}\b|"   # fisso con separatore
    r"\b\+39\s?0\d{1,3}[\s.\-]?\d{4,8}\b|"              # +39 fisso
    r"\b3\d{2}[\s.\-]\d{3}[\s.\-]\d{4}\b|"              # mobile con separatori
    r"\b3\d{9}\b"                                         # mobile senza separatori
    r")"
)


def _sanitize_email(email: Optional[str]) -> Optional[str]:
    if not email:
        return None
    email = email.strip().lower()
    if not re.match(r"^[^\s@]+@[^\s@]+\.[a-z]{2,}$", email):
        return None
    if SKIP_EMAILS_RE.match(email) or SKIP_EMAIL_DOMAINS.search(email):
        return None
    return email


def _sanitize_phone(phone: Optional[str]) -> Optional[str]:
    if not phone:
        return None
    digits = re.sub(r"\D", "", phone)
    if not (6 <= len(digits) <= 13):
        return None
    if re.match(r"^(\d)\1{5,}$", digits):
        return None
    return phone.strip()


def _extract_email_phone(text: str, piva: Optional[str] = None) -> tuple[Optional[str], Optional[str]]:
    """Estrae email e telefono dal testo HTML ripulito."""
    text_clean = re.sub(r"<(script|style)[^>]*>[\s\S]*?</\1>", "", text, flags=re.I)

    email: Optional[str] = None
    phone: Optional[str] = None

    # Email: priorità al mailto:
    m = re.search(r"mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})", text, re.I)
    if m:
        email = _sanitize_email(m.group(1))
    if not email:
        for em in EMAIL_RE.findall(text_clean):
            sanitized = _sanitize_email(em)
            if sanitized:
                email = sanitized
                break

    # Telefono: priorità al tel: link
    m2 = re.search(r"tel:([\+\d][\d\s\-./()]{5,18})", text, re.I)
    if m2:
        raw = m2.group(1).strip()
        digits = re.sub(r"\D", "", raw)
        piva_digits = re.sub(r"\D", "", piva or "")
        if 6 <= len(digits) <= 13 and digits != piva_digits:
            phone = _sanitize_phone(raw)
    if not phone:
        m3 = PHONE_RE.search(text_clean)
        if m3:
            raw = m3.group(0).strip()
            digits = re.sub(r"\D", "", raw)
            piva_digits = re.sub(r"\D", "", piva or "")
            if digits != piva_digits:
                phone = _sanitize_phone(raw)

    return email, phone


async def _scrape_website(
    client: httpx.AsyncClient,
    website: str,
    piva: Optional[str] = None,
) -> tuple[Optional[str], Optional[str]]:
    base = website.rstrip("/")
    email: Optional[str] = None
    phone: Optional[str] = None

    for path in ["", "/contatti", "/contact", "/chi-siamo", "/about", "/contattaci"]:
        try:
            r = await client.get(
                f"{base}{path}",
                headers=HEADERS,
                timeout=8,
                follow_redirects=True,
            )
            if r.status_code != 200:
                continue
            page_email, page_phone = _extract_email_phone(r.text, piva)
            if page_email and not email:
                email = page_email
            if page_phone and not phone:
                phone = page_phone
            if email and phone:
                break
        except Exception:
            continue

    return email, phone


async def _duckduckgo_search(
    client: httpx.AsyncClient,
    name: str,
    location: Optional[str],
    piva: Optional[str],
    need_email: bool,
    need_phone: bool,
) -> tuple[Optional[str], Optional[str]]:
    """Cerca info azienda su DuckDuckGo e nei risultati."""
    parts = [name]
    if location:
        parts.append(location)
    if need_email and need_phone:
        parts.append("email telefono contatti")
    elif need_email:
        parts.append("email contatti")
    else:
        parts.append("telefono contatti")

    query = " ".join(parts)
    email: Optional[str] = None
    phone: Optional[str] = None

    try:
        r = await client.get(
            "https://html.duckduckgo.com/html/",
            params={"q": query},
            headers={**HEADERS, "Accept": "text/html"},
            timeout=12,
            follow_redirects=True,
        )
        if r.status_code != 200:
            return None, None

        text_clean = re.sub(r"<[^>]+>", " ", r.text)
        page_email, page_phone = _extract_email_phone(text_clean, piva)
        # Filtra email di DuckDuckGo stesso
        if page_email and "duckduckgo" not in page_email:
            email = page_email
        phone = page_phone
    except Exception:
        pass

    return email, phone


# ─── Modelli ─────────────────────────────────────────────────────────────────

class EnrichRequest(BaseModel):
    name: str
    website: Optional[str] = None
    piva: Optional[str] = None
    location: Optional[str] = None


# ─── Endpoint ─────────────────────────────────────────────────────────────────

@app.get("/api/enrich")
async def health():
    return {"status": "ok", "service": "pipely-enricher"}


@app.post("/api/enrich")
async def enrich(req: EnrichRequest):
    email: Optional[str] = None
    phone: Optional[str] = None
    sources: list[str] = []

    async with httpx.AsyncClient() as client:
        # 1. Scraping del sito aziendale
        if req.website:
            email, phone = await _scrape_website(client, req.website, req.piva)
            if email or phone:
                sources.append("sito web")

        # 2. DuckDuckGo per info ancora mancanti
        if not email or not phone:
            ddg_email, ddg_phone = await _duckduckgo_search(
                client, req.name, req.location, req.piva,
                need_email=not email,
                need_phone=not phone,
            )
            if ddg_email and not email:
                email = ddg_email
                sources.append("ricerca web")
            if ddg_phone and not phone:
                phone = ddg_phone
                if "ricerca web" not in sources:
                    sources.append("ricerca web")

    return JSONResponse({
        "email": email,
        "phone": phone,
        "source": ", ".join(sources) if sources else None,
    })

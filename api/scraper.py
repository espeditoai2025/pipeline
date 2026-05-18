"""
Pipely Lead Scraper — Vercel Python Serverless Function.
Endpoint: POST /api/scraper

Scraping FatturatoItalia (CCIAA) con BeautifulSoup + INI-PEC + OpenRouter scoring.
"""
import asyncio
import json
import os
import re
from typing import Optional

import httpx
from bs4 import BeautifulSoup
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

app = FastAPI()

# ─── Costanti ────────────────────────────────────────────────────────────────

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept-Language": "it-IT,it;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

SKIP_DOMAINS = re.compile(
    r"fatturatoitalia\.it|google\.|facebook\.|linkedin\.|twitter\.|instagram\.|"
    r"youtube\.|googleapis\.|gstatic\.|cloudflare\.|amazonaws\.|cdn\.|"
    r"numeroverde\.com|adcapital\.it|whatsapp\.",
    re.I,
)

FAKE_EMAILS = [
    "acme", "example", "test", "placeholder", "yourcompany",
    "nomeazienda", "company.it", "azienda.it", "dominio", "pippo", "prova",
]

# ─── Modelli ─────────────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    location: str
    location_slug: str
    max_results: int = 20
    sector: Optional[str] = None
    keywords: Optional[str] = None
    ideal_customer: Optional[str] = None


class Company(BaseModel):
    name: str
    piva: Optional[str] = None
    address: Optional[str] = None
    sector: Optional[str] = None
    ateco: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    n_dipendenti: Optional[str] = None
    forma_giuridica: Optional[str] = None
    anno_fondazione: Optional[str] = None
    score: int = 50
    motivation: Optional[str] = None


# ─── Helpers dati ────────────────────────────────────────────────────────────

def _sanitize_email(email: Optional[str]) -> Optional[str]:
    if not email:
        return None
    email = email.strip().lower()
    if not re.match(r"^[^\s@]+@[^\s@]+\.[a-z]{2,}$", email):
        return None
    if any(p in email for p in FAKE_EMAILS):
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


def _completeness_score(c: dict) -> int:
    score = 65
    if c.get("email"):
        score += 15
    if c.get("phone"):
        score += 10
    if c.get("website"):
        score += 5
    if c.get("sector"):
        score += 5
    return min(score, 100)


# ─── Scraping FatturatoItalia ────────────────────────────────────────────────

def _slug_to_piva(slug: str) -> Optional[str]:
    m = re.search(r"(\d{11})$", slug)
    return m.group(1) if m else None


def _field_from_detail(soup: BeautifulSoup, label: str) -> Optional[str]:
    """
    Estrae un campo dalla pagina dettaglio.
    Pattern: <div class="col-xs-5"><p><b>LABEL</b></p></div>
              <div class="col-xs-7"><p>[<a>]VALUE[</a>]</p></div>
    """
    for b in soup.find_all("b"):
        if b.get_text(strip=True) == label:
            col5 = b.find_parent("div", class_="col-xs-5")
            if not col5:
                continue
            col7 = col5.find_next_sibling("div", class_="col-xs-7")
            if not col7:
                continue
            p = col7.find("p")
            if not p:
                continue
            a = p.find("a")
            text = (a or p).get_text(strip=True)
            return text or None
    return None


async def _fetch_detail(client: httpx.AsyncClient, slug: str) -> dict:
    try:
        r = await client.get(
            f"https://www.fatturatoitalia.it/{slug}",
            headers=HEADERS,
            timeout=12,
            follow_redirects=True,
        )
        if r.status_code != 200:
            return {}
        soup = BeautifulSoup(r.text, "html.parser")

        # Scarta aziende non attive
        stato = _field_from_detail(soup, "Stato Attività")
        if stato and not re.search(r"attiv", stato, re.I):
            return {"_inactive": True}

        via = _field_from_detail(soup, "Indirizzo")
        citta = _field_from_detail(soup, "Città")
        provincia = _field_from_detail(soup, "Provincia")
        address = ", ".join(p for p in [via, citta, provincia] if p) or None

        attivita = _field_from_detail(soup, "Attività prevalente")
        ateco_code = _field_from_detail(soup, "ATECO")
        sector = attivita or (f"ATECO {ateco_code}" if ateco_code else None)

        n_dip = _field_from_detail(soup, "N. Dipendenti")
        forma = _field_from_detail(soup, "Forma giuridica")
        anno = _field_from_detail(soup, "Anno Fondazione")

        # Telefono: link tel: oppure pattern numeri italiani
        phone: Optional[str] = None
        for a in soup.find_all("a", href=re.compile(r"^tel:", re.I)):
            raw = a["href"].replace("tel:", "").strip()
            if 6 <= len(re.sub(r"\D", "", raw)) <= 15:
                phone = raw
                break
        if not phone:
            m = re.search(r"\b((?:\+39[\s.-]?)?0\d{1,3}[\s.-]?\d{5,8})\b", r.text)
            if not m:
                m = re.search(r"\b(3\d{9})\b", r.text)
            phone = m.group(1).strip() if m else None

        # Sito web: primo link esterno non di navigazione
        website: Optional[str] = None
        for a in soup.find_all("a", href=True):
            href: str = a["href"]
            if not href.startswith("http"):
                continue
            if SKIP_DOMAINS.search(href) or "?" in href or href.count("/") > 4:
                continue
            website = href.rstrip("/")
            break

        return {
            "address": address,
            "sector": sector,
            "ateco": ateco_code,
            "phone": _sanitize_phone(phone),
            "website": website,
            "n_dipendenti": n_dip,
            "forma_giuridica": forma,
            "anno_fondazione": anno,
        }
    except Exception:
        return {}


async def _scrape_listing(client: httpx.AsyncClient, url: str) -> list[dict]:
    try:
        r = await client.get(url, headers=HEADERS, timeout=12, follow_redirects=True)
        if r.status_code != 200:
            return []
        soup = BeautifulSoup(r.text, "html.parser")
        companies = []
        seen: set[str] = set()
        for a in soup.find_all("a", href=re.compile(r"fatturatoitalia\.it/[a-z0-9][a-z0-9_-]*-\d{11}$")):
            slug = a["href"].rstrip("/").split("/")[-1]
            if slug in seen:
                continue
            name = a.get_text(strip=True)
            if not name or len(name) < 2:
                continue
            seen.add(slug)
            companies.append({"name": name, "piva": _slug_to_piva(slug), "slug": slug})
        return companies
    except Exception:
        return []


async def _get_pec(client: httpx.AsyncClient, piva: Optional[str]) -> Optional[str]:
    if not piva:
        return None
    try:
        r = await client.get(
            f"https://www.inipec.gov.it/cerca-pec/-/pec/codice-fiscale/{piva}",
            headers={**HEADERS, "Accept": "text/html"},
            timeout=8,
            follow_redirects=True,
        )
        if r.status_code != 200:
            return None
        m = re.search(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", r.text)
        if not m:
            return None
        email = m.group(0).lower()
        if any(x in email for x in ["inipec", "infocamere", "gov.it"]):
            return None
        return _sanitize_email(email)
    except Exception:
        return None


async def _scrape_all(location_slug: str, max_results: int) -> list[dict]:
    base_url = f"https://www.fatturatoitalia.it/{location_slug}"
    max_pages = (max_results // 45) + 2
    CONCURRENCY = 8

    async with httpx.AsyncClient() as client:
        # Fase 1: raccolta slug da listing pages
        entries: list[dict] = []
        seen_pivas: set[str] = set()
        for page in range(1, max_pages + 1):
            url = base_url if page == 1 else f"{base_url}/{page}"
            page_entries = await _scrape_listing(client, url)
            if not page_entries:
                break
            for e in page_entries:
                if e["piva"] and e["piva"] in seen_pivas:
                    continue
                if e["piva"]:
                    seen_pivas.add(e["piva"])
                entries.append(e)
                if len(entries) >= max_results:
                    break
            if len(entries) >= max_results:
                break

        # Fase 2: dettaglio pagine (batch parallelo)
        enriched: list[dict] = []
        for i in range(0, len(entries), CONCURRENCY):
            batch = entries[i: i + CONCURRENCY]
            details = await asyncio.gather(*[_fetch_detail(client, e["slug"]) for e in batch])
            for entry, detail in zip(batch, details):
                if detail.get("_inactive"):
                    continue
                enriched.append({**entry, **detail})

        # Fase 3: INI-PEC (batch parallelo)
        for i in range(0, len(enriched), CONCURRENCY):
            batch = enriched[i: i + CONCURRENCY]
            pecs = await asyncio.gather(*[_get_pec(client, c.get("piva")) for c in batch])
            for company, pec in zip(batch, pecs):
                if pec:
                    company["email"] = pec

    return enriched


# ─── AI scoring via OpenRouter ────────────────────────────────────────────────

async def _openrouter_chat(messages: list[dict], max_tokens: int = 800) -> str:
    api_key = os.getenv("OPENROUTER_API_KEY", "")
    model = os.getenv("OPENROUTER_MODEL", "google/gemini-flash-1.5-8b")
    async with httpx.AsyncClient() as client:
        r = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://pipely.app",
                "X-Title": "Pipely CRM",
            },
            json={
                "model": model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": 0.3,
            },
            timeout=25,
        )
        data = r.json()
        return data["choices"][0]["message"]["content"].strip()


async def _score_companies(companies: list[dict], params: dict) -> list[dict]:
    sector = params.get("sector") or ""
    keywords = params.get("keywords") or ""
    ideal = params.get("ideal_customer") or ""
    location = params.get("location") or ""
    generic = not sector and not keywords and not ideal

    # Normalizza email/phone prima dello scoring
    for c in companies:
        if not c.get("email"):
            c["email"] = None
        if not c.get("phone"):
            c["phone"] = None

    if generic:
        for c in companies:
            c["score"] = _completeness_score(c)
            c["motivation"] = (
                f"Azienda{' di ' + location if location else ''} dal registro CCIAA"
                + (f" — {c['sector']}" if c.get("sector") else "")
                + "."
            )
        return companies

    # AI scoring a batch di 10
    BATCH = 10
    for i in range(0, len(companies), BATCH):
        batch = companies[i: i + BATCH]
        companies_json = json.dumps(
            [
                {
                    "id": idx,
                    "name": c.get("name"),
                    "sector": c.get("sector"),
                    "address": c.get("address"),
                    "has_email": bool(c.get("email")),
                    "has_phone": bool(c.get("phone")),
                    "has_website": bool(c.get("website")),
                    "n_dipendenti": c.get("n_dipendenti"),
                }
                for idx, c in enumerate(batch)
            ],
            ensure_ascii=False,
        )
        prompt = f"""Valuta queste aziende italiane come potenziali lead B2B.

Criteri ricerca:
- Settore: {sector or 'qualsiasi'}
- Parole chiave: {keywords or 'nessuna'}
- Cliente ideale: {ideal or 'non specificato'}
- Zona: {location or 'Italia'}

Aziende:
{companies_json}

Rispondi SOLO con JSON array:
[{{"id": 0, "score": 75, "motivation": "..."}}]
Score 0-100. Motivation max 120 caratteri in italiano."""

        try:
            raw = await _openrouter_chat([{"role": "user", "content": prompt}], 500)
            arr = re.search(r"\[[\s\S]*\]", raw)
            if not arr:
                raise ValueError
            scores = json.loads(arr.group(0))
            score_map = {item["id"]: item for item in scores}
            for idx, c in enumerate(batch):
                item = score_map.get(idx, {})
                c["score"] = max(0, min(100, int(item.get("score", 50))))
                c["motivation"] = str(item.get("motivation", ""))[:200]
        except Exception:
            for c in batch:
                c["score"] = _completeness_score(c)
                c["motivation"] = ""

    return companies


# ─── Endpoint ────────────────────────────────────────────────────────────────

@app.get("/api/scraper")
async def health():
    return {"status": "ok", "service": "pipely-scraper"}


@app.post("/api/scraper")
async def search(req: SearchRequest, request: Request):
    # Autenticazione opzionale
    secret = os.getenv("SCRAPER_SECRET_KEY", "")
    if secret:
        key = request.headers.get("x-scraper-key", "")
        if key != secret:
            raise HTTPException(status_code=401, detail="Unauthorized")

    raw = await _scrape_all(req.location_slug, req.max_results)
    if not raw:
        return JSONResponse({"companies": [], "total": 0})

    enriched = await _score_companies(raw, {
        "location": req.location,
        "sector": req.sector,
        "keywords": req.keywords,
        "ideal_customer": req.ideal_customer,
    })

    enriched.sort(key=lambda c: c.get("score", 0), reverse=True)

    companies = [
        Company(
            name=c.get("name", ""),
            piva=c.get("piva"),
            address=c.get("address"),
            sector=c.get("sector"),
            ateco=c.get("ateco"),
            phone=c.get("phone"),
            email=c.get("email"),
            website=c.get("website"),
            n_dipendenti=c.get("n_dipendenti"),
            forma_giuridica=c.get("forma_giuridica"),
            anno_fondazione=c.get("anno_fondazione"),
            score=c.get("score", 50),
            motivation=c.get("motivation"),
        ).model_dump()
        for c in enriched
    ]

    return JSONResponse({"companies": companies, "total": len(companies)})

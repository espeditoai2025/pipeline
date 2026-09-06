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
    page_offset: int = 0


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
    revenue: Optional[str] = None
    email_source: Optional[str] = None  # "pec" | "sito"
    website_source: Optional[str] = None  # "ai" when proposed by the scorer (the caller verifies it)
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


_PARTICLES = {"di", "del", "della", "dei", "degli", "delle", "da", "in", "e", "&", "a", "al", "allo", "alla", "dal", "dallo", "dalla", "sul", "per", "con"}


def _title_case(name: str) -> str:
    """'DALMINE SPA' -> 'Dalmine Spa'; le particelle restano minuscole, le sigle di 1-2 lettere maiuscole."""
    def cap(part: str) -> str:
        return part[:1].upper() + part[1:].lower() if part else part

    words = []
    for i, w in enumerate(name.strip().split()):
        lw = w.lower()
        if i > 0 and lw in _PARTICLES:
            words.append(lw)
        elif len(w) <= 2 and w.isalpha():
            words.append(w.upper())
        else:
            # Maiuscola anche dopo trattino, apostrofo e punto: "DEUTZ-FAHR" -> "Deutz-Fahr", "S.P.A." -> "S.P.A."
            words.append(re.sub(r"[^-'.]+", lambda m: cap(m.group(0)), w))
    return " ".join(words)


def _detail_fields(soup: BeautifulSoup) -> dict:
    """
    Scheda azienda (settembre 2026): tabella "Dati aziendali" con <th scope="row">Etichetta</th><td>Valore</td>
    e una lista <dt>/<dd> con gli stessi dati. Le etichette sono confrontate in minuscolo.
    """
    fields: dict = {}
    missing = re.compile(r"^(n/?d|n\.d\.|-|non disponibile)$", re.I)  # il sito scrive "N/D" per i dati mancanti

    def put(label, node) -> None:
        key = label.get_text(" ", strip=True).lower()
        value = re.sub(r"\s+", " ", node.get_text(" ", strip=True)) if node else ""
        if key and value and not missing.match(value) and key not in fields:
            fields[key] = value

    for th in soup.find_all("th", attrs={"scope": "row"}):
        put(th, th.find_next_sibling("td"))
    for dt in soup.find_all("dt"):
        put(dt, dt.find_next_sibling("dd"))
    return fields


def _first(fields: dict, *keys: str) -> Optional[str]:
    for k in keys:
        v = fields.get(k)
        if v:
            return v
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
        fields = _detail_fields(soup)
        if not fields:
            return {}

        # Scarta aziende non attive: solo "Attiva" passa (non "Inattiva", "Cessata", "In liquidazione")
        stato = _first(fields, "stato attività", "stato attivita", "stato")
        if stato and not re.match(r"^attiva", stato, re.I):
            return {"_inactive": True}

        via = _first(fields, "indirizzo")
        if via:
            via = _title_case(via)  # il registro scrive gli indirizzi in maiuscolo
        comune = _first(fields, "comune", "città", "citta")
        provincia = _first(fields, "provincia")
        place = f"{comune} ({provincia})" if comune and provincia else (comune or provincia)
        address = ", ".join(p for p in [via, place] if p) or None

        ateco_full = _first(fields, "ateco") or ""
        ateco_code = _first(fields, "codice ateco") or (ateco_full.split(" - ")[0].strip() if ateco_full else None)
        attivita = _first(fields, "attività prevalente", "attivita prevalente") or (
            " - ".join(ateco_full.split(" - ")[1:]).strip() if " - " in ateco_full else None
        )
        sector = attivita or (f"ATECO {ateco_code}" if ateco_code else None)

        n_dip = _first(fields, "n. dipendenti", "dipendenti")
        forma = _first(fields, "forma giuridica")
        anno = _first(fields, "anno fondazione", "anno di fondazione")
        piva_digits = re.sub(r"\D", "", _first(fields, "partita iva", "p.iva") or "")
        piva = piva_digits if len(piva_digits) == 11 else None
        revenue_key = next((k for k in fields if k.startswith("fatturato")), None)
        revenue = None
        if revenue_key:
            year = revenue_key.replace("fatturato", "").strip()
            revenue = fields[revenue_key] + (f" ({year})" if year else "")

        # Telefono e sito non sono più nella scheda gratuita: li cerca il modello con ricerca web.
        return {
            "address": address,
            "sector": sector,
            "ateco": ateco_code,
            "phone": None,
            "website": None,
            "n_dipendenti": n_dip,
            "forma_giuridica": forma,
            "anno_fondazione": anno,
            "piva_detail": piva,
            "revenue": revenue,
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
        # Listing (settembre 2026): <article class="fi-geo-company-row"> con nome (link relativo,
        # maiuscolo), fatturato e comune (provincia). Si accettano anche link assoluti.
        link_re = re.compile(r"^(?:https?://www\.fatturatoitalia\.it)?/([a-z0-9][a-z0-9_-]*-\d{11})/?$")

        def add(a, row) -> None:
            m = link_re.match(a.get("href", ""))
            if not m:
                return
            slug = m.group(1)
            name = a.get_text(" ", strip=True)
            if slug in seen or not name or len(name) < 2:
                return
            seen.add(slug)
            entry = {"name": _title_case(name), "piva": _slug_to_piva(slug), "slug": slug}
            if row is not None:
                rev = row.find("span", class_="fi-geo-company-revenue")
                loc = row.find("span", class_="fi-geo-company-location")
                if rev and rev.get_text(strip=True):
                    entry["revenue"] = re.sub(r"\s+", " ", rev.get_text(" ", strip=True))
                if loc:
                    comune = loc.find("a", href=re.compile(r"^/comune/"))
                    prov = loc.find("a", href=re.compile(r"^/provincia/"))
                    if comune:
                        entry["location"] = comune.get_text(strip=True) + (f" ({prov.get_text(strip=True)})" if prov else "")
            companies.append(entry)

        rows = soup.find_all("article", class_="fi-geo-company-row")
        if rows:
            for row in rows:
                name_span = row.find("span", class_="nome_azienda")
                a = (name_span or row).find("a", href=link_re)
                if a:
                    add(a, row)
        else:
            # Ripiego se il markup cambia ancora: qualsiasi link azienda nella pagina
            for a in soup.find_all("a", href=link_re):
                add(a, None)
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


SKIP_EMAILS_RE = re.compile(
    r"^(noreply|no-reply|donotreply|support|webmaster|admin|postmaster|privacy|cookie|dpo@)",
    re.I,
)
EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")


async def _scrape_email_from_website(client: httpx.AsyncClient, website: Optional[str]) -> Optional[str]:
    if not website:
        return None
    base = website.rstrip("/")
    for path in ["", "/contatti", "/contact", "/chi-siamo"]:
        try:
            r = await client.get(
                f"{base}{path}",
                headers={**HEADERS, "Accept": "text/html"},
                timeout=5,
                follow_redirects=True,
            )
            if r.status_code != 200:
                continue
            text = r.text
            # Priorità 1: mailto:
            m = re.search(r"mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})", text, re.I)
            if m:
                email = m.group(1).lower()
                if not SKIP_EMAILS_RE.match(email):
                    return _sanitize_email(email)
            # Priorità 2: pattern email nel testo
            # Rimuovi script/style per evitare falsi positivi
            text_clean = re.sub(r"<(script|style)[^>]*>[\s\S]*?</\1>", "", text, flags=re.I)
            for em in EMAIL_RE.findall(text_clean):
                em = em.lower()
                if not SKIP_EMAILS_RE.match(em):
                    return _sanitize_email(em)
        except Exception:
            continue
    return None


async def _scrape_all(location_slug: str, max_results: int, start_page: int = 1) -> list[dict]:
    base_url = f"https://www.fatturatoitalia.it/{location_slug}"
    max_pages = (max_results // 45) + 2
    CONCURRENCY = 8

    async with httpx.AsyncClient() as client:
        # Fase 1: raccolta slug da listing pages
        entries: list[dict] = []
        seen_pivas: set[str] = set()
        for page in range(start_page, start_page + max_pages):
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
                # La scheda prevale sul listing, ma i None non cancellano dati già raccolti
                merged = {**entry, **{k: v for k, v in detail.items() if v is not None}}
                if detail.get("piva_detail"):
                    merged["piva"] = detail["piva_detail"]  # P.IVA reale: lo slug contiene il codice fiscale
                if not merged.get("address") and entry.get("location"):
                    merged["address"] = entry["location"]
                enriched.append(merged)

        # Fase 3: INI-PEC (batch parallelo). Il portale oggi non restituisce PEC alle richieste
        # automatiche: se il primo lotto è vuoto si evita di aspettare i timeout degli altri.
        for i in range(0, len(enriched), CONCURRENCY):
            batch = enriched[i: i + CONCURRENCY]
            pecs = await asyncio.gather(*[_get_pec(client, c.get("piva")) for c in batch])
            for company, pec in zip(batch, pecs):
                if pec:
                    company["email"] = pec
                    company["email_source"] = "pec"
            if i == 0 and not any(pecs):
                break

        # Fase 4: email dal sito aziendale (per aziende con website ma senza email)
        # Più affidabile di INI-PEC quando i server governativi bloccano le richieste cloud
        no_email_with_site = [c for c in enriched if c.get("website") and not c.get("email")]
        for i in range(0, min(len(no_email_with_site), 40), CONCURRENCY):
            batch = no_email_with_site[i: i + CONCURRENCY]
            emails = await asyncio.gather(*[
                _scrape_email_from_website(client, c.get("website")) for c in batch
            ])
            for company, email in zip(batch, emails):
                if email:
                    company["email"] = email
                    company["email_source"] = "sito"

    return enriched


# ─── AI scoring via OpenRouter ────────────────────────────────────────────────

def _parse_json_array(raw: str) -> list[dict]:
    """Array JSON dalla risposta del modello; se troncato recupera gli oggetti chiusi prima del taglio."""
    text = re.sub(r"```(?:json)?\s*", "", raw).replace("```", "").strip()
    start = text.find("[")
    if start < 0:
        raise ValueError("nessun array JSON nella risposta")
    end = text.rfind("]")
    if end > start:
        try:
            parsed = json.loads(text[start:end + 1])
            if isinstance(parsed, list):
                return [x for x in parsed if isinstance(x, dict)]
        except json.JSONDecodeError:
            pass
    objects: list[dict] = []
    depth, in_string, escaped, obj_start = 0, False, False, -1
    for i in range(start + 1, len(text)):
        ch = text[i]
        if in_string:
            if escaped:
                escaped = False
            elif ch == "\\":
                escaped = True
            elif ch == '"':
                in_string = False
            continue
        if ch == '"':
            in_string = True
        elif ch == "{":
            if depth == 0:
                obj_start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and obj_start >= 0:
                try:
                    obj = json.loads(text[obj_start:i + 1])
                    if isinstance(obj, dict):
                        objects.append(obj)
                except json.JSONDecodeError:
                    pass
                obj_start = -1
        elif ch == "]" and depth == 0:
            break
    if not objects:
        raise ValueError("JSON malformato nella risposta")
    return objects


async def _openrouter_chat(messages: list[dict], max_tokens: int = 800) -> str:
    api_key = os.getenv("OPENROUTER_API_KEY", "")
    # An empty OPENROUTER_MODEL counts as unset; keep in sync with src/lib/openrouter.ts
    model = os.getenv("OPENROUTER_MODEL") or "google/gemini-3.8-flash"
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
                # Hidden reasoning counts against max_tokens: at the default effort Gemini Flash cut the JSON off (see src/lib/openrouter.ts)
                "reasoning": {"effort": "low"},
            },
            timeout=25,
        )
        data = r.json()
        return data["choices"][0]["message"]["content"].strip()


_NOT_A_COMPANY_SITE = re.compile(r"(facebook|instagram|linkedin|twitter|x\.com|youtube|tiktok|paginegialle|paginebianche|virgilio|wikipedia|google|ufficiocamerale|fatturatoitalia|registroimprese|reportaziende|informazione-aziende|aziende\.it|trovaimprese|cylex|europages|kompass)")


def _plausible_website(value) -> Optional[str]:
    """Keeps only a bare company domain proposed by the model; the caller visits it before trusting it."""
    if not isinstance(value, str):
        return None
    m = re.match(r"^(?:https?://)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)", value.strip().lower())
    if not m or _NOT_A_COMPANY_SITE.search(m.group(1)):
        return None
    return f"https://{m.group(1)}"


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
                    "fatturato": c.get("revenue"),
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
[{{"id": 0, "score": 75, "motivation": "...", "website": "https://www.azienda.it"}}]
Score 0-100. Motivation max 120 caratteri in italiano.
Website: il sito ufficiale SOLO se lo conosci con certezza, altrimenti null (verrà verificato; un sito sbagliato è peggio di nessun sito)."""

        try:
            # 10 aziende con motivazione da 120 caratteri superano i 500 token: con un limite basso
            # il JSON arrivava troncato e l'intero lotto ricadeva sul punteggio di completezza.
            raw = await _openrouter_chat([{"role": "user", "content": prompt}], 1500)
            scores = _parse_json_array(raw)
            score_map = {}
            for item in scores:
                try:
                    score_map[int(item.get("id"))] = item
                except (TypeError, ValueError):
                    continue
            for idx, c in enumerate(batch):
                item = score_map.get(idx)
                if item is None:
                    c["score"] = _completeness_score(c)
                    c["motivation"] = None
                    continue
                try:
                    c["score"] = max(0, min(100, int(round(float(item.get("score", 50))))))
                except (TypeError, ValueError):
                    c["score"] = _completeness_score(c)
                motivation = str(item.get("motivation") or "").strip()
                c["motivation"] = motivation[:200] or None
                site = _plausible_website(item.get("website"))
                if site and not c.get("website"):
                    c["website"] = site
                    c["website_source"] = "ai"
        except Exception as e:
            print(f"[scraper] AI scoring non riuscito: {type(e).__name__}: {str(e)[:200]}")
            for c in batch:
                c["score"] = _completeness_score(c)
                c["motivation"] = None

    return companies


# ─── Endpoint ────────────────────────────────────────────────────────────────

@app.get("/api/scraper")
async def health():
    return {"status": "ok", "service": "pipely-scraper"}


@app.post("/api/scraper")
async def search(req: SearchRequest, request: Request):
    # Autenticazione fail-closed: senza SCRAPER_SECRET_KEY l'endpoint è disabilitato
    # (impedisce scraping/consumo crediti non autorizzato se la variabile manca).
    secret = os.getenv("SCRAPER_SECRET_KEY", "")
    if not secret:
        raise HTTPException(status_code=503, detail="Scraper non configurato")
    key = request.headers.get("x-scraper-key", "")
    if key != secret:
        raise HTTPException(status_code=401, detail="Unauthorized")

    raw = await _scrape_all(req.location_slug, req.max_results, start_page=max(1, req.page_offset + 1))
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
            revenue=c.get("revenue"),
            email_source=c.get("email_source"),
            website_source=c.get("website_source"),
            score=c.get("score", 50),
            motivation=c.get("motivation"),
        ).model_dump()
        for c in enriched
    ]

    return JSONResponse({"companies": companies, "total": len(companies)})

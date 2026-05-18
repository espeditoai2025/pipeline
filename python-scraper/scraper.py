"""
Scraping FatturatoItalia (CCIAA) + lookup INI-PEC.
Usa BeautifulSoup per parsing HTML strutturato — niente regex fragili.
"""
import asyncio
import re
from typing import Optional
import httpx
from bs4 import BeautifulSoup, Tag

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

INACTIVE_PATTERN = re.compile(r"attiv", re.I)


def _slug_to_piva(slug: str) -> Optional[str]:
    """Estrae P.IVA (11 cifre) dalla fine dello slug URL."""
    m = re.search(r"(\d{11})$", slug)
    return m.group(1) if m else None


def _field_from_detail(soup: BeautifulSoup, label: str) -> Optional[str]:
    """
    Estrae il valore di un campo dalla pagina dettaglio FatturatoItalia.
    Struttura HTML:
      <div class="col-xs-5"><p><b>LABEL</b></p></div>
      <div class="col-xs-7"><p>[<a>]VALUE[</a>]</p></div>
    """
    for b_tag in soup.find_all("b"):
        if b_tag.get_text(strip=True) == label:
            col5 = b_tag.find_parent("div", class_="col-xs-5")
            if not col5:
                continue
            col7 = col5.find_next_sibling("div", class_="col-xs-7")
            if not col7:
                continue
            # Testo dall'eventuale link interno o dal p direttamente
            p = col7.find("p")
            if not p:
                continue
            a = p.find("a")
            text = (a or p).get_text(strip=True)
            return text if text else None
    return None


async def fetch_detail(client: httpx.AsyncClient, slug: str) -> dict:
    """
    Scarica la pagina dettaglio di un'azienda e ne estrae tutti i campi disponibili.
    Ritorna {} per aziende non attive (marca con _inactive=True).
    """
    try:
        r = await client.get(
            f"https://www.fatturatoitalia.it/{slug}",
            headers=HEADERS,
            timeout=10,
            follow_redirects=True,
        )
        if r.status_code != 200:
            return {}
        soup = BeautifulSoup(r.text, "lxml")

        stato = _field_from_detail(soup, "Stato Attività")
        if stato and not INACTIVE_PATTERN.search(stato):
            return {"_inactive": True}

        via = _field_from_detail(soup, "Indirizzo")
        citta = _field_from_detail(soup, "Città")
        provincia = _field_from_detail(soup, "Provincia")
        address_parts = [p for p in [via, citta, provincia] if p]
        address = ", ".join(address_parts) if address_parts else None

        # Attività prevalente è più leggibile del solo codice ATECO
        attivita = _field_from_detail(soup, "Attività prevalente")
        ateco_code = _field_from_detail(soup, "ATECO")
        sector = attivita or (f"ATECO {ateco_code}" if ateco_code else None)

        n_dipendenti = _field_from_detail(soup, "N. Dipendenti")
        forma_giuridica = _field_from_detail(soup, "Forma giuridica")
        anno_fondazione = _field_from_detail(soup, "Anno Fondazione")

        # Telefono: cerca link tel: prima, poi fallback su pattern numeri italiani
        phone: Optional[str] = None
        for a in soup.find_all("a", href=re.compile(r"^tel:", re.I)):
            raw = a["href"].replace("tel:", "").strip()
            if 6 <= len(re.sub(r"\D", "", raw)) <= 15:
                phone = raw
                break
        if not phone:
            # numero fisso italiano o mobile
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
            if SKIP_DOMAINS.search(href):
                continue
            if "?" in href:
                continue
            if href.count("/") > 4:
                continue
            website = href.rstrip("/")
            break

        return {
            "address": address,
            "sector": sector,
            "phone": phone,
            "website": website,
            "n_dipendenti": n_dipendenti,
            "forma_giuridica": forma_giuridica,
            "anno_fondazione": anno_fondazione,
        }
    except Exception:
        return {}


async def scrape_listing_page(client: httpx.AsyncClient, url: str) -> list[dict]:
    """
    Scarica una pagina listing e ritorna la lista delle aziende trovate.
    HTML: <td><a href="/slug-PIVA">Nome Azienda</a></td>
    """
    try:
        r = await client.get(url, headers=HEADERS, timeout=10, follow_redirects=True)
        if r.status_code != 200:
            return []
        soup = BeautifulSoup(r.text, "lxml")

        companies = []
        seen_slugs: set[str] = set()

        for a in soup.find_all("a", href=re.compile(r"fatturatoitalia\.it/[a-z0-9][a-z0-9_-]*-\d{11}$")):
            href: str = a["href"]
            # slug = parte dell'URL dopo l'ultimo /
            slug = href.rstrip("/").split("/")[-1]
            if slug in seen_slugs:
                continue
            name = a.get_text(strip=True)
            if not name or len(name) < 2:
                continue
            piva = _slug_to_piva(slug)
            seen_slugs.add(slug)
            companies.append({
                "name": name,
                "piva": piva,
                "slug": slug,
            })

        return companies
    except Exception:
        return []


async def scrape_fatturato(location_slug: str, max_results: int) -> list[dict]:
    """
    Scraping completo: listing pages + dettaglio per ogni azienda.
    location_slug: può essere comune/SLUG, provincia/SLUG, regione/SLUG
    """
    base_url = f"https://www.fatturatoitalia.it/{location_slug}"
    max_pages = (max_results // 45) + 2

    async with httpx.AsyncClient() as client:
        # --- Fase 1: raccolta slug da tutte le pagine ---
        all_entries: list[dict] = []
        seen_pivas: set[str] = set()

        for page in range(1, max_pages + 1):
            url = base_url if page == 1 else f"{base_url}/{page}"
            entries = await scrape_listing_page(client, url)
            if not entries:
                break
            for e in entries:
                if e["piva"] and e["piva"] in seen_pivas:
                    continue
                if e["piva"]:
                    seen_pivas.add(e["piva"])
                all_entries.append(e)
                if len(all_entries) >= max_results:
                    break
            if len(all_entries) >= max_results:
                break

        # --- Fase 2: dettaglio in parallelo (batch da 8) ---
        CONCURRENCY = 8
        enriched: list[dict] = []

        for i in range(0, len(all_entries), CONCURRENCY):
            batch = all_entries[i : i + CONCURRENCY]
            details = await asyncio.gather(
                *[fetch_detail(client, e["slug"]) for e in batch]
            )
            for entry, detail in zip(batch, details):
                if detail.get("_inactive"):
                    continue
                company = {**entry, **detail}
                enriched.append(company)

        # --- Fase 3: INI-PEC in parallelo ---
        async def get_pec(piva: Optional[str]) -> Optional[str]:
            if not piva:
                return None
            try:
                r = await client.get(
                    f"https://www.inipec.gov.it/cerca-pec/-/pec/codice-fiscale/{piva}",
                    headers={
                        "User-Agent": HEADERS["User-Agent"],
                        "Accept": "text/html",
                        "Accept-Language": "it-IT,it;q=0.9",
                    },
                    timeout=8,
                    follow_redirects=True,
                )
                if r.status_code != 200:
                    return None
                m = re.search(
                    r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", r.text
                )
                if not m:
                    return None
                email = m.group(0).lower()
                if any(x in email for x in ["inipec", "infocamere", "gov.it"]):
                    return None
                return email
            except Exception:
                return None

        for i in range(0, len(enriched), CONCURRENCY):
            batch = enriched[i : i + CONCURRENCY]
            pecs = await asyncio.gather(*[get_pec(c.get("piva")) for c in batch])
            for company, pec in zip(batch, pecs):
                if pec:
                    company["pec_email"] = pec

        return enriched

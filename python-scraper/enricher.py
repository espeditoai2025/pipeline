"""
AI enrichment via OpenRouter: scoring, pulizia dati, motivazione.
Modello: google/gemini-flash-1.5-8b (veloce, economico, multilingue).
"""
import json
import os
import re
from typing import Optional
import httpx

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = os.getenv("OPENROUTER_MODEL", "google/gemini-flash-1.5-8b")


async def _chat(messages: list[dict], max_tokens: int = 800) -> str:
    api_key = os.getenv("OPENROUTER_API_KEY", "")
    async with httpx.AsyncClient() as client:
        r = await client.post(
            OPENROUTER_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://pipely.app",
                "X-Title": "Pipely CRM",
            },
            json={
                "model": MODEL,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": 0.3,
            },
            timeout=20,
        )
        data = r.json()
        return data["choices"][0]["message"]["content"].strip()


def _sanitize_email(email: Optional[str]) -> Optional[str]:
    if not email:
        return None
    email = email.strip().lower()
    if not re.match(r"^[^\s@]+@[^\s@]+\.[a-z]{2,}$", email):
        return None
    fake_patterns = [
        "acme", "example", "test", "placeholder", "yourcompany",
        "nomeazienda", "company.it", "azienda.it", "dominio", "pippo", "prova",
    ]
    if any(p in email for p in fake_patterns):
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


def _completeness_score(company: dict) -> int:
    """Score 65-100 basato sui dati disponibili (per ricerche generiche)."""
    score = 65
    if company.get("pec_email") or company.get("website_email"):
        score += 15
    if _sanitize_phone(company.get("phone")):
        score += 10
    if company.get("website"):
        score += 5
    if company.get("sector"):
        score += 5
    return min(score, 100)


async def score_companies(
    companies: list[dict],
    search_params: dict,
) -> list[dict]:
    """
    Aggiunge score + motivazione a ogni azienda.
    Se la ricerca ha parametri specifici (settore, parole chiave, cliente ideale)
    usa l'AI per un scoring contestuale.
    Altrimenti usa completeness score (veloce, economico).
    """
    sector = search_params.get("sector", "")
    keywords = search_params.get("keywords", "")
    ideal_customer = search_params.get("ideal_customer", "")
    location = search_params.get("location", "")

    generic_search = not sector and not keywords and not ideal_customer

    # Pulizia dati di base (prima dello scoring)
    for c in companies:
        c["email"] = _sanitize_email(c.get("pec_email") or c.get("website_email"))
        c["phone"] = _sanitize_phone(c.get("phone"))

    if generic_search:
        for c in companies:
            c["score"] = _completeness_score(c)
            loc_label = f" di {location}" if location else ""
            c["motivation"] = (
                f"Azienda{loc_label} trovata nel registro CCIAA (FatturatoItalia)"
                + (f", settore: {c['sector']}" if c.get("sector") else "")
                + (f", P.IVA {c['piva']}" if c.get("piva") else "")
                + "."
            )
        return companies

    # Scoring AI contestuale: batch da 10 per ridurre le chiamate
    BATCH = 10
    for i in range(0, len(companies), BATCH):
        batch = companies[i : i + BATCH]

        companies_json = json.dumps(
            [
                {
                    "id": idx,
                    "name": c.get("name"),
                    "sector": c.get("sector"),
                    "location": c.get("address") or c.get("slug", "").split("-")[0],
                    "has_email": bool(c.get("email")),
                    "has_phone": bool(c.get("phone")),
                    "has_website": bool(c.get("website")),
                    "n_dipendenti": c.get("n_dipendenti"),
                }
                for idx, c in enumerate(batch)
            ],
            ensure_ascii=False,
        )

        prompt = f"""Sei un esperto di vendite B2B italiano. Valuta queste aziende come potenziali lead.

Criteri di ricerca:
- Settore target: {sector or "qualsiasi"}
- Parole chiave: {keywords or "nessuna"}
- Cliente ideale: {ideal_customer or "non specificato"}
- Zona: {location or "Italia"}

Aziende da valutare:
{companies_json}

Per ogni azienda restituisci un JSON array con:
- id: (stesso id ricevuto)
- score: intero 0-100 (quanto è adatta ai criteri)
- motivation: stringa breve in italiano (max 120 caratteri) che spiega il punteggio

Rispondi SOLO con il JSON array, nessun altro testo."""

        try:
            raw = await _chat([{"role": "user", "content": prompt}], max_tokens=600)
            # Estrai il JSON dalla risposta
            arr_match = re.search(r"\[[\s\S]*\]", raw)
            if not arr_match:
                raise ValueError("No JSON array in response")
            scores = json.loads(arr_match.group(0))
            score_map = {item["id"]: item for item in scores}
            for idx, c in enumerate(batch):
                item = score_map.get(idx, {})
                c["score"] = max(0, min(100, int(item.get("score", 50))))
                c["motivation"] = str(item.get("motivation", ""))[:200]
        except Exception:
            # Fallback su completeness se l'AI fallisce
            for c in batch:
                c["score"] = _completeness_score(c)
                c["motivation"] = ""

    return companies

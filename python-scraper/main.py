"""
Pipely Lead Finder — Python FastAPI microservice.
POST /search → scraping FatturatoItalia + INI-PEC + AI scoring via OpenRouter.
"""
import os
from typing import Optional
from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from dotenv import load_dotenv

from scraper import scrape_fatturato
from enricher import score_companies

load_dotenv()

app = FastAPI(title="Pipely Lead Scraper", version="1.0.0")

# Chiave condivisa tra Next.js e questo servizio
SCRAPER_SECRET = os.getenv("SCRAPER_SECRET_KEY", "")


class SearchRequest(BaseModel):
    location: str
    location_slug: str           # es. "comune/mormanno" o "provincia/cosenza"
    max_results: int = 20
    sector: Optional[str] = None
    keywords: Optional[str] = None
    ideal_customer: Optional[str] = None


class Company(BaseModel):
    name: str
    piva: Optional[str] = None
    address: Optional[str] = None
    sector: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    n_dipendenti: Optional[str] = None
    forma_giuridica: Optional[str] = None
    anno_fondazione: Optional[str] = None
    score: int = 50
    motivation: Optional[str] = None


class SearchResponse(BaseModel):
    companies: list[Company]
    total: int


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/search", response_model=SearchResponse)
async def search(
    req: SearchRequest,
    x_scraper_key: Optional[str] = Header(None),
):
    # Autenticazione tramite header — blocca accessi non autorizzati
    if SCRAPER_SECRET and x_scraper_key != SCRAPER_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")

    # --- Scraping ---
    raw_companies = await scrape_fatturato(
        location_slug=req.location_slug,
        max_results=req.max_results,
    )

    if not raw_companies:
        return SearchResponse(companies=[], total=0)

    # --- AI scoring + pulizia ---
    enriched = await score_companies(
        companies=raw_companies,
        search_params={
            "location": req.location,
            "sector": req.sector,
            "keywords": req.keywords,
            "ideal_customer": req.ideal_customer,
        },
    )

    # Ordina per score decrescente
    enriched.sort(key=lambda c: c.get("score", 0), reverse=True)

    companies = [
        Company(
            name=c.get("name", ""),
            piva=c.get("piva"),
            address=c.get("address"),
            sector=c.get("sector"),
            phone=c.get("phone"),
            email=c.get("email"),
            website=c.get("website"),
            n_dipendenti=c.get("n_dipendenti"),
            forma_giuridica=c.get("forma_giuridica"),
            anno_fondazione=c.get("anno_fondazione"),
            score=c.get("score", 50),
            motivation=c.get("motivation"),
        )
        for c in enriched
    ]

    return SearchResponse(companies=companies, total=len(companies))

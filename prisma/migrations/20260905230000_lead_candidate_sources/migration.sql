-- Origine di email, telefono e sito di ogni candidato del Lead Finder, per distinguere
-- i dati verificati (sito aziendale, PEC, Google Maps, registro) da quelli proposti dal modello.
ALTER TABLE "LeadCandidate"
  ADD COLUMN "emailSource" TEXT,
  ADD COLUMN "phoneSource" TEXT,
  ADD COLUMN "websiteSource" TEXT;

import { describe, it, expect } from "vitest";
import { getKpis, getForecast, getFunnelData, getTrendData, getTopPerformers } from "@/lib/reporting";

describe("reporting — getKpis", () => {
  it("restituisce openDeals >= 0", () => {
    const kpis = getKpis("30d");
    expect(kpis.openDeals).toBeGreaterThanOrEqual(0);
  });

  it("winRate è tra 0 e 100", () => {
    const kpis = getKpis("30d");
    expect(kpis.winRate).toBeGreaterThanOrEqual(0);
    expect(kpis.winRate).toBeLessThanOrEqual(100);
  });

  it("totalPipelineValue >= 0", () => {
    const kpis = getKpis("30d");
    expect(kpis.totalPipelineValue).toBeGreaterThanOrEqual(0);
  });

  it("funziona per tutti i periodi", () => {
    for (const period of ["7d", "30d", "90d", "12m"] as const) {
      const kpis = getKpis(period);
      expect(kpis).toBeDefined();
      expect(kpis.openDeals).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("reporting — getForecast", () => {
  it("restituisce un oggetto con forecast e pipeline", () => {
    const f = getForecast();
    expect(f).toHaveProperty("forecast");
    expect(f).toHaveProperty("pipeline");
    expect(f.forecast).toBeGreaterThanOrEqual(0);
    expect(f.pipeline).toBeGreaterThanOrEqual(0);
  });
});

describe("reporting — getFunnelData", () => {
  it("restituisce un array non vuoto", () => {
    const data = getFunnelData();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it("ogni item ha name e affari", () => {
    const data = getFunnelData();
    for (const item of data) {
      expect(item).toHaveProperty("name");
      expect(item).toHaveProperty("affari");
      expect(item).toHaveProperty("valore");
    }
  });
});

describe("reporting — getTrendData", () => {
  it("restituisce 6 mesi di dati", () => {
    const data = getTrendData();
    expect(data.length).toBe(6);
  });

  it("ogni item ha label, vinti, persi, valore", () => {
    const data = getTrendData();
    for (const item of data) {
      expect(item).toHaveProperty("label");
      expect(item).toHaveProperty("vinti");
      expect(item).toHaveProperty("persi");
      expect(item).toHaveProperty("valore");
    }
  });
});

describe("reporting — getTopPerformers", () => {
  it("restituisce almeno un performer", () => {
    const data = getTopPerformers();
    expect(data.length).toBeGreaterThanOrEqual(1);
  });

  it("ogni performer ha name, vinti, valore, winRate", () => {
    const data = getTopPerformers();
    for (const p of data) {
      expect(p).toHaveProperty("name");
      expect(p).toHaveProperty("vinti");
      expect(p).toHaveProperty("valore");
      expect(p).toHaveProperty("winRate");
      expect(p.winRate).toBeGreaterThanOrEqual(0);
      expect(p.winRate).toBeLessThanOrEqual(100);
    }
  });
});

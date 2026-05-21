"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getQuoteData, type QuoteData } from "@/server/actions/deals";

function formatEur(n: number, currency: string) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(n);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
}

async function generatePDF(q: QuoteData) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = 20;

  // -- Header: company name + info --
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(q.organization.name, margin, y);
  y += 7;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  const orgLines: string[] = [];
  if (q.organization.address) orgLines.push(q.organization.address);
  if (q.organization.city) orgLines.push(q.organization.city + (q.organization.country ? ` — ${q.organization.country}` : ""));
  if (q.organization.vatNumber) orgLines.push(`P.IVA: ${q.organization.vatNumber}`);
  if (q.organization.phone) orgLines.push(`Tel: ${q.organization.phone}`);
  if (q.organization.website) orgLines.push(q.organization.website);
  orgLines.forEach((line) => {
    doc.text(line, margin, y);
    y += 4;
  });

  // -- PREVENTIVO title + number --
  y += 6;
  doc.setTextColor(0);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("PREVENTIVO", margin, y);
  const quoteNum = `PRV-${q.deal.id.slice(-6).toUpperCase()}`;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(quoteNum, pageW - margin, y, { align: "right" });
  y += 8;

  // -- Meta info row --
  doc.setFontSize(9);
  doc.setTextColor(80);
  const metaLeft = `Data: ${formatDate(q.deal.createdAt)}`;
  const metaRight = q.deal.expectedClose ? `Validità: ${formatDate(q.deal.expectedClose)}` : "";
  doc.text(metaLeft, margin, y);
  if (metaRight) doc.text(metaRight, pageW - margin, y, { align: "right" });
  y += 3;

  // Separator line
  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // -- Destinatario --
  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Destinatario", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  if (q.company) {
    doc.setFont("helvetica", "bold");
    doc.text(q.company.name, margin, y);
    doc.setFont("helvetica", "normal");
    y += 4;
  }
  if (q.contact) {
    doc.text(`${q.contact.firstName} ${q.contact.lastName ?? ""}`.trim(), margin, y);
    y += 4;
    if (q.contact.email) { doc.text(q.contact.email, margin, y); y += 4; }
    if (q.contact.phone) { doc.text(q.contact.phone, margin, y); y += 4; }
  }

  // -- Oggetto --
  y += 4;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Oggetto", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(q.deal.title, margin, y);
  y += 8;

  // -- Products table --
  const tableHead = [["#", "Prodotto", "Qtà", "Prezzo unit.", "Sconto", "Imponibile", "IVA", "Totale"]];
  const tableBody = q.items.map((item, i) => [
    String(i + 1),
    item.name + (item.code ? ` (${item.code})` : ""),
    `${item.quantity} ${item.unit}`,
    formatEur(item.unitPrice, q.deal.currency),
    item.discount > 0 ? `${item.discount}%` : "—",
    formatEur(item.subtotal, q.deal.currency),
    `${item.taxRate}%`,
    formatEur(item.total, q.deal.currency),
  ]);

  autoTable(doc, {
    startY: y,
    head: tableHead,
    body: tableBody,
    margin: { left: margin, right: margin },
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold", fontSize: 7.5 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      2: { halign: "center" },
      3: { halign: "right" },
      4: { halign: "center" },
      5: { halign: "right" },
      6: { halign: "center" },
      7: { halign: "right", fontStyle: "bold" },
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8;

  // -- Totals box --
  const boxW = 75;
  const boxX = pageW - margin - boxW;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(boxX, y, boxW, 28, 2, 2, "F");

  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text("Imponibile:", boxX + 4, y + 7);
  doc.text(formatEur(q.totals.subtotal, q.deal.currency), boxX + boxW - 4, y + 7, { align: "right" });

  doc.text("IVA:", boxX + 4, y + 14);
  doc.text(formatEur(q.totals.tax, q.deal.currency), boxX + boxW - 4, y + 14, { align: "right" });

  doc.setDrawColor(200);
  doc.line(boxX + 4, y + 17, boxX + boxW - 4, y + 17);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("Totale:", boxX + 4, y + 24);
  doc.text(formatEur(q.totals.total, q.deal.currency), boxX + boxW - 4, y + 24, { align: "right" });

  // -- Footer --
  const footY = doc.internal.pageSize.getHeight() - 15;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150);
  doc.text(`${q.organization.name} — Preventivo ${quoteNum} — Generato il ${new Date().toLocaleDateString("it-IT")}`, pageW / 2, footY, { align: "center" });

  doc.save(`Preventivo_${quoteNum}.pdf`);
}

type Props = { dealId: string };

export function QuotePDFButton({ dealId }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const res = await getQuoteData(dealId);
      if (res.error || !res.data) {
        toast.error(res.error ?? "Errore nel caricamento dati");
        return;
      }
      await generatePDF(res.data);
      toast.success("Preventivo PDF generato!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Errore nella generazione PDF");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--crm-neutral-100)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--crm-neutral-50)] transition-colors disabled:opacity-50"
      title="Genera preventivo PDF"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5 text-[var(--crm-primary)]" />}
      Preventivo PDF
    </button>
  );
}

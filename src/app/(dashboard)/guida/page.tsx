"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Search, Rocket, GitBranch, Users, Zap, Calendar, Mail, Megaphone,
  BarChart3, Workflow, Package, Settings, ShieldCheck,
  Plug, Smartphone, CreditCard, HelpCircle, PlayCircle,
  ChevronRight, ChevronLeft, ArrowUpRight, BookOpen, Star,
  Clock, CheckCircle2, X, ExternalLink, Lightbulb, AlertTriangle, ListChecks,
  Layers,
} from "lucide-react";
import { GUIDE_SECTIONS, type GuideArticle, type GuideSection, type CrmModeId } from "@/lib/guide-data";
import { getCrmMode } from "@/server/actions/crm-mode";
import { CRM_MODES } from "@/types/crm-modes";

// ─── UI-only types (add icon/color/bgColor to GuideSection) ──────────────────

type Category = GuideSection & {
  icon: React.ElementType;
  color: string;
  bgColor: string;
};

type Article = GuideArticle;

// Map section id → icon + tailwind classes
const SECTION_META: Record<string, { icon: React.ElementType; color: string; bgColor: string }> = {
  inizia:       { icon: Rocket,     color: "text-violet-600",  bgColor: "bg-violet-50 dark:bg-violet-900/20" },
  pipeline:     { icon: GitBranch,  color: "text-blue-600",    bgColor: "bg-blue-50 dark:bg-blue-900/20" },
  contatti:     { icon: Users,      color: "text-emerald-600", bgColor: "bg-emerald-50 dark:bg-emerald-900/20" },
  lead:         { icon: Zap,        color: "text-yellow-600",  bgColor: "bg-yellow-50 dark:bg-yellow-900/20" },
  attivita:     { icon: Calendar,   color: "text-orange-600",  bgColor: "bg-orange-50 dark:bg-orange-900/20" },
  email:        { icon: Mail,       color: "text-sky-600",     bgColor: "bg-sky-50 dark:bg-sky-900/20" },
  campagne:     { icon: Megaphone,  color: "text-rose-600",    bgColor: "bg-rose-50 dark:bg-rose-900/20" },
  report:       { icon: BarChart3,  color: "text-indigo-600",  bgColor: "bg-indigo-50 dark:bg-indigo-900/20" },
  automazioni:  { icon: Workflow,   color: "text-pink-600",    bgColor: "bg-pink-50 dark:bg-pink-900/20" },
  prodotti:     { icon: Package,    color: "text-teal-600",    bgColor: "bg-teal-50 dark:bg-teal-900/20" },
  impostazioni: { icon: Settings,   color: "text-slate-600",   bgColor: "bg-slate-50 dark:bg-slate-800/40" },
  sicurezza:    { icon: ShieldCheck,color: "text-green-600",   bgColor: "bg-green-50 dark:bg-green-900/20" },
  integrazioni: { icon: Plug,       color: "text-purple-600",  bgColor: "bg-purple-50 dark:bg-purple-900/20" },
  mobile:       { icon: Smartphone, color: "text-cyan-600",    bgColor: "bg-cyan-50 dark:bg-cyan-900/20" },
  fatturazione: { icon: CreditCard, color: "text-amber-600",   bgColor: "bg-amber-50 dark:bg-amber-900/20" },
  problemi:     { icon: HelpCircle, color: "text-red-600",     bgColor: "bg-red-50 dark:bg-red-900/20" },
  tutorial:     { icon: PlayCircle, color: "text-rose-600",    bgColor: "bg-rose-50 dark:bg-rose-900/20" },
  settoriale:   { icon: Layers,     color: "text-fuchsia-600", bgColor: "bg-fuchsia-50 dark:bg-fuchsia-900/20" },
};

const CATEGORIES: Category[] = GUIDE_SECTIONS.map((s) => ({
  ...s,
  ...(SECTION_META[s.id] ?? { icon: HelpCircle, color: "text-slate-600", bgColor: "bg-slate-50" }),
}));
const POPULAR_ARTICLES = CATEGORIES.flatMap((c) =>
  c.articles.filter((a) => a.popular && !a.modes).map((a) => ({ ...a, category: c.label, categoryId: c.id, color: c.color, bgColor: c.bgColor, icon: c.icon }))
).slice(0, 6);

// ─── Sub-components ──────────────────────────────────────────────────────────

function CategoryCard({ cat, onClick }: { cat: Category; onClick: () => void }) {
  const Icon = cat.icon;
  return (
    <button
      onClick={onClick}
      className="group text-left rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-5 hover:border-[var(--crm-primary)]/40 hover:shadow-md transition-all duration-200"
    >
      <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${cat.bgColor} mb-4 group-hover:scale-105 transition-transform`}>
        <Icon className={`h-5 w-5 ${cat.color}`} />
      </div>
      <h3 className="font-semibold text-sm text-[var(--crm-neutral-900)] dark:text-white mb-1 group-hover:text-[var(--crm-primary)] transition-colors">
        {cat.label}
      </h3>
      <p className="text-xs text-[var(--crm-neutral-500)] leading-relaxed">
        {cat.description}
      </p>
      <div className="flex items-center gap-1 mt-3 text-xs font-medium text-[var(--crm-primary)] opacity-0 group-hover:opacity-100 transition-opacity">
        <span>Vedi articoli</span>
        <ChevronRight className="h-3 w-3" />
      </div>
    </button>
  );
}

function ArticleView({ article, cat, onBack }: { article: Article; cat: Category; onBack: () => void }) {
  const Icon = cat.icon;
  return (
    <div className="space-y-6 max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs text-[var(--crm-neutral-500)]">
        <button onClick={onBack} className="hover:text-[var(--crm-primary)] transition-colors">
          Tutte le categorie
        </button>
        <ChevronRight className="h-3 w-3" />
        <button onClick={onBack} className="hover:text-[var(--crm-primary)] transition-colors">
          {cat.label}
        </button>
        <ChevronRight className="h-3 w-3" />
        <span className="text-[var(--crm-neutral-900)] dark:text-white truncate">{article.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${cat.bgColor}`}>
          <Icon className={`h-6 w-6 ${cat.color}`} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--crm-neutral-900)] dark:text-white leading-snug">
            {article.title}
          </h1>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="flex items-center gap-1 text-xs text-[var(--crm-neutral-400)]">
              <Clock className="h-3 w-3" /> {article.readTime} min di lettura
            </span>
            {article.popular && (
              <span className="flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 text-xs font-medium text-amber-600">
                <Star className="h-2.5 w-2.5" /> Popolare
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {article.blocks ? (
        <div className="rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-6 space-y-5">
          {article.blocks.map((block, i) => {
            if (block.type === "heading") return (
              <h2 key={i} className="text-base font-semibold text-[var(--crm-neutral-900)] dark:text-white pt-2 first:pt-0">
                {block.text}
              </h2>
            );
            if (block.type === "para") return (
              <p key={i} className="text-sm text-[var(--crm-neutral-700)] dark:text-[var(--crm-neutral-300)] leading-relaxed">
                {block.text}
              </p>
            );
            if (block.type === "list") return (
              <ul key={i} className="space-y-1.5 pl-1">
                {block.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-[var(--crm-neutral-700)] dark:text-[var(--crm-neutral-300)]">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--crm-primary)] shrink-0" />
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            );
            if (block.type === "steps") return (
              <ol key={i} className="space-y-2 pl-1">
                {block.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-3 text-sm text-[var(--crm-neutral-700)] dark:text-[var(--crm-neutral-300)]">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--crm-primary)]/10 text-[10px] font-bold text-[var(--crm-primary)] mt-0.5">
                      {j + 1}
                    </span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ol>
            );
            if (block.type === "tip") return (
              <div key={i} className="flex items-start gap-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/40 px-4 py-3">
                <Lightbulb className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">{block.text}</p>
              </div>
            );
            if (block.type === "warning") return (
              <div key={i} className="flex items-start gap-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">{block.text}</p>
              </div>
            );
            if (block.type === "link") return (
              <a key={i} href={block.href} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-[var(--crm-primary)] hover:underline">
                {block.text} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            );
            return null;
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--crm-neutral-200)] dark:border-white/10 p-10 text-center">
          <ListChecks className="h-8 w-8 text-[var(--crm-neutral-300)] mx-auto mb-3" />
          <p className="text-sm font-medium text-[var(--crm-neutral-500)]">Articolo in fase di redazione</p>
          <p className="text-xs text-[var(--crm-neutral-400)] mt-1">Questo contenuto sarà disponibile a breve.</p>
        </div>
      )}

      {/* Footer nav */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-[var(--crm-neutral-500)] hover:text-[var(--crm-primary)] transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Torna a {cat.label}
        </button>
        <div className="flex items-center gap-2 rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] px-4 py-2 text-xs text-[var(--crm-neutral-500)]">
          Questo articolo ti è stato utile?
          <button className="ml-2 text-lg hover:scale-125 transition-transform" title="Sì">👍</button>
          <button className="text-lg hover:scale-125 transition-transform" title="No">👎</button>
        </div>
      </div>
    </div>
  );
}

function ArticleRow({ article, compact = false, onClick }: { article: Article; compact?: boolean; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className="flex items-start gap-3 py-3 border-b border-[var(--crm-neutral-100)] dark:border-white/10 last:border-0 group cursor-pointer hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 -mx-4 px-4 rounded-lg transition-colors"
    >
      <BookOpen className="h-4 w-4 text-[var(--crm-primary)] mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--crm-neutral-900)] dark:text-white group-hover:text-[var(--crm-primary)] transition-colors">
          {article.title}
        </p>
        {!compact && (
          <p className="text-xs text-[var(--crm-neutral-500)] mt-0.5 line-clamp-1">{article.excerpt}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="flex items-center gap-1 text-xs text-[var(--crm-neutral-400)]">
          <Clock className="h-3 w-3" /> {article.readTime} min
        </span>
        {article.popular && (
          <span className="hidden sm:flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 text-xs font-medium text-amber-600">
            <Star className="h-2.5 w-2.5" /> Popolare
          </span>
        )}
        <ChevronRight className="h-3.5 w-3.5 text-[var(--crm-neutral-300)] group-hover:text-[var(--crm-primary)] transition-colors" />
      </div>
    </div>
  );
}

function CategoryDetail({ cat, onBack, onArticleClick, crmMode }: { cat: Category; onBack: () => void; onArticleClick: (a: Article) => void; crmMode: CrmModeId }) {
  const Icon = cat.icon;
  const visibleArticles = cat.articles.filter((a) => !a.modes || a.modes.includes(crmMode));
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-[var(--crm-neutral-500)] hover:text-[var(--crm-neutral-900)] dark:hover:text-white transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Tutte le categorie</span>
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${cat.bgColor}`}>
          <Icon className={`h-7 w-7 ${cat.color}`} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--crm-neutral-900)] dark:text-white">{cat.label}</h1>
          <p className="text-sm text-[var(--crm-neutral-500)] mt-0.5">{cat.description}</p>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-5">
        <h2 className="text-sm font-semibold text-[var(--crm-neutral-900)] dark:text-white mb-1">
          {visibleArticles.length} articoli in questa categoria
        </h2>
        <p className="text-xs text-[var(--crm-neutral-500)] mb-4">Clicca su un articolo per leggere la guida completa.</p>
        <div>
          {visibleArticles.map((a) => (
            <ArticleRow key={a.id} article={a} onClick={() => onArticleClick(a)} />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[var(--crm-primary)]/20 bg-[var(--crm-primary)]/5 p-5 flex items-start gap-4">
        <HelpCircle className="h-5 w-5 text-[var(--crm-primary)] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-[var(--crm-neutral-900)] dark:text-white">
            Non hai trovato quello che cercavi?
          </p>
          <p className="text-xs text-[var(--crm-neutral-500)] mt-1">
            Il nostro team di supporto è disponibile dal lunedì al venerdì, 9:00—18:00 CET.
          </p>
          <Link href="/contatti" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[var(--crm-primary)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--crm-primary-dark)] transition-colors">
            <ArrowUpRight className="h-3.5 w-3.5" /> Contatta il supporto
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function GuidaPage() {
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [crmMode, setCrmMode] = useState<CrmModeId>("CLASSIC");

  useEffect(() => {
    getCrmMode().then(setCrmMode);
  }, []);

  const mainCategories = useMemo(() => CATEGORIES.filter((c) => c.id !== "settoriale"), []);

  const sectorCat = useMemo(() => CATEGORIES.find((c) => c.id === "settoriale"), []);
  const sectorArticles = useMemo(() => {
    if (!sectorCat || crmMode === "CLASSIC") return [];
    return sectorCat.articles.filter((a) => a.modes?.includes(crmMode));
  }, [sectorCat, crmMode]);

  const searchResults = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return [];
    return CATEGORIES.flatMap((c) =>
      c.articles
        .filter((a) =>
          (!a.modes || a.modes.includes(crmMode)) &&
          (a.title.toLowerCase().includes(q) || a.excerpt.toLowerCase().includes(q))
        )
        .map((a) => ({ ...a, category: c.label, categoryId: c.id, catIcon: c.icon, color: c.color, bgColor: c.bgColor }))
    );
  }, [search, crmMode]);

  if (selectedCat && selectedArticle && !search) {
    return (
      <div className="max-w-3xl mx-auto">
        <ArticleView
          article={selectedArticle}
          cat={selectedCat}
          onBack={() => setSelectedArticle(null)}
        />
      </div>
    );
  }

  if (selectedCat && !search) {
    return (
      <div className="max-w-3xl mx-auto space-y-0">
        <CategoryDetail
          cat={selectedCat}
          onBack={() => setSelectedCat(null)}
          onArticleClick={(a) => setSelectedArticle(a)}
          crmMode={crmMode}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--crm-primary)] to-indigo-700 px-8 py-10 text-white">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 0%, transparent 60%)" }} />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-5 w-5 opacity-80" />
            <span className="text-sm font-medium opacity-80">Centro Assistenza Pipely</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Come possiamo aiutarti?</h1>
          <p className="text-sm opacity-80 mb-6">Guide, tutorial e risposte per usare Pipely al meglio.</p>

          {/* Search bar */}
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--crm-primary)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca tra gli articoli... (es. &quot;importare contatti&quot;, &quot;pipeline&quot;)"
              className="w-full rounded-xl bg-white text-[var(--crm-neutral-900)] placeholder:text-[var(--crm-neutral-400)] pl-11 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 shadow-lg"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-[var(--crm-neutral-100)] text-[var(--crm-neutral-400)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick links */}
          <div className="flex flex-wrap gap-2 mt-4">
            {["Pipeline", "Contatti", "Campagne Email", "Automazioni", "SMTP"].map((tag) => (
              <button
                key={tag}
                onClick={() => setSearch(tag.toLowerCase())}
                className="rounded-full bg-white/15 hover:bg-white/25 px-3 py-1 text-xs font-medium transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search results */}
      {search && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--crm-neutral-900)] dark:text-white">
              {searchResults.length > 0
                ? `${searchResults.length} risultat${searchResults.length === 1 ? "o" : "i"} per "${search}"`
                : `Nessun risultato per "${search}"`}
            </h2>
            <button onClick={() => setSearch("")} className="text-xs text-[var(--crm-neutral-500)] hover:text-[var(--crm-primary)]">
              Annulla ricerca
            </button>
          </div>
          {searchResults.length > 0 ? (
            <div className="rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] divide-y divide-[var(--crm-neutral-100)] dark:divide-white/10">
              {searchResults.map((a) => {
                const Icon = a.catIcon;
                return (
                  <div
                    key={a.id}
                    className="flex items-start gap-4 px-5 py-4 hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 cursor-pointer transition-colors"
                    onClick={() => {
                      const cat = CATEGORIES.find((c) => c.id === a.categoryId);
                      if (cat) {
                        const art = cat.articles.find((x) => x.id === a.id);
                        setSearch(""); setSelectedCat(cat);
                        if (art) setSelectedArticle(art);
                      }
                    }}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${a.bgColor}`}>
                      <Icon className={`h-4 w-4 ${a.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--crm-neutral-900)] dark:text-white">{a.title}</p>
                      <p className="text-xs text-[var(--crm-neutral-500)] mt-0.5 line-clamp-1">{a.excerpt}</p>
                      <span className="text-xs text-[var(--crm-neutral-400)] mt-1 inline-block">{a.category}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[var(--crm-neutral-400)] shrink-0">
                      <Clock className="h-3 w-3" /> {a.readTime} min
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--crm-neutral-200)] dark:border-white/10 p-12 text-center">
              <Search className="h-8 w-8 text-[var(--crm-neutral-300)] mx-auto mb-3" />
              <p className="text-sm font-medium text-[var(--crm-neutral-500)]">Nessun articolo trovato</p>
              <p className="text-xs text-[var(--crm-neutral-400)] mt-1">Prova con parole chiave diverse o sfoglia le categorie qui sotto.</p>
              <button
                onClick={() => setSearch("")}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[var(--crm-primary)] px-4 py-2 text-xs font-medium text-white hover:bg-[var(--crm-primary-dark)] transition-colors"
              >
                Sfoglia le categorie
              </button>
            </div>
          )}
        </div>
      )}

      {!search && (
        <>
          {/* Getting started quick steps */}
          <div className="rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-6">
            <div className="flex items-center gap-2 mb-5">
              <Rocket className="h-4 w-4 text-[var(--crm-primary)]" />
              <h2 className="text-sm font-semibold text-[var(--crm-neutral-900)] dark:text-white">Inizia in 4 passi</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { step: "1", title: "Crea il tuo account", desc: "Registrati e configura la tua organizzazione", icon: CheckCircle2, color: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-900/20" },
                { step: "2", title: "Importa i contatti", desc: "Porta i tuoi dati esistenti con l'import CSV", icon: Users, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
                { step: "3", title: "Configura la pipeline", desc: "Definisci gli stage del tuo processo di vendita", icon: GitBranch, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20" },
                { step: "4", title: "Inizia a vendere", desc: "Crea i tuoi primi affari e traccia le trattative", icon: ArrowUpRight, color: "text-[var(--crm-primary)]", bg: "bg-[var(--crm-primary)]/10" },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.step} className="flex items-start gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${s.bg}`}>
                      <Icon className={`h-4 w-4 ${s.color}`} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[var(--crm-neutral-900)] dark:text-white">
                        <span className="text-[var(--crm-neutral-400)] mr-1">Passo {s.step} ·</span>{s.title}
                      </p>
                      <p className="text-xs text-[var(--crm-neutral-500)] mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Popular articles */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-[var(--crm-neutral-900)] dark:text-white">Articoli più letti</h2>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {POPULAR_ARTICLES.map((a) => {
                const Icon = a.icon;
                return (
                  <div
                    key={a.id}
                    className="group rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-4 cursor-pointer hover:border-[var(--crm-primary)]/40 hover:shadow-sm transition-all"
                    onClick={() => {
                      const cat = CATEGORIES.find((c) => c.id === a.categoryId);
                      if (cat) {
                        const art = cat.articles.find((x) => x.id === a.id);
                        setSelectedCat(cat);
                        if (art) setSelectedArticle(art);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${a.bgColor}`}>
                        <Icon className={`h-4 w-4 ${a.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[var(--crm-neutral-900)] dark:text-white group-hover:text-[var(--crm-primary)] transition-colors line-clamp-2">
                          {a.title}
                        </p>
                        <p className="text-xs text-[var(--crm-neutral-400)] mt-1">{a.category} · {a.readTime} min</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sector-specific articles strip */}
          {sectorArticles.length > 0 && sectorCat && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Layers className="h-4 w-4 text-fuchsia-600" />
                <h2 className="text-sm font-semibold text-[var(--crm-neutral-900)] dark:text-white">
                  Guide per {CRM_MODES[crmMode].name}
                </h2>
                <span className="rounded-full bg-fuchsia-50 dark:bg-fuchsia-900/20 px-2 py-0.5 text-xs font-medium text-fuchsia-600">
                  Il tuo setup
                </span>
              </div>
              <div className="rounded-xl border border-fuchsia-100 dark:border-fuchsia-800/30 bg-white dark:bg-[#1a1a2e] p-4 divide-y divide-[var(--crm-neutral-100)] dark:divide-white/10">
                {sectorArticles.map((a) => (
                  <ArticleRow
                    key={a.id}
                    article={a}
                    onClick={() => {
                      setSelectedCat(sectorCat);
                      setSelectedArticle(a);
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All categories */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-4 w-4 text-[var(--crm-primary)]" />
              <h2 className="text-sm font-semibold text-[var(--crm-neutral-900)] dark:text-white">Tutte le categorie</h2>
              <span className="rounded-full bg-[var(--crm-neutral-100)] dark:bg-white/10 px-2 py-0.5 text-xs text-[var(--crm-neutral-500)]">
                {mainCategories.length}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {mainCategories.map((cat) => (
                <CategoryCard key={cat.id} cat={cat} onClick={() => setSelectedCat(cat)} />
              ))}
            </div>
          </div>

          {/* Support banner */}
          <div className="rounded-xl border border-[var(--crm-neutral-100)] dark:border-white/10 bg-white dark:bg-[#1a1a2e] p-6 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--crm-primary)]/10">
              <HelpCircle className="h-7 w-7 text-[var(--crm-primary)]" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-[var(--crm-neutral-900)] dark:text-white">
                Hai ancora bisogno di aiuto?
              </h3>
              <p className="text-xs text-[var(--crm-neutral-500)] mt-1">
                Il team di supporto Pipely è disponibile dal lunedì al venerdì, 9:00—18:00 CET.
                Puoi anche consultare la nostra community o guardare i tutorial video.
              </p>
            </div>
            <div className="flex gap-2 shrink-0 flex-wrap justify-center">
              <button
                onClick={() => setSelectedCat(CATEGORIES.find((c) => c.id === "tutorial")!)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--crm-neutral-100)] dark:border-white/10 px-3 py-2 text-xs font-medium text-[var(--crm-neutral-700)] dark:text-white hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5 transition-colors"
              >
                <PlayCircle className="h-3.5 w-3.5 text-rose-600" /> Video tutorial
              </button>
              <Link href="/contatti" className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--crm-primary)] px-3 py-2 text-xs font-medium text-white hover:bg-[var(--crm-primary-dark)] transition-colors">
                <ArrowUpRight className="h-3.5 w-3.5" /> Contatta il supporto
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}


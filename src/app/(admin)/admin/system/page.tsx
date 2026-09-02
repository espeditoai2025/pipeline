import { getSystemSnapshot } from "@/server/actions/admin";
import { redirect } from "next/navigation";
import {
  CheckCircle2, XCircle, Database, Shield, BarChart3,
  Mail, Clock, ExternalLink, RefreshCw, ServerCrash,
  Zap, Lock,
} from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SystemPage() {
  const snap = await getSystemSnapshot();
  if (!snap) redirect("/dashboard");

  const collected = new Date(snap.collectedAt);

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Sistema & Monitoring</h1>
          <p className="text-sm text-slate-400 mt-0.5 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Snapshot raccolto alle {collected.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })} del{" "}
            {collected.toLocaleDateString("it-IT")}
          </p>
        </div>
        <Link
          href="/admin/system"
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 transition-colors"
        >
          <RefreshCw className="h-3 w-3" /> Aggiorna
        </Link>
      </div>

      {/* Servizi configurati */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Servizi</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <ServiceCard
            label="Sentry"
            desc="Error monitoring"
            enabled={snap.config.sentryEnabled}
            href={snap.links.sentry}
            icon={ServerCrash}
          />
          <ServiceCard
            label="PostHog"
            desc="Analytics"
            enabled={snap.config.posthogEnabled}
            href={snap.links.posthog}
            icon={BarChart3}
          />
          <ServiceCard
            label="Redis / Rate Limit"
            desc="Protezione spam"
            enabled={snap.config.redisEnabled}
            icon={Shield}
          />
          <ServiceCard
            label="Resend"
            desc="Email transazionale"
            enabled={snap.config.resendEnabled}
            icon={Mail}
          />
          <ServiceCard
            label="Stripe"
            desc="Pagamenti"
            enabled={snap.config.stripeEnabled}
            icon={Lock}
          />
          <ServiceCard
            label="CRON_SECRET"
            desc="Backup protetto"
            enabled={snap.config.cronSecret}
            icon={Clock}
          />
          <ServiceCard
            label="ADMIN_EMAIL"
            desc="Accesso admin"
            enabled={snap.config.adminEmail}
            icon={Shield}
          />
          <ServiceCard
            label="SMTP configurati"
            desc={`${snap.config.smtpOrgs} org${snap.config.smtpOrgs !== 1 ? "." : ""}`}
            enabled={snap.config.smtpOrgs > 0}
            icon={Mail}
          />
        </div>
      </section>

      {/* Snapshot database */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
          Database — snapshot corrente
        </h2>
        <div className="rounded-xl bg-slate-900 border border-white/10 overflow-hidden">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 divide-x divide-y divide-white/5">
            {[
              { label: "Organizzazioni", value: snap.db.orgs },
              { label: "Utenti", value: snap.db.users },
              { label: "Contatti", value: snap.db.contacts },
              { label: "Aziende", value: snap.db.companies },
              { label: "Deal", value: snap.db.deals },
              { label: "Lead", value: snap.db.leads },
              { label: "Attività", value: snap.db.activities },
              { label: "Campagne (totali)", value: snap.db.campaigns },
              { label: "Campagne inviate", value: snap.db.campaignsSent },
              { label: "Contatti lista email", value: snap.db.emailListContacts },
              { label: "Workflow", value: snap.db.workflows },
            ].map(({ label, value }) => (
              <div key={label} className="p-4">
                <p className="text-2xl font-bold text-white">{value.toLocaleString("it-IT")}</p>
                <p className="text-xs text-slate-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Log e pannelli esterni */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
          Log & Pannelli esterni
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ExternalPanel
            label="Vercel Function Logs"
            desc="Log JSON strutturati di tutti i server action e API route (logger.ts)"
            href={snap.links.vercelLogs}
            note="Filtra per livello: ERROR, WARN, INFO"
          />
          <ExternalPanel
            label="Sentry — Error Tracking"
            desc="Errori catturati automaticamente da server, client e edge runtime"
            href={snap.links.sentry}
            note={snap.config.sentryEnabled ? "Attivo" : "Configura SENTRY_DSN su Vercel"}
            warn={!snap.config.sentryEnabled}
          />
          <ExternalPanel
            label="PostHog — Analytics"
            desc="Pageview, eventi utente, session replay, funnel di conversione"
            href={snap.links.posthog}
            note={snap.config.posthogEnabled ? "Attivo" : "Configura NEXT_PUBLIC_POSTHOG_KEY su Vercel"}
            warn={!snap.config.posthogEnabled}
          />
          <ExternalPanel
            label="Supabase — Database Backup"
            desc="Backup automatici giornalieri del database PostgreSQL (piano Pro)"
            href={snap.links.supabase}
            note="Retention: 7gg (Pro) · 30gg (Team)"
          />
        </div>
      </section>

      {/* Backup cron */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
          Backup cron
        </h2>
        <div className="rounded-xl bg-slate-900 border border-white/10 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <Database className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-white">Snapshot giornaliero automatico</p>
              <p className="text-xs text-slate-400 mt-1">
                Ogni giorno alle <strong className="text-slate-300">02:00 UTC</strong> Vercel chiama{" "}
                <code className="bg-white/10 px-1 py-0.5 rounded text-indigo-300 text-[11px]">/api/cron/backup</code>.
                Lo snapshot viene loggato su Vercel Logs e inviato via email all&apos;admin.
              </p>
              <ul className="mt-2 space-y-1 text-xs text-slate-500">
                <li>• Protetto da <code className="bg-white/10 px-1 rounded text-slate-400">CRON_SECRET</code> — {snap.config.cronSecret ? "✅ configurato" : "⚠️ non configurato (impostalo su Vercel)"}</li>
                <li>• Email admin — {snap.config.adminEmail ? "✅ configurata" : "⚠️ ADMIN_EMAIL mancante"}</li>
                <li>• Resend (invio email) — {snap.config.resendEnabled ? "✅ attivo" : "⚠️ RESEND_API_KEY mancante"}</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-3">
            <p className="text-xs text-slate-500">
              <strong className="text-slate-400">Backup DB reale:</strong> gestito da Supabase (pg_dump automatico).
              Per ripristinare vai su Supabase Dashboard → Database → Backups.
            </p>
          </div>
        </div>
      </section>

      {/* Rate limiting */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">
          Rate limiting & protezione spam
        </h2>
        <div className="rounded-xl bg-slate-900 border border-white/10 p-5 space-y-4">
          <div className="flex items-center gap-2">
            {snap.config.redisEnabled
              ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              : <XCircle className="h-4 w-4 text-amber-400" />}
            <p className="text-sm font-medium text-white">
              Upstash Redis — {snap.config.redisEnabled ? "Attivo" : "Non configurato (fail-open)"}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-lg bg-white/5 p-3">
              <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Zap className="h-3 w-3 text-amber-400" /> Endpoint auth
              </p>
              <p className="text-xs text-slate-400 mt-1">
                <code className="text-slate-300">/api/auth/register</code><br />
                10 richieste / minuto / IP · Sliding window
              </p>
            </div>
            <div className="rounded-lg bg-white/5 p-3">
              <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Zap className="h-3 w-3 text-blue-400" /> API generiche
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Tutti gli endpoint protetti<br />
                60 richieste / minuto / IP · Sliding window
              </p>
            </div>
          </div>
          {!snap.config.redisEnabled && (
            <p className="text-xs text-amber-400 bg-amber-900/20 border border-amber-700/30 rounded-lg px-3 py-2">
              ⚠️ Configura <code>UPSTASH_REDIS_REST_URL</code> e <code>UPSTASH_REDIS_REST_TOKEN</code> su Vercel per attivare il rate limiting.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function ServiceCard({
  label, desc, enabled, href, icon: Icon,
}: {
  label: string; desc: string; enabled: boolean; href?: string | null; icon: React.ElementType;
}) {
  const inner = (
    <div className={`rounded-xl border p-4 space-y-2 transition-colors ${enabled ? "bg-slate-900 border-white/10" : "bg-amber-950/20 border-amber-700/30"}`}>
      <div className="flex items-center justify-between">
        <Icon className={`h-4 w-4 ${enabled ? "text-indigo-400" : "text-amber-400"}`} />
        {enabled
          ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          : <XCircle className="h-3.5 w-3.5 text-amber-400" />}
      </div>
      <p className="text-sm font-semibold text-white">{label}</p>
      <p className="text-xs text-slate-400">{desc}</p>
      {href && <ExternalLink className="h-3 w-3 text-slate-600" />}
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block hover:opacity-80 transition-opacity">
        {inner}
      </a>
    );
  }
  return inner;
}

function ExternalPanel({
  label, desc, href, note, warn = false,
}: {
  label: string; desc: string; href: string | null; note?: string; warn?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 space-y-2 ${warn ? "bg-amber-950/20 border-amber-700/30" : "bg-slate-900 border-white/10"}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-white">{label}</p>
        {href && (
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
            Apri <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <p className="text-xs text-slate-400">{desc}</p>
      {note && (
        <p className={`text-xs ${warn ? "text-amber-400" : "text-slate-500"}`}>{note}</p>
      )}
    </div>
  );
}

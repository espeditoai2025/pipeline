import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookie Policy — Pipely CRM",
  description: "Informativa sull'uso dei cookie di Pipely ai sensi dell'art. 122 del Codice Privacy e del GDPR. Quali cookie usiamo e come gestirli.",
  alternates: { canonical: "https://www.pipely.it/cookie" },
  openGraph: {
    title: "Cookie Policy — Pipely CRM",
    description: "Informativa sull'uso dei cookie di Pipely ai sensi del GDPR.",
    url: "https://www.pipely.it/cookie",
    images: [{ url: "https://www.pipely.it/opengraph-image", width: 1200, height: 630, alt: "Pipely CRM — Cookie Policy" }],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Cookie Policy — Pipely CRM",
  description: "Informativa sull'uso dei cookie di Pipely ai sensi del GDPR.",
  url: "https://www.pipely.it/cookie",
  isPartOf: { "@id": "https://www.pipely.it/#website" },
};

const LAST_UPDATED = "14 maggio 2026";

export default function CookiePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="prose prose-slate max-w-none">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Cookie Policy</h1>
      <p className="text-sm text-slate-400 mb-8">
        Ultimo aggiornamento: {LAST_UPDATED} · ai sensi dell&apos;art. 122 del D.Lgs. 196/2003 (Codice Privacy) e del Provvedimento del Garante dell&apos;8 maggio 2014
      </p>

      <Section title="1. Cosa sono i Cookie">
        <p>
          I cookie sono piccoli file di testo che i siti web salvano sul tuo dispositivo
          (computer, smartphone, tablet) quando li visiti. Vengono utilizzati per far
          funzionare il sito in modo efficiente, ricordare le tue preferenze e, con il
          tuo consenso, raccogliere informazioni statistiche sull'utilizzo.
        </p>
      </Section>

      <Section title="2. Cookie Utilizzati da Pipely">
        <p>La seguente tabella elenca tutti i cookie utilizzati dalla piattaforma:</p>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left p-3 border border-slate-200 font-semibold">Nome</th>
                <th className="text-left p-3 border border-slate-200 font-semibold">Tipo</th>
                <th className="text-left p-3 border border-slate-200 font-semibold">Durata</th>
                <th className="text-left p-3 border border-slate-200 font-semibold">Finalità</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["next-auth.session-token", "Tecnico / Sessione", "30 giorni", "Mantiene la sessione autenticata dell'utente. Strettamente necessario."],
                ["next-auth.csrf-token", "Tecnico / Sicurezza", "Sessione del browser", "Protezione contro attacchi CSRF. Strettamente necessario."],
                ["next-auth.callback-url", "Tecnico", "Sessione del browser", "Memorizza l'URL di redirect dopo il login. Strettamente necessario."],
                ["pipely_cookie_consent", "Preferenze", "12 mesi", "Salva la tua scelta sul consenso cookie (localStorage). Non è un cookie HTTP."],
                ["__vercel_live_token", "Tecnico (infrastruttura)", "Sessione", "Usato da Vercel per preview deployment. Non presente in produzione."],
              ].map(([nome, tipo, durata, finalita]) => (
                <tr key={nome} className="border-b border-slate-100">
                  <td className="p-3 border border-slate-200 font-mono text-xs text-slate-700">{nome}</td>
                  <td className="p-3 border border-slate-200 text-slate-600">{tipo}</td>
                  <td className="p-3 border border-slate-200 text-slate-600 whitespace-nowrap">{durata}</td>
                  <td className="p-3 border border-slate-200 text-slate-600">{finalita}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 rounded-lg bg-blue-50 border border-blue-100 p-4 text-sm text-blue-700">
          <strong>Nota:</strong> Pipely non utilizza cookie di profilazione, cookie di terze parti
          per pubblicità o cookie di tracciamento comportamentale. I cookie di sessione (autenticazione)
          sono strettamente necessari al funzionamento del servizio e non richiedono consenso ai sensi
          dell'art. 122, comma 1, del Codice Privacy.
        </div>
      </Section>

      <Section title="3. Pixel di Tracking nelle Email">
        <p>
          La funzionalità di email marketing di Pipely utilizza tecniche di tracking che,
          pur non essendo cookie, raccolgono dati simili:
        </p>
        <ul>
          <li>
            <strong>Pixel di apertura:</strong> un'immagine invisibile (1×1 pixel) incorporata
            nelle email delle campagne. Quando il destinatario apre l'email e il client email
            carica le immagini, viene registrata l'apertura con data/ora e indirizzo IP.
          </li>
          <li>
            <strong>Link tracciati (click tracking):</strong> i link nelle email vengono
            sostituiti con redirect tramite i server Pipely, permettendo di registrare i
            click prima di reindirizzare l'utente alla destinazione finale.
          </li>
        </ul>
        <p>
          Queste tecniche si applicano solo alle email inviate tramite la funzionalità
          campagne email e riguardano i <em>destinatari</em> delle campagne, non gli utenti
          della piattaforma. Gli utenti che utilizzano queste funzionalità devono informarne
          i propri destinatari nella propria privacy policy.
        </p>
      </Section>

      <Section title="4. Cookie di Terze Parti">
        <p>
          Pipely non integra cookie analytics di terze parti (Google Analytics, Hotjar, ecc.)
          nella versione attuale. Qualora venissero introdotti in futuro, la presente Policy
          verrà aggiornata con adeguato preavviso e richiesta di consenso.
        </p>
      </Section>

      <Section title="5. Come Gestire i Cookie">
        <p>
          Puoi gestire o eliminare i cookie in qualsiasi momento tramite le impostazioni
          del tuo browser. Di seguito le istruzioni per i principali browser:
        </p>
        <ul>
          <li>
            <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener" className="text-blue-600 hover:underline">
              Google Chrome
            </a>
          </li>
          <li>
            <a href="https://support.mozilla.org/it/kb/protezione-antitracciamento-avanzata-firefox" target="_blank" rel="noopener" className="text-blue-600 hover:underline">
              Mozilla Firefox
            </a>
          </li>
          <li>
            <a href="https://support.apple.com/it-it/guide/safari/sfri11471/mac" target="_blank" rel="noopener" className="text-blue-600 hover:underline">
              Safari
            </a>
          </li>
          <li>
            <a href="https://support.microsoft.com/it-it/microsoft-edge/eliminare-i-cookie-in-microsoft-edge-63947406" target="_blank" rel="noopener" className="text-blue-600 hover:underline">
              Microsoft Edge
            </a>
          </li>
        </ul>
        <p>
          <strong>Attenzione:</strong> la disabilitazione dei cookie tecnici/di sessione
          impedirà il corretto funzionamento dell'accesso alla piattaforma.
        </p>
        <p>
          Puoi anche revocare il consenso ai cookie analitici (ove presenti) tramite il
          banner cookie che appare al primo accesso al sito.
        </p>
      </Section>

      <Section title="6. Base Giuridica">
        <p>
          Il trattamento dei dati tramite cookie tecnici si basa sull'art. 122, comma 1,
          del D.Lgs. 196/2003 (Codice Privacy), che non richiede consenso per i cookie
          strettamente necessari all'erogazione del servizio.
        </p>
        <p>
          Per eventuali cookie analitici o di preferenza, la base giuridica è il consenso
          dell'utente (art. 6.1.a GDPR), liberamente prestato e revocabile in qualsiasi momento.
        </p>
      </Section>

      <Section title="7. Aggiornamenti">
        <p>
          Possiamo aggiornare questa Cookie Policy in risposta a modifiche tecnologiche,
          legali o operative. Le modifiche saranno pubblicate su questa pagina con data
          di aggiornamento. Ti consigliamo di consultarla periodicamente.
        </p>
      </Section>

      <div className="mt-10 rounded-xl bg-slate-50 border border-slate-200 p-6 text-sm text-slate-600">
        Per maggiori informazioni consulta la nostra{" "}
        <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>{" "}
        o scrivi a{" "}
        <a href="mailto:privacy@pipely.it" className="text-blue-600 hover:underline">privacy@pipely.it</a>.
      </div>
    </article>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">{title}</h2>
      <div className="space-y-3 text-slate-600 leading-relaxed text-[15px]">{children}</div>
    </section>
  );
}

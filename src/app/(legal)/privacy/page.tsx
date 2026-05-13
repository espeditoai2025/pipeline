import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Informativa sul trattamento dei dati personali ai sensi del GDPR (Reg. UE 2016/679)",
};

const LAST_UPDATED = "13 maggio 2025";

export default function PrivacyPage() {
  return (
    <article className="prose prose-slate max-w-none">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Informativa sulla Privacy</h1>
      <p className="text-sm text-slate-400 mb-8">
        Ultimo aggiornamento: {LAST_UPDATED} · ai sensi del Regolamento UE 2016/679 (GDPR)
      </p>

      <Section title="1. Titolare del Trattamento">
        <p>
          Il Titolare del trattamento dei dati personali è <strong>Pipely</strong> (di seguito "Pipely",
          "noi" o "ci"), raggiungibile all'indirizzo email{" "}
          <a href="mailto:privacy@pipely.it" className="text-blue-600 hover:underline">privacy@pipely.it</a>.
        </p>
        <p>
          Per qualsiasi richiesta relativa al trattamento dei tuoi dati personali puoi contattarci
          in qualsiasi momento a quell'indirizzo.
        </p>
      </Section>

      <Section title="2. Categorie di Dati Raccolti">
        <p>Raccogliamo le seguenti categorie di dati personali:</p>
        <ul>
          <li>
            <strong>Dati di registrazione:</strong> nome, cognome, indirizzo email, nome
            dell'organizzazione, password (conservata in forma cifrata con bcrypt).
          </li>
          <li>
            <strong>Dati di utilizzo del servizio:</strong> contatti, aziende, trattative (deal),
            attività, note, campagne email, lead e qualsiasi altro dato che inserisci nella
            piattaforma nell'ambito della tua attività commerciale.
          </li>
          <li>
            <strong>Dati tecnici:</strong> indirizzo IP, tipo di browser, sistema operativo,
            pagine visitate, data e ora degli accessi, log delle sessioni.
          </li>
          <li>
            <strong>Configurazioni SMTP:</strong> credenziali del server email inserite
            dall'utente, conservate in forma cifrata (AES-256).
          </li>
          <li>
            <strong>Dati di tracking email:</strong> se utilizzi le campagne email, raccogliamo
            dati sulle aperture (tramite pixel di tracciamento 1×1) e sui click dei link
            (tramite redirect tracciato) relativi ai destinatari delle campagne.
          </li>
        </ul>
      </Section>

      <Section title="3. Finalità e Basi Giuridiche del Trattamento">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left p-3 border border-slate-200 font-semibold">Finalità</th>
              <th className="text-left p-3 border border-slate-200 font-semibold">Base giuridica</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Erogazione del servizio CRM (account, pipeline, contatti, automazioni)", "Esecuzione del contratto (art. 6.1.b GDPR)"],
              ["Invio di email transazionali (conferma registrazione, notifiche)", "Esecuzione del contratto (art. 6.1.b GDPR)"],
              ["Sicurezza, prevenzione delle frodi e audit dei log", "Legittimo interesse (art. 6.1.f GDPR)"],
              ["Analisi anonimizzata dell'utilizzo per migliorare il servizio", "Legittimo interesse (art. 6.1.f GDPR)"],
              ["Comunicazioni commerciali e newsletter (solo con consenso)", "Consenso (art. 6.1.a GDPR)"],
              ["Adempimento di obblighi di legge (es. fatturazione)", "Obbligo legale (art. 6.1.c GDPR)"],
            ].map(([finalita, base]) => (
              <tr key={finalita} className="border-b border-slate-100">
                <td className="p-3 border border-slate-200 text-slate-600">{finalita}</td>
                <td className="p-3 border border-slate-200 text-slate-600">{base}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="4. Trattamento dei Dati dei Destinatari delle Campagne Email">
        <p>
          Quando utilizzi la funzionalità di email marketing, Pipely tratta i dati dei
          destinatari (nome, cognome, indirizzo email) in qualità di <strong>Responsabile
          del Trattamento</strong> per conto tuo, che rimani il Titolare del Trattamento
          per tali dati.
        </p>
        <p>
          È tua responsabilità assicurarti di disporre di una base giuridica valida (es. consenso,
          interesse legittimo, contratto) per inviare comunicazioni email ai tuoi contatti
          e per il tracking delle aperture e dei click.
        </p>
        <p>
          Il pixel di tracking è un'immagine 1×1 pixel incorporata nell'email. Quando il
          destinatario apre l'email e le immagini vengono caricate, viene registrata l'apertura
          con data/ora e IP. I redirect tracciati permettono di registrare i click sui link.
          Ti consigliamo di informare i tuoi destinatari di queste pratiche nella tua
          privacy policy.
        </p>
      </Section>

      <Section title="5. Conservazione dei Dati">
        <ul>
          <li>
            <strong>Dati dell'account:</strong> conservati per tutta la durata del contratto e
            per 12 mesi successivi alla cancellazione dell'account (salvo diversi obblighi di legge).
          </li>
          <li>
            <strong>Dati inseriti nella piattaforma (contatti, deal, ecc.):</strong> eliminati
            entro 30 giorni dalla cancellazione dell'account su richiesta espressa.
          </li>
          <li>
            <strong>Log di accesso e sicurezza:</strong> conservati per 90 giorni.
          </li>
          <li>
            <strong>Dati di tracking email:</strong> conservati per 24 mesi dalla data di invio
            della campagna.
          </li>
        </ul>
      </Section>

      <Section title="6. Comunicazione a Terzi e Trasferimenti">
        <p>I tuoi dati possono essere comunicati alle seguenti categorie di soggetti:</p>
        <ul>
          <li>
            <strong>Vercel Inc.</strong> (USA) — hosting e infrastruttura cloud. Trasferimento
            coperto da Standard Contractual Clauses (SCC).
          </li>
          <li>
            <strong>Neon / Supabase / PostgreSQL hosting provider</strong> — database. Ove
            applicabile, trasferimento coperto da SCC o hosting in UE.
          </li>
          <li>
            <strong>Resend Inc.</strong> (USA) — invio email transazionali (fallback). Trasferimento
            coperto da SCC.
          </li>
          <li>
            <strong>Anthropic PBC</strong> (USA) — elaborazione delle richieste AI Assistant.
            I prompt inviati all'AI includono dati della pipeline solo se l'utente avvia
            una richiesta. Trasferimento coperto da SCC.
          </li>
          <li>
            <strong>Autorità competenti:</strong> in caso di obbligo di legge o richiesta
            dell'autorità giudiziaria.
          </li>
        </ul>
        <p>
          Non vendiamo i tuoi dati personali a terzi né li utilizziamo per finalità
          di profilazione pubblicitaria.
        </p>
      </Section>

      <Section title="7. I Tuoi Diritti (GDPR)">
        <p>
          In qualità di interessato hai i seguenti diritti, esercitabili inviando una
          richiesta a{" "}
          <a href="mailto:privacy@pipely.it" className="text-blue-600 hover:underline">privacy@pipely.it</a>:
        </p>
        <ul>
          <li><strong>Accesso (art. 15):</strong> ottenere conferma che siano trattati dati che ti riguardano e riceverne una copia.</li>
          <li><strong>Rettifica (art. 16):</strong> correggere dati inesatti o incompleti.</li>
          <li><strong>Cancellazione ("diritto all'oblio", art. 17):</strong> ottenere la cancellazione dei tuoi dati.</li>
          <li><strong>Limitazione (art. 18):</strong> limitare il trattamento in determinati casi.</li>
          <li><strong>Portabilità (art. 20):</strong> ricevere i tuoi dati in formato strutturato e leggibile da macchina.</li>
          <li><strong>Opposizione (art. 21):</strong> opporti al trattamento basato su legittimo interesse.</li>
          <li><strong>Revoca del consenso:</strong> in qualsiasi momento, senza pregiudicare la liceità del trattamento precedente.</li>
          <li>
            <strong>Reclamo:</strong> presentare reclamo al Garante per la Protezione dei
            Dati Personali (<a href="https://www.garanteprivacy.it" className="text-blue-600 hover:underline" target="_blank" rel="noopener">garanteprivacy.it</a>).
          </li>
        </ul>
        <p>Risponderemo alla tua richiesta entro 30 giorni dalla ricezione.</p>
      </Section>

      <Section title="8. Cookie">
        <p>
          Utilizziamo cookie tecnici necessari al funzionamento del servizio (sessione,
          autenticazione) e, con il tuo consenso, cookie analitici. Per informazioni
          dettagliate consulta la nostra{" "}
          <Link href="/cookie" className="text-blue-600 hover:underline">Cookie Policy</Link>.
        </p>
      </Section>

      <Section title="9. Sicurezza">
        <p>
          Adottiamo misure tecniche e organizzative adeguate per proteggere i tuoi dati
          da accessi non autorizzati, perdita, distruzione o divulgazione, tra cui:
        </p>
        <ul>
          <li>Crittografia HTTPS (TLS 1.2+) per tutte le comunicazioni</li>
          <li>Password cifrate con bcrypt (cost factor ≥ 12)</li>
          <li>Credenziali SMTP cifrate con AES-256</li>
          <li>Sessioni con token firmati (JWT/NextAuth)</li>
          <li>Accesso ai dati limitato al personale autorizzato</li>
        </ul>
      </Section>

      <Section title="10. Modifiche alla presente Informativa">
        <p>
          Possiamo aggiornare questa informativa periodicamente. Le modifiche sostanziali
          saranno comunicate via email o tramite avviso nell'applicazione almeno 15 giorni
          prima dell'entrata in vigore. Il proseguimento nell'utilizzo del servizio dopo
          tale data costituisce accettazione delle modifiche.
        </p>
      </Section>

      <div className="mt-10 rounded-xl bg-slate-50 border border-slate-200 p-6 text-sm text-slate-600">
        <strong>Contatti:</strong> Per qualsiasi domanda sulla privacy scrivi a{" "}
        <a href="mailto:privacy@pipely.it" className="text-blue-600 hover:underline">privacy@pipely.it</a>.
      </div>
    </article>
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

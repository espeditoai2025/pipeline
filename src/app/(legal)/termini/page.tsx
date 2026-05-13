import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termini di Servizio",
  description: "Condizioni generali di utilizzo di Pipely CRM",
};

const LAST_UPDATED = "13 maggio 2025";

export default function TerminiPage() {
  return (
    <article className="prose prose-slate max-w-none">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Termini di Servizio</h1>
      <p className="text-sm text-slate-400 mb-8">
        Ultimo aggiornamento: {LAST_UPDATED} · Leggere attentamente prima di utilizzare il servizio.
      </p>

      <Section title="1. Accettazione dei Termini">
        <p>
          Accedendo o utilizzando Pipely (il "Servizio") accetti di essere vincolato dai
          presenti Termini di Servizio ("Termini"). Se utilizzi il Servizio per conto di
          un'organizzazione, accetti i presenti Termini per conto di tale organizzazione.
        </p>
        <p>
          Se non accetti i Termini, non puoi utilizzare il Servizio. L'utilizzo continuato
          dopo la pubblicazione di modifiche costituisce accettazione delle stesse.
        </p>
      </Section>

      <Section title="2. Descrizione del Servizio">
        <p>
          Pipely è una piattaforma CRM (Customer Relationship Management) SaaS che offre,
          tra le altre funzionalità:
        </p>
        <ul>
          <li>Gestione pipeline di vendita con vista Kanban</li>
          <li>Rubrica contatti e aziende</li>
          <li>Calendario attività e task</li>
          <li>Report e analytics</li>
          <li>Campagne email con tracking aperture e click</li>
          <li>Configurazione SMTP personalizzata</li>
          <li>Automazioni e workflow</li>
          <li>AI Assistant integrato (piano Pro)</li>
          <li>Gestione lead e import da file XLS/CSV</li>
        </ul>
        <p>
          Le funzionalità disponibili dipendono dal piano sottoscritto. Ci riserviamo il
          diritto di modificare, aggiungere o rimuovere funzionalità con ragionevole preavviso.
        </p>
      </Section>

      <Section title="3. Account e Registrazione">
        <p>Per utilizzare il Servizio è necessario creare un account. Ti impegni a:</p>
        <ul>
          <li>Fornire informazioni accurate, complete e aggiornate durante la registrazione.</li>
          <li>Mantenere la riservatezza delle tue credenziali di accesso.</li>
          <li>Notificarci immediatamente in caso di accesso non autorizzato al tuo account.</li>
          <li>Essere responsabile di tutte le attività svolte tramite il tuo account.</li>
        </ul>
        <p>
          Non puoi creare un account per conto di un'altra persona senza autorizzazione,
          né creare più di un account per organizzazione senza nostra autorizzazione scritta.
        </p>
      </Section>

      <Section title="4. Piani e Pagamento">
        <p>Pipely offre i seguenti piani:</p>
        <ul>
          <li>
            <strong>Starter (gratuito):</strong> 1 pipeline, fino a 500 contatti, funzionalità
            di base. Nessuna carta di credito richiesta.
          </li>
          <li>
            <strong>Pro (€29/mese o €290/anno):</strong> pipeline illimitate, contatti illimitati,
            AI Assistant, automazioni, campagne email, SMTP personalizzato.
          </li>
          <li>
            <strong>Enterprise:</strong> soluzione personalizzata, contattare il supporto.
          </li>
        </ul>
        <p>
          I pagamenti sono elaborati in modo sicuro. I prezzi si intendono IVA esclusa ove
          applicabile. Gli abbonamenti si rinnovano automaticamente salvo disdetta prima
          del rinnovo. Non è previsto rimborso per periodi parziali già fatturati, salvo
          diverso accordo scritto o obbligo di legge.
        </p>
        <p>
          In caso di mancato pagamento, il piano verrà automaticamente declassato a Starter
          dopo un periodo di grazia di 7 giorni, senza perdita dei dati.
        </p>
      </Section>

      <Section title="5. Uso Accettabile">
        <p>Accetti di non utilizzare il Servizio per:</p>
        <ul>
          <li>Attività illegali o fraudolente.</li>
          <li>Inviare spam, email non sollecitate o comunicazioni in violazione del GDPR o del CAN-SPAM.</li>
          <li>Caricare, trasmettere o distribuire virus, malware o altro codice dannoso.</li>
          <li>Tentare di accedere senza autorizzazione a sistemi, dati o account di altri utenti.</li>
          <li>Sovraccaricare intenzionalmente l'infrastruttura del Servizio (DoS/DDoS).</li>
          <li>Raccogliere dati di altri utenti senza consenso.</li>
          <li>Violare diritti di proprietà intellettuale di terzi.</li>
          <li>Rivendere o sublicenziare il Servizio senza autorizzazione scritta.</li>
        </ul>
        <p>
          Ci riserviamo il diritto di sospendere o terminare account che violino queste condizioni,
          anche senza preavviso in caso di violazioni gravi.
        </p>
      </Section>

      <Section title="6. Dati e Privacy">
        <p>
          Il trattamento dei tuoi dati personali è disciplinato dalla nostra{" "}
          <Link href="/privacy" className="text-blue-600 hover:underline">Informativa sulla Privacy</Link>,
          che costituisce parte integrante dei presenti Termini.
        </p>
        <p>
          I dati che inserisci nella piattaforma (contatti, deal, note, ecc.) rimangono di
          tua proprietà. Pipely non rivendica alcun diritto su tali dati. Ti garantiamo la
          possibilità di esportare i tuoi dati in qualsiasi momento e di richiederne la
          cancellazione alla chiusura dell'account.
        </p>
        <p>
          Agendo come Responsabile del Trattamento per i dati dei destinatari delle tue
          campagne email, Pipely tratta tali dati esclusivamente secondo le tue istruzioni e
          in conformità al GDPR.
        </p>
      </Section>

      <Section title="7. Proprietà Intellettuale">
        <p>
          Pipely e i suoi licenzianti detengono tutti i diritti di proprietà intellettuale
          sul Servizio, inclusi software, design, logo, testi e documentazione.
        </p>
        <p>
          Ti concediamo una licenza limitata, non esclusiva, non trasferibile e revocabile
          per utilizzare il Servizio esclusivamente per le finalità previste dai presenti Termini.
        </p>
        <p>
          Fornendo feedback, suggerimenti o segnalazioni di bug, ci concedi il diritto di
          utilizzarli senza obbligo di compensazione.
        </p>
      </Section>

      <Section title="8. Disponibilità e SLA">
        <p>
          Ci impegniamo a garantire una disponibilità del Servizio pari o superiore al
          <strong> 99,5%</strong> su base mensile, esclusi interventi di manutenzione
          programmata (comunicati con almeno 24 ore di preavviso) e cause di forza maggiore.
        </p>
        <p>
          Non garantiamo che il Servizio sia privo di errori o interruzioni. In caso di
          indisponibilità prolungata imputabile a Pipely, potrai richiedere un credito
          proporzionale al periodo di downtime.
        </p>
      </Section>

      <Section title="9. Limitazione di Responsabilità">
        <p>
          Nei limiti consentiti dalla legge applicabile, Pipely non sarà responsabile per
          danni indiretti, incidentali, speciali, consequenziali o punitivi, inclusa la
          perdita di profitti, dati o opportunità commerciali, anche se informata della
          possibilità di tali danni.
        </p>
        <p>
          La responsabilità complessiva di Pipely nei tuoi confronti per qualsiasi causa
          non supererà l'importo da te pagato nei 12 mesi precedenti l'evento che ha
          dato origine alla richiesta, o €100 se non hai effettuato pagamenti.
        </p>
        <p>
          Queste limitazioni non si applicano in caso di dolo, colpa grave o in altri casi
          in cui la legge non consente l'esclusione di responsabilità.
        </p>
      </Section>

      <Section title="10. Durata e Risoluzione">
        <p>
          I presenti Termini rimangono in vigore finché utilizzi il Servizio. Puoi risolvere
          il contratto in qualsiasi momento cancellando il tuo account dalle impostazioni.
        </p>
        <p>
          Possiamo sospendere o terminare il tuo accesso in caso di violazione dei presenti
          Termini, mancato pagamento o per giustificato motivo, con un preavviso di almeno
          30 giorni salvo violazioni gravi che richiedano azione immediata.
        </p>
        <p>
          Alla risoluzione, potrai richiedere l'export dei tuoi dati entro 30 giorni.
          Successivamente i dati verranno eliminati in conformità alla nostra Privacy Policy.
        </p>
      </Section>

      <Section title="11. Modifiche ai Termini">
        <p>
          Possiamo modificare i presenti Termini notificandoti via email o tramite avviso
          nell'applicazione almeno <strong>15 giorni</strong> prima dell'entrata in vigore.
          Se le modifiche sono sostanziali, il preavviso sarà di almeno 30 giorni.
        </p>
        <p>
          Se non accetti le modifiche, puoi risolvere il contratto prima della data di
          entrata in vigore senza penali.
        </p>
      </Section>

      <Section title="12. Legge Applicabile e Foro Competente">
        <p>
          I presenti Termini sono regolati dal diritto italiano. Per qualsiasi controversia
          relativa ai presenti Termini sarà competente il Tribunale di riferimento della sede
          legale di Pipely, fermo restando il diritto del consumatore di adire il foro del
          proprio domicilio ai sensi del Codice del Consumo (D.Lgs. 206/2005).
        </p>
        <p>
          Per la risoluzione stragiudiziale delle controversie, puoi accedere alla piattaforma
          ODR della Commissione Europea disponibile all'indirizzo{" "}
          <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener" className="text-blue-600 hover:underline">
            ec.europa.eu/consumers/odr
          </a>.
        </p>
      </Section>

      <Section title="13. Contatti">
        <p>
          Per qualsiasi domanda sui presenti Termini scrivi a{" "}
          <a href="mailto:support@pipely.it" className="text-blue-600 hover:underline">support@pipely.it</a>.
        </p>
      </Section>
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

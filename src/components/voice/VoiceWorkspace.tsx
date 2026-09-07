"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Mic, Square, Loader2 } from "lucide-react";
import { listVoiceNotes, saveVoiceTranscript, deleteVoiceNote, searchVoiceTargets, updateVoiceNoteDetails } from "@/server/actions/voice";
import { prepareCrmCommand, executeCrmCommand } from "@/server/actions/crm-commands";
import { MAX_VOICE_SECONDS, MAX_VOICE_BYTES, type VoiceNoteSummary } from "@/lib/voice";
import type { CrmCommandPreview } from "@/lib/crm-command-schema";

type Target = { id: string; kind: "deal" | "contact"; name: string };
const inputClass = "w-full rounded-lg border border-[var(--crm-neutral-200)] bg-transparent p-3 text-sm";
const buttonClass = "rounded-lg border border-[var(--crm-neutral-200)] px-3 py-2 text-sm disabled:opacity-50";

function SavedNote({ note, selectedTarget, canEdit, ai, onRefresh, onCommand, onError }: { note: VoiceNoteSummary; selectedTarget: Target | null; canEdit: boolean; ai: boolean; onRefresh: () => void; onCommand: (text: string, target: Target | null) => void; onError: (error: string) => void }) {
  const [text, setText] = useState(note.transcript);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editedTitle, setEditedTitle] = useState(note.title);
  const [linkChoice, setLinkChoice] = useState("current");
  async function run(operation: () => Promise<{ error?: string }>) {
    if (busy) return; setBusy(true);
    try { const result = await operation(); if (result.error) onError(result.error); else onRefresh(); }
    catch { onError("Operazione non confermata. Aggiorna l’elenco prima di riprovare."); }
    finally { setBusy(false); }
  }
  return <article className="space-y-3 rounded-xl border border-[var(--crm-neutral-200)] bg-white p-4 dark:bg-white/5">
    <div className="flex flex-wrap justify-between gap-2"><h3 className="break-words font-semibold">{note.title}</h3><span className="text-xs text-[var(--crm-neutral-500)]">{new Date(note.createdAt).toLocaleDateString("it-IT")} · {note.duration}s</span></div>
    {/* Audio is fetched only when played, with the current CRM session. */}
    <audio controls preload="none" src={"/api/voice/" + note.id} className="w-full" aria-label={"Ascolta " + note.title} />
    {(note.dealId || note.contactId) && <Link href={(note.dealId ? "/deals/" + note.dealId : "/contacts/" + note.contactId)} className="block text-sm underline">Apri {note.dealId ? "affare" : "contatto"} collegato</Link>}
    <label className="block space-y-1 text-sm">Trascrizione<textarea aria-label={"Trascrizione di " + note.title} rows={4} maxLength={12000} value={text} readOnly={!canEdit} disabled={busy} onChange={e => setText(e.target.value)} className={inputClass} placeholder="Trascrivi l’audio oppure scrivi il testo qui." /></label>
    {canEdit && <div className="flex flex-wrap gap-2">
      {ai && !note.transcript && <button className={buttonClass} disabled={busy} onClick={() => run(async () => { const response = await fetch("/api/voice/" + note.id + "/transcribe", { method: "POST" }); const result = await response.json(); if (result.text) setText(result.text); return result; })}>{busy ? "Elaborazione…" : "Trascrivi con AI"}</button>}
      <button className={buttonClass} disabled={busy || text === note.transcript} onClick={() => run(() => saveVoiceTranscript(note.id, text))}>Salva testo</button>
      {ai && <button className={buttonClass} disabled={busy || !text.trim()} onClick={() => onCommand(text, note.dealId ? { id: note.dealId, kind: "deal", name: note.targetName ?? "Affare della nota: " + note.title } : note.contactId ? { id: note.contactId, kind: "contact", name: note.targetName ?? "Contatto della nota: " + note.title } : null)}>Usa come comando</button>}
      <button className={buttonClass} disabled={busy} onClick={() => setDeleting(true)}>Elimina nota</button>
    </div>}
    {canEdit && <details className="rounded-lg border border-[var(--crm-neutral-200)] p-3 text-sm">
      <summary className="cursor-pointer">Modifica titolo e collegamento</summary>
      <form className="mt-3 space-y-3" onSubmit={event => { event.preventDefault(); void run(() => {
        const linked = linkChoice === "selected" ? selectedTarget : linkChoice === "none" ? null : note.dealId ? { kind: "deal" as const, id: note.dealId } : note.contactId ? { kind: "contact" as const, id: note.contactId } : null;
        return updateVoiceNoteDetails({ id: note.id, title: editedTitle, kind: linked?.kind ?? "none", targetId: linked?.id ?? "" });
      }); }}>
        <label className="block space-y-1">Titolo della nota<input className={inputClass} required maxLength={200} value={editedTitle} disabled={busy} onChange={event => setEditedTitle(event.target.value)} /></label>
        <label className="block space-y-1">Collegamento della nota<select aria-label="Collegamento della nota" className={inputClass} value={linkChoice} disabled={busy} onChange={event => setLinkChoice(event.target.value)}>
          <option value="current">Mantieni: {note.targetName ?? (note.dealId ? "affare attuale" : note.contactId ? "contatto attuale" : "nessuno")}</option>
          <option value="none">Nessun collegamento</option>
          {selectedTarget && <option value="selected">Collega a {selectedTarget.name}</option>}
        </select></label>
        <p className="text-xs">Per scegliere un altro destinatario, usa la ricerca record in questa pagina. La registrazione e il testo vengono conservati.</p>
        <button className={buttonClass} disabled={busy || !editedTitle.trim() || (linkChoice === "selected" && !selectedTarget)}>Salva titolo e collegamento</button>
      </form>
    </details>}
    {deleting && <div className="rounded-lg border border-rose-300 p-3 text-sm"><p>Eliminare questa registrazione e la sua trascrizione?</p><div className="mt-2 flex gap-2"><button disabled={busy} className={buttonClass} onClick={() => run(() => deleteVoiceNote(note.id))}>Conferma eliminazione</button><button disabled={busy} className={buttonClass} onClick={() => setDeleting(false)}>Annulla</button></div></div>}
  </article>;
}

export function VoiceWorkspace({ initialNotes, initialTarget = null, canWrite, canManage, userId, ai, maxNotes }: { initialNotes: VoiceNoteSummary[]; initialTarget?: Target | null; canWrite: boolean; canManage: boolean; userId: string; ai: boolean; maxNotes: number }) {
  const [notes, setNotes] = useState(initialNotes);
  const [title, setTitle] = useState("");
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [audio, setAudio] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [requestId, setRequestId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [targets, setTargets] = useState<Target[]>([]);
  const [target, setTarget] = useState<Target | null>(initialTarget);
  const [command, setCommand] = useState("");
  const [preview, setPreview] = useState<CrmCommandPreview | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const started = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mounted = useRef(true);
  const pending = useRef(false);
  const commandPanel = useRef<HTMLDivElement>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; if (timer.current) clearInterval(timer.current); if (recorder.current?.state === "recording") recorder.current.stop(); stream.current?.getTracks().forEach(track => track.stop()); }; }, []);
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);
  async function refresh() {
    const result = await listVoiceNotes(); if (result.error) setError(result.error); else setNotes(result.data ?? []);
  }
  function stop() { if (recorder.current?.state === "recording") recorder.current.stop(); }
  async function start() {
    if (pending.current) return; pending.current = true; setBusy(true); setError(""); setNotice("");
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw new Error("Registrazione non supportata in questo browser. Usa un browser aggiornato con HTTPS.");
      const capture = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current) { capture.getTracks().forEach(track => track.stop()); return; }
      stream.current = capture;
      const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find(type => MediaRecorder.isTypeSupported(type));
      if (!mime) throw new Error("Formato di registrazione non supportato dal browser.");
      const media = new MediaRecorder(capture, { mimeType: mime, audioBitsPerSecond: 64000 }); recorder.current = media;
      const chunks: Blob[] = []; let bytes = 0;
      media.ondataavailable = event => { if (event.data.size) { chunks.push(event.data); bytes += event.data.size; if (bytes > MAX_VOICE_BYTES) stop(); } };
      media.onstop = () => {
        if (timer.current) clearInterval(timer.current); capture.getTracks().forEach(track => track.stop());
        if (!mounted.current) return;
        setRecording(false); setSeconds(Math.min(MAX_VOICE_SECONDS, Math.max(1, Math.ceil((Date.now() - started.current) / 1000))));
        if (bytes > MAX_VOICE_BYTES) { setError("Registrazione oltre 3 MB. Registra una nota più breve."); return; }
        const blob = new Blob(chunks, { type: media.mimeType });
        setAudio(blob); setAudioUrl(URL.createObjectURL(blob)); setRequestId(crypto.randomUUID());
      };
      media.onerror = () => { capture.getTracks().forEach(track => track.stop()); if (timer.current) clearInterval(timer.current); setRecording(false); setError("Registrazione interrotta dal browser."); };
      setAudio(null); setAudioUrl(""); setSeconds(0); started.current = Date.now(); setRecording(true); media.start(1000);
      timer.current = setInterval(() => { const elapsed = Math.floor((Date.now() - started.current) / 1000); setSeconds(Math.min(elapsed, MAX_VOICE_SECONDS)); if (elapsed >= MAX_VOICE_SECONDS) stop(); }, 250);
    } catch (caught) { stream.current?.getTracks().forEach(track => track.stop()); setError(caught instanceof Error && caught.name === "NotAllowedError" ? "Consenti l’accesso al microfono per registrare una nota." : caught instanceof Error ? caught.message : "Microfono non disponibile."); }
    finally { pending.current = false; setBusy(false); }
  }
  async function save() {
    if (!audio || pending.current) return; pending.current = true; setBusy(true); setError("");
    try {
      const form = new FormData(); form.set("id", requestId); form.set("title", title.trim() || "Nota vocale"); form.set("duration", String(seconds)); form.set("audio", audio, "nota"); form.set("dealId", target?.kind === "deal" ? target.id : ""); form.set("contactId", target?.kind === "contact" ? target.id : "");
      const response = await fetch("/api/voice", { method: "POST", body: form }); const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Salvataggio non riuscito");
      setAudio(null); setAudioUrl(""); setTitle(""); setNotice("Nota salvata. Puoi ascoltarla o trascriverla dall’elenco."); await refresh();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Salvataggio non confermato. Riprova da qui: la nota non verrà duplicata."); }
    finally { pending.current = false; setBusy(false); }
  }
  async function interpret() {
    if (!target || pending.current) return; pending.current = true; setBusy(true); setError(""); setPreview(null);
    try { const result = await prepareCrmCommand({ text: command, kind: target.kind, targetId: target.id }); if (result.error) setError(result.error); else setPreview(result.data ?? null); }
    catch { setError("Interpretazione non riuscita. Riprova."); }
    finally { pending.current = false; setBusy(false); }
  }
  async function execute() {
    if (!preview || pending.current) return; pending.current = true; setBusy(true); setError("");
    try { const result = await executeCrmCommand(preview.id); if (result.error) setError(result.error); else { setNotice(result.message ?? "Comando eseguito"); setPreview(null); setCommand(""); } }
    catch { setError("Esito non confermato. Puoi riprovare questa stessa anteprima senza duplicare le modifiche."); }
    finally { pending.current = false; setBusy(false); }
  }
  return <div className="mx-auto max-w-4xl space-y-6">
    <header><h1 className="text-2xl font-bold">Note vocali e comandi</h1><p className="mt-2 text-sm text-[var(--crm-neutral-500)]">Registra fino a 2 minuti per nota. {notes.length}/{maxNotes} note salvate · spazio condiviso massimo 50 MB.</p></header>
    {error && <p role="alert" className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
    {notice && <p role="status" className="rounded-lg border border-emerald-300 p-3 text-sm">{notice}</p>}
    {canWrite && <section className="space-y-4 rounded-xl border border-[var(--crm-neutral-200)] p-4">
      <h2 className="font-semibold">Nuova nota</h2>
      <label className="block space-y-1 text-sm">Titolo<input disabled={busy || recording} className={inputClass} value={title} maxLength={200} onChange={e => setTitle(e.target.value)} placeholder="Es. Incontro con Studio Rossi" /></label>
      <div className="flex flex-wrap items-center gap-3"><button disabled={busy || (!recording && notes.length >= maxNotes)} className={buttonClass + " inline-flex items-center gap-2"} onClick={recording ? stop : start}>{recording ? <Square size={16} /> : <Mic size={16} />}{recording ? "Ferma registrazione" : audio ? "Registra di nuovo" : "Registra nota"}</button><span aria-live="polite">{seconds}s / 120s</span></div>
      {audio && !recording && <><audio controls src={audioUrl} className="w-full" aria-label="Anteprima registrazione" /><button disabled={busy} className={buttonClass} onClick={save}>{busy ? "Salvataggio…" : "Salva registrazione"}</button></>}
    </section>}
    {canWrite && <section ref={commandPanel} className="space-y-4 rounded-xl border border-[var(--crm-neutral-200)] p-4">
      <h2 className="font-semibold">Collegamento e comandi CRM</h2>
      <p className="text-sm text-[var(--crm-neutral-500)]">Seleziona il record a cui collegare la nuova nota o applicare un comando.</p>
      <label className="block text-sm">Cerca affare o contatto<input className={inputClass} value={query} maxLength={200} disabled={busy || recording} onChange={e => setQuery(e.target.value)} /></label>
      <button disabled={busy || recording} className={buttonClass} onClick={async () => { setBusy(true); try { const result = await searchVoiceTargets(query); if (result.error) setError(result.error); setTargets(result.data ?? []); } catch { setError("Ricerca non riuscita"); } finally { setBusy(false); } }}>Cerca record</button>
      {targets.length > 0 && <select aria-label="Seleziona record CRM" className={inputClass} disabled={busy || recording} value={target ? target.kind + ":" + target.id : ""} onChange={e => { setTarget(targets.find(row => row.kind + ":" + row.id === e.target.value) ?? null); setPreview(null); }}><option value="">Scegli un record</option>{targets.map(row => <option key={row.kind + row.id} value={row.kind + ":" + row.id}>{row.kind === "deal" ? "Affare" : "Contatto"}: {row.name}</option>)}</select>}
      {target && <p className="text-sm">Selezionato: <strong>{target.name}</strong> <button disabled={busy || recording} className="ml-2 underline" onClick={() => { setTarget(null); setPreview(null); }}>Rimuovi</button></p>}
      {ai ? <>
        <label className="block space-y-1 text-sm">Comando<textarea className={inputClass} rows={4} maxLength={6000} value={command} disabled={busy} onChange={e => { setCommand(e.target.value); setPreview(null); }} placeholder="Segna l’affare come vinto e crea un’attività per richiamare il cliente domani alle 10." /></label>
        <p className="text-xs text-[var(--crm-neutral-500)]">L’audio da trascrivere e il testo dei comandi vengono elaborati dal servizio AI di Pipely. Puoi creare note, pianificare attività e modificare stato, valore o fase dell’affare selezionato. 50 elaborazioni al giorno per organizzazione, condivise con le trascrizioni.</p>
        <button disabled={busy || !target || command.trim().length < 3} className={buttonClass} onClick={interpret}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mostra anteprima del comando"}</button>
        {preview && <div className="space-y-3 rounded-xl border border-[var(--crm-primary)] p-4"><h3 className="font-semibold">Modifiche a {preview.targetName}</h3><ul className="list-inside list-disc space-y-2 text-sm">{preview.actions.map((action, index) => <li key={index} className="whitespace-pre-wrap break-words">{action}</li>)}</ul><p className="text-xs">Controlla destinatario, importi e date. Le modifiche possono attivare le automazioni configurate. Anteprima valida 10 minuti.</p><div className="flex gap-2"><button disabled={busy} className={buttonClass + " bg-[var(--crm-primary)] text-white"} onClick={execute}>Conferma ed esegui</button><button disabled={busy} className={buttonClass} onClick={() => setPreview(null)}>Annulla</button></div></div>}
      </> : <p className="text-sm">Trascrizione AI e comandi CRM sono disponibili dal <Link href="/billing" className="underline">piano Pro</Link>. Puoi registrare note e scrivere il testo manualmente.</p>}
    </section>}
    <section className="space-y-3"><div className="flex justify-between"><h2 className="font-semibold">Note salvate</h2><button className={buttonClass} onClick={() => refresh().catch(() => setError("Aggiornamento non riuscito"))}>Aggiorna elenco</button></div>
      {!notes.length && <p className="rounded-xl border p-8 text-center text-sm">Nessuna nota vocale salvata.</p>}
      {notes.map(note => <SavedNote key={[note.id, note.title, note.transcript, note.dealId, note.contactId].join(":")} note={note} selectedTarget={target} canEdit={canWrite && (canManage || note.authorId === userId)} ai={ai} onRefresh={() => { void refresh(); }} onError={setError} onCommand={(text, linked) => { setCommand(text.slice(0, 6000)); setPreview(null); setTarget(linked); commandPanel.current?.scrollIntoView({ behavior: "smooth" }); }} />)}
    </section>
  </div>;
}

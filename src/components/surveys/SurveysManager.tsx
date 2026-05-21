"use client";

import { useState, useEffect } from "react";
import {
  ClipboardList, Plus, Trash2, ExternalLink, Copy, Loader2,
  ToggleLeft, ToggleRight, BarChart3, X, Star,
} from "lucide-react";
import { toast } from "sonner";
import {
  getSurveys, createSurvey, deleteSurvey, toggleSurvey, getSurveyResults,
  type SurveyListItem, type SurveyResults,
} from "@/server/actions/surveys";

const inputCls = "w-full rounded-lg border border-[var(--crm-neutral-200)] bg-white dark:bg-white/5 px-3 py-2.5 text-sm text-[var(--crm-neutral-900)] dark:text-white placeholder:text-[var(--crm-neutral-400)] focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] focus:border-transparent transition-colors";

type QuestionDraft = {
  text: string;
  type: "text" | "choice" | "rating";
  options: string[];
  required: boolean;
};

export function SurveysManager() {
  const [surveys, setSurveys] = useState<SurveyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    { text: "", type: "text", options: [], required: false },
  ]);
  const [results, setResults] = useState<SurveyResults | null>(null);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    getSurveys().then((s) => { setSurveys(s); setLoading(false); });
  }, []);

  function addQuestion() {
    setQuestions([...questions, { text: "", type: "text", options: [], required: false }]);
  }

  function removeQuestion(i: number) {
    setQuestions(questions.filter((_, idx) => idx !== i));
  }

  function updateQuestion(i: number, patch: Partial<QuestionDraft>) {
    setQuestions(questions.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (questions.some((q) => !q.text.trim())) {
      toast.error("Tutte le domande devono avere un testo");
      return;
    }
    setCreating(true);
    const result = await createSurvey({
      title,
      description: description || undefined,
      questions: questions.map((q) => ({
        text: q.text,
        type: q.type,
        options: q.type === "choice" ? q.options.filter(Boolean) : undefined,
        required: q.required,
      })),
    });
    if (result.success) {
      toast.success("Sondaggio creato");
      setShowForm(false);
      setTitle("");
      setDescription("");
      setQuestions([{ text: "", type: "text", options: [], required: false }]);
      const updated = await getSurveys();
      setSurveys(updated);
    } else {
      toast.error(result.error ?? "Errore");
    }
    setCreating(false);
  }

  async function handleDelete(id: string) {
    await deleteSurvey(id);
    setSurveys(surveys.filter((s) => s.id !== id));
    toast.success("Sondaggio eliminato");
  }

  async function handleToggle(id: string, current: boolean) {
    await toggleSurvey(id, !current);
    setSurveys(surveys.map((s) => (s.id === id ? { ...s, isActive: !current } : s)));
  }

  async function viewResults(id: string) {
    const r = await getSurveyResults(id);
    if (r) {
      setResults(r);
      setShowResults(true);
    }
  }

  function copyLink(id: string) {
    const url = `${window.location.origin}/survey/${id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiato!");
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--crm-neutral-400)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results modal */}
      {showResults && results && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">{results.survey.title} — Risultati</h3>
              <button onClick={() => setShowResults(false)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">{results.totalResponses} risposte totali</p>

            {Object.entries(results.answers).map(([qId, data]) => (
              <div key={qId} className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-white/5">
                <p className="text-sm font-medium mb-2">{data.question}</p>
                {data.type === "rating" ? (
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                    <span className="text-sm font-bold">
                      {data.values.length > 0
                        ? ((data.values as number[]).reduce((a, b) => a + b, 0) / data.values.length).toFixed(1)
                        : "—"}
                    </span>
                    <span className="text-xs text-gray-400">/ 5 ({data.values.length} voti)</span>
                  </div>
                ) : data.type === "choice" ? (
                  <div className="space-y-1">
                    {Object.entries(
                      (data.values as string[]).reduce<Record<string, number>>((acc, v) => {
                        acc[v] = (acc[v] ?? 0) + 1;
                        return acc;
                      }, {}),
                    ).sort((a, b) => b[1] - a[1]).map(([opt, count]) => (
                      <div key={opt} className="flex items-center gap-2 text-sm">
                        <div className="flex-1">{opt}</div>
                        <div className="w-20 h-2 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-purple-500"
                            style={{ width: `${(count / data.values.length) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {(data.values as string[]).map((v, i) => (
                      <p key={i} className="text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 rounded p-1.5">
                        {v}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-purple-500" />
          Sondaggi
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 text-xs font-medium text-[var(--crm-primary)] hover:underline"
        >
          <Plus className="h-3.5 w-3.5" /> Nuovo sondaggio
        </button>
      </div>

      {/* Creation form */}
      {showForm && (
        <form onSubmit={handleCreate} className="p-4 rounded-lg border border-[var(--crm-neutral-100)] dark:border-white/10 space-y-3">
          <div>
            <label className="text-xs font-medium">Titolo</label>
            <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} placeholder="es. Soddisfazione cliente" />
          </div>
          <div>
            <label className="text-xs font-medium">Descrizione (opzionale)</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} placeholder="Breve descrizione" />
          </div>

          <div className="space-y-3">
            <label className="text-xs font-medium">Domande</label>
            {questions.map((q, i) => (
              <div key={i} className="p-3 rounded-lg bg-gray-50 dark:bg-white/5 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 w-5">{i + 1}.</span>
                  <input
                    required
                    value={q.text}
                    onChange={(e) => updateQuestion(i, { text: e.target.value })}
                    className={inputCls}
                    placeholder="Testo della domanda"
                  />
                  {questions.length > 1 && (
                    <button type="button" onClick={() => removeQuestion(i)} className="p-1 text-red-400 hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3 ml-7">
                  <select
                    value={q.type}
                    onChange={(e) => updateQuestion(i, { type: e.target.value as QuestionDraft["type"], options: e.target.value === "choice" ? [""] : [] })}
                    className="rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-white/5 px-2 py-1 text-xs"
                  >
                    <option value="text">Testo libero</option>
                    <option value="choice">Scelta multipla</option>
                    <option value="rating">Valutazione (1-5)</option>
                  </select>
                  <label className="flex items-center gap-1 text-xs text-gray-500">
                    <input type="checkbox" checked={q.required} onChange={(e) => updateQuestion(i, { required: e.target.checked })} />
                    Obbligatoria
                  </label>
                </div>
                {q.type === "choice" && (
                  <div className="ml-7 space-y-1">
                    {q.options.map((opt, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <input
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...q.options];
                            newOpts[j] = e.target.value;
                            updateQuestion(i, { options: newOpts });
                          }}
                          className="flex-1 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-white/5 px-2 py-1 text-xs"
                          placeholder={`Opzione ${j + 1}`}
                        />
                        {q.options.length > 1 && (
                          <button type="button" onClick={() => updateQuestion(i, { options: q.options.filter((_, k) => k !== j) })} className="text-red-400">
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => updateQuestion(i, { options: [...q.options, ""] })}
                      className="text-xs text-[var(--crm-primary)] hover:underline"
                    >
                      + Aggiungi opzione
                    </button>
                  </div>
                )}
              </div>
            ))}
            <button type="button" onClick={addQuestion} className="text-xs text-[var(--crm-primary)] hover:underline">
              + Aggiungi domanda
            </button>
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={creating} className="px-4 py-2 rounded-lg bg-[var(--crm-primary)] text-white text-sm font-medium disabled:opacity-50">
              {creating ? "Creazione..." : "Crea sondaggio"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-[var(--crm-neutral-500)]">
              Annulla
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {surveys.length === 0 ? (
        <p className="text-sm text-[var(--crm-neutral-400)] text-center py-4">
          Nessun sondaggio. Crea il primo per raccogliere feedback!
        </p>
      ) : (
        <div className="space-y-2">
          {surveys.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between p-3 rounded-lg border border-[var(--crm-neutral-100)] dark:border-white/10"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{s.title}</p>
                  {!s.isActive && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-gray-500">
                      Disattivo
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[var(--crm-neutral-400)] mt-0.5">
                  {s.questionsCount} domande · {s.responsesCount} risposte
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => viewResults(s.id)} className="p-1.5 rounded hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5" title="Risultati">
                  <BarChart3 className="h-3.5 w-3.5 text-purple-500" />
                </button>
                <button onClick={() => handleToggle(s.id, s.isActive)} title={s.isActive ? "Disattiva" : "Attiva"}>
                  {s.isActive ? (
                    <ToggleRight className="h-5 w-5 text-green-500" />
                  ) : (
                    <ToggleLeft className="h-5 w-5 text-gray-400" />
                  )}
                </button>
                <button onClick={() => copyLink(s.id)} className="p-1.5 rounded hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5" title="Copia link">
                  <Copy className="h-3.5 w-3.5 text-[var(--crm-neutral-400)]" />
                </button>
                <a href={`/survey/${s.id}`} target="_blank" className="p-1.5 rounded hover:bg-[var(--crm-neutral-50)] dark:hover:bg-white/5" title="Apri">
                  <ExternalLink className="h-3.5 w-3.5 text-[var(--crm-neutral-400)]" />
                </a>
                <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20" title="Elimina">
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

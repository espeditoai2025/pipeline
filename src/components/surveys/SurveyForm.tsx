"use client";

import { useState } from "react";
import { Check, Loader2, Star } from "lucide-react";
import { submitSurveyResponse, type SurveyDetail } from "@/server/actions/surveys";

type Props = {
  survey: SurveyDetail;
};

export function SurveyForm({ survey }: Props) {
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [respondent, setRespondent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setAnswer(qId: string, value: string | number) {
    setAnswers((prev) => ({ ...prev, [qId]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validate required
    for (const q of survey.questions) {
      if (q.required && !answers[q.id] && answers[q.id] !== 0) {
        setError(`La domanda "${q.text}" è obbligatoria`);
        return;
      }
    }

    setSubmitting(true);
    const result = await submitSurveyResponse({
      surveyId: survey.id,
      answers,
      respondent: respondent || undefined,
    });

    if (result.success) {
      setDone(true);
    } else {
      setError(result.error ?? "Errore nell'invio");
    }
    setSubmitting(false);
  }

  if (done) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-lg font-semibold mb-2">Grazie per le tue risposte!</h2>
        <p className="text-gray-500">Il sondaggio è stato completato con successo.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 space-y-5">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="text-xs font-medium text-gray-500">Nome o email (opzionale)</label>
        <input
          value={respondent}
          onChange={(e) => setRespondent(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Il tuo nome"
        />
      </div>

      {survey.questions.map((q, i) => (
        <div key={q.id} className="space-y-2">
          <label className="text-sm font-medium text-gray-900 dark:text-white">
            {i + 1}. {q.text}
            {q.required && <span className="text-red-500 ml-1">*</span>}
          </label>

          {q.type === "text" && (
            <textarea
              value={(answers[q.id] as string) ?? ""}
              onChange={(e) => setAnswer(q.id, e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              placeholder="La tua risposta..."
            />
          )}

          {q.type === "choice" && q.options && (
            <div className="space-y-1.5">
              {q.options.map((opt) => (
                <label key={opt} className="flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers[q.id] === opt}
                    onChange={() => setAnswer(q.id, opt)}
                    className="h-4 w-4 text-purple-600"
                  />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
            </div>
          )}

          {q.type === "rating" && (
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setAnswer(q.id, n)}
                  className="p-1"
                >
                  <Star
                    className={`h-7 w-7 transition-colors ${
                      (answers[q.id] as number) >= n
                        ? "text-amber-400 fill-amber-400"
                        : "text-gray-300 dark:text-gray-600"
                    }`}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      <button
        type="submit"
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-purple-600 text-white font-medium text-sm hover:bg-purple-700 disabled:opacity-50 transition-colors"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invia risposte"}
      </button>
    </form>
  );
}

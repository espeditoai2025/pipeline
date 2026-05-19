"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { submitContactForm } from "@/server/actions/contact-form";

const schema = z.object({
  name: z.string().min(2, "Nome troppo corto"),
  email: z.string().email("Email non valida"),
  subject: z.enum(["info", "support", "billing", "partnership", "other"], {
    message: "Seleziona un argomento",
  }),
  message: z.string().min(10, "Messaggio troppo corto (min. 10 caratteri)").max(3000, "Max 3000 caratteri"),
  privacy: z.literal(true, { message: "Devi accettare la privacy policy" }),
});

type FormValues = z.infer<typeof schema>;

const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all";
const errorCls = "mt-1.5 text-xs text-red-500";

export function ContactForm() {
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  function onSubmit(data: FormValues) {
    setServerError(null);
    startTransition(async () => {
      const result = await submitContactForm(data);
      if (result.success) {
        setSuccess(true);
      } else {
        setServerError("Si è verificato un errore. Riprova o scrivici direttamente a support@pipely.it");
      }
    });
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-green-100 bg-green-50 px-8 py-14 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Messaggio inviato!</h2>
        <p className="max-w-sm text-sm leading-relaxed text-slate-500">
          Grazie per averci contattato. Ti risponderemo entro 1 giorno lavorativo
          all&apos;indirizzo email che hai fornito.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Nome e cognome <span className="text-red-500">*</span>
          </label>
          <input
            {...register("name")}
            className={inputCls}
            placeholder="Mario Rossi"
            autoComplete="name"
          />
          {errors.name && <p className={errorCls}>{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            {...register("email")}
            type="email"
            className={inputCls}
            placeholder="mario@azienda.it"
            autoComplete="email"
          />
          {errors.email && <p className={errorCls}>{errors.email.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Argomento <span className="text-red-500">*</span>
        </label>
        <select {...register("subject")} className={inputCls}>
          <option value="">Seleziona un argomento…</option>
          <option value="info">Informazioni generali</option>
          <option value="support">Supporto tecnico</option>
          <option value="billing">Fatturazione / Piano</option>
          <option value="partnership">Partnership / Rivenditori</option>
          <option value="other">Altro</option>
        </select>
        {errors.subject && <p className={errorCls}>{errors.subject.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Messaggio <span className="text-red-500">*</span>
        </label>
        <textarea
          {...register("message")}
          rows={6}
          className={`${inputCls} resize-none`}
          placeholder="Descrivi la tua richiesta…"
        />
        {errors.message && <p className={errorCls}>{errors.message.message}</p>}
      </div>

      <div className="flex items-start gap-3">
        <input
          {...register("privacy")}
          type="checkbox"
          id="privacy"
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
        />
        <label htmlFor="privacy" className="text-sm text-slate-600 cursor-pointer leading-relaxed">
          Ho letto e accetto la{" "}
          <a href="/privacy" target="_blank" className="text-blue-600 hover:underline font-medium">
            Privacy Policy
          </a>
          . Acconsento al trattamento dei miei dati personali per rispondere alla mia richiesta.{" "}
          <span className="text-red-500">*</span>
        </label>
      </div>
      {errors.privacy && <p className={`${errorCls} -mt-3`}>{errors.privacy.message}</p>}

      {serverError && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {serverError}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60 transition-all"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Invio in corso…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            Invia messaggio
          </>
        )}
      </button>
    </form>
  );
}

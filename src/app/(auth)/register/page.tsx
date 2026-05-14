"use client";

import { useState, useEffect } from "react";
import { PipelyAppIcon } from "@/components/shared/PipelyLogo";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";

const inputCls = "w-full px-3 py-2 border border-[var(--crm-neutral-100)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] focus:border-transparent";

const unifiedSchema = z
  .object({
    name: z.string().min(2, "Nome deve avere almeno 2 caratteri"),
    email: z.string().email("Email non valida"),
    organizationName: z.string().optional(),
    password: z.string().min(8, "Password deve avere almeno 8 caratteri"),
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, { message: "Devi accettare i Termini di Servizio per continuare" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Le password non coincidono",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof unifiedSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const isInvite = !!inviteToken;

  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(
      isInvite
        ? unifiedSchema
        : unifiedSchema.refine((d) => (d.organizationName ?? "").trim().length >= 2, {
            message: "Nome azienda deve avere almeno 2 caratteri",
            path: ["organizationName"],
          })
    ),
  });

  useEffect(() => {
    const emailFromParams = searchParams.get("email");
    if (emailFromParams) setValue("email", emailFromParams);
  }, [searchParams, setValue]);

  async function onSubmit(data: FormData) {
    setServerError(null);
    const payload = isInvite
      ? { name: data.name, email: data.email, password: data.password, inviteToken }
      : { name: data.name, email: data.email, organizationName: data.organizationName, password: data.password };

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) {
      setServerError(json.error ?? "Errore durante la registrazione");
      return;
    }
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    if (result?.error) {
      router.push("/login?registered=1");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[var(--crm-neutral-100)] p-8">
      <div className="mb-8 text-center">
        <PipelyAppIcon size={48} className="mx-auto mb-4 rounded-xl" />
        <h1 className="text-2xl font-semibold text-[var(--crm-neutral-900)]">
          {isInvite ? "Accetta l'invito" : "Crea il tuo account"}
        </h1>
        <p className="mt-1 text-sm text-[var(--crm-neutral-500)]">
          {isInvite ? "Completa la registrazione per unirti al team" : "Inizia gratis, senza carta di credito"}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--crm-neutral-900)] mb-1">Nome e cognome</label>
          <input type="text" autoComplete="name" {...register("name")} className={inputCls} placeholder="Mario Rossi" />
          {errors.name && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.name.message}</p>}
        </div>

        {!isInvite && (
          <div>
            <label className="block text-sm font-medium text-[var(--crm-neutral-900)] mb-1">Nome azienda</label>
            <input type="text" {...register("organizationName")} className={inputCls} placeholder="Acme Srl" />
            {errors.organizationName && (
              <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.organizationName.message}</p>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-[var(--crm-neutral-900)] mb-1">Email</label>
          <input type="email" autoComplete="email" {...register("email")} className={inputCls} placeholder="mario@acme.it" />
          {errors.email && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--crm-neutral-900)] mb-1">Password</label>
          <input type="password" autoComplete="new-password" {...register("password")} className={inputCls} placeholder="Minimo 8 caratteri" />
          {errors.password && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.password.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--crm-neutral-900)] mb-1">Conferma password</label>
          <input type="password" autoComplete="new-password" {...register("confirmPassword")} className={inputCls} placeholder="••••••••" />
          {errors.confirmPassword && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.confirmPassword.message}</p>}
        </div>

        <div>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              {...register("acceptTerms")}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--crm-neutral-100)] text-[var(--crm-primary)] focus:ring-[var(--crm-primary)]"
            />
            <span className="text-sm text-[var(--crm-neutral-600)]">
              Ho letto e accetto i{" "}
              <a href="/termini" target="_blank" className="text-[var(--crm-primary)] font-medium hover:underline">Termini di Servizio</a>{" "}
              e la{" "}
              <a href="/privacy" target="_blank" className="text-[var(--crm-primary)] font-medium hover:underline">Privacy Policy</a>
            </span>
          </label>
          {errors.acceptTerms && <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.acceptTerms.message}</p>}
        </div>

        {serverError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-[var(--crm-danger)]">
            {serverError}
          </div>
        )}

        <Button type="submit" disabled={isSubmitting} className="w-full bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white">
          {isSubmitting
            ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Registrazione in corso…</>
            : isInvite ? "Unisciti al team" : "Crea account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--crm-neutral-500)]">
        Hai già un account?{" "}
        <Link href="/login" className="text-[var(--crm-primary)] font-medium hover:underline">Accedi</Link>
      </p>
    </div>
  );
}

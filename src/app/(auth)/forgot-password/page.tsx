"use client";

import { useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { CheckCircle, Loader2 } from "lucide-react";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validators/auth";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(data: ForgotPasswordInput) {
    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    // Always show success to prevent email enumeration
    setSubmitted(true);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[var(--crm-neutral-100)] p-8">
      <div className="mb-8 text-center">
        <Image src="/pipely-app-icon-blue.svg" alt="Pipely" width={48} height={48} className="mx-auto mb-4 rounded-xl" priority />
        <h1 className="text-2xl font-semibold text-[var(--crm-neutral-900)]">Password dimenticata</h1>
        <p className="mt-1 text-sm text-[var(--crm-neutral-500)]">
          Ti invieremo un link per reimpostare la password
        </p>
      </div>

      {submitted ? (
        <div className="text-center space-y-4">
          <CheckCircle className="mx-auto h-12 w-12 text-[var(--crm-success)]" />
          <p className="text-sm text-[var(--crm-neutral-900)]">
            Se esiste un account con questa email, riceverai a breve un link per reimpostare la
            password.
          </p>
          <Link
            href="/login"
            className="inline-block text-sm text-[var(--crm-primary)] font-medium hover:underline"
          >
            Torna al login
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--crm-neutral-900)] mb-1">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              {...register("email")}
              className="w-full px-3 py-2 border border-[var(--crm-neutral-100)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] focus:border-transparent"
              placeholder="mario@azienda.it"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.email.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Invio in corso…
              </>
            ) : (
              "Invia link di reset"
            )}
          </Button>

          <p className="text-center text-sm text-[var(--crm-neutral-500)]">
            <Link href="/login" className="text-[var(--crm-primary)] font-medium hover:underline">
              Torna al login
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}

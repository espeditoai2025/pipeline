"use client";

import { useState } from "react";
import { PipelyAppIcon } from "@/components/shared/PipelyLogo";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validators/auth";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginInput) {
    setError(null);
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    if (result?.error) {
      setError("Email o password non corretti");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-[var(--crm-neutral-100)] p-8">
      <div className="mb-8 text-center">
        <PipelyAppIcon size={48} className="mx-auto mb-4 rounded-xl" />
        <h1 className="text-2xl font-semibold text-[var(--crm-neutral-900)]">Accedi a Pipely</h1>
        <p className="mt-1 text-sm text-[var(--crm-neutral-500)]">
          Inserisci le tue credenziali per continuare
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-[var(--crm-neutral-900)] mb-1">
            Email
          </label>
          <input
            id="email"
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

        <div>
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="password" className="block text-sm font-medium text-[var(--crm-neutral-900)]">
              Password
            </label>
            <Link href="/forgot-password" className="text-xs text-[var(--crm-primary)] hover:underline">
              Password dimenticata?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register("password")}
            className="w-full px-3 py-2 border border-[var(--crm-neutral-100)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--crm-primary)] focus:border-transparent"
            placeholder="••••••••"
          />
          {errors.password && (
            <p className="mt-1 text-xs text-[var(--crm-danger)]">{errors.password.message}</p>
          )}
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-[var(--crm-danger)]">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[var(--crm-primary)] hover:bg-[var(--crm-primary-dark)] text-white"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Accesso in corso…
            </>
          ) : (
            "Accedi"
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--crm-neutral-500)]">
        Non hai un account?{" "}
        <Link href="/register" className="text-[var(--crm-primary)] font-medium hover:underline">
          Registrati
        </Link>
      </p>
    </div>
  );
}

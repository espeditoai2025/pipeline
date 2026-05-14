import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(1, "Password obbligatoria"),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "Nome deve avere almeno 2 caratteri"),
    email: z.string().email("Email non valida"),
    organizationName: z.string().min(2, "Nome azienda deve avere almeno 2 caratteri"),
    password: z.string().min(8, "Password deve avere almeno 8 caratteri"),
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, { message: "Devi accettare i Termini di Servizio per continuare" }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Le password non coincidono",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email non valida"),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "Password deve avere almeno 8 caratteri"),
    confirmPassword: z.string(),
    token: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Le password non coincidono",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

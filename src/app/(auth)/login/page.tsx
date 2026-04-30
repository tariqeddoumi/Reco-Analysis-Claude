"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { Eye, EyeOff, Loader2, Lock, Mail, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "L'adresse email est requise")
    .email("Adresse email invalide"),
  password: z
    .string()
    .min(1, "Le mot de passe est requis")
    .min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      if (
        error.message.includes("Invalid login credentials") ||
        error.message.includes("invalid_credentials")
      ) {
        setServerError("Email ou mot de passe incorrect.");
      } else if (error.message.includes("Email not confirmed")) {
        setServerError(
          "Votre adresse email n'a pas été confirmée. Veuillez vérifier votre boîte de réception."
        );
      } else if (error.message.includes("Too many requests")) {
        setServerError(
          "Trop de tentatives de connexion. Veuillez réessayer dans quelques minutes."
        );
      } else {
        setServerError(
          "Une erreur est survenue lors de la connexion. Veuillez réessayer."
        );
      }
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 overflow-hidden">
        {/* Card header */}
        <div className="bg-gradient-to-r from-slate-900 to-[#0f2744] px-8 py-6">
          <h2 className="text-white text-xl font-semibold">Connexion</h2>
          <p className="text-slate-400 text-sm mt-1">
            Accédez à votre espace de suivi
          </p>
        </div>

        {/* Card body */}
        <div className="px-8 py-6">
          {/* Server error */}
          {serverError && (
            <div className="mb-5 flex gap-3 rounded-lg bg-red-50 border border-red-200 p-3.5 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p>{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-700">
                Adresse email
              </Label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
                  aria-hidden="true"
                />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="prenom.nom@banque.fr"
                  className={cn(
                    "pl-10 h-10",
                    errors.email && "border-red-400 focus-visible:ring-red-400"
                  )}
                  {...register("email")}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  aria-invalid={!!errors.email}
                />
              </div>
              {errors.email && (
                <p id="email-error" className="text-xs text-red-600" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-700">
                  Mot de passe
                </Label>
                <a
                  href="/forgot-password"
                  className="text-xs text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                >
                  Mot de passe oublié ?
                </a>
              </div>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none"
                  aria-hidden="true"
                />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={cn(
                    "pl-10 pr-10 h-10",
                    errors.password &&
                      "border-red-400 focus-visible:ring-red-400"
                  )}
                  {...register("password")}
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={
                    showPassword
                      ? "Masquer le mot de passe"
                      : "Afficher le mot de passe"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p
                  id="password-error"
                  className="text-xs text-red-600"
                  role="alert"
                >
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-10 bg-[#0f2744] hover:bg-[#1a3a5c] text-white font-medium mt-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Connexion en cours...
                </>
              ) : (
                "Se connecter"
              )}
            </Button>
          </form>
        </div>

        {/* Card footer */}
        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100">
          <p className="text-center text-xs text-slate-500">
            Accès réservé aux utilisateurs autorisés.{" "}
            <a
              href="mailto:support@banque.fr"
              className="text-blue-600 hover:underline"
            >
              Contacter le support
            </a>
          </p>
        </div>
      </div>

      {/* Security notice */}
      <p className="mt-4 text-center text-xs text-slate-500">
        Connexion sécurisée — Ne partagez jamais vos identifiants.
      </p>
    </div>
  );
}

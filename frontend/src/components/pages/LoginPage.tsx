"use client";

/**
 * LoginPage — Supply Chain Control Tower sign-in screen.
 *
 * Responsibilities:
 * - Zod-validated form (email + password)
 * - POST /auth/login via typed login() helper
 * - Stores JWT via setToken() cookie helper only
 * - Redirects to /dashboard on success
 * - Clear error states: field validation, 401, network
 * - Motion entrance animation (respects prefers-reduced-motion)
 * - Keyboard accessible, focus-visible, responsive from 320px
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { z } from "zod";
import { ShieldCheck, Mail, LockKeyhole, ArrowRight, AlertCircle, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { login, isApiError } from "@/lib/api";
import { setToken } from "@/lib/auth";

// ── Validation schema ─────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type LoginFormData = z.infer<typeof loginSchema>;
type FieldErrors = Partial<Record<keyof LoginFormData, string>>;

// ── Component ─────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [isPending, startTransition] = useTransition();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const initialState = shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 };
  const animateState = { opacity: 1, y: 0 };
  const transition = { duration: 0.22, ease: "easeOut" as const } as const;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError(null);

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof LoginFormData;
        if (!errors[field]) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    startTransition(async () => {
      try {
        const data = await login({ email, password });
        setToken(data.access_token);
        router.push("/dashboard");
      } catch (err) {
        if (isApiError(err)) {
          if (err.isUnauthorized) {
            setServerError("Invalid credentials. Check your email and password.");
          } else if (err.status === 0) {
            setServerError("Unable to reach the server. Check your network connection.");
          } else {
            setServerError(err.detail || "An unexpected error occurred. Please try again.");
          }
        } else {
          setServerError("An unexpected error occurred. Please try again.");
        }
      }
    });
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-background px-4 py-12">
      <motion.div
        initial={initialState}
        animate={animateState}
        transition={transition}
        className="w-full max-w-sm"
      >
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"
            aria-hidden="true"
          >
            <ShieldCheck className="size-5" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cognizant E2 + PR2
            </p>
            <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-foreground">
              Supply Chain Control Tower
            </h1>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="pb-0">
            <CardTitle className="text-base">Sign in</CardTitle>
            <CardDescription>Enter your credentials to access the control tower.</CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            <form
              onSubmit={handleSubmit}
              noValidate
              aria-label="Sign-in form"
              className="flex flex-col gap-4"
            >
              {serverError && (
                <Alert variant="destructive" role="alert" aria-live="assertive">
                  <AlertCircle className="size-4" aria-hidden="true" />
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="login-email">Email address</Label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    aria-invalid={!!fieldErrors.email}
                    aria-describedby={fieldErrors.email ? "email-error" : undefined}
                    className="pl-9"
                    disabled={isPending}
                  />
                </div>
                {fieldErrors.email && (
                  <p id="email-error" className="text-xs text-destructive" role="alert">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <LockKeyhole
                    className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password)
                        setFieldErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    aria-invalid={!!fieldErrors.password}
                    aria-describedby={fieldErrors.password ? "password-error" : undefined}
                    className="pl-9"
                    disabled={isPending}
                  />
                </div>
                {fieldErrors.password && (
                  <p id="password-error" className="text-xs text-destructive" role="alert">
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                className="mt-1 w-full"
                disabled={isPending}
                aria-busy={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Demo account:{" "}
          <span className="font-medium text-foreground/70">gokul@supplychain.dev</span>
          {" / "}
          <span className="font-medium text-foreground/70">pass1234</span>
        </p>
      </motion.div>
    </div>
  );
}

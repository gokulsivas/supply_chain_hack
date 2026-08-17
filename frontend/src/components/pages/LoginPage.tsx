"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";
import { motion, useReducedMotion } from "framer-motion";
import { login, register, extractApiError } from "@/lib/api";
import { setToken, saveUser } from "@/lib/auth";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldCheck, Mail, LockKeyhole, User, ArrowRight, AlertCircle, Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramTab = searchParams.get("tab") === "signup" ? "signup" : "signin";
  const { checkAuth } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  
  const [prevParamTab, setPrevParamTab] = useState(searchParams.get("tab"));
  const [activeTab, setActiveTab] = useState<"signin" | "signup">(paramTab);

  if (searchParams.get("tab") !== prevParamTab) {
    setPrevParamTab(searchParams.get("tab"));
    setActiveTab(searchParams.get("tab") === "signup" ? "signup" : "signin");
  }
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [signupSuccess, setSignupSuccess] = useState(false);

  // Sign In State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Sign Up State
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);
    setFieldErrors({});

    const result = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach(issue => {
        if (issue.path[0]) errors[String(issue.path[0])] = issue.message;
      });
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      const res = await login({
        email: loginEmail.trim().toLowerCase(),
        password: loginPassword,
      });

      setToken(res.access_token);
      if (res.user) saveUser(res.user);

      await checkAuth();

      router.push("/dashboard");
    } catch (err: unknown) {
      setGlobalError(extractApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);
    setFieldErrors({});

    const result = signupSchema.safeParse({
      name: signupName,
      email: signupEmail,
      password: signupPassword,
      confirmPassword: signupConfirm,
    });
    
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.issues.forEach(issue => {
        if (issue.path[0]) errors[String(issue.path[0])] = issue.message;
      });
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      // 1. Register the user
      await register({
        name: signupName.trim(),
        email: signupEmail.trim().toLowerCase(),
        password: signupPassword,
      });

      // 2. Auto-login on success
      const loginRes = await login({
        email: signupEmail.trim().toLowerCase(),
        password: signupPassword,
      });

      setToken(loginRes.access_token);
      if (loginRes.user) saveUser(loginRes.user);

      await checkAuth();

      setSignupSuccess(true);
      router.push("/dashboard");
    } catch (err: unknown) {
      setGlobalError(extractApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center bg-background p-4 sm:p-6 md:p-8 font-sans text-foreground overflow-hidden">
      
      {/* Background Ambient Glow matching Landing Page */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div 
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-25 dark:opacity-40 blur-[130px]"
          style={{
            background: "radial-gradient(ellipse at center, rgba(99, 102, 241, 0.45) 0%, rgba(147, 51, 234, 0.25) 45%, transparent 75%)"
          }}
        />
      </div>

      {/* Top Bar with Return Link & Theme Toggle */}
      <div className="absolute top-4 inset-x-4 sm:inset-x-8 max-w-7xl mx-auto flex items-center justify-between z-20">
        <Link 
          href="/"
          className="text-xs font-bold tracking-wider text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/60 border border-border/80 hover:bg-muted/80 transition-colors shadow-2xs"
        >
          ← Overview
        </Link>
        <div className="bg-card/60 border border-border/80 rounded-full p-0.5 shadow-2xs">
          <ThemeToggle />
        </div>
      </div>

      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[420px] z-10 space-y-6 my-auto pt-10"
      >
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-2.5 rounded-none bg-primary/10 border border-primary/20 text-primary shadow-2xs">
            <ShieldCheck className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Supply Chain Control Tower
            </h1>
            <p className="text-xs font-medium text-muted-foreground tracking-wide mt-0.5 uppercase">
              Autonomous Operations Platform
            </p>
          </div>
        </div>

        {/* Auth Card */}
        <Card className="border border-border/80 bg-card/95 backdrop-blur-md shadow-lg rounded-2xl overflow-hidden">
          <Tabs 
            value={activeTab} 
            onValueChange={(val: string) => { 
              setActiveTab(val as "signin" | "signup"); 
              setGlobalError(null); 
              setFieldErrors({}); 
            }} 
            className="w-full"
          >
            <CardHeader className="p-4 pb-0">
              {/* Custom segmented tab control — bypasses Base UI TabsTrigger's
                  h-[calc(100%-1px)] and bg-muted layering which caused the
                  active tab border to be partially obscured by the track */}
              <div
                role="tablist"
                aria-label="Authentication mode"
                className="grid w-full grid-cols-2 gap-1 rounded-lg border border-border bg-muted/60 p-1"
              >
                <button
                  type="button"
                  role="tab"
                  id="tab-signin"
                  aria-selected={activeTab === "signin"}
                  aria-controls="panel-signin"
                  onClick={() => { setActiveTab("signin"); setGlobalError(null); setFieldErrors({}); }}
                  className={[
                    "flex items-center justify-center rounded-md py-2 text-xs font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 cursor-pointer",
                    activeTab === "signin"
                      ? "bg-card text-foreground border border-border shadow-none"
                      : "bg-transparent text-muted-foreground border border-transparent hover:text-foreground",
                  ].join(" ")}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  role="tab"
                  id="tab-signup"
                  aria-selected={activeTab === "signup"}
                  aria-controls="panel-signup"
                  onClick={() => { setActiveTab("signup"); setGlobalError(null); setFieldErrors({}); }}
                  className={[
                    "flex items-center justify-center rounded-md py-2 text-xs font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 cursor-pointer",
                    activeTab === "signup"
                      ? "bg-card text-foreground border border-border shadow-none"
                      : "bg-transparent text-muted-foreground border border-transparent hover:text-foreground",
                  ].join(" ")}
                >
                  Create Account
                </button>
              </div>
            </CardHeader>

            {/* Sign In Tab */}
            <TabsContent value="signin" className="m-0 focus-visible:outline-none focus-visible:ring-0">
              <form onSubmit={handleSignIn} className="p-5 pt-4 space-y-4">
                {globalError && (
                  <Alert variant="destructive" className="bg-destructive/10 border-destructive/30 text-destructive text-xs py-2.5">
                    <AlertCircle className="size-4 shrink-0 text-destructive" />
                    <AlertDescription className="ml-2 font-medium">{globalError}</AlertDescription>
                  </Alert>
                )}

                {signupSuccess && !globalError && (
                  <Alert className="bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs py-2.5">
                    <ShieldCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <AlertDescription className="ml-2 font-medium">Account created successfully. Authenticating...</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="signin-email" className="text-xs font-semibold text-foreground">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input 
                      id="signin-email"
                      placeholder="name@example.com" 
                      type="email" 
                      autoComplete="email"
                      className={`pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground text-xs h-9 focus-visible:ring-1 focus-visible:ring-primary ${fieldErrors.email ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="text-[11px] font-medium text-destructive mt-1">{fieldErrors.email}</p>
                  )}
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="signin-password" className="text-xs font-semibold text-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <LockKeyhole className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input 
                      id="signin-password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className={`pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground text-xs h-9 focus-visible:ring-1 focus-visible:ring-primary ${fieldErrors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  {fieldErrors.password && (
                    <p className="text-[11px] font-medium text-destructive mt-1">{fieldErrors.password}</p>
                  )}
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 shadow-xs flex items-center justify-center gap-1.5 cursor-pointer mt-2" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Control Tower</span>
                      <ArrowRight className="size-3.5" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* Sign Up Tab */}
            <TabsContent value="signup" className="m-0 focus-visible:outline-none focus-visible:ring-0">
              <form onSubmit={handleSignUp} className="p-5 pt-4 space-y-3.5">
                {globalError && (
                  <Alert variant="destructive" className="bg-destructive/10 border-destructive/30 text-destructive text-xs py-2.5">
                    <AlertCircle className="size-4 shrink-0 text-destructive" />
                    <AlertDescription className="ml-2 font-medium">{globalError}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-1.5">
                  <Label htmlFor="signup-name" className="text-xs font-semibold text-foreground">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input 
                      id="signup-name"
                      placeholder="Jane Doe" 
                      autoComplete="name"
                      className={`pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground text-xs h-9 focus-visible:ring-1 focus-visible:ring-primary ${fieldErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  {fieldErrors.name && (
                    <p className="text-[11px] font-medium text-destructive mt-1">{fieldErrors.name}</p>
                  )}
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="signup-email" className="text-xs font-semibold text-foreground">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input 
                      id="signup-email"
                      placeholder="name@example.com" 
                      type="email" 
                      autoComplete="email"
                      className={`pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground text-xs h-9 focus-visible:ring-1 focus-visible:ring-primary ${fieldErrors.email ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="text-[11px] font-medium text-destructive mt-1">{fieldErrors.email}</p>
                  )}
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="signup-password" className="text-xs font-semibold text-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <LockKeyhole className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input 
                      id="signup-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Min. 6 characters"
                      className={`pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground text-xs h-9 focus-visible:ring-1 focus-visible:ring-primary ${fieldErrors.password ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  {fieldErrors.password && (
                    <p className="text-[11px] font-medium text-destructive mt-1">{fieldErrors.password}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-confirm" className="text-xs font-semibold text-foreground">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <LockKeyhole className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                    <Input 
                      id="signup-confirm"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Must match password"
                      className={`pl-9 bg-background border-border text-foreground placeholder:text-muted-foreground text-xs h-9 focus-visible:ring-1 focus-visible:ring-primary ${fieldErrors.confirmPassword ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                      value={signupConfirm}
                      onChange={(e) => setSignupConfirm(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p className="text-[11px] font-medium text-destructive mt-1">{fieldErrors.confirmPassword}</p>
                  )}
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs h-9 shadow-xs flex items-center justify-center gap-1.5 cursor-pointer mt-2" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account &amp; Sign In</span>
                      <ArrowRight className="size-3.5" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </motion.div>
    </div>
  );
}

export function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
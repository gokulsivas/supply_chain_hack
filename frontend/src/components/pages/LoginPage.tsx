"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { login, registerUser, isApiError } from "@/lib/api";
import { setToken, saveUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Loader2, ArrowRight, UserPlus, LogIn, Sparkles } from "lucide-react";
import { toast } from "sonner";

export function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  
  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("USER");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (mode === "signup") {
        if (!name.trim()) {
          setErrorMsg("Please enter your full name.");
          setIsLoading(false);
          return;
        }
        // Register in PostgreSQL & retrieve session token
        const res = await registerUser({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
        });

        setToken(res.access_token);
        if (res.user) saveUser(res.user);

        toast.success(`Account created successfully! Welcome, ${name}.`);
        router.push("/dashboard");
      } else {
        // Authenticate existing user
        const res = await login({
          email: email.trim().toLowerCase(),
          password,
        });

        setToken(res.access_token);
        if (res.user) saveUser(res.user);

        toast.success("Signed in successfully!");
        router.push("/dashboard");
      }
    } catch (err: any) {
      if (isApiError(err)) {
        setErrorMsg(err.detail || "Authentication failed. Please check your credentials.");
      } else if (err.response?.data?.detail) {
        setErrorMsg(err.response.data.detail);
      } else {
        setErrorMsg(mode === "signup" ? "User already exists or registration failed." : "Invalid email or password.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30 mb-2">
            <ShieldCheck className="size-6" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Supply Chain Control Tower
          </h1>
          <p className="text-xs text-slate-400">
            Autonomous Procure-to-Pay (PR2) & Live Fleet Tracker (E2)
          </p>
        </div>

        <Card className="border-slate-800 bg-slate-900/90 backdrop-blur-xl shadow-2xl text-slate-100">
          <CardHeader className="pb-4">
            
            {/* Mode Switcher Tabs */}
            <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-lg border border-slate-800 mb-4">
              <button
                type="button"
                onClick={() => { setMode("login"); setErrorMsg(null); }}
                className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-md transition-all ${
                  mode === "login" 
                    ? "bg-blue-600 text-white shadow" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <LogIn className="size-3.5" /> Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode("signup"); setErrorMsg(null); }}
                className={`flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-md transition-all ${
                  mode === "signup" 
                    ? "bg-blue-600 text-white shadow" 
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <UserPlus className="size-3.5" /> Create Account
              </button>
            </div>

            <CardTitle className="text-lg font-bold text-white">
              {mode === "login" ? "Welcome back" : "Register new operator"}
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              {mode === "login" 
                ? "Enter your email and password to access the tower." 
                : "Create a verified profile saved directly to your PostgreSQL database."}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              
              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  {errorMsg}
                </div>
              )}

              {/* Full Name (Sign Up only) */}
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-medium text-slate-300">
                    Full Name
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="e.g. Alex Morgan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-blue-500"
                  />
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium text-slate-300">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-blue-500"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-slate-300">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-blue-500"
                />
              </div>

              {/* Role Selector (Sign Up only) */}
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-slate-300">Workspace Role</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole("USER")}
                      className={`p-2 rounded-lg border text-xs text-left transition-all ${
                        role === "USER" 
                          ? "border-blue-500 bg-blue-500/10 text-white font-semibold" 
                          : "border-slate-800 bg-slate-950 text-slate-400"
                      }`}
                    >
                      <div className="font-medium">Operator (User)</div>
                      <div className="text-[10px] text-slate-500">Requisitions & Tracking</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("ADMIN")}
                      className={`p-2 rounded-lg border text-xs text-left transition-all ${
                        role === "ADMIN" 
                          ? "border-blue-500 bg-blue-500/10 text-white font-semibold" 
                          : "border-slate-800 bg-slate-950 text-slate-400"
                      }`}
                    >
                      <div className="font-medium">Administrator</div>
                      <div className="text-[10px] text-slate-500">Approvals & Payments</div>
                    </button>
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="pt-2 flex flex-col gap-3">
              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold h-10 shadow-lg shadow-blue-600/20"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    {mode === "signup" ? "Creating account..." : "Signing in..."}
                  </>
                ) : (
                  <>
                    {mode === "signup" ? "Complete Registration" : "Sign In to Dashboard"}
                    <ArrowRight className="size-4 ml-1.5" />
                  </>
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "login" ? "signup" : "login");
                    setErrorMsg(null);
                  }}
                  className="text-xs text-slate-400 hover:text-blue-400 transition-colors"
                >
                  {mode === "login" ? (
                    <>Don&apos;t have an account? <span className="text-blue-400 font-semibold underline">Sign up</span></>
                  ) : (
                    <>Already registered? <span className="text-blue-400 font-semibold underline">Sign in</span></>
                  )}
                </button>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Demo Footer Note */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-center">
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <Sparkles className="size-3 text-blue-400" />
            <span>Database Authentication: Register any new user or sign in with existing credentials.</span>
          </p>
        </div>

      </div>
    </div>
  );
}

export default LoginPage;
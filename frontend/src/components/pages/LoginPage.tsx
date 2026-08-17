"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";
import { motion } from "framer-motion";
import { login, register, extractApiError } from "@/lib/api";
import { setToken, saveUser } from "@/lib/auth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export function LoginPage() {
  const router = useRouter();
  const { checkAuth } = useAuth();
  
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
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
    } catch (err: any) {
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
    } catch (err: any) {
      setGlobalError(extractApiError(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-[440px] z-10"
      >
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="bg-indigo-100 p-2.5 rounded-xl shadow-sm">
              <ShieldCheck className="w-7 h-7 text-indigo-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Supply Chain Control Tower</h1>
          <p className="text-sm text-slate-500 mt-2 font-medium tracking-wide">Cognizant E2 + PR2</p>
        </div>

        <Card className="border-slate-200 bg-white shadow-xl rounded-2xl overflow-hidden">
          <Tabs 
            value={activeTab} 
            onValueChange={(val: string) => { 
              setActiveTab(val as "signin" | "signup"); 
              setGlobalError(null); 
              setFieldErrors({}); 
            }} 
            className="w-full"
          >
            <CardHeader className="pb-4 pt-6 px-6">
              <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 rounded-lg">
                <TabsTrigger 
                  value="signin" 
                  className="rounded-md text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-600 py-1.5"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger 
                  value="signup" 
                  className="rounded-md text-sm font-medium transition-all data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm text-slate-600 py-1.5"
                >
                  Create Account
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="signin" className="m-0 focus-visible:outline-none focus-visible:ring-0">
              <form onSubmit={handleSignIn} className="px-6 pb-6 pt-2">
                <div className="space-y-4">
                  {globalError && (
                    <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-700">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="ml-2 font-medium text-sm">{globalError}</AlertDescription>
                    </Alert>
                  )}
                  {signupSuccess && !globalError && (
                    <Alert className="bg-green-50 border-green-200 text-green-800">
                      <ShieldCheck className="h-4 w-4 text-green-600" />
                      <AlertDescription className="ml-2 font-medium text-sm">Account created successfully. Logging you in...</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="signin-email" className="text-sm font-semibold text-slate-700">Email address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input 
                        id="signin-email"
                        placeholder="name@example.com" 
                        type="email" 
                        autoComplete="email"
                        className={`pl-9 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-indigo-500 ${fieldErrors.email ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    {fieldErrors.email && <p className="text-xs font-medium text-red-600 mt-1">{fieldErrors.email}</p>}
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password" className="text-sm font-semibold text-slate-700">Password</Label>
                    </div>
                    <div className="relative">
                      <LockKeyhole className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input 
                        id="signin-password"
                        type="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        className={`pl-9 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-indigo-500 ${fieldErrors.password ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    {fieldErrors.password && <p className="text-xs font-medium text-red-600 mt-1">{fieldErrors.password}</p>}
                  </div>
                </div>
                
                <div className="mt-6 flex flex-col gap-4">
                  <Button 
                    type="submit" 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 h-auto shadow-sm" 
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                      <>
                        Sign In
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                  
                  <div className="text-center text-xs text-slate-500 mt-2">
                    <p className="font-medium">Demo Account:</p>
                    <p className="font-mono mt-1 text-slate-600 bg-slate-100 inline-block px-2 py-1 rounded">gokul@supplychain.dev / pass1234</p>
                  </div>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="m-0 focus-visible:outline-none focus-visible:ring-0">
              <form onSubmit={handleSignUp} className="px-6 pb-6 pt-2">
                <div className="space-y-4">
                  {globalError && (
                    <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-700">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="ml-2 font-medium text-sm">{globalError}</AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-name" className="text-sm font-semibold text-slate-700">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input 
                        id="signup-name"
                        placeholder="Jane Doe" 
                        autoComplete="name"
                        className={`pl-9 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-indigo-500 ${fieldErrors.name ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    {fieldErrors.name && <p className="text-xs font-medium text-red-600 mt-1">{fieldErrors.name}</p>}
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email" className="text-sm font-semibold text-slate-700">Email address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input 
                        id="signup-email"
                        placeholder="name@example.com" 
                        type="email" 
                        autoComplete="email"
                        className={`pl-9 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-indigo-500 ${fieldErrors.email ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    {fieldErrors.email && <p className="text-xs font-medium text-red-600 mt-1">{fieldErrors.email}</p>}
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password" className="text-sm font-semibold text-slate-700">Password</Label>
                    <div className="relative">
                      <LockKeyhole className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input 
                        id="signup-password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Min. 6 characters"
                        className={`pl-9 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-indigo-500 ${fieldErrors.password ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    {fieldErrors.password && <p className="text-xs font-medium text-red-600 mt-1">{fieldErrors.password}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-confirm" className="text-sm font-semibold text-slate-700">Confirm Password</Label>
                    <div className="relative">
                      <LockKeyhole className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input 
                        id="signup-confirm"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Must match password"
                        className={`pl-9 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-indigo-500 ${fieldErrors.confirmPassword ? 'border-red-300 focus-visible:ring-red-500' : ''}`}
                        value={signupConfirm}
                        onChange={(e) => setSignupConfirm(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    {fieldErrors.confirmPassword && <p className="text-xs font-medium text-red-600 mt-1">{fieldErrors.confirmPassword}</p>}
                  </div>
                </div>
                
                <div className="mt-6">
                  <Button 
                    type="submit" 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 h-auto shadow-sm" 
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                      <>
                        Create Account
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </motion.div>
    </div>
  );
}
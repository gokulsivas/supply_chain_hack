"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

export function LandingNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: "PLATFORM", href: "#capabilities" },
    { label: "TRACKING", href: "#process" },
    { label: "PROCUREMENT", href: "#capabilities" },
    { label: "FINANCE", href: "#capabilities" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-black/5 dark:border-white/10 bg-background/85 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 h-16 flex items-center justify-between">
        
        {/* Brand Identity: SVG Mark + Stacked Text */}
        <Link 
          href="/" 
          className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded-md p-0.5"
        >
          {/* Geometric linked-node control tower mark */}
          <div className="size-[34px] flex items-center justify-center rounded-lg bg-indigo-500/10 dark:bg-white/10 border border-indigo-500/20 dark:border-white/20 group-hover:border-indigo-500/40 dark:group-hover:border-white/40 transition-colors">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="text-indigo-600 dark:text-white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="6" cy="6" r="2.5" fill="currentColor" />
              <circle cx="18" cy="6" r="2.5" />
              <circle cx="12" cy="18" r="2.5" fill="currentColor" />
              <path d="M7.5 7.5 L10.5 16" />
              <path d="M16.5 7.5 L13.5 16" />
              <path d="M8.5 6 H15.5" strokeDasharray="2 2" />
            </svg>
          </div>

          {/* Stacked Uppercase Text */}
          <div className="flex flex-col text-left leading-none tracking-tight select-none">
            <span className="font-extrabold text-[12px] text-foreground tracking-wider">CONTROL</span>
            <span className="font-semibold text-[10px] text-muted-foreground tracking-widest mt-0.5">TOWER</span>
          </div>
        </Link>

        {/* Center Navigation Links (Desktop) */}
        <nav 
          aria-label="Public Landing Navigation"
          className="hidden md:flex items-center gap-8"
        >
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[11px] font-bold tracking-[0.18em] text-muted-foreground hover:text-foreground transition-colors duration-150 relative py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded"
            >
              {link.label}
              <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-indigo-500 transition-all duration-200 hover:w-full" />
            </a>
          ))}
        </nav>

        {/* Right Controls: Theme Toggle + Sign In + Sign Up Buttons + Mobile Menu Trigger */}
        <div className="flex items-center gap-2.5">
          
          {/* Reused Global Theme Toggle */}
          <ThemeToggle />

          {/* Sign In Link */}
          <Link
            href="/login?tab=signin"
            className="hidden sm:inline-flex items-center justify-center px-3.5 h-[34px] rounded-full border border-border/80 hover:border-foreground/40 bg-card/60 hover:bg-muted text-foreground text-[11px] font-bold tracking-wider uppercase transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            SIGN IN
          </Link>

          {/* Sign Up Button */}
          <Link
            href="/login?tab=signup"
            className="inline-flex items-center justify-center px-4 h-[34px] rounded-full bg-[#4B3EFF] hover:bg-[#584CFF] active:bg-[#4335E6] text-white text-[11px] font-bold tracking-wider uppercase transition-all duration-150 shadow-[0_0_20px_-3px_rgba(75,62,255,0.5)] hover:shadow-[0_0_25px_0_rgba(75,62,255,0.75)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
          >
            SIGN UP
          </Link>

          {/* Mobile Hamburger Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileMenuOpen}
            className="md:hidden size-[34px] flex flex-col items-center justify-center gap-1 rounded-lg bg-muted/60 hover:bg-muted transition-colors p-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 cursor-pointer"
          >
            {mobileMenuOpen ? (
              <X className="size-4 text-foreground" />
            ) : (
              <>
                <span className="w-3.5 h-[1.5px] bg-foreground rounded-full" />
                <span className="w-4 h-[1.5px] bg-foreground rounded-full" />
                <span className="w-2.5 h-[1.5px] bg-foreground rounded-full" />
              </>
            )}
          </button>
        </div>

      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-card/95 backdrop-blur-xl px-6 py-5 flex flex-col gap-4 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-bold tracking-widest text-muted-foreground hover:text-foreground py-2.5 px-3 rounded-lg hover:bg-muted transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="pt-3 border-t border-border flex flex-col sm:flex-row gap-2">
            <Link
              href="/login?tab=signin"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center h-10 px-4 rounded-xl border border-border bg-muted/50 text-foreground text-xs font-bold tracking-wider uppercase"
            >
              <span>SIGN IN</span>
            </Link>
            <Link
              href="/login?tab=signup"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between h-10 px-4 rounded-xl bg-[#4B3EFF] text-white text-xs font-bold tracking-wider uppercase shadow-md"
            >
              <span>CREATE ACCOUNT</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

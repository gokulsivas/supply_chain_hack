"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Bot, Compass, Truck, CreditCard } from "lucide-react";

export function LandingSections() {
  const capabilities = [
    {
      title: "AI Procurement",
      desc: "Autonomous extraction of natural-language orders with intelligent multi-factor supplier ranking.",
      icon: Bot,
      accent: "text-indigo-600 dark:text-indigo-400 border-indigo-500/20 bg-indigo-500/10",
    },
    {
      title: "Live Logistics",
      desc: "Continuous vehicle telematics, route monitoring, and proactive bottleneck prevention across transit corridors.",
      icon: Truck,
      accent: "text-sky-600 dark:text-sky-400 border-sky-500/20 bg-sky-500/10",
    },
    {
      title: "Yard & Dock Orchestration",
      desc: "Intelligent bay allocation and real-time turn-around management for incoming freight.",
      icon: Compass,
      accent: "text-violet-600 dark:text-violet-400 border-violet-500/20 bg-violet-500/10",
    },
    {
      title: "Touchless Finance",
      desc: "Autonomous 3-way PO-shipment-invoice reconciliation with direct payment authorization.",
      icon: CreditCard,
      accent: "text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
    },
  ];

  const processSteps = [
    "Requisition",
    "Supplier",
    "PO",
    "Shipment",
    "Receipt",
    "Invoice",
    "Payment",
  ];

  return (
    <div className="relative z-10 w-full flex flex-col items-center mt-6 text-foreground pb-20">
      
      {/* ========================================================= */}
      {/* 1. THIN CAPABILITY STRIP                                  */}
      {/* ========================================================= */}
      <section 
        id="capabilities" 
        aria-label="Capabilities Overview"
        className="w-full border-y border-border/60 bg-muted/40 dark:bg-[#07070B] py-4 px-5 sm:px-8 lg:px-12 overflow-x-auto shadow-2xs"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between min-w-[700px] text-[11px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
          <span className="flex items-center gap-2 text-indigo-600 dark:text-indigo-300">
            <span className="size-1.5 rounded-full bg-indigo-500" />
            AI PROCUREMENT
          </span>
          <span className="text-border">/</span>
          <span className="flex items-center gap-2 text-foreground/80">
            LIVE LOGISTICS
          </span>
          <span className="text-border">/</span>
          <span className="flex items-center gap-2 text-foreground/80">
            YARD + DOCK
          </span>
          <span className="text-border">/</span>
          <span className="flex items-center gap-2 text-foreground/80">
            TOUCHLESS FINANCE
          </span>
          <span className="text-border">/</span>
          <span className="flex items-center gap-2 text-muted-foreground">
            EXECUTIVE SIGNALS
          </span>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 2. "ONE FLOW. NO BLIND SPOTS." SECTION                    */}
      {/* ========================================================= */}
      <section 
        id="process"
        aria-label="Unified Operational Flow"
        className="w-full py-16 sm:py-24 px-5 sm:px-8 lg:px-12 border-b border-border/40"
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column: Heading & Concept */}
          <div className="lg:col-span-5 space-y-3.5 text-left">
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
              One flow.<br />
              No blind spots.
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-1 max-w-[360px]">
              Every requisition links seamlessly to supplier scoring, transit telematics, bay scheduling, and instant 3-way invoice matching.
            </p>
          </div>

          {/* Right Column: Linear Process Flow Motif */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <div className="relative p-6 sm:p-8 rounded-2xl bg-card border border-border/80 shadow-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 items-center">
                {processSteps.map((step, idx) => (
                  <div key={step} className="flex flex-col items-center text-center group">
                    <div className="size-10 rounded-xl bg-muted/70 dark:bg-white/5 border border-border flex items-center justify-center text-xs font-mono font-bold text-indigo-600 dark:text-indigo-300 group-hover:border-indigo-500/60 group-hover:bg-indigo-500/10 transition-all shadow-2xs">
                      0{idx + 1}
                    </div>
                    <span className="text-[10.5px] font-bold tracking-wider uppercase text-foreground/85 mt-2">
                      {step}
                    </span>
                    {idx < processSteps.length - 1 && (
                      <span className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 text-border">
                        →
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================= */}
      {/* 3. FOUR CAPABILITY PANELS                                 */}
      {/* ========================================================= */}
      <section 
        aria-label="Core Tower Capabilities"
        className="w-full py-16 px-5 sm:px-8 lg:px-12"
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {capabilities.map((cap) => {
            const Icon = cap.icon;
            return (
              <div
                key={cap.title}
                className="p-6 sm:p-7 rounded-2xl bg-card border border-border/80 hover:border-border transition-all duration-200 flex flex-col justify-between text-left group shadow-xs hover:shadow-sm"
              >
                <div className="space-y-4">
                  <div className={`size-10 rounded-xl border flex items-center justify-center ${cap.accent}`}>
                    <Icon className="size-5" />
                  </div>
                  <h3 className="text-base font-bold text-foreground tracking-tight">
                    {cap.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {cap.desc}
                  </p>
                </div>
                
                <div className="pt-6 flex items-center text-[10.5px] font-bold tracking-widest text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-500 uppercase">
                  <span>ACTIVE MODULE</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. FINAL DEEP-INDIGO CTA BAND                             */}
      {/* ========================================================= */}
      <section 
        aria-label="Control Tower Sign In Call to Action"
        className="w-full px-5 sm:px-8 lg:px-12 mt-6"
      >
        <div className="max-w-7xl mx-auto rounded-[24px] sm:rounded-[32px] bg-gradient-to-br from-[#1E1452] via-[#120D32] to-[#0A071E] border border-indigo-500/30 p-8 sm:p-14 text-center shadow-[0_30px_90px_-20px_rgba(79,70,229,0.35)] relative overflow-hidden flex flex-col items-center">
          <div className="relative z-10 max-w-2xl space-y-4 text-white">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
              One decision layer for the entire supply chain.
            </h2>

            <p className="text-xs sm:text-sm text-indigo-200/80 max-w-lg mx-auto">
              Experience real-time autonomous routing, supplier optimization, and touchless financial settlement.
            </p>

            <div className="pt-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 px-8 h-11 rounded-full bg-[#4B3EFF] hover:bg-[#584CFF] active:bg-[#4335E6] text-white text-xs font-bold tracking-wider uppercase transition-all shadow-[0_0_25px_2px_rgba(75,62,255,0.7)] hover:shadow-[0_0_35px_4px_rgba(75,62,255,0.9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
              >
                <span>OPEN CONTROL TOWER</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 5. MINIMAL FOOTER                                         */}
      {/* ========================================================= */}
      <footer 
        aria-label="Public Landing Footer"
        className="w-full px-5 sm:px-8 lg:px-12 mt-16 pt-8 border-t border-border/60"
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <div className="size-5 rounded-md bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <div className="size-1.5 rounded-full bg-indigo-500" />
            </div>
            <span className="font-bold text-foreground tracking-wider text-[11px]">
              CONTROL TOWER
            </span>
            <span className="text-border">|</span>
            <span className="text-[11px] text-muted-foreground">Cognizant E2 + PR2</span>
          </div>

          <div className="flex items-center gap-6 text-[11px] font-medium tracking-wider">
            <a href="#capabilities" className="hover:text-foreground transition-colors">CAPABILITIES</a>
            <a href="#process" className="hover:text-foreground transition-colors">FLOW</a>
            <Link href="/login" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-bold transition-colors">SIGN IN</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}

"use client";

import React from "react";
import { LandingNav } from "./LandingNav";
import { LandingHero } from "./LandingHero";
import { LandingSections } from "./LandingSections";

export function LandingPage() {
  return (
    <main className="landing-root min-h-[100svh] w-full relative bg-background text-foreground overflow-x-hidden flex flex-col items-center selection:bg-indigo-500 selection:text-white transition-colors duration-200">
      
      {/* Background Ambient Glow (Seamless full-viewport glow) */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden" 
        aria-hidden="true"
      >
        <div 
          className="absolute left-1/2 top-[35%] -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[800px] rounded-full opacity-35 dark:opacity-50 blur-[130px]"
          style={{
            background: "radial-gradient(ellipse at center, rgba(99, 102, 241, 0.45) 0%, rgba(147, 51, 234, 0.25) 45%, transparent 75%)"
          }}
        />
      </div>

      {/* Full-width Header Navigation */}
      <LandingNav />

      {/* Full-width Hero Section */}
      <LandingHero />

      {/* Full-width Lower Sections */}
      <LandingSections />

    </main>
  );
}

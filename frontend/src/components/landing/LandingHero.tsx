"use client";

import React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ContourArtwork } from "./ContourArtwork";

export function LandingHero() {
  const prefersReducedMotion = useReducedMotion();

  const handleExploreClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById("process") || document.getElementById("capabilities");
    if (target) {
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section 
      aria-label="Supply Chain Control Tower Hero"
      className="relative z-10 w-full min-h-[calc(100svh-4rem)] flex flex-col justify-between overflow-hidden px-5 sm:px-8 lg:px-12 py-10 sm:py-16"
    >
      {/* Background Abstract Topographic Contour-Line Artwork */}
      <ContourArtwork />

      {/* Hero Asymmetric Composition Content Container */}
      <div className="relative z-20 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center my-auto">
        
        {/* Left Column: Enormous Headline, Positioning Copy, Dual CTAs */}
        <div className="lg:col-span-7 flex flex-col items-start text-left">

          {/* Enormous Asymmetric Headline */}
          <h1 className="text-[54px] sm:text-[80px] lg:text-[100px] xl:text-[110px] font-black tracking-[-0.075em] leading-[0.9] text-foreground select-none">
            Command the<br />
            flow.
          </h1>

          {/* Sub-headline / Positioning narrative */}
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-lg mt-6">
            Autonomous procurement, real-time fleet telematics, dynamic yard orchestration, and touchless 3-way matching in a unified control tower.
          </p>

          {/* Compact Dual CTAs */}
          <div className="flex flex-wrap items-center gap-3.5 mt-8">
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-7 h-[42px] rounded-full bg-[#4B3EFF] hover:bg-[#584CFF] active:bg-[#4335E6] text-white text-xs font-bold tracking-wider uppercase transition-all shadow-[0_0_22px_0_rgba(75,62,255,0.55)] hover:shadow-[0_0_30px_2px_rgba(75,62,255,0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            >
              OPEN TOWER
            </Link>

            <a
              href="#process"
              onClick={handleExploreClick}
              className="inline-flex items-center justify-center px-7 h-[42px] rounded-full border border-border/80 hover:border-foreground/60 bg-card/60 hover:bg-muted text-foreground text-xs font-bold tracking-wider uppercase transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground backdrop-blur-xs"
            >
              EXPLORE FLOW
            </a>
          </div>
        </div>

        {/* Right Column: "Control, in motion." + Operational narrative */}
        <div className="lg:col-span-5 flex flex-col lg:items-start lg:pl-10 text-left lg:pt-8">
          <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-foreground">
            Control, in motion.
          </h2>

          <p className="text-xs sm:text-[13px] text-muted-foreground leading-relaxed max-w-[280px] mt-2.5">
            Connect requisitions, shipments, docks, invoices, and decisions in one operational view.
          </p>
        </div>

      </div>

      {/* Bottom Center Slim Scroll Cue */}
      <div className="relative z-20 flex flex-col items-center justify-center w-full mt-8 select-none" aria-hidden="true">
        <div className="w-[18px] h-[30px] rounded-full border border-border/60 flex items-start justify-center p-1 bg-card/40">
          <motion.div
            animate={prefersReducedMotion ? { y: 2 } : { y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="size-1 rounded-full bg-indigo-500"
          />
        </div>
      </div>

    </section>
  );
}

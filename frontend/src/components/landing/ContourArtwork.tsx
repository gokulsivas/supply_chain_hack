"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Variants } from "framer-motion";

export function ContourArtwork() {
  const prefersReducedMotion = useReducedMotion();

  const floatVariants: Variants = {
    animate: {
      scale: [1, 1.025, 0.985, 1],
      opacity: [0.85, 0.98, 0.88, 0.85],
      transition: {
        duration: 14,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
    static: {
      scale: 1,
      opacity: 0.9,
    },
  };

  const floatVariantsB: Variants = {
    animate: {
      scale: [1, 0.98, 1.02, 1],
      opacity: [0.8, 0.95, 0.82, 0.8],
      transition: {
        duration: 16,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
    static: {
      scale: 1,
      opacity: 0.85,
    },
  };

  return (
    <div 
      className="absolute inset-0 pointer-events-none overflow-hidden select-none" 
      aria-hidden="true"
    >
      <svg
        className="w-full h-full absolute inset-0"
        viewBox="0 0 1200 700"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Main Topographic Indigo to Violet Gradient */}
          <linearGradient id="contourGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#7C3AED" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#A855F7" stopOpacity="0.4" />
          </linearGradient>

          {/* Secondary Soft Violet Gradient */}
          <linearGradient id="contourGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.85" />
            <stop offset="60%" stopColor="#8B5CF6" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.35" />
          </linearGradient>

          {/* Tertiary Subtle Glow Gradient */}
          <linearGradient id="contourGrad3" x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#818CF8" stopOpacity="0.75" />
            <stop offset="50%" stopColor="#C084FC" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0.3" />
          </linearGradient>

          {/* Route Arc Gradient */}
          <linearGradient id="routeArcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#6366F1" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#A855F7" stopOpacity="0.9" />
          </linearGradient>

          {/* Soft Central Radial Glow Filter */}
          <radialGradient id="contourCoreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.12" />
            <stop offset="60%" stopColor="#7C3AED" stopOpacity="0.04" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient background glow inside the black frame */}
        <circle cx="640" cy="360" r="280" fill="url(#contourCoreGlow)" />

        {/* ========================================================= */}
        {/* FORMATION A: Organic Warped Topographic Island / Cluster   */}
        {/* Centered around ~53% width, ~51% height                    */}
        {/* ========================================================= */}
        <motion.g
          variants={floatVariants}
          animate={prefersReducedMotion ? "static" : "animate"}
          style={{ transformOrigin: "640px 360px" }}
        >
          {/* Outermost Contour Layer */}
          <path
            d="M 520 220 C 580 180, 680 190, 750 240 C 820 290, 830 410, 770 480 C 710 550, 590 560, 520 510 C 450 460, 460 360, 480 300 Z"
            stroke="url(#contourGrad1)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.45"
          />

          {/* Layer 2 */}
          <path
            d="M 540 245 C 600 205, 670 215, 730 260 C 790 305, 800 400, 750 460 C 700 520, 605 530, 545 485 C 485 440, 490 350, 510 305 Z"
            stroke="url(#contourGrad1)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.55"
          />

          {/* Layer 3 */}
          <path
            d="M 565 270 C 615 235, 665 245, 715 285 C 765 325, 770 395, 730 440 C 690 485, 615 495, 570 455 C 525 415, 525 340, 540 305 Z"
            stroke="url(#contourGrad2)"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.7"
          />

          {/* Layer 4 */}
          <path
            d="M 590 295 C 630 265, 665 275, 700 310 C 735 345, 740 390, 710 420 C 680 450, 625 460, 595 425 C 565 390, 560 335, 570 310 Z"
            stroke="url(#contourGrad2)"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.85"
          />

          {/* Layer 5 (Inner Core) */}
          <path
            d="M 615 325 C 645 300, 670 305, 685 330 C 700 355, 705 385, 685 400 C 665 415, 635 420, 615 395 C 595 370, 595 345, 615 325 Z"
            stroke="url(#contourGrad3)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.95"
          />

          {/* Layer 6 (Tight Center Ring) */}
          <path
            d="M 635 345 C 655 330, 665 335, 675 350 C 685 365, 680 380, 670 385 C 660 390, 645 390, 635 375 C 625 360, 625 350, 635 345 Z"
            stroke="url(#contourGrad3)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.6"
          />
        </motion.g>

        {/* ========================================================= */}
        {/* FORMATION B: Wide Flowing Horizontal Terrain Contours     */}
        {/* Anchored at bottom-right, extending toward the edges      */}
        {/* ========================================================= */}
        <motion.g
          variants={floatVariantsB}
          animate={prefersReducedMotion ? "static" : "animate"}
          style={{ transformOrigin: "980px 580px" }}
        >
          {/* Outer Flowing Band 1 */}
          <path
            d="M 780 660 C 850 560, 960 520, 1070 540 C 1180 560, 1240 640, 1260 700"
            stroke="url(#contourGrad1)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeOpacity="0.35"
          />

          {/* Flowing Band 2 */}
          <path
            d="M 810 680 C 880 585, 980 550, 1080 570 C 1170 590, 1230 660, 1260 720"
            stroke="url(#contourGrad2)"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeOpacity="0.5"
          />

          {/* Flowing Band 3 */}
          <path
            d="M 850 690 C 910 610, 1000 580, 1090 600 C 1160 620, 1210 680, 1240 730"
            stroke="url(#contourGrad3)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeOpacity="0.75"
          />

          {/* Flowing Band 4 */}
          <path
            d="M 890 710 C 940 640, 1020 615, 1100 630 C 1150 645, 1190 695, 1220 740"
            stroke="url(#contourGrad3)"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeOpacity="0.85"
          />
        </motion.g>

        {/* ========================================================= */}
        {/* ABSTRACT ROUTE ARC & TELEMETRY NODES                      */}
        {/* Subtle connector implying live supply chain telemetry     */}
        {/* ========================================================= */}
        <g>
          {/* Connecting dashed trajectory */}
          <path
            d="M 460 380 Q 560 480, 710 430 T 920 380"
            stroke="url(#routeArcGrad)"
            strokeWidth="1.5"
            strokeDasharray="4 6"
            strokeLinecap="round"
            strokeOpacity="0.65"
          />

          {/* Electric Blue Circular Solid Node */}
          <circle cx="460" cy="380" r="4.5" fill="#38BDF8" />
          <circle cx="460" cy="380" r="10" stroke="#38BDF8" strokeWidth="1" strokeOpacity="0.4" />

          {/* Violet Ring Node */}
          <circle cx="710" cy="430" r="3.5" fill="#C084FC" />
          <circle cx="710" cy="430" r="8" stroke="#C084FC" strokeWidth="1.25" strokeOpacity="0.7" />

          {/* Far Terminal Node */}
          <circle cx="920" cy="380" r="3" fill="#818CF8" />
        </g>
      </svg>
    </div>
  );
}

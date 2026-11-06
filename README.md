# RailTwin 3D (Dadar Junction Pilot)

> **Spatial Digital Twin & Live Crowd Navigation Platform for Indian Railway Hubs**

---

## Overview

RailTwin is a real-time 3D station monitoring and navigation application engineered specifically for daily commuters navigating high-density Indian railway junctions. 

While train transit along tracks is covered by generic tracking apps, **stations represent an information black box**. Commuters face last-minute platform switches, unannounced coach position inversions along 600m platforms, and hazardous foot overbridge (FOB) bottlenecks.

RailTwin pilots at **Dadar Junction (Mumbai)** — the busiest transit interchange in India handling ~2 million daily passengers across 14 platforms connecting Western Railway (PF 1–7) and Central Railway (PF 8–14).

---

## Core Pillars

1. **3D Spatial Digital Twin:** Multi-level station geometry (Ground Level tracks/platforms, $+6\text{m}$ elevated foot overbridges, underpasses) rendered in Three.js with moving suburban local train physics.
2. **Coach Alignment Engine:** Color-coded 12/15-coach demarcation (Ladies, First Class, General, AC, Divyangjan) mapped to physical platform landmarks.
3. **FOB Crowd Congestion Radar:** Real-time bridge density index (🟢 Free Flow, 🟡 Dense, 🔴 Choked) to avert stampedes.
4. **Smart Interchange Route Dispatcher:** 3D glowing path vector directing commuters between Western and Central platforms via the fastest, least-crowded bridge.
5. **Station Accessibility & Utilities:** Live operational statuses of lifts, escalators, clean drinking water kiosks, and RPF emergency points.

---

## Tech Stack

* **Framework:** React 19 + TypeScript + Vite
* **3D Engine:** Three.js + WebGL Canvas
* **Styling:** Tailwind CSS + Lucide Icons
* **Testing:** Vitest + React Testing Library

---

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run test suite
npm run test

# Typecheck and build
npm run build
```

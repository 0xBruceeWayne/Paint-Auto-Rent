# Car Rent Dan — Website Design Spec

**Date:** 2026-04-12
**Client:** Dan (Bruce's friend)
**Project folder:** `/Users/brucewayne/Desktop/VOSSWeb3D Design/Website Car Rent Dan/`

---

## Context

Dan owns a car rental business in Bucharest co-located with an auto paint service shop. His target customers are Uber and Bolt drivers who need to rent a reliable car to work. The site is purely call-to-action focused — no online booking system, just get drivers to call Dan.

**Address:** Strada Fabrica de Chibrituri 24-26, Sector 5, București
**Company name:** TBD (placeholder "DAN RENT" used throughout)
**Contact:** Phone number placeholder, WhatsApp button

---

## Design Direction

Driver's Cockpit — the hero looks like a cockpit. Dark carbon fiber top transitions to white below. The 3D car model reacts to cursor movement with red headlight glow. White is the base color with red and black/carbon fiber as accents. Premium feel for a practical service — makes Uber/Bolt drivers feel they're choosing a top-tier professional partner.

**Color palette:**
- White `#ffffff` — base background for most sections
- Black `#0a0a0a` / `#111111` — hero, dark sections, carbon fiber
- Red `#e02020` — single accent, CTAs, borders, glows
- Carbon fiber texture — on dark cards and dark sections

**Typography:** Barlow Condensed (Google Fonts) — weights 300, 600, 700, 800

**Stack:** Vanilla HTML/CSS/JS. Single `index.html` file. Three.js via CDN import map. GSAP via CDN. Lenis for smooth scroll. No frameworks, no build tools.

---

## Section Breakdown (all scroll-snapped, full viewport height)

### Section 1 — Hero: Full Screen Cockpit

- Full viewport height, scroll snap
- Top 60% dark carbon fiber background with Three.js WebGL canvas
- 3D car model (geometric placeholder or simple mesh) floating and rotating slowly
- Car tilts toward cursor position using lerp-smoothed mouse tracking
- Red spotlight/headlight glow follows cursor on the canvas (Three.js point light)
- ACESFilmic tone mapping, UnrealBloom post-processing, film grain shader
- Headline "PARTENERUL TĂU PROFESIONAL" — text scramble effect on load, Barlow Condensed 800 weight
- Subheadline "Închiriază Azi. Câștigă Mai Mult." fades in after scramble
- Bottom 40% white panel
- Massive red pulsing FAB CTA button "SUNĂ ACUM" with phone number
- Scroll indicator at bottom
- Frosted glass navbar over hero: logo left, nav links right (Fleet, Despre, Contact)

### Section 2 — Why Dan: 3 Stat Cards

- White background
- Section headline "De Ce Alegeți Dan Rent?" scroll-reveal from below
- 3 large cards with carbon fiber texture on dark background
- Each card tilts in 3D toward cursor (per-card rect-cached tilt)
- Stats count up when section enters viewport (IntersectionObserver):
  - "500+ Șoferi Parteneri"
  - "3 Ani Experiență"
  - "Disponibil 7/7"
- Red border slides in from left on card hover
- Cards have icon (inline SVG, stroke-based), number, and short label

### Section 3 — Fleet: Horizontal Car Showcase

- Dark section (carbon fiber bg)
- Headline "Flota Noastră" white, scroll-reveal
- Horizontal scroll strip — GSAP draggable or scroll-linked
- 4 to 6 car cards, each with:
  - Front: car photo (placeholder) + car name + key spec (seats, transmission)
  - Hover: red border slides in, card lifts with box-shadow
  - "DISPONIBIL" badge in red, or "OCUPAT" in gray
  - Cards float with continuous gentle keyframe animation (staggered offsets)
- Drag hint icon fades out after first drag

### Section 4 — How It Works: 3 Steps

- White background
- Headline "Cum Funcționează?" scroll-reveal
- 3 steps in a row connected by an animated red line that draws on scroll
- Each step has:
  - Large animated number (1, 2, 3) that counts up on scroll
  - Inline SVG icon that path-draws itself using stroke-dashoffset animation
  - Step title and short description
  - "1. Sună-ne", "2. Alege Mașina", "3. Începe să Câștigi"
- Clean, minimal — designed for quick comprehension

### Section 5 — Benefits: Feature Strip for Drivers

- Dark carbon fiber background
- Headline "Gândit Pentru Șoferii Uber & Bolt" white
- 4 floating benefit cards in a grid:
  - "Fără Garanție Mare" — shield icon
  - "Asigurare Inclusă" — checkmark icon
  - "Întreținere Asigurată" — wrench icon
  - "Contract Flexibil" — document icon
- Cards float with staggered keyframe animations (different timing per card)
- Red glow appears on card hover
- All icons inline SVG, stroke-based, no icon libraries

### Section 6 — Contact: Call to Action

- White background
- Red diagonal accent strip at top of section
- Split layout: left 55%, right 45%
- Left side:
  - "Sună-ne Acum" headline
  - Massive phone number (placeholder) with pulse ring animation around it
  - FAB phone button with red glow
  - WhatsApp button (green, inline SVG logo)
  - Address: Strada Fabrica de Chibrituri 24-26, Sector 5, București
  - Hours placeholder: "Lun-Vin 08:00 - 20:00"
- Right side:
  - Google Maps iframe showing the address location
  - Rounded corners, subtle shadow

### Section 7 — Footer

- Dark background (`#0a0a0a`)
- Carbon fiber texture overlay (subtle)
- Thin red top border (2px)
- Three columns: logo/tagline left, nav links center, social icons right
- "© 2026 Dan Rent. Toate drepturile rezervate."
- Social icons: Facebook, Instagram, WhatsApp — inline SVG

---

## Interactions & Animations Summary

- Three.js 3D hero with cursor-reactive car tilt and red spotlight
- ACESFilmic renderer, UnrealBloom, film grain post-processing
- Cursor: custom cursor dot that scales up on hover over interactive elements
- Lenis smooth scroll between all sections
- Full-page scroll snap (CSS scroll-snap-type: y mandatory)
- Frosted glass navbar that appears on first scroll past hero
- GSAP ScrollTrigger for all scroll-reveal animations
- Per-card 3D tilt with mouse (stat cards, benefit cards)
- SVG path draw animations on step icons
- Count-up stats on IntersectionObserver
- Horizontal fleet scroll with GSAP draggable
- Pulse ring FAB buttons (red)
- Red border slide-in on card hover
- Text scramble on hero headline
- Floating card animations (CSS keyframes, staggered)

---

## Quality Bar

- Desktop 1920x1080 looks cinematic
- Mobile 375px is clean and usable
- All icons are inline SVG (no icon libraries)
- Single accent color red `#e02020` throughout
- No effects obscure the headline or phone number
- Phone number visible within 3 seconds of landing
- Scroll snap feels smooth, not jumpy
- 4K ready: `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`

---

## File Structure

```
Website Car Rent Dan/
  index.html        (everything: HTML + style + script)
  assets/
    cars/           (car photos — placeholders for now)
    logo.svg        (placeholder)
```

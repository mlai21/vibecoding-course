```markdown
# Design System Document: Cinematic Precision

## 1. Overview & Creative North Star
**Creative North Star: "The Tactical Commander"**
This design system moves away from generic "dark mode" templates toward a high-precision, cinematic interface inspired by advanced avionics and the iconic aesthetic of Char Aznable. It is a tribute to technical excellence—sharp, aggressive, yet deeply sophisticated.

The system breaks the "template" look through **Intentional Asymmetry**. We do not center everything; we use offset layouts and "data-heavy" decorative elements created entirely through CSS to simulate a high-tech HUD (Heads-Up Display). The vibe is one of controlled power: a deep black void punctuated by high-energy crimson and neon-pink strikes.

---

## 2. Colors & Atmospheric Lighting
The palette is built on a "Total Black" foundation to ensure the red and pink accents feel emissive, like glowing cockpit lights.

### Core Palette
- **Background (The Void):** `#131315` (Surface) and `#0e0e10` (Surface Container Lowest).
- **Primary (The Red Comet):** Transitioning from `primary_container` (#c1121f) to `tertiary` (#ffb0ca).
- **Secondary (The Gold Standard):** `secondary` (#e9c349) for high-level technical callouts.

### The "No-Line" Rule
Traditional 1px solid borders are strictly prohibited for sectioning. Separation is achieved through:
1.  **Tonal Shifts:** Place a `surface_container_low` (#1c1b1d) section against the `surface` (#131315) background.
2.  **Ambient Glows:** Use large, blurred `box-shadow` values (0px 0px 80px) using the `on_error_container` (#93000a) at 5% opacity to "lift" sections.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical armor plates. 
- **Base Layer:** `surface_dim` (#131315).
- **Tactical Panels:** `surface_container` (#201f21).
- **Active Data Modules:** `surface_container_highest` (#353437).
By nesting a higher-tier container inside a lower one, you create depth without artificial shadows.

### The "Glass & Gradient" Rule
Floating tactical overlays must use **Glassmorphism**. Use `surface_variant` (#353437) at 40% opacity with a `backdrop-filter: blur(12px)`. This allows the red ambient glows from the background to bleed through, softening the "hard" tech edges.

---

## 3. Typography
Typography is our primary visual "image." We use high-contrast scales to create an editorial feel.

- **Display (Space Grotesk):** Massive, tight-leading, and aggressive. For `display-lg`, apply a linear gradient from `primary_container` (#c1121f) to `tertiary` (#ffb0ca). This creates a "heated metal" effect.
- **Body (Manrope):** Geometric and highly legible. Use `on_surface_variant` (#e5bdb9) for body text to reduce eye strain against the pure black background.
- **Labels:** Use `label-md` in `secondary` (#e9c349) with `letter-spacing: 0.1em` and `text-transform: uppercase` to mimic technical readouts.

---

## 4. Elevation & Depth
In this design system, depth is "Atmospheric" rather than structural.

- **The Layering Principle:** Avoid the "card on a flat plane" look. Instead, use the **Spacing Scale** to create wide gutters (Value 16 or 20) between containers of different surface tiers. This "breathing room" makes the layout feel like a high-end interface rather than a website.
- **Ambient Shadows:** Shadows are never grey. Use a 15% opacity version of `on_primary_fixed_variant` (#930011) for shadows. This creates a "Crimson Aura" around active elements.
- **The "Ghost Border" Fallback:** For buttons or input fields, use `outline_variant` (#5c403d) at 20% opacity. It should look like a faint laser-etched line, not a stroke.
- **CSS Shapes:** Since images are forbidden, use `clip-path` to create chamfered corners (45-degree angles) on containers to reinforce the "Gundam/Mecha" aesthetic.

---

## 5. Components

### Buttons
- **Primary:** No background. 1px "Ghost Border" using `primary`. Text in `primary`. On hover, a subtle `primary_container` glow fills the background.
- **Tactical (Action):** `surface_container_highest` background with a `secondary` (#e9c349) left-accent border (4px).

### Input Fields
- **Styling:** Transparent backgrounds with an `outline_variant` bottom border only. 
- **States:** On focus, the bottom border transitions to a `tertiary` (#ffb0ca) gradient. Helper text must use `label-sm` in `secondary`.

### Cards & Lists
- **The "No-Divider" Rule:** Never use horizontal lines. Separate list items using `surface_container_low` backgrounds and `spacing.2` vertical margins.
- **Interactive States:** On hover, a card should not move "up"; instead, increase the `backdrop-filter: blur` and change the border opacity from 10% to 40%.

### Technical Accents (Custom Component)
- **Data Brackets:** Use CSS `::before` and `::after` pseudo-elements to create "[" and "]" brackets around key stats in `secondary` (#e9c349).
- **Corner Marks:** Small 2px x 2px `primary` squares at the four corners of a container to simulate a targeting reticle.

---

## 6. Do’s and Don’ts

### Do:
- **Use Intentional Asymmetry:** Align the hero text to the left but place a technical "readout" (list of skills) offset to the far right.
- **Embrace Negative Space:** Let the `surface_lowest` color breathe. High-end design is defined by what you *don't* show.
- **Animate Gradients:** Use CSS keyframes to slowly move the red-to-pink gradient on headings to simulate "pulsing energy."

### Don’t:
- **Don’t use Images:** If you need a visual, build a geometric pattern using `repeating-linear-gradient` or CSS grid dots.
- **Don’t use Pure White:** Use `on_surface` (#e5e1e4) for text. Pure white (#FFFFFF) is too harsh and breaks the cinematic immersion.
- **Don’t use Standard Corners:** Avoid the `md` or `lg` roundedness scale for main layout containers. Use `none` (0px) or `sm` (0.125rem) for a sharper, "high-precision" technical feel. Reserve `full` only for small chips.

### Accessibility Note:
Ensure that even with "Ghost Borders," the contrast between `on_background` text and the `surface` remains high. Use the `secondary` gold accent sparingly to highlight only the most critical navigational paths.```
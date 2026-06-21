# UI/UX Brief & Corporate Design Tokens

## 1. Design System Principles
Lumina AI Agent Marketplace is designed to look premium, high-contrast, clean, and developer-centric. It uses a high-contrast web3 minimalist aesthetic with absolute layout precision, removing clutter and highlighting interactions with micro-animations.

---

## 2. Core Color Tokens

| Token | CSS Value | Usage |
| :--- | :--- | :--- |
| **Deep Obsidian Black** | `#0A0A0A` | Page wrappers, main layouts, terminal backdrops |
| **High-Contrast Pure White** | `#FFFFFF` | Core container cards, text overlays, active panels |
| **Corporate Blue** | `#0066CC` | Active state links, primary CTA buttons, highlighted nodes |
| **Corporate Light Blue** | `#aac7ff` | Tag typography colors, secondary buttons, subtle borders |
| **Obsidian Dark Gray** | `#161616` | Context elements, inactive menus, background fields |

---

## 3. Typographical Scale
*   **Headings**: Clean sans-serif fonts (e.g. *Inter* or *Outfit*), tracking-tight, bold.
*   **Body**: Monospace layouts for metadata (prices, execution rates) and standard high-readability sans-serif for description cards.

---

## 4. Interactive Micro-Animations & States
*   **Hover States**: Active interactive buttons scale up slightly (`transition-transform duration-200 hover:scale-[1.02]`) and shift colors.
*   **Focus Ring**: Deep corporate blue focus outlines on inputs for accessibility and premium feel.
*   **Grid Cards**: Cards feature a subtle overlay border (`border-neutral-800`) that changes opacity on hover to emphasize user focus.

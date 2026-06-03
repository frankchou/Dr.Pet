---
name: purepaw-design
description: Use this skill to generate well-branded interfaces and assets for PurePaw 無敏毛孩 (a pet nutrition & health-management app), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files.

Key files:
- `README.md` — product context, content/visual/iconography foundations, and the **v1→v2 feature-mapping report**.
- `colors_and_type.css` — color + type tokens (CSS vars + semantic classes). Quicksand font.
- `assets/logo.svg` — brand logo.
- `ui_kits/purepaw_app/` — high-fidelity, interactive recreation of the app (v2 Figma UIUX + v1 Dr.Pet features). Lift components from here.
- `preview/` — design-system swatch/specimen cards.

Brand in one line: cute, rounded, Korean-stationery feel. **Quicksand** font, macaron apricot `#FFE8D6` + ink `#111111` on a cool `#F4F7FB` canvas, very round corners (24–40px + pills), soft low-contrast shadows, 2px slate-900/5 hairline cards, solid-black active states, lucide line icons. Traditional-Chinese (Taiwan) copy, pets = 「毛孩」, almost no emoji.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

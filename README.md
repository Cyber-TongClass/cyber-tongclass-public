# Tong Class Website — Frontend Aesthetics & Contributor Guide

> By [Xiyao Tian](https://github.com/Prince-cjml), last updated Mar 9, 2026

This repository contains the full website code for Tong Class. The backend (Convex) is implemented and should be treated as a finished service, do **NOT** change any of the backend logic; frontend contributors are expected to focus on aesthetic polish, layout, and UX improvements only. See `documents/api.md` for backend API details and how to interact with Convex.

Quick orientation
- Backend: Convex — server code lives in `convex/` and the schema is in `convex/schema.ts`. The frontend consumes Convex via `NEXT_PUBLIC_CONVEX_URL` and the generated API in `convex/_generated/api`.
- Frontend: Next.js (app dir), Tailwind CSS, shadcn/ui components, `src/` contains the UI and hooks.

This README focuses on a basic development guide, and the requirements for frontend aesthetics: design tokens, layout, component library, style system, imagery, motion, accessibility, and the practical steps for contributors to implement production-grade visuals.

---

## 1. Project constraints & what contributors must know
- The backend is already implemented — do NOT change backend logic unless absolutely necessary. In the latter case, contact [Xiyao Tian](https://github.com/Prince-cjml) or [Shaoheng Yan](https://github.com/PhotonYan). To understand available API endpoints and data shapes, open `documents/api.md`.
- Frontend changes should call Convex via the hooks in `src/lib/hooks`. Do not directly call Convex from components, and avoid calling Convex directly from generated apis. 
- The pipeline for development is as follows:
  1. Request read access to the repository from any of the maintainers: [Xiyao Tian](https://github.com/Prince-cjml), [Shaoheng Yan](https://github.com/PhotonYan), [Yinghan Chen](https://github.com/chenyinghan) and [Jiangyue Zeng](https://github.com/qqqqingmo); 
  2. Fork this repository on this page first, then clone it locally: 
    ```bash
    git clone https://github.com/YOUR_USERNAME/Cyber-TongClass.git
    cd Cyber-TongClass
    ```
  3. Connect your local branch to the original repository to keep it updated:
    ```bash
    git remote add upstream https://github.com/Cyber-TongClass/Cyber-TongClass.git
    ```
  4. Create a new branch for your changes:
    ```bash
    git fetch upstream
    git checkout -b feature/your-contribution upstream/develop
    ```
  5. After making changes, commit and push to your fork. Before making any changes, make sure you pull the latest changes from the original repository to avoid conflicts:
    ```bash
    git pull upstream develop
    # resolve any conflicts if necessary, then add your changes, commit, and push
    git add . # or specify files to add
    git commit -m "Your commit message"
    git push origin feature/your-contribution
    ```
  6. Finally, create a pull request on github from your fork's branch to the original repository's `develop` branch. Provide a clear description of your changes and any relevant screenshots or details for reviewers. 
- For local development, developers must first install [Node.js with npm](https://nodejs.org/zh-cn/download). Then, run the following commands in the project directory:
  ```bash
  npm ci
  npx convex dev
  npm run dev
  ```
  When a convex auth is required, **LOGIN WITHOUT EMAIL**. You do not need to handle the remote database, hence a local Convex instance is sufficient for frontend development. 

  After this process, the frontend will be running at `http://localhost:3000` and the Convex backend will be running at `http://localhost:3001`. The frontend is configured to use the local Convex instance by default, so no additional configuration is needed for API calls.

  Before you create a pull request, make sure you have tested the full feature by running:
  ```bash
  npx convex codegen
  npm run build
  npm run start
  ```
  Only pull request production-ready code that has been tested in a production-like environment (i.e., with `npm run build` and `npm run start`), and ensure that all new features are visually polished, responsive, and accessible. 
## 2. Goals for frontend aesthetics
- Make the site feel polished, academic, and modern while remaining lightweight and accessible.
- Key deliverables for a publish-ready theme:
  - A refined color palette and typography scale
  - Responsive header and navigation with clear hierarchy
  - A visually strong homepage hero and content hierarchy for News/Events/Publications
  - Well-designed card system for lists and index pages (news, publications, members)
  - Accessible forms and modal dialogs (login, registration, admin editor)
  - Consistent spacing, icons, and imagery strategy

## 3. Design tokens (single source of truth)

From this point on, the whole `README.md` is written for vibe coding agents. You need not read this part, but feed it to your agent to understand the design system and token strategy for the frontend.

Where: `src/styles/design-system.ts` (or add it if missing). Store tokens both as TypeScript constants and CSS variables for runtime theming.

Here is a list of example tokens for pure demonstration purpose:
```ts
export const colors = {
  primary: '#0b63ff',
  primaryDark: '#0849c1',
  accent: '#ff7a59',
  background: '#ffffff',
  surface: '#f8fafc',
  muted: '#6b7280',
  border: '#e6e9ef',
}

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 }
export const radii = { sm: 6, md: 12, lg: 16 }
```

Then map them into CSS variables at root for Tailwind usage:
```css
:root {
  --color-primary: #0b63ff;
  --color-background: #ffffff;
  --space-md: 16px;
}
```

And in `tailwind.config.ts` reference CSS variables or directly inject tokens to maintain consistency.

## 4. Typography
- Choose fonts: one display (for hero/headings) and one readable content font. Example: `Inter` for body and `Merriweather` or `Playfair Display` for headings.
- Define type scale in `tailwind.config.ts` and ensure `line-height` follows an 8px baseline grid.
- Avoid many different sizes — use a 4-step scale for headings.

## 5. Layout & Grid
- Container: define `container-custom` with max-width breakpoints (640/768/1024/1280/1440).
- Grid: center content using a 12-column grid for large layouts; use simple stacked layout for mobile.
- Spacing: use tokenized spacing classes via Tailwind utilities (avoid magic numbers in components).

## 6. Header & Navigation
- Header structure: Left: logo; Center: primary nav; Right: search + auth
- Desktop: show full menu with dropdowns for multi-level items.
- Mobile: collapsible menu (sheet/drawer). Use `aria-expanded` and keyboard traps for accessibility.

## 7. Hero and Homepage
- Hero: full-width banner with optional image, gradient overlay, and highlighted CTA buttons. Use `object-fit: cover` and `loading=lazy` for large images.
- Feature slider: accessible controls, keyboard support, and reduced motion fallback.

## 8. Cards, Lists, and Details
- Card system: `Card` component (image, meta, title, excerpt, CTA). Keep aspect-ratio consistent (e.g., 16:9) for images.
- News list: grid on desktop (3 columns), single-column stacked on mobile. Use consistent date and category chips.
- Detail page: readable max-width (e.g., 720px), persistent table of contents for long articles.

## 9. Components to polish first
- `Hero` — make it bold and image-rich.
- `NewsCard` and `NewsList` — consistent cards, hover states, and readable excerpt lengths.
- `AppShell` header & footer — responsive layout, polished top nav, search UX.
- `ProfileCard` for members — avatar, role, quick links.

I can scaffold `Hero` + `NewsCard` components on request.

## 10. Imagery and avatars
- Use high-quality hero illustrations or photography with consistent color grading.
- Avatars: circular crop, 64px/96px/128px sizes, fallback initials for missing images.
- Optimize images at build time and use Next.js `Image` component. If using Cloudflare Pages, set `images.unoptimized = true` or use Cloudflare Images.

## 11. Icons and visual language
- Use `lucide-react` (already in deps) for icons. Keep icon sizes and stroke widths consistent.
- Provide an icon utility wrapper to standardize color and accessible labels.

## 12. Motion and transitions
- Subtle transitions for hover states and modals; respect `prefers-reduced-motion`.
- Use Tailwind `transition` utilities and `framer-motion` only if necessary.

## 13. Accessibility
- Keyboard navigation for all interactive elements, focus-visible styles, and skip links.
- Use semantic HTML (nav, main, article, header, footer).
- Ensure color contrast meets WCAG AA for text and interactive elements.

## 14. Theming and dark mode
- Use `next-themes` for toggling. Keep tokens in CSS variables so switching theme is only changing root variable values.

## 15. Forms, validation, and CAPTCHA
- Registration and login forms should be accessible and show inline validation.
- For bot protection, integrate Cloudflare Turnstile. Client uses `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. Verification call should run server-side (Convex mutation or Next API route). See `documents/api.md` for backend contact.

## 16. File uploads
- Upload flow: frontend requests signed URL from server (Convex). Upload directly to R2/S3, then store the URL in Convex.

## 17. Shadcn/UI and component templates
- Use `npx shadcn-ui@latest init` and `npx shadcn-ui@latest add <component>` to scaffold components into `src/components/ui`.
- The official template site is https://ui.shadcn.com — copy or scaffold components and adapt tokens.

## 18. Development workflow & checks
- Local dev commands:
```powershell
npm ci
npm run dev
```
- Linting: `npm run lint` (Next.js ESLint). Commit hooks are recommended.
- Visual review: add Storybook or a simple component gallery (optional but recommended).

## 19. Pull request checklist for UI/Design changes
- Visual: screenshots for desktop and mobile
- Accessibility: keyboard walkthrough and contrast check
- Performance: Lighthouse score basic checks (images, JS payload)
- Do not modify Convex backend code — only change hooks and UI unless backend contract changes are coordinated.

## 20. How to contact the backend
- Read `documents/api.md` to discover Convex functions, query/mutation names, and payload shapes. This is the canonical reference when you need to call or extend backend functionality.


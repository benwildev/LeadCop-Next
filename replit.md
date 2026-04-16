# LeadCop / TempShield — Email Validation SaaS

## Architecture

**Monorepo (pnpm workspaces)**
- `artifacts/tempshield/` — React 19 + Vite frontend (port 5173)
- `artifacts/api-server/` — Express 5 backend (port 8080)
- `lib/db/` — Drizzle ORM schema + migrations (PostgreSQL)

**Start command:** `start-dev.sh` (runs both services in parallel)

## Key Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4, shadcn/ui |
| State/Data | TanStack Query v5 |
| Backend | Express 5, TypeScript |
| ORM | Drizzle ORM |
| Database | PostgreSQL (`postgresql://postgres:password@helium/heliumdb?sslmode=disable`) |
| Rich Editor | TipTap v3 (`@tiptap/react` + extensions) |
| Animations | Framer Motion |
| Icons | Lucide React |

## Important Files

- `artifacts/tempshield/src/pages/admin.tsx` — Blog admin CRUD page
- `artifacts/tempshield/src/components/TiptapEditor.tsx` — WordPress-like rich text editor (TipTap v3)
- `artifacts/tempshield/src/components/MarkdownEditor.tsx` — Re-exports TiptapEditor (backward compat)
- `artifacts/tempshield/src/pages/blog-post.tsx` — Public blog post renderer (HTML + legacy markdown)
- `artifacts/tempshield/src/pages/landing.tsx` — Marketing landing page
- `lib/db/src/schema/blog.ts` — Blog post schema

## Editor Notes

- TipTap v3 is installed. `BubbleMenu` lives in `@tiptap/extension-bubble-menu` (not `@tiptap/react`)
- Blog content field stores **HTML** (TipTap output). Legacy posts in markdown are auto-detected by `/<[a-z][\s\S]*>/i` and rendered via `ReactMarkdown` as a fallback
- Editor styles: `src/index.css` under `.tiptap-editor .tiptap` selector

## Responsive Design

- Landing page uses `px-4 sm:px-6`, `py-14 sm:py-20` breakpoints
- Newsletter form stacks vertically on mobile (`flex-col sm:flex-row`)

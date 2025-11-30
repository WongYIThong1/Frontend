# Repository Guidelines

## Project Structure & Module Organization
- `app/` contains App Router routes (`login`, `signup`, `tasks`, `machines`, `settings`, `utilities`, API under `app/api`) and `globals.css`.
- `components/` holds shared UI/layout shells (`dashboard-layout.tsx`, `dashboard-sidebar.tsx`, `components/ui/*` on Radix).
- `hooks/` keeps reusable React hooks; pull shared data/state logic here.
- `lib/` centralizes utilities (Supabase client in `lib/supabase.ts`, helpers in `lib/utils.ts`).
- `public/` stores static assets; `styles/` holds legacy CSS. `components.json` configures the shadcn/Radix setup.

## Build, Test, and Development Commands
- `pnpm dev` - run the dev server at http://localhost:3000.
- `pnpm build` - create a production build.
- `pnpm start` - serve the production build locally.
- `pnpm lint` - Next.js ESLint pass (run before every PR).  
Use `pnpm` (lockfile present); avoid mixing package managers.

## Coding Style & Naming Conventions
- Stack: TypeScript, React 19, Next.js 16; path alias `@/*` in `tsconfig.json`.
- Styling: Tailwind CSS v4 via `app/globals.css`; favor utilities. Components should accept `className`.
- Formatting: 2-space indentation; components in PascalCase, hooks in `useX`, files in kebab-case (`dashboard-sidebar.tsx`). Prefer double quotes.
- `next.config.mjs` ignores TS build errors; rely on `pnpm lint` locally.

## Testing Guidelines
- No automated tests yet. When adding features, include component tests (React Testing Library + Vitest recommended) with Supabase client mocks.
- Name tests after the unit (`component-name.test.tsx`) and colocate under `__tests__/` or beside the source file.
- Focus coverage on auth, task creation, machine actions, and API handlers.

## Commit & Pull Request Guidelines
- Use Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`); keep subjects <=72 characters.
- Before opening a PR: run `pnpm lint` (and any new tests), summarize the change, link the issue/board card, and attach UI screenshots for visible updates.
- Keep PRs small and focused; split large rewrites if needed. Update docs or env notes when configuration or Supabase keys change.

## Security & Configuration Tips
- Secrets belong in `.env.local`; never commit them. `lib/supabase.ts` includes fallback keys - override locally and in deployment to avoid using the default anon key.
- When adding env vars, document them in `.env.local` with placeholders and update the hosting config (e.g., Vercel). Avoid logging secrets on server or client.

# Vercel Preview Smoke

Purpose: trigger a clean Preview deployment from Git integration without changing application behavior.

Source branch: `chore/vercel-preview-smoke`
Base: `main`

Expected build path:

- `bun install`
- `bun run build`
- `next build --webpack`

This file is intentionally documentation-only.

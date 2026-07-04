# TheFresh Admin

Admin portal for TheFresh — Next.js (App Router) + Refine + Ant Design.
See `../docs/catalog-design.md` for the domain model this UI is built against.

## Getting Started

```bash
npm install
npm run dev
```

Requires the API (`../api`) running on `http://localhost:3000` — see the root `README.md`
for full local setup (Docker Postgres/Redis, seeding, etc).

## Stack notes

- **Refine (headless core) + Ant Design**, not a prebuilt Refine UI kit. `@refinedev/core`
  provides data/routing/auth hooks only; all rendering is plain `antd` components. See
  `src/providers/refine-provider.tsx`.
- Next.js 16 renamed `middleware.ts` → `proxy.ts` (same behavior, new file name/export).
  Auth-gate logic lives in `src/proxy.ts`.
- Theme tokens live in `src/providers/theme.ts` (not the default `RefineThemes` preset).

## Known issues

### Flash of unstyled content (FOUC) on hard refresh — fixed via `overrides`

**Symptom:** on a hard page load/refresh, the page briefly renders as plain unstyled HTML
(default browser fonts/colors, no antd styling) before Ant Design's CSS applies a moment
later. Only affects the first paint of a full navigation, not client-side route changes.

**Root cause:** `@ant-design/nextjs-registry` (which server-renders Ant Design's CSS-in-JS
styles into the initial HTML via `useServerInsertedHTML`) declares a very loose peer
dependency on `@ant-design/cssinjs` (`>=1.0.0`). `antd@5.x` itself depends on
`@ant-design/cssinjs@^1.24.0`. When npm auto-installs peer dependencies, it resolved a
**separate nested copy of `@ant-design/cssinjs@2.1.2`** for `@ant-design/nextjs-registry`,
instead of reusing the `1.24.0` already required by `antd`/`@refinedev/antd` elsewhere in
the tree (confirm with `npm ls @ant-design/cssinjs` — a healthy tree shows a single
deduped version; a broken one shows two).

Because `@ant-design/cssinjs` v1 and v2 are incompatible major versions, this results in
**two separate CSS-in-JS engine instances** in the same app: `AntdRegistry`'s style cache
(v2) is invisible to antd's actual components (v1), which register their styles into a
completely different runtime instance. Server-side extraction pulls from the wrong (or an
effectively empty) cache, so the first paint ships with no antd styles at all — hence the
flash while the client-side v1 instance catches up after hydration.

**Fix** (`package.json`):

```json
"overrides": {
  "@ant-design/cssinjs": "^1.24.0"
}
```

This forces a single, deduped `@ant-design/cssinjs` version across the whole tree. Verify
with `npm ls @ant-design/cssinjs` — every entry should say `deduped` or `overridden`, none
should show a second major version. After changing this, delete `.next` and rebuild.

**How this was diagnosed:** curling the SSR HTML directly (`curl .../products | grep
'<style'`) showed zero style tags even in a production build — a real signal, not a dev-mode
artifact. An isolated minimal repro (bare `AntdRegistry` + `ConfigProvider` + `Table`, no
Refine) still flashed once `antd` was pinned to the exact version this project uses,
which ruled out Refine/Suspense/`ThemedLayout` as the cause and pointed at the dependency
tree itself. `npm ls @ant-design/cssinjs` then showed the duplicate instance directly.

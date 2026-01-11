# WXT + React

This template should help get you started developing with React in WXT.

## oRPC messaging demos

- Background RPC server: `entrypoints/background.ts`
- Popup client (React Query): `entrypoints/popup/App.tsx`, `shared/orpc/query.ts`
- Content script client: `entrypoints/content.ts`
- Shared router + client helpers: `shared/orpc`
- Counter state is persisted in `browser.storage.local` (MV3-safe).

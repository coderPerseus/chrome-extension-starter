# Repository Guidelines

## Project Overview
This is a WXT-based browser extension project. It targets modern extension runtimes and uses a React UI layer for extension surfaces like the popup and onboarding.

## Tech Stack
- WXT as the extension build system and runtime orchestration.
- TypeScript + React for UI and shared logic.
- oRPC + TanStack Query for typed request/response and cache management across extension modules.
- Biome for formatting and linting.
- Internationalization via the browser i18n API with locale message files.

## Module Communication
- Background (service worker) and UI surfaces (popup/onboarding) communicate through oRPC over extension message ports.
- Content scripts and injected page scripts communicate via `window.postMessage` and `window.addEventListener("message")` to bridge the isolated world with the page context.
- Shared types and contracts live in the oRPC layer to keep cross-module calls consistent and typed.

## UI Frameworks
- Ant Design v6 provides core UI components.
- Tailwind CSS v4 is used for utility-first layout and styling.
- Prefer concise, composable UI that renders quickly in popup contexts.

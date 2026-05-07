# Design Web Visualizer

AI-assisted color palette and font preview tool for websites, web systems, apps, dashboards, landing pages, e-commerce, SaaS products, and portfolios.

The app helps users see how their own project could look when different color palettes and font pairs are applied. Users can describe their project, upload a reference photo or screenshot, and generate 10 design directions using their own AI provider API key.

## Features

- Generate exactly 10 palette and font-pair options.
- Supports Gemini, OpenAI, and Anthropic user-owned API keys.
- Optional model fetching based on the user's own provider credential.
- Focused design brief for system type, design style, use case, audience, mood, and color/font notes.
- Optional screenshot or photo upload for AI reference.
- Dedicated preview templates for:
  - Website
  - Web System
  - Mobile App
  - Dashboard
  - Landing Page
  - E-commerce
  - SaaS Product
  - Portfolio
- AI-generated component chips such as `Top Navigation`, `Booking Form`, `Product Grid`, or `Analytics Table`.
- AI-generated preview copy for mockup labels, nav items, card titles, form fields, table rows, action labels, and footer labels.
- Light and dark mode preview per palette.
- Copy palette/font prompt for use in other design or development tools.
- Optional local-folder saving for credentials and history.
- Read-only history view for previously saved generations.

## What The App Is For

This project is only for generating and previewing color palettes and fonts for UI projects.

It is not intended to generate full websites, production code, marketing plans, or unrestricted AI output. The AI response is constrained to palette, font, component, style, and safe preview-copy data. The frontend uses controlled templates so the result stays focused.

## How Uploads Work

Uploaded photos or screenshots are sent to the selected AI provider as reference input.

The upload is used to infer:

- UI type
- component emphasis
- density and spacing rhythm
- visual tone
- suitable component labels
- safe mockup copy
- palette and typography direction

The uploaded image is not displayed inside the generated preview, and the app instructs AI not to copy exact text, logos, names, faces, private data, or unique identifiers. The preview is a controlled look-a-like mockup for palette and font evaluation, not a pixel-perfect clone.

## Security Model

- No owner API key is bundled in the app.
- Users must provide their own Gemini, OpenAI, or Anthropic API key.
- This project has no user database.
- API keys are not saved to any project server.
- If a user chooses to save their key, it is written only to `credentials.json` in the local folder they select on their own device.
- Saved history is written only as JSON files in the user's chosen local folder.
- On refresh or a new session, users must choose the same local folder again to reload saved credentials/history.
- If deployed as a static frontend, AI requests are sent directly from the user's browser to the selected AI provider.

## Public Deployment Notes

This app can be deployed as a static frontend.

Recommended deployment checks:

- Confirm `npm run build` succeeds in the target deployment environment.
- Serve over HTTPS so browser APIs behave correctly.
- Test generation with fresh Gemini, OpenAI, and Anthropic keys.
- Test upload + generate for each system type.
- Test local folder saving in Chrome or Edge.
- Test history reload by selecting the same folder again.

Important limitations:

- Local folder saving depends on the File System Access API. It works best in Chrome or Edge on HTTPS or localhost.
- Some browsers do not support local folder access.
- Provider CORS behavior, model listing, quotas, and rate limits can vary by provider and key.
- The app uses client-side API calls. If a backend is added later, add server-side rate limiting, user quotas, request queues, encrypted secret storage, and abuse protection before accepting API keys server-side.

## AI Providers

The app currently supports:

- Gemini
- OpenAI
- Anthropic

Users can keep the recommended model or use Advanced model selection. The `Fetch` action attempts to list available models using the user's own API key. If model listing fails, the app keeps the recommended model.

## Local Development

Prerequisite: Node.js.

```bash
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:3000
```

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run preview
```

## Environment

No AI API key is required in `.env`.

Users paste their own provider key in the app. See `.env.example` for the optional app URL placeholder used by some deployment platforms.

## Deployment Readiness

Before pushing to production, run:

```bash
npm run lint
npm run build
```

If `vite build` fails locally with an esbuild `spawn EPERM` error on Windows, verify the build in your deployment environment. This can be caused by local permission or sandbox restrictions rather than TypeScript errors.

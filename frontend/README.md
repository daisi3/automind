# AutoMind Frontend

React and TypeScript frontend for AutoMind, built with Vite.

## Development

```bash
npm install
npm run dev
```

The application expects the backend at `http://localhost:8000`. To use another address, copy `.env.example` to `.env.local` and update `VITE_API_BASE_URL`.

## Checks

```bash
npm run lint
npm run build
```

## API contract

The reusable API client lives in `src/services/api/client.ts`. It provides generic JSON requests and SSE streaming with shared Base URL, response parsing, and error handling. The chat service sends `POST /api/chat` with a `messages` array and consumes a `text/event-stream` response. SSE payloads may be plain text or JSON containing `delta`, `content`, `text`, or `message`.

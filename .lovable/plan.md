# Live AI Debug Panel

Add a dedicated debug surface that proves Gemini/Groq are actually called, with raw payloads and statuses shown in the UI. No "success" wording unless a live HTTP 200 with a raw body is rendered.

## What gets built

### 1. New server function: `debugGeminiLiveFn` (`src/lib/ai.functions.ts`)
Returns a fully transparent diagnostic object — never throws:
```ts
{
  env: { geminiKeyLoaded: boolean, groqKeyLoaded: boolean },
  model: "gemini-2.5-flash",
  request: { url, payloadBytes, promptChars, imageBytes, mimeType },
  response: { sent: boolean, received: boolean, httpStatus: number, ok: boolean, rawBody: string, durationMs: number },
  parsed: { json: unknown | null, parseError: string | null },
  validator: { accepted: boolean, reason: string, detectedObject: string, isAgricultural: boolean, confidence: number },
  exception: { message: string, stack: string } | null
}
```
Accepts `{ base64?: string, prompt?: string }`. If no image provided, sends a tiny text-only ping to Gemini so the button works without an upload. Raw body is truncated to ~4KB and key is redacted.

### 2. New component: `src/components/debug/AiDebugPanel.tsx`
Collapsible panel with:
- **Env status row**: `GEMINI_API_KEY: true/false`, `GROQ_API_KEY: true/false` (from `validateAiEnvironmentFn`)
- **Model**: exact id displayed
- **"Run Live AI Test"** button — calls `debugGeminiLiveFn` and renders:
  - Request sent: yes/no
  - Payload size (bytes)
  - Response received: yes/no
  - HTTP status code (colored)
  - Raw response body in `<pre>`
  - Error body if `!ok`
  - Parsed JSON (if any)
  - Validator decision + reason
  - Confidence %
  - Exception stack (if thrown)
- Optional: accepts an image data URL prop so the SoilAnalyzer/Disease pages can pass the current preview into the test.

No "success" / "verified" / "working" copy. Status labels are factual: `HTTP 200`, `HTTP 401`, `no response`, etc.

### 3. Wire into UI
- Mount `<AiDebugPanel />` at the bottom of `src/routes/disease.tsx` and inside `SoilAnalyzer` (replacing the current ad-hoc "Test AI Connection" raw-text block, which only shows a single string).
- Pass the current image preview so the live test uses the user's actual upload when available; falls back to a text-only ping otherwise.

### 4. Logging
Server function logs each stage with `[FarmSmartAI][debug]` prefix (request start, status, parse, validator decision) so server logs mirror the UI panel.

## Files touched
- `src/lib/ai.functions.ts` — add `debugGeminiLiveFn`
- `src/lib/geminiApi.ts` — thin client wrapper `runLiveAiTest()`
- `src/components/debug/AiDebugPanel.tsx` — new
- `src/components/crop/SoilAnalyzer.tsx` — mount panel, remove old raw-text test block
- `src/routes/disease.tsx` — mount panel

## Out of scope
No changes to the analysis pipeline behavior itself, no new fallbacks, no mock data.

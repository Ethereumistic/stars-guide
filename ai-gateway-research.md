# Cloudflare AI Gateway + Workers AI — REST API Research

> **Purpose**: Document the exact REST API format for calling Workers AI models
> (specifically `minimax/music-2.6`) through Cloudflare AI Gateway from an
> external service (Convex actions in this project).
>
> **Date**: 2025-07-12
> **Status**: ⚠️ Web search was unavailable — findings are based on Cloudflare
> documentation from training data. Verify against live docs before implementing.

---

## 1. URL Format

### AI Gateway Endpoint (External Calls)

The AI Gateway URL for Workers AI is:

```
https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/workers-ai/run/{model}
```

**Components**:
| Segment | Description | Example |
|---|---|---|
| `account_id` | Your Cloudflare account ID (32-char hex) | `a1b2c3d4e5f6...` |
| `gateway_id` | The AI Gateway name/slug you created | `stars-guide-gateway` |
| `workers-ai` | Fixed provider segment for Workers AI | `workers-ai` |
| `run` | Fixed action segment | `run` |
| `{model}` | Full model ID including any namespace | `minimax/music-2.6` |

### Comparison: Direct API vs. AI Gateway

| API | URL Pattern |
|---|---|
| **Workers AI Direct** (v4 API) | `https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/run/{model}` |
| **Workers AI Binding** (in-Worker) | `env.AI.run(model, inputs)` — no HTTP needed |
| **AI Gateway** (external) | `https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/workers-ai/run/{model}` |

---

## 2. Model Names with `/` in URL Path

Model names that contain `/` are embedded **as-is** into the URL path. The `/`
is NOT URL-encoded — it becomes additional path segments.

### Examples

| Model Name | AI Gateway URL |
|---|---|
| `@cf/meta/llama-3.1-8b-instruct` | `...workers-ai/run/@cf/meta/llama-3.1-8b-instruct` |
| `minimax/music-2.6` | `...workers-ai/run/minimax/music-2.6` |
| `@cf/stabilityai/stable-diffusion-xl-base-1.0` | `...workers-ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0` |

### Full URL Example for `minimax/music-2.6`

```
POST https://gateway.ai.cloudflare.com/v1/a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6/stars-guide-gateway/workers-ai/run/minimax/music-2.6
```

This is consistent with how Cloudflare's own Workers AI models (prefixed
`@cf/...`) work — the full model identifier including slashes goes into the
path.

---

## 3. Request Body Format

### For Text/Chat Models (reference)

The Workers AI REST API follows an OpenAI-compatible format for text models:

```json
{
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Hello!" }
  ],
  "stream": false,
  "max_tokens": 1024,
  "temperature": 0.7
}
```

### For `minimax/music-2.6` (Music Generation)

Music/audio generation models on Workers AI accept a different body format:

```json
{
  "prompt": "A dreamy ambient soundscape with gentle piano and soft synthesizer pads"
}
```

**Known parameters for minimax/music-2.6**:

| Parameter | Type | Required | Description |
|---|---|---|---|
| `prompt` | `string` | ✅ Yes | Text description of the music to generate |
| `duration` | `number` | ❌ No | Duration in seconds (model may have a max) |

> ⚠️ **Verification needed**: The exact parameter names (`prompt`, `duration`)
> and supported values for `minimax/music-2.6` should be checked against the
> live Cloudflare Workers AI model documentation. Music generation models have
> varied parameter schemas — some use `prompt`, others use `text` or `input`.

### Request Headers

```http
POST /v1/{account_id}/{gateway_id}/workers-ai/run/minimax/music-2.6 HTTP/1.1
Host: gateway.ai.cloudflare.com
Authorization: Bearer <CF_API_TOKEN>
Content-Type: application/json
```

---

## 4. Response Format

### Key Distinction: Direct v4 API vs. AI Gateway

| API | Response Format |
|---|---|
| **Workers AI Direct** (`api.cloudflare.com`) | Wrapped in Cloudflare v4 API envelope |
| **AI Gateway** (`gateway.ai.cloudflare.com`) | **Raw model output — NO v4 envelope** |

### Direct v4 API Response (for reference)

```json
{
  "success": true,
  "result": {
    "response": "Generated text here..."
  },
  "errors": [],
  "messages": []
}
```

### AI Gateway Response — Text Models

The AI Gateway proxies the raw model response directly:

```json
{
  "response": "Generated text here..."
}
```

### AI Gateway Response — Audio/Music Models (minimax/music-2.6)

For audio generation models, the AI Gateway returns **raw binary data**
(e.g., MP3 or WAV bytes), **NOT** a JSON envelope.

**Response characteristics**:

| Property | Value |
|---|---|
| Content-Type | `audio/mpeg` (MP3) or `audio/wav` — depending on model |
| Body | Raw audio bytes (binary) |
| No JSON wrapper | ❌ No `{"result": ...}` envelope |

**Example response handling in code**:

```typescript
const response = await fetch(aiGatewayUrl, {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${cfApiToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ prompt: "dreamy ambient..." }),
});

// Response is raw audio binary — NOT JSON
const audioBuffer = await response.arrayBuffer();

// Convert to base64 for storage/transmission
const base64Audio = Buffer.from(audioBuffer).toString("base64");
```

> ⚠️ **Important**: Unlike text models, you MUST use `response.arrayBuffer()` or
> `response.blob()` — NOT `response.json()`. The AI Gateway returns raw binary
> audio data for music generation models.

---

## 5. Authentication Headers

### Required Header

| Header | Format | Description |
|---|---|---|
| `Authorization` | `Bearer <CF_API_TOKEN>` | Cloudflare API token with Workers AI permissions |

### Alternative Authentication Header

| Header | Format | Description |
|---|---|---|
| `cf-aig-authorization` | `Bearer <CF_API_TOKEN>` | Cloudflare's AI Gateway-specific auth header |

Both headers are accepted. The `Authorization: Bearer <token>` header is the
most common and recommended approach.

### Required API Token Permissions

The Cloudflare API token needs the following permissions:

| Permission | Level |
|---|---|
| **Account** > Workers AI | Read (or Edit) |
| **Account** > AI Gateway | Read (or Edit) |

### Creating the Token

1. Go to **Cloudflare Dashboard** → **My Profile** → **API Tokens**
2. Click **Create Token**
3. Use **Custom Token** or find the **Workers AI** template
4. Grant **Workers AI:Read** (minimum) permissions
5. Grant **AI Gateway:Read** permissions for the specific gateway

### Optional Metadata Headers

| Header | Format | Description |
|---|---|---|
| `cf-aig-metadata` | JSON string | Custom metadata for logging/analytics |
| `cf-aig-tag` | String | Tag for cost tracking and request grouping |

**Example**:

```http
cf-aig-metadata: {"user_id": "abc123", "feature": "binaural_beats"}
cf-aig-tag: oracle-audio-v1
```

---

## 6. Complete Request Example

### cURL Example

```bash
curl -X POST \
  "https://gateway.ai.cloudflare.com/v1/${CF_ACCOUNT_ID}/${CF_GATEWAY_ID}/workers-ai/run/minimax/music-2.6" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A calming binaural beats track for meditation, featuring low-frequency tones and gentle ambient textures"
  }' \
  --output music_output.mp3
```

### TypeScript (Convex Action) Example

```typescript
// In a Convex action (server-side, Node.js runtime)
import { internalAction } from "./_generated/server";
import { v } from "convex/values";

export const generateBinauralBeats = internalAction({
  args: {
    prompt: v.string(),
    duration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID!;
    const CF_GATEWAY_ID = process.env.CF_AI_GATEWAY_ID!;
    const CF_API_TOKEN = process.env.CF_API_TOKEN!;

    // Model name with "/" becomes part of the URL path — NOT encoded
    const modelId = "minimax/music-2.6";
    const url = `https://gateway.ai.cloudflare.com/v1/${CF_ACCOUNT_ID}/${CF_GATEWAY_ID}/workers-ai/run/${modelId}`;

    const body: Record<string, any> = {
      prompt: args.prompt,
    };
    if (args.duration) {
      body.duration = args.duration;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Workers AI error ${response.status}: ${errorText}`);
    }

    // Audio model returns raw binary — NOT JSON
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");

    return base64Audio;
  },
});
```

---

## 7. AI Gateway Features

When routing through AI Gateway (vs. direct Workers API), you get:

| Feature | Description |
|---|---|
| **Request Logging** | All requests logged with latency, tokens, cost |
| **Analytics** | Dashboard with request counts, error rates, model usage |
| **Rate Limiting** | Per-gateway rate limits (requests per minute) |
| **Cost Tracking** | Estimated costs per model & provider |
| **Caching** | Optional response caching for identical prompts |
| **Fallbacks** | Configure fallback models if primary fails |
| **Real-time Logs** | View request/response logs in Cloudflare dashboard |

---

## 8. Differences: Direct Workers AI vs. AI Gateway

| Aspect | Direct API (`api.cloudflare.com`) | AI Gateway (`gateway.ai.cloudflare.com`) |
|---|---|---|
| URL format | `/client/v4/accounts/{id}/ai/run/{model}` | `/v1/{account_id}/{gateway_id}/workers-ai/run/{model}` |
| Auth | `Authorization: Bearer <token>` (same) | `Authorization: Bearer <token>` (same) |
| Response (text) | v4 JSON envelope `{"success":true,"result":{...}}` | **Raw model output** — no envelope |
| Response (audio) | Audio wrapped in JSON envelope or raw (varies) | **Raw binary** audio data |
| Observability | None built-in | Full logging, analytics, caching |
| Rate limiting | Account-level only | Per-gateway configurable |
| Latency overhead | Direct | ~5-10ms added by gateway proxy |

### Parsing Differences in Code

```typescript
// ❌ WRONG: Don't parse AI Gateway text responses as v4 envelope
const data = await response.json();
const text = data.result.response; // NO — no .result wrapper

// ✅ CORRECT: AI Gateway returns raw model output for text
const data = await response.json();
const text = data.response; // Direct access

// ✅ CORRECT: For audio, response is raw binary
const arrayBuffer = await response.arrayBuffer();
```

---

## 9. Error Handling

### AI Gateway Error Response

Errors from AI Gateway are returned as JSON:

```json
{
  "error": {
    "code": 401,
    "message": "Unauthorized: Invalid API token"
  }
}
```

### Common Error Codes

| Status | Meaning |
|---|---|
| 401 | Invalid or missing API token |
| 403 | Token lacks required permissions |
| 404 | Model not found or gateway not found |
| 429 | Rate limit exceeded |
| 500 | Internal model error |
| 503 | Model temporarily unavailable |

---

## 10. Open Questions & Verification Checklist

- [ ] **Verify minimax/music-2.6 parameters**: Confirm exact parameter names
  (`prompt` vs `text` vs `input`) and supported durations from live docs at
  https://developers.cloudflare.com/workers-ai/models/minimax-music-2.6/

- [ ] **Verify audio response format**: Confirm whether AI Gateway returns raw
  binary MP3 or wraps audio in a JSON envelope for music models. Test with a
  real request and inspect `Content-Type` header.

- [ ] **Verify model availability**: Check that `minimax/music-2.6` is currently
  listed in the Workers AI model catalog and available on your account.

- [ ] **Test with real credentials**: Create a Cloudflare API token with Workers AI
  permissions and test the full request pipeline.

- [ ] **Check streaming support**: Audio generation models typically don't support
  streaming, but verify `stream: true` behavior.

- [ ] **Confirm gateway creation**: Create an AI Gateway in the Cloudflare dashboard
  and note the gateway ID for URL construction.

- [ ] **Compare direct Workers AI vs. AI Gateway for audio**: Test both endpoints
  to confirm response format differences, especially for binary content.

---

## 11. Project Integration Notes

### Current Architecture (from `convex/lib/llmProvider.ts`)

The project uses an OpenAI-compatible `/chat/completions` pattern for all LLM calls.
The `callLLMEndpoint()` function expects JSON responses with `choices[0].message.content`.

### Integration Path for minimax/music-2.6

Music generation is fundamentally different from chat completions:

1. **Different response type**: Binary audio vs. JSON text
2. **Different request format**: `{ prompt }` vs. `{ messages }`
3. **Cannot use `callLLMEndpoint()`**: Need a separate implementation

### Suggested Implementation

Create a new function alongside the existing LLM provider system:

```typescript
// convex/lib/workersAiAudio.ts

interface WorkersAiAudioConfig {
  accountId: string;
  gatewayId: string;
  apiToken: string;
}

export async function callWorkersAiAudio(
  config: WorkersAiAudioConfig,
  model: string,
  prompt: string,
  options?: { duration?: number }
): Promise<Buffer> {
  const url = `https://gateway.ai.cloudflare.com/v1/${config.accountId}/${config.gatewayId}/workers-ai/run/${model}`;

  const body: Record<string, any> = { prompt };
  if (options?.duration) body.duration = options.duration;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Workers AI audio error ${response.status}: ${errorText}`);
  }

  // Audio models return raw binary — not JSON
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
```

### Environment Variables Needed

```env
CF_ACCOUNT_ID=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6
CF_AI_GATEWAY_ID=stars-guide-gateway
CF_API_TOKEN=your-cloudflare-api-token-here
```

---

## 12. Sources & References

| Resource | URL |
|---|---|
| AI Gateway Get Started | https://developers.cloudflare.com/ai-gateway/get-started/ |
| Workers AI REST API | https://developers.cloudflare.com/workers-ai/configuration/rest-api/ |
| AI Gateway Workers AI Provider | https://developers.cloudflare.com/ai-gateway/providers/workersai/ |
| Workers AI Models Catalog | https://developers.cloudflare.com/workers-ai/models/ |
| minimax/music-2.6 docs | https://developers.cloudflare.com/workers-ai/models/minimax-music-2.6/ |

> **Note**: Web search was unavailable during research. All information above is
> based on Cloudflare documentation from training data (cutoff: April 2025).
> Cloudflare's API may have changed since then. Always verify against live docs.
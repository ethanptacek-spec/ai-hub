# Unified AI Creative Studio

A web application that brings together multiple AI APIs — Kling, ChatGPT (DALL·E), and Google AI Studio (Gemini/Imagen) — into a single interface for image generation, video generation, and creative workflows that seamlessly chain outputs between providers.

---

## Core Concept

Instead of jumping between separate tools, users work in one unified canvas where they can generate an image with one provider, upscale or edit it with another, and turn it into a video with a third — all without leaving the app. The APIs complement each other: ChatGPT handles text-to-image and prompt refinement, Google AI Studio provides Gemini vision understanding and Imagen generation, and Kling powers video generation and image-to-video.

---

## Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Frontend     | React + TypeScript, Tailwind CSS    |
| State        | Zustand (or Redux Toolkit)          |
| Backend      | Node.js + Express (or Next.js API routes) |
| Database     | PostgreSQL (projects, history, user data) |
| File Storage | S3-compatible (Cloudflare R2 or AWS S3) |
| Queue        | BullMQ + Redis (async job processing) |
| Auth         | NextAuth.js or Clerk                |
| Deployment   | Vercel (frontend) + Railway/Fly.io (backend) |

---

## API Integrations

### Kling API
- **Text-to-video** — generate video clips from text prompts
- **Image-to-video** — animate a still image into a video clip
- **Video extension** — extend generated clips with additional frames
- **Lip sync** — sync generated characters to audio
- Primary use: video generation pipeline

### ChatGPT API (OpenAI)
- **DALL·E 3 image generation** — high-quality text-to-image
- **GPT-4o vision** — analyze and describe images, suggest edits
- **Prompt enhancement** — use GPT to refine/expand user prompts before sending to any provider
- **Chat assistant** — in-app creative copilot for brainstorming
- Primary use: image generation, prompt intelligence, creative direction

### Google AI Studio API (Gemini)
- **Gemini vision** — image understanding, comparison, and analysis
- **Imagen image generation** — Google's text-to-image model
- **Gemini text generation** — alternative prompt refinement and storyboarding
- **Multimodal input** — send images + text for context-aware generation
- Primary use: image generation, multimodal understanding, second-opinion analysis

---

## Features

### 1. Unified Generation Panel
Single prompt bar that lets the user choose which provider(s) to send to. Options to fan out a prompt to multiple providers simultaneously and compare results side by side.

### 2. Creative Canvas / Project Workspace
- Organize work into projects with folders
- Drag-and-drop gallery of all generated assets (images, videos)
- Tag, favorite, and filter assets
- Full generation history with prompt, settings, and provider metadata

### 3. Cross-Provider Pipelines
Chain outputs between providers in defined workflows:
- **Image → Video**: Generate image (DALL·E or Imagen) → animate with Kling image-to-video
- **Prompt → Multi-gen**: Write a rough idea → GPT refines it → fan out to DALL·E + Imagen → pick best → send to Kling for video
- **Analyze → Regenerate**: Upload any image → Gemini describes it → use description as prompt for DALL·E or Imagen variation
- **Storyboard → Video**: Generate a sequence of images → chain them into a Kling video sequence
- Users can also build custom pipelines by connecting steps

### 4. Smart Prompt Studio
- Write a rough prompt, hit "Enhance" to have GPT-4o rewrite it optimized for each target provider
- Provider-specific prompt templates (Kling prompts need different structure than DALL·E)
- Prompt history and versioning
- Negative prompt support where applicable

### 5. Side-by-Side Comparison
- Generate the same prompt across 2-3 providers at once
- Compare outputs in a split-view or grid
- Rate and select winners to build a preference profile over time

### 6. Video Workspace
- Timeline view for managing Kling video generations
- Stitch multiple clips together
- Preview and trim before export
- Audio/lip sync controls

### 7. Asset Management
- All generated images and videos stored in cloud storage
- Download originals in full resolution
- Share links for individual assets or entire projects
- Export collections as ZIP

---

## Data Model (Simplified)

```
User
├── id, email, name, auth_provider
├── api_keys (encrypted) — per-provider keys
└── settings / preferences

Project
├── id, user_id, name, description
├── created_at, updated_at
└── tags[]

Asset
├── id, project_id, type (image | video)
├── provider (kling | openai | google)
├── prompt, negative_prompt
├── model_params (JSON — model version, size, steps, etc.)
├── storage_url, thumbnail_url
├── status (pending | processing | complete | failed)
├── parent_asset_id (nullable — for pipeline chains)
└── created_at

Pipeline
├── id, project_id, name
├── steps[] (ordered list of PipelineStep)
└── created_at

PipelineStep
├── id, pipeline_id, order
├── provider, action (generate_image | generate_video | enhance_prompt | analyze)
├── config (JSON — model params, prompt template)
└── input_source (user_input | previous_step)

Generation Job
├── id, asset_id, pipeline_step_id (nullable)
├── status (queued | running | complete | failed)
├── provider_job_id
├── started_at, completed_at
└── error_message (nullable)
```

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Frontend                    │
│  React App — Canvas, Gallery, Prompt Bar,   │
│  Pipeline Builder, Video Timeline           │
└──────────────────┬──────────────────────────┘
                   │ REST / WebSocket
┌──────────────────▼──────────────────────────┐
│               API Server                     │
│  Auth · Rate Limiting · Validation           │
│  Prompt Enhancement · Pipeline Orchestration │
└────┬──────────┬──────────┬──────────────────┘
     │          │          │
     ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐
│ OpenAI │ │ Google │ │  Kling │
│  API   │ │ AI API │ │  API   │
└────────┘ └────────┘ └────────┘
     │          │          │
     └──────────┼──────────┘
                ▼
         ┌────────────┐
         │  Job Queue  │    ← BullMQ + Redis
         │  (async)    │
         └──────┬─────┘
                ▼
         ┌────────────┐
         │  Storage    │    ← S3 / R2
         │  + Database │    ← PostgreSQL
         └────────────┘
```

### Key Architecture Decisions
- **Job queue for all generation requests** — API calls to Kling and image models can take seconds to minutes. All generation is async with WebSocket status updates pushed to the frontend.
- **Provider abstraction layer** — each API integration implements a common interface (`generateImage`, `generateVideo`, `checkStatus`, `getResult`) so the pipeline engine and UI don't care which provider is behind a step.
- **Encrypted API key storage** — users bring their own API keys. Keys are encrypted at rest and never exposed to the frontend after initial entry.

---

## API Abstraction Interface

```typescript
interface GenerationProvider {
  name: string;
  capabilities: ('text-to-image' | 'image-to-video' | 'text-to-video' | 'prompt-enhance' | 'image-analyze')[];

  generateImage(params: ImageGenParams): Promise<GenerationJob>;
  generateVideo(params: VideoGenParams): Promise<GenerationJob>;
  enhancePrompt(prompt: string, targetProvider?: string): Promise<string>;
  analyzeImage(imageUrl: string, instruction: string): Promise<string>;
  checkJobStatus(jobId: string): Promise<JobStatus>;
  getJobResult(jobId: string): Promise<Asset>;
}

interface ImageGenParams {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  model?: string;
  style?: string;
  referenceImageUrl?: string;
}

interface VideoGenParams {
  prompt: string;
  sourceImageUrl?: string;
  duration?: number;
  model?: string;
  aspectRatio?: string;
}
```

---

## Pages / Views

| Route                  | Description                                      |
|------------------------|--------------------------------------------------|
| `/`                    | Dashboard — recent projects, quick generate      |
| `/generate`            | Unified generation panel (prompt → pick providers → go) |
| `/projects/:id`        | Project workspace — gallery, assets, pipelines   |
| `/projects/:id/pipeline` | Visual pipeline builder                        |
| `/compare`             | Side-by-side comparison view                     |
| `/video/:id`           | Video workspace — timeline, preview, export      |
| `/settings`            | API keys, preferences, account                   |
| `/history`             | Full generation history across all projects      |

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Redis
REDIS_URL=redis://...

# Storage
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY=
S3_SECRET_KEY=

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# API Keys (user-provided, stored encrypted in DB — these are fallback/default)
OPENAI_API_KEY=
GOOGLE_AI_API_KEY=
KLING_API_KEY=

# Encryption
ENCRYPTION_KEY=  # for encrypting stored user API keys
```

---

## Development Phases

### Phase 1 — Foundation
- [ ] Project scaffolding (Next.js or React + Express)
- [ ] Auth setup
- [ ] Database schema + migrations
- [ ] Basic UI shell: dashboard, prompt bar, settings page
- [ ] API key management (encrypted storage, per-user)

### Phase 2 — Single-Provider Generation
- [ ] OpenAI integration (DALL·E image gen)
- [ ] Google AI Studio integration (Imagen image gen)
- [ ] Kling integration (text-to-video, image-to-video)
- [ ] Async job queue + WebSocket status updates
- [ ] Asset storage pipeline (generate → upload to S3 → save metadata)
- [ ] Gallery view with generated assets

### Phase 3 — Cross-Provider Features
- [ ] Prompt enhancement via GPT-4o
- [ ] Fan-out generation (same prompt → multiple providers)
- [ ] Side-by-side comparison view
- [ ] Image → Video pipeline (DALL·E/Imagen output → Kling)
- [ ] Analyze → Regenerate pipeline (Gemini vision → new prompt → generate)

### Phase 4 — Advanced Workflows
- [ ] Visual pipeline builder UI
- [ ] Custom multi-step pipelines with save/reuse
- [ ] Video workspace with timeline and stitching
- [ ] Storyboard mode (sequence of images → video sequence)
- [ ] Prompt templates and provider-specific optimization

### Phase 5 — Polish & Scale
- [ ] Usage tracking and cost estimation per generation
- [ ] Rate limiting and quota management
- [ ] Project sharing and collaboration
- [ ] Export and download options
- [ ] Mobile-responsive UI
- [ ] Performance optimization (lazy loading, CDN for assets)

---

## Notes

- **Bring Your Own Keys** — users supply their own API keys for each provider to avoid centralized billing complexity. App encrypts and stores them.
- **Cost transparency** — show estimated cost before generation based on provider pricing (e.g., DALL·E 3 ~$0.04/image, Kling credits per video second).
- **Graceful degradation** — if a user only has keys for 1-2 providers, the app still works — features that require missing providers are disabled with clear messaging.
- **Rate limit handling** — each provider has different rate limits. The job queue respects per-provider concurrency limits and retries with backoff on 429s.
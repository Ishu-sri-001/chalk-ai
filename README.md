# ChalkAI: an AI whiteboard tutor

Type any topic and ChalkAI teaches it the way a good teacher would at a whiteboard: a spoken
lesson of about two minutes, with diagrams drawn step by step in sync with the voice. You can
pause, scrub to any moment, replay, draw your own notes on the board, and ask follow-up
questions that the tutor answers in context, with a fresh sketch when it helps.

Built for the Braynix Studios **AI-Powered Interactive Whiteboard Tutor** assignment.

| | |
| --- | --- |
| **Live demo** | `https://<your-deployment>.vercel.app` _(add the link after deploying)_ |
| **Repository** | `https://github.com/<your-username>/chalk-ai` |

---

## For reviewers: how to try it

1. Open the live demo. There is no sign-up or login.
2. Type a topic (for example *How neural networks work*) or pick a suggested one, then press
   **Teach me**. Writing the lesson takes about 15 to 40 seconds.
3. Press **Start the lesson**. Turn your sound on: the lesson is narrated.
4. While it plays, try **pause**, **drag the seek bar**, **previous/next part** and **restart**.
   The drawing on the board always matches the moment you are at.
5. Open **Ask a question** in the right panel and ask something about the lesson. If the answer
   comes with a sketch, it plays on the board; **Back to lesson** returns you to where you were.
6. Use the board tools on the left edge of the board: **zoom**, **pan**, **pen** (draw your own
   notes) and **full screen**.

Good to know:

- **Daily allowance.** The demo runs on a limited AI quota, shown in the header as "sticks of
  chalk" (one new lesson uses one stick). Replaying a recent lesson is free and doesn't use any.
- **Recent lessons** are saved in your browser only and reopen instantly.
- **Best experience:** a desktop Chromium browser (Chrome, Edge, Arc). It also works on tablets
  and phones.

---

## What is live and what is not

| Part | Status |
| --- | --- |
| Lesson generation | **Live AI.** Every lesson is generated on request by OpenAI or Google Gemini. There are no canned lessons. |
| Whiteboard drawings | **Live AI.** The model writes structured drawing actions; the app validates and renders them. |
| Voice narration | **Live AI text-to-speech** (OpenAI or Gemini). When no voice provider is set up, or its quota runs out, the viewer's **built-in device voice** (Web Speech API) reads the lesson instead, for free. On a device with no voice at all, lessons play as timed captions. The interface always says which one is in use. |
| Follow-up answers | **Live AI**, grounded in the generated lesson and the part the learner is on. |
| Recent lessons | Stored in the learner's browser (localStorage). Narration audio is cached in the browser (Cache Storage). Nothing is stored on the server. |

Nothing in the app is mocked or prerecorded. The only simulation was in testing, where the
end-to-end runs used a local stand-in for the OpenAI API (see [Testing](#testing)).

---

## How it meets the brief

| Requirement | Where it lives |
| --- | --- |
| Chat-first interface to enter a topic | Home screen topic input, plus a follow-up chat beside every lesson |
| AI-generated lesson of about 2 minutes | `POST /api/lesson`: 260 to 340 narrated words in 6 to 9 parts, validated on the server |
| Whiteboard with diagrams, drawings and annotations | SVG board with 15 drawing actions, drawn progressively |
| Voice and whiteboard in sync | The narration audio is the clock; each drawing starts as its words are spoken |
| Play, pause, resume, seek, restart | Playback bar, seek bar (click, drag or keyboard) and keyboard shortcuts |
| Follow-up questions | `POST /api/followup`, answered with the lesson and the current part as context |
| Publicly deployed | Vercel (see [Deploying](#deploying-to-vercel)) |

---

## Features

**Learning flow**

- A topic input with suggested topics (paged, six at a time), Enter to submit, cancellable
  generation and clear error states.
- A structured lesson: title, introduction, objectives, 6 to 9 narrated parts, conclusion,
  follow-up questions and related topics.
- A chapter list with timestamps that jumps the lesson to any part.
- A completion state with **Replay**, **Ask a question** and **Keep going** topic links.
- Recent lessons reopen instantly with no new AI or voice calls.

**Whiteboard**

- An SVG renderer for 15 action types: `heading`, `text`, `annotation`, `formula`, `line`,
  `arrow`, `circle`, `ellipse`, `rectangle`, `drawNodes`, `connectNodes`, `highlight`,
  `graph` (line, scatter or bar), `erase` and `clear`.
- Progressive drawing: text writes on, strokes draw along their path, nodes pop in, edges draw
  one by one, and graphs draw their axes before their data.
- Zoom (buttons, Ctrl or trackpad pinch, two-finger pinch), drag to pan, fit to board, and full
  screen, where the board fills the whole screen.
- A learner pen for your own notes, with **Clear my notes**.
- A light theme that looks like a whiteboard and a dark theme that looks like a chalkboard.

**Voice and sync**

- Each part has its own narration clip, and the timeline uses the clips' real durations.
- Drawings are timed to the narration: an action starts as its words are spoken
  ("…a **hidden layer**…" draws the hidden layer).
- Live captions highlight the words already spoken.
- Keyboard: `Space` or `K` to play and pause, `←`/`→` to move 5 seconds, `Shift+←`/`Shift+→`
  for the previous or next part.

**Follow-ups**

- Questions are answered with the lesson, the learner's current part and the recent
  conversation as context. The lesson pauses while you ask, so the answer isn't talked over.
- When a sketch helps, the answer plays on the board with its own voice and timeline.

**Interface**

- A two-column home screen that fits one desktop screen without scrolling, and stacks on tablet
  and mobile.
- Motion: headings are revealed with a soft mask wipe, paragraphs rise line by line, and
  hairlines draw themselves in (GSAP). Menus, tabs and panels use small spring transitions.
- Reduced motion is respected throughout: animations are replaced by simple fades.

---

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, JavaScript |
| Styling | Tailwind CSS 4 with a custom type scale and design tokens, Radix UI primitives, lucide icons |
| Motion | GSAP (SplitText, ScrollTrigger) for text and line reveals; Motion for interface transitions |
| State | Zustand for app state; a framework-free `LessonPlayer` class for playback |
| Validation | Zod 4 |
| Board rendering | SVG |
| AI | OpenAI Chat Completions (JSON mode) or Google Gemini `generateContent`, called with `fetch` (no SDKs) |
| Voice | OpenAI `audio/speech` or Gemini text-to-speech, with the Web Speech API as a fallback |
| Fonts (via `next/font`) | Host Grotesk (headings), Instrument Sans (text), Kalam (board handwriting), STIX Two Text (formulas), Geist Mono (times and code) |

---

## Architecture

```
Browser                                              Server (Next.js route handlers)
───────────────────────────────────────────          ─────────────────────────────────────
HomeScreen ──topic──▶ tutor-store ──POST /api/lesson─▶ guard (origin check + rate limit)
                                                      lesson-generator
                                                        ├─ llm.completeJSON ─▶ OpenAI | Gemini
                                                        └─ validateLesson (zod, clamp, ids, refs)
                                                           └─ one repair retry on weak output
           ◀────────────── validated lesson JSON ───
PlayerProvider
  LessonPlayer ──POST /api/tts (per part, 3 at a time)▶ tts.synthesizeSpeech ─▶ OpenAI | Gemini
    │  (audio is the clock; real durations build the timeline)
    ▼
  timeline.scheduleSegment   (anchors each drawing to its spoken words)
  board-state.buildBoardState(position)   (pure replay of actions, including clear and erase)
  Whiteboard (SVG) + per-element drawing progress

FollowUpChat ──POST /api/followup (lesson + part + history)──▶ follow-up ─▶ OpenAI | Gemini
```

**Key design decisions**

1. **Structured output, validated defensively.** The model returns JSON in a documented schema.
   [`validate.js`](src/lib/lesson/validate.js) checks the structure with Zod and validates each
   drawing action on its own, so one bad action is dropped instead of the whole lesson. It
   clamps coordinates to the 1600×900 board, makes ids unique and resolves references such as
   `hidden#2`. Weak output (no drawings, narration too short) triggers one repair round trip
   that lists the problems.
2. **The board is a pure function of the playback position.** There is no animation history:
   at any (part, time) the board is rebuilt by replaying the actions up to that point. Seeking in
   either direction, pausing, restarting and replaying can't duplicate or skip a drawing. Only
   the element currently being drawn re-renders on each frame.
3. **Audio is the clock.** While a part plays, the `<audio>` element's `currentTime` drives
   everything, so the voice and the drawings can't drift apart. Parts without audio (voice off,
   or a clip that failed) use a wall clock with an estimated duration.
4. **Drawings follow the narration.** [`timeline.js`](src/lib/playback/timeline.js) matches the
   words an action writes (labels, text, ids) to the narration and starts the action just before
   those words are spoken. Unmatched actions are spaced between their neighbours.
5. **Secrets stay on the server.** API keys are only read in `server-only` modules. Provider
   errors are turned into safe messages, and anything that looks like a key is blanked in logs.

---

## Project structure

```
src/
├── app/
│   ├── api/
│   │   ├── lesson/route.js       POST: generate a lesson
│   │   ├── followup/route.js     POST: answer a question in lesson context
│   │   ├── tts/route.js          POST: narration audio for one part
│   │   └── status/route.js       GET: which providers are configured (no secrets)
│   ├── layout.js                 fonts, metadata, providers
│   ├── page.js                   renders TutorApp
│   ├── globals.css               design tokens, type scale, container
│   └── error.js, global-error.js
├── components/
│   ├── TutorApp.jsx              header + home screen or lesson page
│   ├── Providers.jsx             motion and tooltip context
│   ├── animations/               FadeUp, ParaAnim, MaskTextReveal, LineDraw (GSAP)
│   ├── chalk/                    daily allowance: ChalkMeter, ChalkLine, ChalkSticks
│   ├── home/                     HomeScreen, Suggestions, RecentLessons, SectionHeading, SetupNotice
│   ├── layout/                   SiteHeader, Logo, HistoryMenu, OfflineNotice
│   ├── playback/                 PlayerProvider, LiveBoard, PlaybackBar, PlayButton, SeekBar,
│   │                             Captions, VoiceNote, VoicePicker
│   ├── whiteboard/               Whiteboard (SVG), BoardElement, BoardToolbar, ElementBoundary
│   ├── workspace/                lesson page: WorkspaceHeader, BoardPanel, LessonStage,
│   │                             TutorPanel, LessonOutline, FollowUpChat, board states
│   └── ui/                       ArrowFillButton, CharStaggerButton, Composer, Tabs,
│                                 DropdownMenu, Popover, Tooltip, ThemeSwitch, …
├── data/suggestions.js           suggested topics
├── hooks/                        use-board-viewport, use-fullscreen, use-device-narrates
├── lib/
│   ├── ai/                       provider config, LLM client, prompts, lesson generator,
│   │                             follow-up, text-to-speech
│   ├── lesson/                   constants, Zod schema, validation and normalisation
│   ├── playback/                 LessonPlayer, timeline, narration fetch, audio cache, device voice
│   ├── whiteboard/               board-state replay, geometry, id references
│   ├── chalk.js, daily-budget.js daily allowance (client labels, server counter)
│   ├── guard.js                  same-origin check and rate limiting
│   ├── motion.js                 GSAP setup and shared motion values
│   └── http.js, errors.js, api-client.js, theme.js, time.js, utils.js
└── store/tutor-store.js          lesson lifecycle, history, conversation
```

---

## Running locally

Requirements: Node.js 20.9 or newer, and an OpenAI **or** Google Gemini API key.

```bash
npm install
```

Create a file named `.env.local` in the project root with **one** provider key. It is
git-ignored and only read on the server.

```bash
# Option A: OpenAI (lessons, follow-ups and voice)
OPENAI_API_KEY=your-openai-key

# Option B: Google Gemini, free tier (lessons and follow-ups),
# with narration by the viewer's device voice so no voice quota is spent
GEMINI_API_KEY=your-gemini-key
TTS_PROVIDER=browser
```

Then start the app:

```bash
npm run dev          # http://localhost:3000
```

Other commands:

```bash
npm run build && npm start   # production build
npm run lint                 # ESLint
```

A free Gemini key is available from [Google AI Studio](https://aistudio.google.com) with no card.
If the server has no key at all, the home screen says so instead of failing on the first lesson.

---

## Environment variables

Only one provider key is required. Everything else is optional.

| Variable | Default | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | none | Enables OpenAI for lessons, follow-ups and voice |
| `GEMINI_API_KEY` | none | Enables Gemini (used when there is no OpenAI key, or when selected) |
| `AI_PROVIDER` | auto | `openai` or `gemini` for lessons and follow-ups |
| `OPENAI_MODEL` | `gpt-4.1-mini` | Any chat-completions model with JSON mode |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | For OpenAI-compatible gateways |
| `GEMINI_MODEL` | `gemini-3.8-flash` | Gemini text model |
| `GEMINI_FALLBACK_MODELS` | `gemini-3.1-flash-lite,gemini-3.5-flash-lite` | Backup models, in order, for when the main one is overloaded, hangs or is out of quota |
| `TTS_PROVIDER` | auto | `openai`, `gemini` or `browser` (device voice only: free, uses no AI quota) |
| `OPENAI_TTS_MODEL` | `gpt-4o-mini-tts` | OpenAI voice model |
| `OPENAI_TTS_VOICE` | `coral` | `alloy`, `ash`, `ballad`, `coral`, `echo`, `fable`, `nova`, `onyx`, `sage`, `shimmer` or `verse` |
| `GEMINI_TTS_MODEL` | `gemini-3.8-flash-tts` | Gemini voice model |
| `GEMINI_TTS_VOICE` | `Kore` | Gemini prebuilt voice |
| `DAILY_LESSON_LIMIT` | `15` on Gemini, off on OpenAI | Lessons per day, shown as "sticks of chalk" and enforced. Resets at midnight Pacific time. `off` hides it |
| `RATE_LIMIT_LESSON` | `10` | Lessons per client per 10 minutes |
| `RATE_LIMIT_FOLLOWUP` | `40` | Follow-up questions per client per 10 minutes |
| `RATE_LIMIT_TTS` | `200` | Narration clips per client per 10 minutes |

**AI provider.** With `OPENAI_API_KEY` set, OpenAI is used automatically. To use Gemini, set
`GEMINI_API_KEY` (and optionally `AI_PROVIDER=gemini`). Lessons are requested in JSON mode
(`response_format: json_object` or `responseMimeType: application/json`) and validated on the
server.

**Voice provider.** Voice uses the same keys. OpenAI returns MP3; Gemini returns raw PCM, which
the server wraps as WAV. Without a voice provider, or once its quota runs out, the app switches to
the viewer's device voice by itself.

---

## Deploying to Vercel

1. Push the repository to GitHub.
2. In Vercel, choose **Add New → Project** and import the repository. The framework preset is
   Next.js; no build settings need changing.
3. Under **Settings → Environment Variables**, add `OPENAI_API_KEY` or `GEMINI_API_KEY` (and
   `TTS_PROVIDER=browser` for a free Gemini setup) for Production, plus any optional variables
   above.
4. Deploy, then open `https://<your-app>/api/status`. It should report `"configured": true` for
   `ai` (and for `voice`, unless you chose the device voice).

Notes:

- Route handlers set `maxDuration`: 120 seconds for lessons, 60 for follow-ups and voice.
  Lessons normally take 15 to 40 seconds.
- Set a spending limit in your OpenAI or Google dashboard. The in-app rate limits are per server
  instance (see [Known limitations](#known-limitations)).

---

## Security

- API keys only exist in server modules (`import "server-only"`). The client bundle was checked
  for keys, provider URLs and prompts.
- Every POST route checks `Origin` against the host (403 cross-site), is rate limited per client
  (429 with `Retry-After`), caps the body size and validates its input.
- The lesson sent along with a follow-up question is validated again before it enters a prompt.
- Security headers: a same-origin Content-Security-Policy (with `blob:` for audio),
  `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy`.
- All `.env*` files are git-ignored; no keys or credentials are committed.

---

## Testing

- `npm run build` and `npm run lint` pass with no errors.
- API contract tests (curl) for every route: valid requests, empty, oversized and invalid input,
  model refusal, malformed JSON with automatic repair, missing drawings with repair, repeated
  failure, provider 401, 429 and 500, request cancellation (the upstream AI call is aborted),
  cross-origin rejection and rate limiting.
- Browser end-to-end runs (Playwright with headless Chromium, desktop and mobile viewports)
  covering the full flow: generate *How Neural Networks Work*, start the narration, watch the
  drawings build up, pause, resume, seek forward and back (the board is identical either way),
  restart, ask a follow-up and check the lesson context reached the model, generate a second,
  non-technical lesson (*Supply and Demand*, which exercises `erase` and `clear`), rapid
  play and pause (never more than one narration playing), lesson completion, switching lessons
  mid-playback, voice disabled, one failed voice clip, the audio cache, offline mode,
  zoom, pan, pen and full screen, with no CSP violations or page errors.

The end-to-end runs used a local OpenAI-compatible stand-in server that returns fixed lesson
JSON and generated audio. That tests the whole pipeline (requests, parsing, validation,
rendering, audio sync) without spending credits, but it doesn't judge the quality of real
model output, which needs a run with a real key.

---

## Known limitations

- **Diagram quality depends on the model.** The prompt describes the board's coordinate system
  and layout rules, and validation keeps everything on the board, but the model can still place
  two labels close together. Stronger models produce noticeably better layouts.
- **Rate limits are in memory, per server instance.** On serverless hosting they deter casual
  abuse but are not a global quota; use provider spending limits for hard caps.
- **The daily allowance is an estimate.** Google doesn't report remaining free quota, so the app
  counts its own lessons (in memory plus a temporary file, per instance on serverless hosting).
  It drops to zero early if Google reports that the day's quota is used up.
- **Recent lessons stay in one browser.** History and the audio cache are per browser, and there
  are no accounts.
- **Small screens.** A full lesson works on a phone, but board text is small at 390px wide.
  Zoom and full screen help; element full screen isn't available on iPhone Safari.
- **Word-to-drawing alignment is approximate.** It assumes an even speaking pace within each
  part.
- **The device voice varies by browser.** Its quality depends on the viewer's system voices.
  With the device voice, seeking restarts speech at the nearest word, and the timeline length is
  an estimate.
- **Gemini voice is untested with a live key.** The Gemini text-to-speech path (PCM wrapped as
  WAV) is implemented but wasn't exercised against the real API during development.
- **Browser coverage.** Tested in Chromium. Safari and Firefox weren't tested end to end.

---

## Use of AI tools

AI coding assistants were used during development, as the assignment allows. The product
decisions, architecture and the trade-offs described above are explained in this README and in
the code, and every part of the implementation can be walked through in detail.

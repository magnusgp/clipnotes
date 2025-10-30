# ClipNotes Video Summary – Research

## Hafnia VLM API Workflow
- **Decision**: Use Hafnia `/assets` to upload the binary, then call `/chat/completions` with a system prompt requesting structured JSON.
- **Rationale**: Aligns with Hafnia docs for video handling—asset IDs ensure large files are processed asynchronously while `/chat/completions` supports multimodal prompts with grounding. Structured JSON keeps frontend rendering deterministic.
- **Alternatives Considered**: Direct streaming upload via `/chat/completions` (rejected: limited file size support and less resilient), pre-transcoding to images (rejected: loses temporal context).

## FastAPI Upload Handling
- **Decision**: Accept uploads via `UploadFile` with `SpooledTemporaryFile`, enforce size/type limits before saving, and stream to Hafnia using HTTPX with timeout + retry policy.
- **Rationale**: `UploadFile` avoids loading the entire asset into memory, while validation guards protect Hafnia quota. HTTPX async client integrates cleanly with FastAPI.
- **Alternatives Considered**: Base64-encoding payloads in JSON (rejected: unnecessary bloat), synchronous `requests` client (rejected: blocks event loop and complicates performance budget).

## Summary Prompt Engineering
- **Decision**: Craft a reusable system prompt instructing Hafnia to output bullet summaries and JSON with actors/actions, fallback to plain text when JSON is unavailable.
- **Rationale**: Ensures consistent structure for frontend rendering and simplifies error handling by supporting both formats.
- **Alternatives Considered**: Free-form natural language responses (rejected: harder to parse), forcing JSON-only responses (rejected: brittle when model confidence is low).

## Frontend Accessibility & Responsiveness
- **Decision**: Build upload form and summary panel with shadcn/ui primitives, enforce keyboard-first navigation, and validate via axe core + manual responsive checks.
- **Rationale**: shadcn/ui pairs with Tailwind for rapid development while providing accessible defaults; automated + manual checks satisfy constitution Principle IV.
- **Alternatives Considered**: Custom Tailwind components from scratch (rejected: higher effort), relying solely on manual testing (rejected: misses regressions).

## Local Dev Proxy & DX
- **Decision**: Configure Vite dev server proxy to forward `/api` requests to `http://localhost:8000`, while FastAPI enables CORS for `http://localhost:5173`.
- **Rationale**: Keeps frontend code using relative paths and simplifies local full-stack testing without deploying.
- **Alternatives Considered**: Separate ports without proxy (rejected: requires managing CORS per request), using a shared Docker compose for MVP (rejected: stretch goal per brief).

## Stretch Deployment Packaging
- **Decision**: Plan optional Dockerfiles (`backend/Dockerfile`, `frontend/Dockerfile`) and a docker-compose manifest once MVP stabilizes.
- **Rationale**: Matches stretch goal, allows future containerized demo, but does not block initial delivery.
- **Alternatives Considered**: Single multi-stage Dockerfile (rejected for MVP; keeps stacks independently deployable).

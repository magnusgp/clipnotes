# Credential Handling Notes

- Reuse existing Hafnia credentials: `HAFNIA_API_KEY` and `HAFNIA_BASE_URL`.
- Capture all key rotations through the upcoming Settings UI, which hashes and stores values server-side; the API never returns the raw key.
- Rotation guidance: follow the Hafnia partner portal cadence and update `.env.example` placeholders only (never commit real values).
- Local development can enable fake Hafnia responses via `HAFNIA_USE_FAKE=true`; this flag requires no additional secrets.
- Document SaaS feature flags and theme defaults: `ENABLE_LIVE_MODE`, `ENABLE_GRAPH_VIEW`, and `CLIPNOTES_THEME_DEFAULT` should live in `.env` for bootstrap defaults.
- Store production secrets exclusively in the approved secret manager (per team playbook) and avoid embedding them in build artifacts or logs.

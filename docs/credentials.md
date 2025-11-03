# Credential Handling Notes

- Reuse existing Hafnia credentials: `HAFNIA_API_KEY` and `HAFNIA_BASE_URL`.
- Compare & Reason features never introduce new secrets; they rely on persisted analysis artifacts.
- Rotation guidance: follow the Hafnia partner portal rotation cadence and update `.env.example` placeholders only (never commit real values).
- Local development can enable the fake Hafnia responses by setting `HAFNIA_USE_FAKE=true`; this flag requires no additional secrets.
- Store production secrets exclusively in the approved secret manager (per team playbook) and avoid embedding them in build artifacts or logs.

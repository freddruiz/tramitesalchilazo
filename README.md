# Tramites al Chilazo

Automated legal service procurement platform for Guatemala — dual-portal system (Client + Admin) for requesting Antecedentes Penales, Antecedentes Policiales, Certificados de Nacimiento (RENAP), and MINEX Apostillados.

## Status

Pre-development. Repo bootstrap in progress. See [sprint.md](./sprint.md) for the active sprint, user story, and full roadmap.

## Stack

- **Portal:** Next.js 15 (App Router) + TypeScript on Vercel
- **Database / Auth / Storage:** Supabase
- **Queue:** BullMQ on Upstash Redis
- **Automation Worker:** Playwright in isolated Docker container on Fly.io
- **Payments:** Recurrente, NeoNet, Visanet, Stripe + manual bank transfer
- **Email:** Resend

## Architecture

See [sprint.md](./sprint.md) — the Architectural Decision Log (ADL) section captures every non-trivial design choice.

## Security

See [SECURITY.md](./SECURITY.md).

## Contributing

1. Read [sprint.md](./sprint.md) — it is the source of truth.
2. Pick the Active Story.
3. Follow the **Per-Story Git Protocol** in `sprint.md`.
4. Open PR to `dev`. All CI gates must pass.

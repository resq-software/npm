# AGENTS.md — @resq-systems/email-templates

Type-safe transactional email templates: an Effect Schema contract, React Email components, headless render-to-html/text, and an optional Resend sender. Part of the [ResQ Systems npm workspace](../../AGENTS.md).

## Commands

```bash
bun install                                   # from repo root
bun --filter @resq-systems/email-templates build
bun --filter @resq-systems/email-templates test
bun --filter @resq-systems/email-templates email:dev      # preview server
bun --filter @resq-systems/email-templates email:export   # export static HTML
```

## What's here

- `contract.ts`, `schemas.ts` — the Effect Schema contract for each template's props.
- `templates.tsx`, `emails/`, `registry.tsx` — React Email components (entry `./emails`).
- `render.ts` — headless render to HTML/text.
- `mailer.tsx`, `send/` — optional Resend sender (entry `./send`).
- Core barrel (entry `.`).

## Dependencies

- **Runtime:** `@react-email/components`, `@react-email/render`, `@resq-systems/constants`.
- **Peers:** `effect`, `react`, `react-dom`, `resend`.

## Rules

- The `./send` (Resend) path is optional — `resend` is a **peer**; keep it out of the core import graph so render-only consumers don't need it.
- Style with the email-safe **hex** tokens from `@resq-systems/constants`; do not hardcode colors.
- Every template's props go through the Effect Schema contract — validate at the boundary, no untyped payloads.

## Changesets

Behavior changes need a `.changeset/*.md` bumping `@resq-systems/email-templates`. See the [root guide](../../AGENTS.md#commits--changesets).

## References

- [Package README](README.md)
- [Workspace guide](../../AGENTS.md)

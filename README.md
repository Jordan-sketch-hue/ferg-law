# Ferguson Law Platform

Full-stack Ferguson Law client platform built with Next.js, TypeScript, and
Supabase. The project includes public firm pages, booking, client and admin
portals, email workflows, H.O.M.E. content, and backend notifications.

## Agent and operations handoffs

- Start with [AGENTS.md](AGENTS.md) for project rules, approved database, and
  deployment requirements.
- [AGENT-STATUS.md](AGENT-STATUS.md) records the current deployment status and
  identifies older entries as historical.
- [WhatsApp alert operations](docs/WHATSAPP-ALERTS-OPERATIONS.md) is the
  authoritative cross-project record for Ferguson Law alert routing, the
  separate linked-device reader, verified deployment state, and open limits.
- `CLAUDE.md` imports the project handoff for Claude-based agents.

## Local development

Use the Node version required by `package.json`, install dependencies with
`npm install`, and run:

```bash
npm run dev
```

## Validation

```bash
npx tsc --noEmit
npx eslint src/lib/wa-notify.ts src/lib/whatsapp.server.ts src/app/api/admin/wa-send/route.ts
npm run build
```

The production build uses Webpack (`next build --webpack`) as configured in
`package.json`.

## Deployment

Follow the authorized production procedure in `AGENTS.md`. Pull the current
`main` branch before editing or deploying, preserve local worktree changes, and
verify the production target and required project alias after each deployment.
Do not send real WhatsApp or email test messages without explicit authorization.

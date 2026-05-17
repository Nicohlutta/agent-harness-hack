# Contributing to Agent Harness Hack

Welcome, teammate! This is the shared codebase for our Sundai Hackathon project.

## Branching strategy

```
main          ← always working, always deployable
└── feat/<your-name>/<short-description>   ← your feature branch
```

**Never push directly to `main`.** Open a pull request and get one teammate to review.

Example branch names:
- `feat/nico/agent-tool-router`
- `feat/alice/memory-panel`
- `fix/bob/auth-redirect`

## Workflow

```bash
# 1. Always pull main first
git checkout main
git pull origin main

# 2. Create your branch
git checkout -b feat/<your-name>/<description>

# 3. Do your work, commit often
git add <files>
git commit -m "feat: short description of what you did"

# 4. Push and open a PR
git push -u origin feat/<your-name>/<description>
gh pr create --fill
```

## Shared files to coordinate on

These files are commonly edited — communicate in the group chat before touching them to avoid conflicts:

| File | What it does |
|------|-------------|
| `lib/ai/models.ts` | AI model configuration |
| `app/(chat)/api/chat/route.ts` | Main chat API handler |
| `lib/db/schema.ts` | Database schema |
| `components/` | Shared UI components |

## Commit message format

```
feat: add agent tool routing
fix: correct auth redirect loop
chore: update dependencies
refactor: extract tool handler into lib
```

## Environment variables

Never commit `.env.local`. Share secrets via a private group message or a shared password manager.
Copy `.env.example` → `.env.local` and fill in values from a teammate.

## Getting unstuck

- Ask in the team chat before spending >30 min blocked
- `pnpm lint` and `pnpm build` before opening a PR
- Tag a teammate as reviewer on your PR

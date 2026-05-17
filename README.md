# Agent Harness Hack — Sundai Hackathon May 17

Open-source agent harness built at the [Sundai Club](https://github.com/sergeicu/sundai-global) hackathon on May 17, 2026.

Built on the [Vercel AI SDK Chatbot](https://github.com/vercel/ai-chatbot) template — Next.js + AI SDK + shadcn/ui.

## What we're building

An agent harness: a platform where AI agents can be wired together, given tools, and run interactively. See [`AGENT HARNESS HACK/`](./AGENT%20HARNESS%20HACK/) for the hackathon brief.

## Stack

- [Next.js](https://nextjs.org) App Router
- [Vercel AI SDK](https://ai-sdk.dev) — unified LLM interface (Anthropic, OpenAI, etc.)
- [shadcn/ui](https://ui.shadcn.com) + Tailwind CSS
- [Neon Postgres](https://neon.tech) for persistence
- [Auth.js](https://authjs.dev) for authentication

## Team — quick start

```bash
# 1. Clone
git clone https://github.com/Nicohlutta/agent-harness-hack.git
cd agent-harness-hack

# 2. Install deps
pnpm install

# 3. Set up env (ask a teammate for values)
cp .env.example .env.local

# 4. Run locally
pnpm dev
```

App runs at [http://localhost:3000](http://localhost:3000).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for branching strategy, PR rules, and how to add features.

## License

Open source under the [Apache 2.0 License](./LICENSE) — as required by Sundai Club rules.

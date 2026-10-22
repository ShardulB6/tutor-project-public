# Tutor AI

Tutor AI is a notebook-based study workspace for learning from your own material. Users can
organize PDF sources into notebooks, label each source with topics, and ask an AI tutor questions
grounded in those files.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/ShardulB6/tutor-project-public)

The application runs on Cloudflare Workers. It combines a TanStack Start frontend with a stateful
Cloudflare agent, D1 for application and chat data, and R2 for uploaded PDFs.

## Features

- GitHub sign-in
- Per-user notebooks and PDF source libraries
- User-defined source topics that help the tutor select relevant files
- Source-aware tutoring with tools that list and read notebook PDFs
- Persistent chat threads with generated titles, renaming, and deletion
- A choice of tutor models and reasoning levels
- Per-browser Vercel AI Gateway or OpenRouter credentials stored in local storage
- multiple-choice quiz and flashcard generation with optional notebook PDF sources
- Resizable source, chat, and study-tool panels

## Architecture

| Area              | Implementation                                               |
| ----------------- | ------------------------------------------------------------ |
| Web application   | React 19, TanStack Start, TanStack Router, and Vite          |
| UI                | Tailwind CSS and shadcn/ui components                        |
| Tutor             | Cloudflare Agents SDK and `@cloudflare/think`                |
| Model access      | Vercel AI Gateway or OpenRouter through the AI SDK           |
| Authentication    | Better Auth with GitHub OAuth                                |
| Relational data   | Cloudflare D1 with Drizzle ORM                               |
| File storage      | Cloudflare R2                                                |
| Stateful sessions | Cloudflare Durable Objects with chat history persisted to D1 |

Each chat addresses a `TutorAgent` by notebook and session ID. When a question depends on the
notebook material, the agent first lists the available sources, uses filenames and topics to find
the relevant PDFs, and then reads those files before answering.

## Local development

### Prerequisites

- Node.js and pnpm 11
- A GitHub OAuth app
- A Vercel AI Gateway or OpenRouter API key

For local authentication, configure the GitHub OAuth callback URL as:

```text
http://localhost:3000/api/auth/callback/github
```

### Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy `.env.example` to `.env.local` and fill in the application secrets:

   ```dotenv
   BETTER_AUTH_URL=http://localhost:3000
   BETTER_AUTH_SECRET=replace-with-a-long-random-secret
   GITHUB_CLIENT_ID=your-github-client-id
   GITHUB_CLIENT_SECRET=your-github-client-secret
   ```

3. Apply the D1 migrations to the local database:

   ```bash
   pnpm db:migrate
   ```

4. Start the development server:

   ```bash
   pnpm dev
   ```

The app is available at [http://localhost:3000](http://localhost:3000). After signing in, open
Settings, choose Vercel AI Gateway or OpenRouter, and add the corresponding API key before starting
a chat. The selected provider is used for chat, thread titles, quizzes, and flashcards. Each key is
stored in that browser's local storage for the signed-in user and can be removed in Settings.
OpenRouter keys connect directly through the AI SDK OpenRouter provider; they do not require a
Vercel AI Gateway key. Switching back to Vercel AI Gateway restores a previously saved Gateway key.
Wrangler keeps local D1, R2, and Durable Object state under `.wrangler/`.

Use `pnpm db:migrate` or `pnpm exec wrangler` so local commands use the project's installed Wrangler
version. `pnpx wrangler` can download a newer runtime that changes the local state format and
prevents the installed development server from starting (for example, an `_cf_ALARM` column mismatch).

## Commands

| Command                  | Purpose                                               |
| ------------------------ | ----------------------------------------------------- |
| `pnpm dev`               | Start the local development server on port 3000       |
| `pnpm build`             | Create a production build                             |
| `pnpm preview`           | Preview the production build locally                  |
| `pnpm test`              | Run the Vitest test suite                             |
| `pnpm check`             | Run formatting, linting, and type checks              |
| `pnpm db:generate`       | Generate a Drizzle migration from schema changes      |
| `pnpm db:migrate`        | Apply D1 migrations locally                           |
| `pnpm db:migrate:remote` | Apply D1 migrations to the configured remote database |
| `pnpm db:studio`         | Open Drizzle Studio                                   |
| `pnpm deploy`            | Build, deploy, and apply remote D1 migrations         |

## Deployment

Click **Deploy to Cloudflare** above to create a copy of this project in your own GitHub account and
deploy it to your Cloudflare account. The flow provisions a D1 database, an R2 bucket, and the
`TutorAgent` Durable Object from [`wrangler.json`](./wrangler.json). The deploy command applies the
D1 schema migrations automatically, including on later deployments.

Before starting the deploy flow, create a [GitHub OAuth app](https://github.com/settings/developers)
and generate a signing secret with `openssl rand -base64 32`. In the Cloudflare setup page, provide:

| Setting                | Value                                                                                                                                                      |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BETTER_AUTH_URL`      | The public URL you will use for this Worker, such as `https://tutor-project.<your-subdomain>.workers.dev` or a custom domain. Do not add a trailing slash. |
| `BETTER_AUTH_SECRET`   | Your generated signing secret.                                                                                                                             |
| `GITHUB_CLIENT_ID`     | Client ID from the GitHub OAuth app.                                                                                                                       |
| `GITHUB_CLIENT_SECRET` | Client secret from the same GitHub OAuth app.                                                                                                              |

Set the OAuth app homepage to `BETTER_AUTH_URL` and its callback URL to
`<BETTER_AUTH_URL>/api/auth/callback/github`. If you change the Worker name, workers.dev subdomain,
or custom domain during deployment, update `BETTER_AUTH_URL` and the GitHub OAuth app to the final
URL before signing in. Tutor requires a separate Vercel AI Gateway or OpenRouter API key for model
access; after signing in, add it in Settings. That key is stored in your browser, not in Cloudflare.

For a command-line deployment, install dependencies, configure the same four values as Worker
secrets, then run `pnpm deploy`. The deploy command provisions the configured
resources and applies migrations. Future deploys use the same commands. `pnpm db:migrate:remote`
applies only pending migrations when you need to run them separately.

## Project structure

```text
src/
├── components/              Shared shadcn/ui and AI interface components
├── db/                      Drizzle schemas for auth, notebooks, files, and chats
├── lib/                     Auth, server functions, models, and session persistence
├── routes/                  TanStack Router pages and API routes
│   └── agents/              Tutor agent and notebook-file tools
└── server.ts                Cloudflare Worker entry point
drizzle/                     Versioned D1 migrations
wrangler.json                Worker bindings and deployment configuration
```

## Technology

- [TanStack Start](https://tanstack.com/start)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Cloudflare Agents](https://developers.cloudflare.com/agents/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Better Auth](https://www.better-auth.com/)
- [AI SDK](https://ai-sdk.dev/)
- [shadcn/ui](https://ui.shadcn.com/)

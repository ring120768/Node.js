# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds controllers, services, models, middleware, jobs, routes, utils, websocket helpers, and the API entry `app.js`; shared helpers live in `lib/`.
- Schema/storage assets: `supabase/`, `migrations/`. PDF/web assets: `pdf-templates/`, `templates/`, `views/`, `public/`. Logs and coverage: `logs/`, `coverage/`.
- Root utilities (`scripts/*.js`, `verify-tables.js`, `apply-missing-tables.js`, `cleanup-*.js`) handle health checks, schema verification, and cleanup. Runtime entrypoint: `index.js`.
- IMPORTANT: Typeform and Zapier are retired; do not add or rely on those webhook flows.

## Build, Test, and Development Commands
- `nvm use && npm install` pins Node 18 from `.nvmrc` and refreshes the lockfile.
- `npm run dev` (nodemon) for local work; `npm start` for manual runs; `npm run start:prod` for production parity.
- `npm run lint` (ESLint), `npm run format` (Prettier), `npm run depcheck` (unused deps), `npm run audit` (vulns).
- `npm test` with coverage or `npm run test:watch` for TDD. `npm run health` smokes the API, `npm run clean` clears caches/temp uploads, `npm run validate:pdf-mapping` gates template changes, `npm run validate:lockfile` confirms lockfile sync.

## Coding Style & Naming Conventions
- ESLint/Prettier enforce 2-space indent, single quotes, semicolons, no trailing commas, ~100-char lines, `prefer-const`, `no-var`, strict equality; console logging is allowed.
- Use camelCase for vars/functions, PascalCase for classes, kebab-case filenames (`test-form-filling.js`, `apply-missing-tables.js`). Keep lint disables rare and justified inline.

## Testing Guidelines
- Jest on Node with `testMatch` for `**/__tests__/**/*.test.js` and `*.spec.js|*.test.js`. Co-locate tests in `src/` or create focused end-to-end harnesses at the repo root.
- Coverage thresholds are 60% across branches/functions/lines/statements; review `coverage/lcov-report/index.html` before merging. Prefer fakes over live Supabase/AWS/Adobe calls; gate external requests behind flags or mocks.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat:`, `fix:`, `docs:`); keep commits single-purpose and call out Supabase schema or PDF impacts in the body.
- PRs should include an intent summary, linked issue/task, outputs for `npm test` and `npm run lint`, and screenshots/PDFs for UI/template changes. Note any migrations or mapping updates and confirm `npm run validate:pdf-mapping` (and `verify-tables.js` when schema changes occur).

## Security & Configuration Tips
- Keep secrets out of git; mirror required vars in `.env.example` and load via `.env`. Protect Supabase keys, Adobe credentials, AWS tokens, and webhook URLs.
- Run `verify-tables.js` or `apply-missing-tables.js` when altering schema, and scrub temp artifacts with `npm run clean`. Avoid logging PII; prefer masked identifiers in request/response logs.

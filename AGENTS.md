# Repository Guidelines

## Project Structure & Module Organization
This repository is currently minimal. Use the following structure for all new work so contributions stay consistent:
- `src/`: application code (group by feature, not by file type).
- `tests/`: unit and integration tests mirroring `src/` paths.
- `assets/`: static assets (images, icons, sample fixtures).
- `docs/`: product and technical documentation.
- `scripts/`: repeatable development or release scripts.

Example:
- `src/capture/scroll_capture.ts`
- `tests/capture/scroll_capture.test.ts`

## Build, Test, and Development Commands
Standardize on npm scripts once `package.json` is added:
- `npm install`: install dependencies.
- `npm run dev`: run local development mode.
- `npm run build`: create production build.
- `npm test`: run test suite.
- `npm run lint`: run static checks.
- `npm run format`: apply code formatting.

If you add a new toolchain, update this section and include equivalent commands.

## Coding Style & Naming Conventions
- Use 2-space indentation for JS/TS/JSON/Markdown.
- Prefer TypeScript for new source files.
- File names: `kebab-case` (`auto-scroll.ts`).
- Classes/components: `PascalCase`; functions/variables: `camelCase`; constants: `UPPER_SNAKE_CASE`.
- Keep modules small and single-purpose.
- Use Prettier + ESLint when config files are introduced.

## Testing Guidelines
- Place tests under `tests/` with mirrored paths.
- Test file naming: `*.test.ts` (unit), `*.spec.ts` (integration/e2e if needed).
- Cover happy path, edge cases, and failure paths for capture, stitching, and export flows.
- Run tests locally before opening a PR: `npm test`.

## Commit & Pull Request Guidelines
- Follow Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- Keep commits focused; avoid mixing refactor and feature changes.
- PRs should include:
  - clear summary and scope,
  - linked issue/task,
  - testing notes,
  - screenshots or sample outputs for UI/capture changes.

## Security & Configuration Tips
- Never commit secrets, tokens, or private document data.
- Use `.env.local` for local config and commit only `.env.example`.
- Redact sensitive content in test fixtures and screenshots.

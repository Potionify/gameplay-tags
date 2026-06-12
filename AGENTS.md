# Repository Guidance

This repo publishes `@potionify/gameplay-tags` and a tiny `gameplay-tags` alias package.

Keep local context, credentials, and planning artifacts out of commits. Do not commit `.env`, `.npmrc`, `.context/`, `.codex/`, `.claude/`, or `.plan/`.

Prefer camelCase in TypeScript docs and examples. Keep Unreal-style class names and method aliases when adding API coverage so developers can map Unreal references directly.

Run these before publishing or opening a release pull request:

```sh
npm run check
```

Use alpha and beta npm dist-tags before publishing anything as latest. Use the manual deprecation workflow for the unscoped handoff package after it is published.

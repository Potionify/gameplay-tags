# Changelog

## 0.1.0-alpha.4 - 2026-06-17

- Added gameplay tag query JSON helpers: `parseGameplayTagQuery`, `stringifyGameplayTagQuery`, `fromJSON`, `clone`, and `equals`.
- Added `makeGameplayTagQueryFromFilters` for note-app filter state such as required, blocked, and exact tags.
- Added `doesGameplayTagContainerMatchQuery` and `filterGameplayTagQueryMatches` for matching containers and filtering tagged records.
- Updated the Vite workbench query panel to exercise query filters, JSON round-tripping, and sample note filtering.

## 0.1.0-alpha.3 - 2026-06-17

- Added Unreal `DefaultGameplayTags.ini`-style dictionary import and export.
- Added direct INI helper aliases alongside the JSON and CSV dictionary format dispatchers.
- Updated the Vite workbench import/export panel with INI controls.
- Fixed INI string unescaping so literal backslash sequences round-trip correctly.

## Earlier Alpha Releases

- Scaffolded the ESM/CJS package, unscoped handoff package, release workflow, CI, and GitHub Pages demo.
- Added Unreal-style gameplay tag, container, query, manager, and Blueprint library aliases with TypeScript-friendly camelCase helpers.
- Added dictionary import/export, validation diagnostics, redirects, restricted tags, and source metadata.

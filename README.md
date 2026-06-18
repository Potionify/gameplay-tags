# @potionify/gameplay-tags

Unreal Engine-style gameplay tags for TypeScript and JavaScript apps.

The package exposes TypeScript-friendly camelCase methods while keeping Unreal-style aliases for direct API mapping. That means `container.hasTag(tag)` and `container.HasTag(tag)` both work.

## Packages

- `@potionify/gameplay-tags`: official package.
- `gameplay-tags`: small handoff package that re-exports the scoped package.

The unscoped `gameplay-tags` package should be published only to protect the name and guide accidental installs. The Publish workflow automatically deprecates it after real publishes that include `gameplay-tags`. The manual command remains useful if the message needs to be repaired later:

```sh
npm deprecate gameplay-tags@"*" "Use the official package: @potionify/gameplay-tags"
```

## Install

```sh
npm install @potionify/gameplay-tags
```

For the current beta release:

```sh
npm install @potionify/gameplay-tags@beta
```

Use `@potionify/gameplay-tags` for application code. The unscoped `gameplay-tags` package exists only as a handoff package for accidental installs.

## Usage

```ts
import {
  GameplayTagsManager,
  makeGameplayTagContainer,
  requestGameplayTag
} from "@potionify/gameplay-tags";

const tags = GameplayTagsManager.get();

tags.addNativeGameplayTag("Note.Status.Draft");
tags.addNativeGameplayTag("Note.Topic.Engine");

const owned = makeGameplayTagContainer([
  "Note.Status.Draft",
  "Note.Topic.Engine"
]);

owned.hasTag(requestGameplayTag("Note.Status"));
owned.hasTagExact(requestGameplayTag("Note.Status"));
```

## Dictionary Tools

The manager can import and export Unreal-style table rows, restricted table rows, and redirects. The same package helpers support JSON, CSV, and Unreal `DefaultGameplayTags.ini`-style strings for note apps that want portable tag dictionaries.

```ts
import {
  EGameplayTagSourceType,
  GameplayTagsManager,
  importGameplayTagDictionary,
  parseGameplayTagDictionary,
  stringifyGameplayTagDictionary
} from "@potionify/gameplay-tags";

const result = importGameplayTagDictionary({
  gameplayTagList: [
    { Tag: "Note.Status.Draft", DevComment: "Editable note" }
  ],
  restrictedGameplayTagList: [
    { Tag: "Note.Internal.Archived", bAllowNonRestrictedChildren: true }
  ],
  gameplayTagRedirects: [
    { OldTagName: "Note.Status.ReadyForReview", NewTagName: "Note.Status.Review" }
  ]
}, {
  sourceName: "Notes",
  sourceType: EGameplayTagSourceType.TagList
});

const json = stringifyGameplayTagDictionary(
  GameplayTagsManager.get().exportGameplayTagDictionary(),
  "json"
);

const ini = stringifyGameplayTagDictionary(
  GameplayTagsManager.get().exportGameplayTagDictionary(),
  "ini"
);

const parsed = parseGameplayTagDictionary(ini, "ini");
```

Import results include diagnostics so applications can show duplicate tags, invalid tag strings, and redirects that point at missing tags before applying a dictionary.

## Query Tools

Gameplay tag queries can be built with Unreal-style constructors or persisted as JSON for application search state.

```ts
import {
  filterGameplayTagQueryMatches,
  makeGameplayTagQueryFromFilters,
  parseGameplayTagQuery,
  stringifyGameplayTagQuery
} from "@potionify/gameplay-tags";

const query = makeGameplayTagQueryFromFilters({
  anyTags: ["Note.Status"],
  noTags: ["Character.State"],
  exactAnyTags: ["Note.Topic.Engine"]
});

const saved = stringifyGameplayTagQuery(query);
const loaded = parseGameplayTagQuery(saved);

const matches = filterGameplayTagQueryMatches(notes, loaded, (note) => note.tags);
```

## API Mapping

CamelCase helpers are the recommended TypeScript entry points, while Unreal-style names remain available on the classes for direct lookup from Unreal documentation.

| Unreal-style API | TypeScript-friendly API |
| --- | --- |
| `FGameplayTag::RequestGameplayTag` | `requestGameplayTag` |
| `UGameplayTagsManager::RequestGameplayTagContainer` | `requestGameplayTagContainer` |
| `UGameplayTagsManager::AddNativeGameplayTag` | `addNativeGameplayTag` |
| `UGameplayTagsManager::ValidateGameplayTagString` | `validateGameplayTagString` |
| `UGameplayTagsManager::RedirectGameplayTagName` | `redirectGameplayTagName` |
| `FGameplayTagContainer::HasTag` | `container.hasTag` |
| `FGameplayTagContainer::FilterExact` | `container.filterExact` |
| `FGameplayTagQuery::MakeQuery_MatchAnyTags` | `FGameplayTagQuery.makeQueryMatchAnyTags` |
| `UBlueprintGameplayTagLibrary::HasAllTags` | `BlueprintGameplayTagLibrary.hasAllTags` |

## Example

```sh
npm install
npm run dev
```

The Vite example lives in `examples/basic` and is configured for GitHub Pages. The Pages workflow builds the app with `/gameplay-tags/` as its base path.

Try the hosted workbench at [potionify.github.io/gameplay-tags](https://potionify.github.io/gameplay-tags/).

## Beta Feedback

The beta release is intended for integration feedback before promoting a stable `latest` release. Useful feedback includes Unreal API mapping gaps, note-app dictionary import/export needs, query helper ergonomics, and any ESM/CJS packaging issues.

Open a [beta feedback issue](https://github.com/Potionify/gameplay-tags/issues/new?template=beta-feedback.yml) or a [bug report](https://github.com/Potionify/gameplay-tags/issues/new?template=bug-report.yml) with a small reproduction when possible.

## Changelog

Release notes live in [CHANGELOG.md](CHANGELOG.md).

## Release Strategy

Use short-lived feature branches with the `codex/` prefix for implementation work, then merge through pull requests into `main`.

Recommended npm dist-tags:

- `alpha`: early API exploration, breaking changes expected.
- `beta`: API is close to stable, real usage feedback wanted.
- `latest`: stable release line.

Recommended flow:

```sh
npm version prerelease --preid alpha --workspaces
npm publish -w @potionify/gameplay-tags --tag alpha
npm publish -w gameplay-tags --tag alpha
```

The preferred publishing path is the manual GitHub Actions `Publish` workflow. It uses the repository `NPMJS_TOKEN` secret, runs `npm run check`, skips workspace versions that already exist on npm during real publish steps, publishes with provenance, automatically deprecates only the newly published unscoped handoff version after real runs that publish `gameplay-tags`, and requires an explicit confirmation before publishing with the `latest` dist-tag.

The `Publish` workflow has three publish modes:

- `dry run then publish`: default release path that validates the npm package output before publishing it.
- `dry run only`: validation path that does not publish or deprecate anything.
- `publish only`: repair path for publishing after a separate dry run has already passed.

Use the `Deprecate Unscoped Package` workflow only as a manual repair path if the deprecation message needs to be applied again:

```sh
npm deprecate gameplay-tags@"*" "Use the official package: @potionify/gameplay-tags"
```

After publishing, run a registry smoke test:

```sh
npm run smoke:published
```

The published smoke test installs both package names from npm and checks ESM/CJS imports, container matching, INI dictionary import/export, and query helper round-trips.

## Beta Readiness

Before moving from `alpha` to `beta`:

- Confirm `main` is green in CI.
- Run `npm run check`.
- Run `GAMEPLAY_TAGS_SMOKE_VERSION=alpha npm run smoke:published`.
- Confirm the GitHub Pages workbench loads and exercises dictionary JSON/CSV/INI plus query helper flows.
- Review unresolved GitHub Copilot comments and either address or intentionally dismiss false positives.
- Confirm `@potionify/gameplay-tags` and `gameplay-tags` have the same `alpha` version on npm.
- Confirm `gameplay-tags` remains deprecated with the handoff message.
- Update [CHANGELOG.md](CHANGELOG.md) with the beta release notes before publishing the beta version.

When the checklist passes, publish a beta prerelease through the manual `Publish` workflow. Use `dist-tag=beta` and `publish-mode=dry run then publish` for both packages. Keep `latest` unchanged until beta has had real usage feedback.

The equivalent local versioning command is:

```sh
npm version prerelease --preid beta --workspaces
```

Promote a proven version to latest:

```sh
npm dist-tag add @potionify/gameplay-tags@0.1.0 latest
```

Avoid using npm credentials from local shell history. Prefer CI publishing with npm trusted publishing or an npm automation token stored as a GitHub Actions secret.

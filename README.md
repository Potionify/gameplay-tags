# @potionify/gameplay-tags

Unreal Engine-style gameplay tags for TypeScript and JavaScript apps.

The package exposes TypeScript-friendly camelCase methods while keeping Unreal-style aliases for direct API mapping. That means `container.hasTag(tag)` and `container.HasTag(tag)` both work.

## Install

```sh
npm install @potionify/gameplay-tags
```

## Usage

```ts
import {
  GameplayTagsManager,
  makeGameplayTagContainer,
  requestGameplayTag
} from "@potionify/gameplay-tags";

const tags = GameplayTagsManager.get();

tags.addNativeGameplayTag("Ability.Element.Fire");
tags.addNativeGameplayTag("Character.Class.Mage");

const owned = makeGameplayTagContainer([
  "Ability.Element.Fire",
  "Character.Class.Mage"
]);

owned.hasTag(requestGameplayTag("Ability.Element"));
owned.hasTagExact(requestGameplayTag("Ability.Element"));
```

## Dictionary Tools

The manager can import and export Unreal-style table rows, restricted table rows, and redirects. The same package helpers support JSON, CSV, and Unreal `DefaultGameplayTags.ini`-style strings for RPG tools that want portable tag dictionaries.

Dictionaries are the global tag catalog: they define valid tags, redirects, restrictions, and editor metadata. A `FGameplayTagContainer` is the runtime tag set attached to one actor, item, ability, encounter, save row, or query input.

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
    { Tag: "Ability.Element.Fire", DevComment: "Fire damage and spell effects" }
  ],
  restrictedGameplayTagList: [
    { Tag: "Character.Internal.DebugOnly", bAllowNonRestrictedChildren: true }
  ],
  gameplayTagRedirects: [
    { OldTagName: "Character.State.OnFire", NewTagName: "Character.State.Burning" }
  ]
}, {
  sourceName: "RpgTags",
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
  anyTags: ["Ability.Element"],
  noTags: ["Character.State"],
  exactAnyTags: ["Character.Class.Mage"]
});

const saved = stringifyGameplayTagQuery(query);
const loaded = parseGameplayTagQuery(saved);

const matches = filterGameplayTagQueryMatches(encounters, loaded, (encounter) => encounter.tags);
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
npm publish --workspace @potionify/gameplay-tags --tag alpha
npm publish --workspace gameplay-tags --tag alpha
```

The preferred publishing path is the manual GitHub Actions `Publish` workflow. It uses the repository `NPMJS_TOKEN` secret, runs `npm run check`, skips workspace versions that already exist on npm during real publish steps, publishes with provenance, deprecates the `gameplay-tags` handoff package when that package is published in a real run, and requires an explicit confirmation before publishing with the `latest` dist-tag.

The `Publish` workflow has three publish modes:

- `dry run then publish`: default release path that validates the npm package output before publishing it.
- `dry run only`: validation path that does not publish or deprecate anything.
- `publish only`: repair path for publishing after a separate dry run has already passed.

After publishing, run a registry smoke test:

```sh
npm run smoke:published
```

The published smoke test installs from npm and checks ESM/CJS imports, container matching, INI dictionary import/export, and query helper round-trips.

## Beta Readiness

Before moving from `alpha` to `beta`:

- Confirm `main` is green in CI.
- Run `npm run check`.
- Run `GAMEPLAY_TAGS_SMOKE_VERSION=alpha npm run smoke:published`.
- Confirm the GitHub Pages guide loads and exercises dictionary JSON/CSV/INI plus query helper flows.
- Review unresolved GitHub Copilot comments and either address or intentionally dismiss false positives.
- Update [CHANGELOG.md](CHANGELOG.md) with the beta release notes before publishing the beta version.

When the checklist passes, publish a beta prerelease through the manual `Publish` workflow. Use `dist-tag=beta` and `publish-mode=dry run then publish` for the workspace release. Keep `latest` unchanged until beta has had real usage feedback.

The equivalent local versioning command is:

```sh
npm version prerelease --preid beta --workspaces
```

Promote a proven version to latest:

```sh
npm dist-tag add @potionify/gameplay-tags@0.1.0 latest
```

Avoid using npm credentials from local shell history. Prefer CI publishing with npm trusted publishing or an npm automation token stored as a GitHub Actions secret.

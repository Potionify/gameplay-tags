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

The manager can import and export Unreal-style table rows, restricted table rows, and redirects. The same helpers support JSON and CSV strings for note apps that want portable tag dictionaries.

```ts
import {
  EGameplayTagSourceType,
  GameplayTagsManager,
  importGameplayTagDictionary,
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
```

Import results include diagnostics so applications can show duplicate tags, invalid tag strings, and redirects that point at missing tags before applying a dictionary.

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

The preferred publishing path is the manual GitHub Actions `Publish` workflow. It uses the repository `NPMJS_TOKEN` secret, runs `npm run check`, defaults to a dry run, skips workspace versions that already exist on npm, publishes with provenance, automatically deprecates the unscoped handoff package after real runs that include `gameplay-tags`, and requires an explicit confirmation before publishing with the `latest` dist-tag.

Use the `Deprecate Unscoped Package` workflow only as a manual repair path if the deprecation message needs to be applied again:

```sh
npm deprecate gameplay-tags@"*" "Use the official package: @potionify/gameplay-tags"
```

After publishing, run a registry smoke test:

```sh
npm run smoke:published
```

Move to beta when the API names and runtime behavior feel settled:

```sh
npm version prerelease --preid beta --workspaces
npm publish -w @potionify/gameplay-tags --tag beta
```

Promote a proven version to latest:

```sh
npm dist-tag add @potionify/gameplay-tags@0.1.0 latest
```

Avoid using npm credentials from local shell history. Prefer CI publishing with npm trusted publishing or an npm automation token stored as a GitHub Actions secret.

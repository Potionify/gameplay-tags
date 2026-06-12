# @potionify/gameplay-tags

Unreal Engine-style gameplay tags for TypeScript and JavaScript apps.

The package exposes TypeScript-friendly camelCase methods while keeping Unreal-style aliases for direct API mapping. That means `container.hasTag(tag)` and `container.HasTag(tag)` both work.

## Packages

- `@potionify/gameplay-tags`: official package.
- `gameplay-tags`: small handoff package that re-exports the scoped package.

The unscoped `gameplay-tags` package should be published only to protect the name and guide accidental installs. After publishing it, deprecate it with a message like:

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

The preferred publishing path is the manual GitHub Actions `Publish` workflow. It uses the repository `NPMJS_TOKEN` secret, runs `npm run check`, defaults to a dry run, and requires an explicit confirmation before publishing with the `latest` dist-tag.

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

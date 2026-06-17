# @potionify/gameplay-tags

Unreal Engine-style gameplay tags for TypeScript and JavaScript.

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

The public surface mirrors Unreal naming where it makes sense in JavaScript: `FGameplayTag`, `FGameplayTagContainer`, `FGameplayTagQuery`, `FGameplayTagQueryExpression`, `UGameplayTagsManager`, and `UBlueprintGameplayTagLibrary`.

CamelCase aliases are the primary TypeScript style. Unreal-style method names remain available for one-to-one lookup from Unreal documentation.

## API Mapping

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

Dictionary helpers are included for tools that need to read and write gameplay tag lists:

```ts
import {
  GameplayTagsManager,
  importGameplayTagDictionary,
  parseGameplayTagDictionary,
  stringifyGameplayTagDictionary
} from "@potionify/gameplay-tags";

importGameplayTagDictionary({
  gameplayTagList: [{ Tag: "Note.Status.Draft" }],
  gameplayTagRedirects: [
    { OldTagName: "Note.Status.ReadyForReview", NewTagName: "Note.Status.Review" }
  ]
});

const csv = stringifyGameplayTagDictionary(
  GameplayTagsManager.get().exportGameplayTagDictionary(),
  "csv"
);

const ini = stringifyGameplayTagDictionary(
  GameplayTagsManager.get().exportGameplayTagDictionary(),
  "ini"
);

const parsed = parseGameplayTagDictionary(ini, "ini");
```

Supported dictionary string formats are JSON, CSV, and Unreal `DefaultGameplayTags.ini`-style config rows.

Gameplay tag query helpers are also included for tools that need persistent search or filter state:

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

const loaded = parseGameplayTagQuery(stringifyGameplayTagQuery(query));
const matches = filterGameplayTagQueryMatches(notes, loaded, (note) => note.tags);
```

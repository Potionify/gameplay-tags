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

Dictionary helpers are included for tools that need to read and write gameplay tag lists:

```ts
import {
  GameplayTagsManager,
  importGameplayTagDictionary,
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
```

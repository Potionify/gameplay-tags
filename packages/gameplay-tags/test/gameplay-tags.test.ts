import { beforeEach, describe, expect, it } from "vitest";
import {
  BlueprintGameplayTagLibrary,
  FGameplayTag,
  FGameplayTagContainer,
  FGameplayTagQuery,
  FGameplayTagQueryExpression,
  GameplayTag,
  GameplayTagsManager,
  makeGameplayTagContainer,
  requestGameplayTag
} from "../src/index.js";

describe("gameplay tags", () => {
  beforeEach(() => {
    const manager = GameplayTagsManager.get();
    manager.reset();
    manager.addNativeGameplayTag("Note.Status.Draft");
    manager.addNativeGameplayTag("Note.Status.Published");
    manager.addNativeGameplayTag("Note.Topic.Engine");
    manager.addNativeGameplayTag("Note.Topic.Rendering");
    manager.addNativeGameplayTag("Character.State.Stunned");
  });

  it("registers tags and resolves implicit parents", () => {
    const draft = GameplayTag.requestGameplayTag("Note.Status.Draft");
    const status = requestGameplayTag("Note.Status");

    expect(draft.isValid()).toBe(true);
    expect(status.isValid()).toBe(true);
    expect(draft.matchesTag(status)).toBe(true);
    expect(status.matchesTag(draft)).toBe(false);
    expect(draft.matchesTagExact(status)).toBe(false);
    expect(draft.getTagLeafName()).toBe("Draft");
    expect(draft.requestDirectParent().getTagName()).toBe("Note.Status");
  });

  it("matches containers against explicit and parent tags", () => {
    const owned = makeGameplayTagContainer([
      "Note.Status.Draft",
      "Note.Topic.Engine"
    ]);

    expect(owned.hasTag(requestGameplayTag("Note.Status"))).toBe(true);
    expect(owned.hasTagExact(requestGameplayTag("Note.Status"))).toBe(false);
    expect(owned.hasAll(makeGameplayTagContainer(["Note.Status", "Note.Topic"]))).toBe(true);
    expect(owned.hasAllExact(makeGameplayTagContainer(["Note.Status", "Note.Topic"]))).toBe(false);
    expect(owned.num()).toBe(2);
  });

  it("filters using Unreal hierarchical semantics", () => {
    const owned = makeGameplayTagContainer([
      "Note.Status.Draft",
      "Note.Topic.Engine",
      "Character.State.Stunned"
    ]);
    const noteTags = makeGameplayTagContainer(["Note"]);

    expect(owned.filter(noteTags).toJSON()).toEqual([
      "Note.Status.Draft",
      "Note.Topic.Engine"
    ]);
    expect(owned.filterExact(noteTags).toJSON()).toEqual([]);
  });

  it("supports leaf tag insertion", () => {
    const container = new FGameplayTagContainer(requestGameplayTag("Note.Status"));

    expect(container.addLeafTag(requestGameplayTag("Note.Status.Draft"))).toBe(true);
    expect(container.toJSON()).toEqual(["Note.Status.Draft"]);
    expect(container.addLeafTag(requestGameplayTag("Note.Status"))).toBe(false);
    expect(container.toJSON()).toEqual(["Note.Status.Draft"]);
  });

  it("evaluates shortcut queries and expression trees", () => {
    const owned = makeGameplayTagContainer(["Note.Status.Draft", "Note.Topic.Engine"]);
    const statusParent = makeGameplayTagContainer(["Note.Status"]);
    const exactStatus = FGameplayTagQuery.makeQueryExactMatchAnyTags(statusParent);
    const parentStatus = FGameplayTagQuery.makeQueryMatchAnyTags(statusParent);
    const noStun = FGameplayTagQuery.makeQueryMatchNoTags(makeGameplayTagContainer(["Character.State.Stunned"]));
    const complex = FGameplayTagQuery.buildQuery(
      new FGameplayTagQueryExpression()
        .allExprMatch()
        .addExpr(new FGameplayTagQueryExpression().anyTagsMatch().addTag("Note.Status"))
        .addExpr(new FGameplayTagQueryExpression().noTagsMatch().addTag("Character.State"))
    );

    expect(parentStatus.matches(owned)).toBe(true);
    expect(exactStatus.matches(owned)).toBe(false);
    expect(noStun.matches(owned)).toBe(true);
    expect(complex.matches(owned)).toBe(true);
    expect(owned.matchesQuery(complex)).toBe(true);
  });

  it("keeps Unreal-style aliases available", () => {
    const owned = FGameplayTagContainer.CreateFromArray([
      FGameplayTag.RequestGameplayTag("Note.Status.Draft")
    ]);

    expect(owned.HasTag(FGameplayTag.RequestGameplayTag("Note.Status"))).toBe(true);
    expect(BlueprintGameplayTagLibrary.HasTag(owned, FGameplayTag.RequestGameplayTag("Note.Status"), false)).toBe(true);
    expect(BlueprintGameplayTagLibrary.hasTag(owned, FGameplayTag.RequestGameplayTag("Note.Status"), true)).toBe(false);
  });

  it("validates tag strings", () => {
    const validation = GameplayTagsManager.get().validateGameplayTagString(" .Note.Bad,Tag. ");

    expect(validation.isValid).toBe(false);
    expect(validation.fixedString).toBe("Note.Bad_Tag");
    expect(GameplayTag.isValidGameplayTagString("Note.Good")).toBe(true);
  });

  it("can enumerate explicit and implicit dictionary tags", () => {
    const explicitOnly = new FGameplayTagContainer();
    const fullDictionary = new FGameplayTagContainer();

    GameplayTagsManager.get().requestAllGameplayTags(explicitOnly, true);
    GameplayTagsManager.get().requestAllGameplayTags(fullDictionary, false);

    expect(explicitOnly.hasTagExact(requestGameplayTag("Note.Status.Draft"))).toBe(true);
    expect(explicitOnly.hasTagExact(requestGameplayTag("Note.Status"))).toBe(false);
    expect(fullDictionary.hasTagExact(requestGameplayTag("Note.Status"))).toBe(true);
  });
});

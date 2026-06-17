import { beforeEach, describe, expect, it } from "vitest";
import {
  addNativeGameplayTag,
  EGameplayTagSourceType,
  BlueprintGameplayTagLibrary,
  FGameplayTag,
  FGameplayTagContainer,
  FGameplayTagQuery,
  FGameplayTagQueryExpression,
  GameplayTag,
  GameplayTagsManager,
  importGameplayTagDictionary,
  makeGameplayTagContainer,
  parseGameplayTagDictionary,
  parseGameplayTagDictionaryIni,
  redirectGameplayTagName,
  requestGameplayTagContainer,
  stringifyGameplayTagDictionary,
  stringifyGameplayTagDictionaryIni,
  validateGameplayTagString,
  validateGameplayTagDictionary,
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

  it("keeps top-level Unreal and camelCase helpers available", () => {
    const created = addNativeGameplayTag("Note.Status.ReadyForReview");
    const container = requestGameplayTagContainer(["Note.Status.ReadyForReview", "Note.Topic.Engine"]);
    const validation = validateGameplayTagString(" .Note.Bad,Tag. ");

    GameplayTagsManager.get().addGameplayTagRedirect({
      OldTagName: "Note.Status.Review",
      NewTagName: "Note.Status.ReadyForReview"
    });

    expect(created.getTagName()).toBe("Note.Status.ReadyForReview");
    expect(container.hasTag(requestGameplayTag("Note.Status"))).toBe(true);
    expect(validation.fixedString).toBe("Note.Bad_Tag");
    expect(redirectGameplayTagName("Note.Status.Review")).toBe("Note.Status.ReadyForReview");
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

  it("imports and exports source-aware gameplay tag dictionaries", () => {
    const manager = GameplayTagsManager.get();
    const result = importGameplayTagDictionary({
      gameplayTagList: [
        { Tag: "Note.Priority.High", DevComment: "Important note" },
        { Tag: "Note.Priority.Low", DevComment: "Low priority note" }
      ],
      restrictedGameplayTagList: [
        { Tag: "Note.Internal.Archived", DevComment: "Internal state", bAllowNonRestrictedChildren: true }
      ],
      gameplayTagRedirects: [
        { OldTagName: "Note.Priority.Urgent", NewTagName: "Note.Priority.High" }
      ]
    }, {
      sourceName: "Notes",
      sourceType: EGameplayTagSourceType.TagList
    });

    expect(result.diagnostics).toEqual([]);
    expect(result.importedTags.toJSON()).toEqual([
      "Note.Priority.High",
      "Note.Priority.Low",
      "Note.Internal.Archived"
    ]);
    expect(manager.requestGameplayTag("Note.Priority.Urgent").getTagName()).toBe("Note.Priority.High");
    expect(manager.isDictionaryTag("Note.Priority")).toBe(false);
    expect(manager.isDictionaryTag("Note.Priority.High")).toBe(true);
    expect(manager.getTagEditorData("Note.Priority.High")).toMatchObject({
      comment: "Important note",
      firstTagSource: "Notes",
      isTagExplicit: true,
      isRestrictedTag: false
    });
    expect(manager.getTagEditorData("Note.Internal.Archived")).toMatchObject({
      isRestrictedTag: true,
      allowNonRestrictedChildren: true
    });

    const exported = manager.exportGameplayTagDictionary();
    expect(exported.gameplayTagList.some((row) => row.Tag === "Note.Priority.High")).toBe(true);
    expect(exported.restrictedGameplayTagList).toContainEqual({
      Tag: "Note.Internal.Archived",
      DevComment: "Internal state",
      bAllowNonRestrictedChildren: true
    });
    expect(exported.gameplayTagRedirects).toEqual([
      { OldTagName: "Note.Priority.Urgent", NewTagName: "Note.Priority.High" }
    ]);

    const serializedExport = JSON.parse(stringifyGameplayTagDictionary(exported)) as {
      gameplayTagList: Array<{ Tag: string }>;
      restrictedGameplayTagList: Array<{ Tag: string }>;
    };

    expect(serializedExport.gameplayTagList.filter((row) => row.Tag === "Note.Priority.High")).toHaveLength(1);
    expect(serializedExport.gameplayTagList.filter((row) => row.Tag === "Note.Priority.Low")).toHaveLength(1);
    expect(serializedExport.restrictedGameplayTagList.filter((row) => row.Tag === "Note.Internal.Archived")).toHaveLength(1);

    const mixedSerialized = JSON.parse(stringifyGameplayTagDictionary({
      gameplayTagList: [{ Tag: "Note.Mixed.Row" }],
      entries: [
        { tag: "Note.Mixed.Row" },
        { tag: "Note.Mixed.Entry" }
      ]
    })) as { gameplayTagList: Array<{ Tag: string }> };

    expect(mixedSerialized.gameplayTagList.map((row) => row.Tag)).toEqual([
      "Note.Mixed.Row",
      "Note.Mixed.Entry"
    ]);
  });

  it("coerces string boolean dictionary flags", () => {
    const manager = GameplayTagsManager.get();
    const result = importGameplayTagDictionary({
      restrictedGameplayTagList: [
        {
          Tag: "Note.Flags.RestrictedFalse",
          DevComment: "String false should stay false",
          bAllowNonRestrictedChildren: "false" as unknown as boolean
        }
      ],
      entries: [
        {
          tag: "Note.Flags.EntryPlain",
          devComment: "String false should not mark the entry restricted",
          isRestricted: "false" as unknown as boolean,
          allowNonRestrictedChildren: "true" as unknown as boolean
        },
        {
          tag: "Note.Flags.EntryRestricted",
          devComment: "String true should mark the entry restricted",
          isRestricted: "true" as unknown as boolean,
          allowNonRestrictedChildren: "false" as unknown as boolean
        }
      ]
    }, {
      sourceName: "Notes",
      sourceType: EGameplayTagSourceType.TagList
    });

    expect(result.diagnostics).toEqual([]);
    expect(manager.getTagEditorData("Note.Flags.RestrictedFalse")).toMatchObject({
      isRestrictedTag: true,
      allowNonRestrictedChildren: false
    });
    expect(manager.getTagEditorData("Note.Flags.EntryPlain")).toMatchObject({
      isRestrictedTag: false,
      allowNonRestrictedChildren: false
    });
    expect(manager.getTagEditorData("Note.Flags.EntryRestricted")).toMatchObject({
      isRestrictedTag: true,
      allowNonRestrictedChildren: false
    });
  });

  it("validates dictionary input before import", () => {
    const validation = validateGameplayTagDictionary({
      gameplayTagList: [
        { Tag: "Note.Topic.Engine", DevComment: "Duplicate" },
        { Tag: "Note.Topic.Engine", DevComment: "Duplicate again" },
        { Tag: ".Bad,Tag.", DevComment: "Invalid" }
      ],
      gameplayTagRedirects: [
        { OldTagName: "Note.Old", NewTagName: "Note.Missing" },
        { OldTagName: "Note.Same", NewTagName: "Note.Same" }
      ]
    });

    expect(validation.isValid).toBe(false);
    expect(validation.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "tag-duplicate",
      "tag-invalid",
      "redirect-target-missing",
      "redirect-loop"
    ]);
  });

  it("resolves redirect chains and validates redirect cycles", () => {
    const manager = GameplayTagsManager.get();
    const valid = validateGameplayTagDictionary({
      gameplayTagList: [
        { Tag: "Note.Status.Review" }
      ],
      gameplayTagRedirects: [
        { OldTagName: "Note.Status.ReadyForReview", NewTagName: "Note.Status.PendingReview" },
        { OldTagName: "Note.Status.PendingReview", NewTagName: "Note.Status.Review" }
      ]
    });

    expect(valid.diagnostics).toEqual([]);

    importGameplayTagDictionary({
      gameplayTagList: [
        { Tag: "Note.Status.Review" }
      ],
      gameplayTagRedirects: [
        { OldTagName: "Note.Status.ReadyForReview", NewTagName: "Note.Status.PendingReview" },
        { OldTagName: "Note.Status.PendingReview", NewTagName: "Note.Status.Review" }
      ]
    });

    expect(manager.requestGameplayTag("Note.Status.ReadyForReview").getTagName()).toBe("Note.Status.Review");
    expect(manager.redirectGameplayTagName("Note.Status.ReadyForReview")).toBe("Note.Status.Review");

    const invalid = validateGameplayTagDictionary({
      gameplayTagRedirects: [
        { OldTagName: "Note.Cycle.A", NewTagName: "Note.Cycle.B" },
        { OldTagName: "Note.Cycle.B", NewTagName: "Note.Cycle.A" }
      ]
    });

    expect(invalid.isValid).toBe(false);
    expect(invalid.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "redirect-loop",
      "redirect-loop"
    ]);
  });

  it("validates redirect source names and avoids redundant target diagnostics", () => {
    const validation = validateGameplayTagDictionary({
      gameplayTagRedirects: [
        { OldTagName: ".Bad,Old.", NewTagName: "Note.Status.Draft" },
        { OldTagName: "Note.ValidOld", NewTagName: ".Bad,Target." }
      ]
    });

    expect(validation.isValid).toBe(false);
    expect(validation.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "redirect-source-invalid",
      "redirect-target-invalid"
    ]);
  });

  it("distinguishes long redirect chains from redirect cycles", () => {
    const redirects = Array.from({ length: 34 }, (_, index) => ({
      OldTagName: `Note.Redirect.${index}`,
      NewTagName: `Note.Redirect.${index + 1}`
    }));
    const validation = validateGameplayTagDictionary({
      gameplayTagList: [
        { Tag: "Note.Redirect.34" }
      ],
      gameplayTagRedirects: redirects
    });

    expect(validation.isValid).toBe(false);
    expect(validation.diagnostics.some((diagnostic) => diagnostic.code === "redirect-chain-too-deep")).toBe(true);
    expect(validation.diagnostics.some((diagnostic) => diagnostic.message.includes("cycle"))).toBe(false);
  });

  it("replaces query dictionary tags without changing query shape", () => {
    const draft = FGameplayTagQuery.makeQueryMatchTag(requestGameplayTag("Note.Status.Draft"));
    const published = makeGameplayTagContainer(["Note.Status.Published"]);
    const ownedDraft = makeGameplayTagContainer(["Note.Status.Draft"]);
    const ownedPublished = makeGameplayTagContainer(["Note.Status.Published"]);

    expect(draft.matches(ownedDraft)).toBe(true);
    expect(draft.matches(ownedPublished)).toBe(false);

    draft.replaceTagsFast(published);

    expect(draft.getGameplayTagArray().map((tag) => tag.getTagName())).toEqual(["Note.Status.Published"]);
    expect(draft.matches(ownedDraft)).toBe(false);
    expect(draft.matches(ownedPublished)).toBe(true);
  });

  it("round-trips dictionary data as csv", () => {
    const csv = [
      "Tag,DevComment,Restricted,bAllowNonRestrictedChildren,OldTagName,NewTagName",
      "Note.Source.Csv,\"CSV, imported\",false,false,,",
      "Note.Source.Restricted,Locked,true,true,,",
      ",,,,Note.Source.Old,Note.Source.Csv"
    ].join("\n");
    const parsed = parseGameplayTagDictionary(csv, "csv");
    const serialized = stringifyGameplayTagDictionary(parsed, "csv");

    expect(parsed.gameplayTagList).toEqual([
      { Tag: "Note.Source.Csv", DevComment: "CSV, imported" }
    ]);
    expect(parsed.restrictedGameplayTagList).toEqual([
      { Tag: "Note.Source.Restricted", DevComment: "Locked", bAllowNonRestrictedChildren: true }
    ]);
    expect(parsed.gameplayTagRedirects).toEqual([
      { OldTagName: "Note.Source.Old", NewTagName: "Note.Source.Csv" }
    ]);
    expect(serialized).toContain("\"CSV, imported\"");
    expect(serialized).toContain("Note.Source.Old,Note.Source.Csv");
  });

  it("round-trips dictionary data as ini", () => {
    const ini = [
      "; DefaultGameplayTags.ini style import",
      "[/Script/GameplayTags.GameplayTagsSettings]",
      "+GameplayTagList=(Tag=\"Note.Source.Ini\",DevComment=\"INI, imported with \\\"quotes\\\"\") ; trailing comment",
      "+GameplayTagList=(Tag=\"Note.Source.Literal\",DevComment=\"Literal \\\\n token\")",
      "+RestrictedGameplayTagList=(Tag=\"Note.Source.Restricted\",DevComment=\"Locked\",bAllowNonRestrictedChildren=True)",
      "+GameplayTagRedirects=(OldTagName=\"Note.Source.Old\",NewTagName=\"Note.Source.Ini\")",
      "[/Script/Other.Section]",
      "+GameplayTagList=(Tag=\"Ignored.Section\",DevComment=\"Ignored\")"
    ].join("\n");
    const parsed = parseGameplayTagDictionary(ini, "ini");
    const serialized = stringifyGameplayTagDictionary(parsed, "ini");

    expect(parsed).toEqual(parseGameplayTagDictionaryIni(ini));
    expect(stringifyGameplayTagDictionaryIni(parsed)).toBe(serialized);
    expect(parsed.gameplayTagList).toEqual([
      { Tag: "Note.Source.Ini", DevComment: "INI, imported with \"quotes\"" },
      { Tag: "Note.Source.Literal", DevComment: "Literal \\n token" }
    ]);
    expect(parsed.restrictedGameplayTagList).toEqual([
      { Tag: "Note.Source.Restricted", DevComment: "Locked", bAllowNonRestrictedChildren: true }
    ]);
    expect(parsed.gameplayTagRedirects).toEqual([
      { OldTagName: "Note.Source.Old", NewTagName: "Note.Source.Ini" }
    ]);
    expect(serialized).toContain("[/Script/GameplayTags.GameplayTagsSettings]");
    expect(serialized).toContain("+GameplayTagList=(Tag=\"Note.Source.Ini\",DevComment=\"INI, imported with \\\"quotes\\\"\")");
    expect(serialized).toContain("+GameplayTagList=(Tag=\"Note.Source.Literal\",DevComment=\"Literal \\\\n token\")");
    expect(serialized).toContain("+RestrictedGameplayTagList=(Tag=\"Note.Source.Restricted\",DevComment=\"Locked\",bAllowNonRestrictedChildren=True)");
    expect(serialized).toContain("+GameplayTagRedirects=(OldTagName=\"Note.Source.Old\",NewTagName=\"Note.Source.Ini\")");
    expect(serialized).not.toContain("Ignored.Section");
  });
});

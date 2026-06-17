export type GameplayTagLike = FGameplayTag | string;
export type GameplayTagContainerLike = FGameplayTagContainer | Iterable<GameplayTagLike>;

export enum EGameplayTagSourceType {
  Native = "Native",
  DefaultTagList = "DefaultTagList",
  TagList = "TagList",
  RestrictedTagList = "RestrictedTagList",
  DataTable = "DataTable",
  Invalid = "Invalid"
}

export interface GameplayTagValidationResult {
  isValid: boolean;
  error: string;
  fixedString: string;
}

export interface FGameplayTagTableRow {
  Tag: string;
  DevComment?: string;
}

export type GameplayTagTableRow = FGameplayTagTableRow;

export interface FRestrictedGameplayTagTableRow extends FGameplayTagTableRow {
  bAllowNonRestrictedChildren?: boolean;
}

export interface FGameplayTagRedirect {
  OldTagName: string;
  NewTagName: string;
}

export interface GameplayTagEditorData {
  comment: string;
  firstTagSource: string;
  tagSources: string[];
  sourceTypes: EGameplayTagSourceType[];
  isTagExplicit: boolean;
  isRestrictedTag: boolean;
  allowNonRestrictedChildren: boolean;
}

export type GameplayTagDictionaryDiagnosticLevel = "error" | "warning";

export interface GameplayTagDictionaryDiagnostic {
  level: GameplayTagDictionaryDiagnosticLevel;
  code: string;
  message: string;
  tag?: string;
  index?: number;
}

export interface GameplayTagDictionaryEntry {
  tag: string;
  devComment?: string;
  sourceName?: string;
  sourceType?: EGameplayTagSourceType;
  isExplicit?: boolean;
  isRestricted?: boolean;
  allowNonRestrictedChildren?: boolean;
}

export interface GameplayTagDictionaryExport {
  gameplayTagList: FGameplayTagTableRow[];
  restrictedGameplayTagList: FRestrictedGameplayTagTableRow[];
  gameplayTagRedirects: FGameplayTagRedirect[];
  entries: GameplayTagDictionaryEntry[];
}

export interface GameplayTagDictionaryImportOptions {
  sourceName?: string;
  sourceType?: EGameplayTagSourceType;
  restrictedSourceName?: string;
  repairInvalidTags?: boolean;
}

export interface GameplayTagDictionaryImportResult {
  importedTags: FGameplayTagContainer;
  gameplayTagList: FGameplayTagTableRow[];
  restrictedGameplayTagList: FRestrictedGameplayTagTableRow[];
  gameplayTagRedirects: FGameplayTagRedirect[];
  diagnostics: GameplayTagDictionaryDiagnostic[];
}

export interface GameplayTagDictionaryExportOptions {
  onlyIncludeDictionaryTags?: boolean;
  includeRedirects?: boolean;
}

export interface GameplayTagDictionaryValidationResult {
  isValid: boolean;
  diagnostics: GameplayTagDictionaryDiagnostic[];
}

export interface GameplayTagDictionaryShape {
  gameplayTagList?: readonly FGameplayTagTableRow[];
  GameplayTagList?: readonly FGameplayTagTableRow[];
  restrictedGameplayTagList?: readonly FRestrictedGameplayTagTableRow[];
  RestrictedGameplayTagList?: readonly FRestrictedGameplayTagTableRow[];
  gameplayTagRedirects?: readonly FGameplayTagRedirect[];
  GameplayTagRedirects?: readonly FGameplayTagRedirect[];
  tags?: readonly GameplayTagDictionaryEntry[];
  Tags?: readonly GameplayTagDictionaryEntry[];
  entries?: readonly GameplayTagDictionaryEntry[];
  Entries?: readonly GameplayTagDictionaryEntry[];
  redirects?: readonly FGameplayTagRedirect[];
  Redirects?: readonly FGameplayTagRedirect[];
}

export type GameplayTagDictionaryInput = readonly FGameplayTagTableRow[] | GameplayTagDictionaryShape;
export type GameplayTagDictionaryFormat = "json" | "csv";

export enum EGameplayTagQueryExprType {
  Undefined = "Undefined",
  AnyTagsMatch = "AnyTagsMatch",
  AllTagsMatch = "AllTagsMatch",
  NoTagsMatch = "NoTagsMatch",
  AnyTagsExactMatch = "AnyTagsExactMatch",
  AllTagsExactMatch = "AllTagsExactMatch",
  AnyExprMatch = "AnyExprMatch",
  AllExprMatch = "AllExprMatch",
  NoExprMatch = "NoExprMatch"
}

interface GameplayTagNode {
  tag: FGameplayTag;
  fullName: string;
  simpleName: string;
  key: string;
  parentKey: string;
  children: Set<string>;
  explicit: boolean;
  devComment: string;
  restricted: boolean;
  allowNonRestrictedChildren: boolean;
  sources: Map<string, EGameplayTagSourceType>;
}

const NAME_NONE = "";
const DEFAULT_INVALID_TAG_CHARACTERS = "\"',\r\n\t";

const DEFAULT_SOURCE_NAME = "Default";
const DEFAULT_RESTRICTED_SOURCE_NAME = "Restricted";

interface NormalizedGameplayTagDictionary {
  gameplayTagList: FGameplayTagTableRow[];
  restrictedGameplayTagList: FRestrictedGameplayTagTableRow[];
  gameplayTagRedirects: FGameplayTagRedirect[];
}

function toTagName(value: GameplayTagLike): string {
  return value instanceof FGameplayTag ? value.GetTagName() : String(value);
}

function keyForTagName(value: string): string {
  return value.toLocaleLowerCase("en-US");
}

function normalizeTagName(value: unknown): string {
  return String(value ?? "").trim();
}

function sourceKeyForName(value: string, type: EGameplayTagSourceType): string {
  return `${type}:${value}`;
}

function parseBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  return ["1", "true", "yes", "y"].includes(String(value ?? "").trim().toLocaleLowerCase("en-US"));
}

function normalizeTableRow(row: FGameplayTagTableRow): FGameplayTagTableRow {
  return {
    Tag: normalizeTagName(row.Tag),
    DevComment: row.DevComment ? String(row.DevComment) : ""
  };
}

function normalizeRestrictedTableRow(row: FRestrictedGameplayTagTableRow): FRestrictedGameplayTagTableRow {
  return {
    ...normalizeTableRow(row),
    bAllowNonRestrictedChildren: parseBoolean(row.bAllowNonRestrictedChildren)
  };
}

function normalizeRedirect(redirect: FGameplayTagRedirect): FGameplayTagRedirect {
  return {
    OldTagName: normalizeTagName(redirect.OldTagName),
    NewTagName: normalizeTagName(redirect.NewTagName)
  };
}

function normalizeDictionaryEntry(entry: GameplayTagDictionaryEntry): FGameplayTagTableRow | FRestrictedGameplayTagTableRow {
  const row = {
    Tag: normalizeTagName(entry.tag),
    DevComment: entry.devComment ? String(entry.devComment) : ""
  };

  if (parseBoolean(entry.isRestricted)) {
    return {
      ...row,
      bAllowNonRestrictedChildren: parseBoolean(entry.allowNonRestrictedChildren)
    };
  }

  return row;
}

function normalizeGameplayTagDictionary(input: GameplayTagDictionaryInput): NormalizedGameplayTagDictionary {
  if (Array.isArray(input)) {
    return {
      gameplayTagList: input.map(normalizeTableRow),
      restrictedGameplayTagList: [],
      gameplayTagRedirects: []
    };
  }

  const dictionary = input as GameplayTagDictionaryShape;
  const rows = dictionary.gameplayTagList ?? dictionary.GameplayTagList ?? [];
  const restrictedRows = dictionary.restrictedGameplayTagList ?? dictionary.RestrictedGameplayTagList ?? [];
  const redirects = dictionary.gameplayTagRedirects ?? dictionary.GameplayTagRedirects ?? dictionary.redirects ?? dictionary.Redirects ?? [];
  const entries = dictionary.entries ?? dictionary.Entries ?? dictionary.tags ?? dictionary.Tags ?? [];

  const entryRows = entries.map(normalizeDictionaryEntry);
  const entryGameplayRows = entryRows.filter((row): row is FGameplayTagTableRow => !("bAllowNonRestrictedChildren" in row));
  const entryRestrictedRows = entryRows.filter((row): row is FRestrictedGameplayTagTableRow => "bAllowNonRestrictedChildren" in row);

  return {
    gameplayTagList: [...rows.map(normalizeTableRow), ...entryGameplayRows],
    restrictedGameplayTagList: [...restrictedRows.map(normalizeRestrictedTableRow), ...entryRestrictedRows],
    gameplayTagRedirects: redirects.map(normalizeRedirect)
  };
}

function escapeCsvField(value: unknown): string {
  const field = String(value ?? "");

  if (!/[",\r\n]/.test(field)) {
    return field;
  }

  return `"${field.replaceAll("\"", "\"\"")}"`;
}

function parseCsvRows(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];

    if (character === "\"") {
      if (inQuotes && next === "\"") {
        field += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && next === "\n") {
        index += 1;
      }

      row.push(field);
      field = "";

      if (row.some((cell) => cell.length > 0)) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    field += character;
  }

  row.push(field);

  if (row.some((cell) => cell.length > 0)) {
    rows.push(row);
  }

  return rows;
}

function valueForHeader(row: Record<string, string>, ...headers: string[]): string {
  for (const header of headers) {
    const value = row[header.toLocaleLowerCase("en-US")];

    if (value !== undefined) {
      return value;
    }
  }

  return "";
}

function uniqueTags(tags: Iterable<FGameplayTag>): FGameplayTag[] {
  const seen = new Set<string>();
  const result: FGameplayTag[] = [];

  for (const tag of tags) {
    if (!tag.IsValid()) {
      continue;
    }

    const key = tag.GetTagKey();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(tag);
  }

  return result;
}

function ensureTag(value: GameplayTagLike): FGameplayTag {
  return value instanceof FGameplayTag ? value : new FGameplayTag(value);
}

function ensureContainer(value: GameplayTagContainerLike): FGameplayTagContainer {
  return value instanceof FGameplayTagContainer ? value : FGameplayTagContainer.CreateFromArray([...value].map(ensureTag));
}

function splitTagName(value: string): string[] {
  return value.split(".").filter(Boolean);
}

function parentNames(value: string): string[] {
  const parts = splitTagName(value);
  const parents: string[] = [];

  for (let index = parts.length - 1; index > 0; index -= 1) {
    parents.push(parts.slice(0, index).join("."));
  }

  return parents;
}

function hasHierarchicalMatch(source: FGameplayTag, target: FGameplayTag): boolean {
  if (!source.IsValid() || !target.IsValid()) {
    return false;
  }

  const sourceKey = source.GetTagKey();
  const targetKey = target.GetTagKey();

  return sourceKey === targetKey || sourceKey.startsWith(`${targetKey}.`);
}

function compareTagNames(left: FGameplayTag, right: FGameplayTag): number {
  return left.GetTagKey().localeCompare(right.GetTagKey(), "en-US", {
    numeric: true,
    sensitivity: "base"
  });
}

function cloneExpression(expression: FGameplayTagQueryExpression): FGameplayTagQueryExpression {
  const next = new FGameplayTagQueryExpression();
  next.ExprType = expression.ExprType;
  next.TagSet = expression.TagSet.map((tag) => new FGameplayTag(tag.GetTagName()));
  next.ExprSet = expression.ExprSet.map(cloneExpression);
  return next;
}

function tagsEqual(left: FGameplayTag, right: FGameplayTag): boolean {
  return left.GetTagKey() === right.GetTagKey();
}

function collectExpressionTags(expression: FGameplayTagQueryExpression, out: FGameplayTag[]): void {
  for (const tag of expression.TagSet) {
    if (!out.some((existing) => tagsEqual(existing, tag))) {
      out.push(tag);
    }
  }

  for (const child of expression.ExprSet) {
    collectExpressionTags(child, out);
  }
}

function replaceExpressionTags(expression: FGameplayTagQueryExpression, replacements: FGameplayTag[]): FGameplayTagQueryExpression {
  let index = 0;
  const replace = (current: FGameplayTagQueryExpression): FGameplayTagQueryExpression => {
    const next = new FGameplayTagQueryExpression();
    next.ExprType = current.ExprType;
    next.TagSet = current.TagSet.map(() => {
      const replacement = replacements[index] ?? new FGameplayTag();
      index += 1;
      return replacement;
    });
    next.ExprSet = current.ExprSet.map(replace);
    return next;
  };

  return replace(expression);
}

export function parseGameplayTagDictionary(source: string, format: GameplayTagDictionaryFormat = "json"): GameplayTagDictionaryExport {
  if (format === "csv") {
    return parseGameplayTagDictionaryCsv(source);
  }

  const normalized = normalizeGameplayTagDictionary(JSON.parse(source) as GameplayTagDictionaryInput);
  return {
    ...normalized,
    entries: []
  };
}

export function ParseGameplayTagDictionary(source: string, format: GameplayTagDictionaryFormat = "json"): GameplayTagDictionaryExport {
  return parseGameplayTagDictionary(source, format);
}

export function stringifyGameplayTagDictionary(dictionary: GameplayTagDictionaryInput, format: GameplayTagDictionaryFormat = "json"): string {
  const normalized = normalizeGameplayTagDictionary(dictionary);

  if (format === "csv") {
    return stringifyGameplayTagDictionaryCsv(normalized);
  }

  return JSON.stringify(
    {
      gameplayTagList: normalized.gameplayTagList,
      restrictedGameplayTagList: normalized.restrictedGameplayTagList,
      gameplayTagRedirects: normalized.gameplayTagRedirects
    },
    null,
    2
  );
}

export function StringifyGameplayTagDictionary(dictionary: GameplayTagDictionaryInput, format: GameplayTagDictionaryFormat = "json"): string {
  return stringifyGameplayTagDictionary(dictionary, format);
}

export function parseGameplayTagDictionaryCsv(source: string): GameplayTagDictionaryExport {
  const [headerRow = [], ...bodyRows] = parseCsvRows(source);
  const headers = headerRow.map((header) => header.trim().toLocaleLowerCase("en-US"));
  const gameplayTagList: FGameplayTagTableRow[] = [];
  const restrictedGameplayTagList: FRestrictedGameplayTagTableRow[] = [];
  const gameplayTagRedirects: FGameplayTagRedirect[] = [];

  for (const values of bodyRows) {
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ""]));
    const oldTagName = valueForHeader(row, "oldtagname", "old tag name", "old");
    const newTagName = valueForHeader(row, "newtagname", "new tag name", "new");
    const tag = valueForHeader(row, "tag", "tagname", "tag name");

    if (oldTagName || newTagName) {
      gameplayTagRedirects.push({
        OldTagName: oldTagName,
        NewTagName: newTagName
      });
      continue;
    }

    if (!tag) {
      continue;
    }

    const devComment = valueForHeader(row, "devcomment", "dev comment", "comment");
    const restricted = parseBoolean(valueForHeader(row, "restricted", "bisrestrictedtag", "isrestricted"));
    const allowNonRestrictedChildren = parseBoolean(valueForHeader(row, "ballownonrestrictedchildren", "allownonrestrictedchildren"));

    if (restricted) {
      restrictedGameplayTagList.push({
        Tag: tag,
        DevComment: devComment,
        bAllowNonRestrictedChildren: allowNonRestrictedChildren
      });
    } else {
      gameplayTagList.push({
        Tag: tag,
        DevComment: devComment
      });
    }
  }

  return {
    gameplayTagList,
    restrictedGameplayTagList,
    gameplayTagRedirects,
    entries: []
  };
}

export function ParseGameplayTagDictionaryCsv(source: string): GameplayTagDictionaryExport {
  return parseGameplayTagDictionaryCsv(source);
}

export function stringifyGameplayTagDictionaryCsv(dictionary: GameplayTagDictionaryInput): string {
  const normalized = normalizeGameplayTagDictionary(dictionary);
  const rows = [["Tag", "DevComment", "Restricted", "bAllowNonRestrictedChildren", "OldTagName", "NewTagName"]];

  for (const row of normalized.gameplayTagList) {
    rows.push([row.Tag, row.DevComment ?? "", "false", "false", "", ""]);
  }

  for (const row of normalized.restrictedGameplayTagList) {
    rows.push([row.Tag, row.DevComment ?? "", "true", String(Boolean(row.bAllowNonRestrictedChildren)), "", ""]);
  }

  for (const redirect of normalized.gameplayTagRedirects) {
    rows.push(["", "", "", "", redirect.OldTagName, redirect.NewTagName]);
  }

  return rows.map((row) => row.map(escapeCsvField).join(",")).join("\n");
}

export function StringifyGameplayTagDictionaryCsv(dictionary: GameplayTagDictionaryInput): string {
  return stringifyGameplayTagDictionaryCsv(dictionary);
}

export class FGameplayTag {
  static requestGameplayTag(TagName: string, ErrorIfNotFound = true): FGameplayTag {
    return FGameplayTag.RequestGameplayTag(TagName, ErrorIfNotFound);
  }

  static RequestGameplayTag(TagName: string, ErrorIfNotFound = true): FGameplayTag {
    return UGameplayTagsManager.Get().RequestGameplayTag(TagName, ErrorIfNotFound);
  }

  static isValidGameplayTagString(TagString: string): boolean {
    return FGameplayTag.IsValidGameplayTagString(TagString);
  }

  static IsValidGameplayTagString(TagString: string): boolean {
    return UGameplayTagsManager.Get().IsValidGameplayTagString(TagString);
  }

  static validateGameplayTagString(TagString: string): GameplayTagValidationResult {
    return FGameplayTag.ValidateGameplayTagString(TagString);
  }

  static ValidateGameplayTagString(TagString: string): GameplayTagValidationResult {
    return UGameplayTagsManager.Get().ValidateGameplayTagString(TagString);
  }

  private readonly TagName: string;

  constructor(TagName: string = NAME_NONE) {
    this.TagName = TagName;
  }

  equals(Other: FGameplayTag): boolean {
    return this.Equals(Other);
  }

  Equals(Other: FGameplayTag): boolean {
    return tagsEqual(this, Other);
  }

  matchesTag(TagToCheck: FGameplayTag): boolean {
    return this.MatchesTag(TagToCheck);
  }

  MatchesTag(TagToCheck: FGameplayTag): boolean {
    return hasHierarchicalMatch(this, TagToCheck);
  }

  matchesTagExact(TagToCheck: FGameplayTag): boolean {
    return this.MatchesTagExact(TagToCheck);
  }

  MatchesTagExact(TagToCheck: FGameplayTag): boolean {
    return TagToCheck.IsValid() && tagsEqual(this, TagToCheck);
  }

  matchesTagDepth(TagToCheck: FGameplayTag): number {
    return this.MatchesTagDepth(TagToCheck);
  }

  MatchesTagDepth(TagToCheck: FGameplayTag): number {
    const left = splitTagName(this.GetTagKey());
    const right = splitTagName(TagToCheck.GetTagKey());
    const length = Math.min(left.length, right.length);
    let depth = 0;

    for (let index = 0; index < length; index += 1) {
      if (left[index] !== right[index]) {
        break;
      }

      depth += 1;
    }

    return depth;
  }

  matchesAny(ContainerToCheck: FGameplayTagContainer): boolean {
    return this.MatchesAny(ContainerToCheck);
  }

  MatchesAny(ContainerToCheck: FGameplayTagContainer): boolean {
    if (ContainerToCheck.IsEmpty()) {
      return false;
    }

    return ContainerToCheck.GetGameplayTagArray().some((tag) => this.MatchesTag(tag));
  }

  matchesAnyExact(ContainerToCheck: FGameplayTagContainer): boolean {
    return this.MatchesAnyExact(ContainerToCheck);
  }

  MatchesAnyExact(ContainerToCheck: FGameplayTagContainer): boolean {
    if (ContainerToCheck.IsEmpty()) {
      return false;
    }

    return ContainerToCheck.GetGameplayTagArray().some((tag) => this.MatchesTagExact(tag));
  }

  isValid(): boolean {
    return this.IsValid();
  }

  IsValid(): boolean {
    return this.TagName !== NAME_NONE;
  }

  getSingleTagContainer(): FGameplayTagContainer {
    return this.GetSingleTagContainer();
  }

  GetSingleTagContainer(): FGameplayTagContainer {
    return new FGameplayTagContainer(this);
  }

  requestDirectParent(): FGameplayTag {
    return this.RequestDirectParent();
  }

  RequestDirectParent(): FGameplayTag {
    return UGameplayTagsManager.Get().RequestGameplayTagDirectParent(this);
  }

  getGameplayTagParents(): FGameplayTagContainer {
    return this.GetGameplayTagParents();
  }

  GetGameplayTagParents(): FGameplayTagContainer {
    return UGameplayTagsManager.Get().RequestGameplayTagParents(this);
  }

  parseParentTags(UniqueParentTags: FGameplayTag[]): void {
    this.ParseParentTags(UniqueParentTags);
  }

  ParseParentTags(UniqueParentTags: FGameplayTag[]): void {
    for (const parent of parentNames(this.TagName)) {
      const tag = new FGameplayTag(parent);

      if (!UniqueParentTags.some((existing) => tagsEqual(existing, tag))) {
        UniqueParentTags.push(tag);
      }
    }
  }

  getTagLeafName(): string {
    return this.GetTagLeafName();
  }

  GetTagLeafName(): string {
    const parts = splitTagName(this.TagName);
    return parts.at(-1) ?? NAME_NONE;
  }

  getTagName(): string {
    return this.GetTagName();
  }

  GetTagName(): string {
    return this.TagName;
  }

  getTagKey(): string {
    return this.GetTagKey();
  }

  GetTagKey(): string {
    return keyForTagName(this.TagName);
  }

  ToString(): string {
    return this.TagName;
  }

  toString(): string {
    return this.ToString();
  }

  toJSON(): string {
    return this.TagName;
  }
}

export class FGameplayTagContainer implements Iterable<FGameplayTag> {
  static readonly EmptyContainer = new FGameplayTagContainer();
  static readonly emptyContainer = FGameplayTagContainer.EmptyContainer;

  static createFromArray(SourceTags: readonly FGameplayTag[]): FGameplayTagContainer {
    return FGameplayTagContainer.CreateFromArray(SourceTags);
  }

  static CreateFromArray(SourceTags: readonly FGameplayTag[]): FGameplayTagContainer {
    const container = new FGameplayTagContainer();

    for (const tag of SourceTags) {
      container.AddTag(tag);
    }

    return container;
  }

  private GameplayTags: FGameplayTag[] = [];
  private ParentTags: FGameplayTag[] = [];

  constructor(Tag?: FGameplayTag) {
    if (Tag) {
      this.AddTag(Tag);
    }
  }

  equals(Other: FGameplayTagContainer): boolean {
    return this.Equals(Other);
  }

  Equals(Other: FGameplayTagContainer): boolean {
    return this.HasAllExact(Other) && Other.HasAllExact(this);
  }

  hasTag(TagToCheck: FGameplayTag): boolean {
    return this.HasTag(TagToCheck);
  }

  HasTag(TagToCheck: FGameplayTag): boolean {
    if (!TagToCheck.IsValid()) {
      return false;
    }

    return this.GameplayTags.some((tag) => tagsEqual(tag, TagToCheck)) || this.ParentTags.some((tag) => tagsEqual(tag, TagToCheck));
  }

  hasTagExact(TagToCheck: FGameplayTag): boolean {
    return this.HasTagExact(TagToCheck);
  }

  HasTagExact(TagToCheck: FGameplayTag): boolean {
    if (!TagToCheck.IsValid()) {
      return false;
    }

    return this.GameplayTags.some((tag) => tagsEqual(tag, TagToCheck));
  }

  hasAny(ContainerToCheck: FGameplayTagContainer): boolean {
    return this.HasAny(ContainerToCheck);
  }

  HasAny(ContainerToCheck: FGameplayTagContainer): boolean {
    if (ContainerToCheck.IsEmpty()) {
      return false;
    }

    return ContainerToCheck.GameplayTags.some((tag) => this.HasTag(tag));
  }

  hasAnyExact(ContainerToCheck: FGameplayTagContainer): boolean {
    return this.HasAnyExact(ContainerToCheck);
  }

  HasAnyExact(ContainerToCheck: FGameplayTagContainer): boolean {
    if (ContainerToCheck.IsEmpty()) {
      return false;
    }

    return ContainerToCheck.GameplayTags.some((tag) => this.HasTagExact(tag));
  }

  hasAll(ContainerToCheck: FGameplayTagContainer): boolean {
    return this.HasAll(ContainerToCheck);
  }

  HasAll(ContainerToCheck: FGameplayTagContainer): boolean {
    if (ContainerToCheck.IsEmpty()) {
      return true;
    }

    return ContainerToCheck.GameplayTags.every((tag) => this.HasTag(tag));
  }

  hasAllExact(ContainerToCheck: FGameplayTagContainer): boolean {
    return this.HasAllExact(ContainerToCheck);
  }

  HasAllExact(ContainerToCheck: FGameplayTagContainer): boolean {
    if (ContainerToCheck.IsEmpty()) {
      return true;
    }

    return ContainerToCheck.GameplayTags.every((tag) => this.HasTagExact(tag));
  }

  num(): number {
    return this.Num();
  }

  Num(): number {
    return this.GameplayTags.length;
  }

  isValid(): boolean {
    return this.IsValid();
  }

  IsValid(): boolean {
    return this.GameplayTags.length > 0;
  }

  isEmpty(): boolean {
    return this.IsEmpty();
  }

  IsEmpty(): boolean {
    return this.GameplayTags.length === 0;
  }

  getGameplayTagParents(): FGameplayTagContainer {
    return this.GetGameplayTagParents();
  }

  GetGameplayTagParents(): FGameplayTagContainer {
    const result = new FGameplayTagContainer();

    for (const tag of [...this.GameplayTags, ...this.ParentTags]) {
      result.AddTag(tag);
    }

    return result;
  }

  filter(OtherContainer: FGameplayTagContainer): FGameplayTagContainer {
    return this.Filter(OtherContainer);
  }

  Filter(OtherContainer: FGameplayTagContainer): FGameplayTagContainer {
    const result = new FGameplayTagContainer();

    for (const tag of this.GameplayTags) {
      if (tag.MatchesAny(OtherContainer)) {
        result.AddTagFast(tag);
      }
    }

    result.RemoveDuplicates();
    return result;
  }

  filterExact(OtherContainer: FGameplayTagContainer): FGameplayTagContainer {
    return this.FilterExact(OtherContainer);
  }

  FilterExact(OtherContainer: FGameplayTagContainer): FGameplayTagContainer {
    const result = new FGameplayTagContainer();

    for (const tag of this.GameplayTags) {
      if (tag.MatchesAnyExact(OtherContainer)) {
        result.AddTagFast(tag);
      }
    }

    result.RemoveDuplicates();
    return result;
  }

  matchesQuery(Query: FGameplayTagQuery): boolean {
    return this.MatchesQuery(Query);
  }

  MatchesQuery(Query: FGameplayTagQuery): boolean {
    return Query.Matches(this);
  }

  appendTags(Other: FGameplayTagContainer): void {
    this.AppendTags(Other);
  }

  AppendTags(Other: FGameplayTagContainer): void {
    for (const tag of Other.GameplayTags) {
      this.AddTag(tag);
    }
  }

  appendMatchingTags(OtherA: FGameplayTagContainer, OtherB: FGameplayTagContainer): void {
    this.AppendMatchingTags(OtherA, OtherB);
  }

  AppendMatchingTags(OtherA: FGameplayTagContainer, OtherB: FGameplayTagContainer): void {
    for (const tag of OtherA.GameplayTags) {
      if (tag.MatchesAny(OtherB)) {
        this.AddTag(tag);
      }
    }
  }

  addTag(TagToAdd: FGameplayTag): void {
    this.AddTag(TagToAdd);
  }

  AddTag(TagToAdd: FGameplayTag): void {
    if (!TagToAdd.IsValid() || this.HasTagExact(TagToAdd)) {
      return;
    }

    this.GameplayTags.push(TagToAdd);
    this.FillParentTags();
  }

  addTagFast(TagToAdd: FGameplayTag): void {
    this.AddTagFast(TagToAdd);
  }

  AddTagFast(TagToAdd: FGameplayTag): void {
    if (!TagToAdd.IsValid()) {
      return;
    }

    this.GameplayTags.push(TagToAdd);
    this.FillParentTags();
  }

  addLeafTag(TagToAdd: FGameplayTag): boolean {
    return this.AddLeafTag(TagToAdd);
  }

  AddLeafTag(TagToAdd: FGameplayTag): boolean {
    if (this.HasTagExact(TagToAdd)) {
      return true;
    }

    if (this.HasTag(TagToAdd)) {
      return false;
    }

    const parents: FGameplayTag[] = [];
    TagToAdd.ParseParentTags(parents);

    for (const parent of parents) {
      if (this.HasTagExact(parent)) {
        this.RemoveTag(parent);
      }
    }

    this.AddTag(TagToAdd);
    return true;
  }

  removeTag(TagToRemove: FGameplayTag, bDeferParentTags = false): boolean {
    return this.RemoveTag(TagToRemove, bDeferParentTags);
  }

  RemoveTag(TagToRemove: FGameplayTag, bDeferParentTags = false): boolean {
    const previousLength = this.GameplayTags.length;
    this.GameplayTags = this.GameplayTags.filter((tag) => !tagsEqual(tag, TagToRemove));
    const removed = this.GameplayTags.length !== previousLength;

    if (removed && !bDeferParentTags) {
      this.FillParentTags();
    }

    return removed;
  }

  removeTags(TagsToRemove: FGameplayTagContainer): void {
    this.RemoveTags(TagsToRemove);
  }

  RemoveTags(TagsToRemove: FGameplayTagContainer): void {
    for (const tag of TagsToRemove.GameplayTags) {
      this.RemoveTag(tag, true);
    }

    this.FillParentTags();
  }

  reset(Slack = 0): void {
    this.Reset(Slack);
  }

  Reset(_Slack = 0): void {
    this.GameplayTags = [];
    this.ParentTags = [];
  }

  ToString(): string {
    return this.ToStringSimple(true);
  }

  fromExportString(ExportString: string): void {
    this.FromExportString(ExportString);
  }

  FromExportString(ExportString: string): void {
    this.Reset();
    const matches = ExportString.match(/[A-Za-z0-9_ -]+(?:\.[A-Za-z0-9_ -]+)*/g) ?? [];

    for (const match of matches) {
      const tag = UGameplayTagsManager.Get().RequestGameplayTag(match, false);

      if (tag.IsValid()) {
        this.AddTag(tag);
      }
    }
  }

  toStringSimple(bQuoted = false): string {
    return this.ToStringSimple(bQuoted);
  }

  ToStringSimple(bQuoted = false): string {
    return this.GameplayTags.map((tag) => (bQuoted ? `"${tag.GetTagName()}"` : tag.GetTagName())).join(", ");
  }

  toStringsMaxLen(MaxLen: number): string[] {
    return this.ToStringsMaxLen(MaxLen);
  }

  ToStringsMaxLen(MaxLen: number): string[] {
    const chunks: string[] = [];
    let current = "";

    for (const tag of this.GameplayTags) {
      const next = current ? `${current}, ${tag.GetTagName()}` : tag.GetTagName();

      if (next.length > MaxLen && current) {
        chunks.push(current);
        current = tag.GetTagName();
      } else {
        current = next;
      }
    }

    if (current) {
      chunks.push(current);
    }

    return chunks;
  }

  getGameplayTagArray(): FGameplayTag[] {
    return this.GetGameplayTagArray();
  }

  GetGameplayTagArray(): FGameplayTag[] {
    return [...this.GameplayTags];
  }

  createConstIterator(): IterableIterator<FGameplayTag> {
    return this.CreateConstIterator();
  }

  CreateConstIterator(): IterableIterator<FGameplayTag> {
    return this[Symbol.iterator]();
  }

  isValidIndex(Index: number): boolean {
    return this.IsValidIndex(Index);
  }

  IsValidIndex(Index: number): boolean {
    return Number.isInteger(Index) && Index >= 0 && Index < this.GameplayTags.length;
  }

  getByIndex(Index: number): FGameplayTag {
    return this.GetByIndex(Index);
  }

  GetByIndex(Index: number): FGameplayTag {
    return this.IsValidIndex(Index) ? this.GameplayTags[Index] ?? new FGameplayTag() : new FGameplayTag();
  }

  first(): FGameplayTag {
    return this.First();
  }

  First(): FGameplayTag {
    return this.GameplayTags[0] ?? new FGameplayTag();
  }

  last(): FGameplayTag {
    return this.Last();
  }

  Last(): FGameplayTag {
    return this.GameplayTags.at(-1) ?? new FGameplayTag();
  }

  fillParentTags(): void {
    this.FillParentTags();
  }

  FillParentTags(): void {
    const parents: FGameplayTag[] = [];
    const manager = UGameplayTagsManager.Get();

    for (const tag of this.GameplayTags) {
      manager.ExtractParentTags(tag, parents);
    }

    this.ParentTags = uniqueTags(parents);
  }

  sort(): void {
    this.Sort();
  }

  Sort(): void {
    this.GameplayTags.sort(compareTagNames);
    this.FillParentTags();
  }

  toJSON(): string[] {
    return this.GameplayTags.map((tag) => tag.GetTagName());
  }

  [Symbol.iterator](): IterableIterator<FGameplayTag> {
    return this.GameplayTags[Symbol.iterator]();
  }

  private RemoveDuplicates(): void {
    this.GameplayTags = uniqueTags(this.GameplayTags);
    this.FillParentTags();
  }
}

export class FGameplayTagQueryExpression {
  ExprType = EGameplayTagQueryExprType.Undefined;
  ExprSet: FGameplayTagQueryExpression[] = [];
  TagSet: FGameplayTag[] = [];

  anyTagsMatch(): this {
    return this.AnyTagsMatch();
  }

  AnyTagsMatch(): this {
    this.ExprType = EGameplayTagQueryExprType.AnyTagsMatch;
    return this;
  }

  allTagsMatch(): this {
    return this.AllTagsMatch();
  }

  AllTagsMatch(): this {
    this.ExprType = EGameplayTagQueryExprType.AllTagsMatch;
    return this;
  }

  noTagsMatch(): this {
    return this.NoTagsMatch();
  }

  NoTagsMatch(): this {
    this.ExprType = EGameplayTagQueryExprType.NoTagsMatch;
    return this;
  }

  anyTagsExactMatch(): this {
    return this.AnyTagsExactMatch();
  }

  AnyTagsExactMatch(): this {
    this.ExprType = EGameplayTagQueryExprType.AnyTagsExactMatch;
    return this;
  }

  allTagsExactMatch(): this {
    return this.AllTagsExactMatch();
  }

  AllTagsExactMatch(): this {
    this.ExprType = EGameplayTagQueryExprType.AllTagsExactMatch;
    return this;
  }

  anyExprMatch(): this {
    return this.AnyExprMatch();
  }

  AnyExprMatch(): this {
    this.ExprType = EGameplayTagQueryExprType.AnyExprMatch;
    return this;
  }

  allExprMatch(): this {
    return this.AllExprMatch();
  }

  AllExprMatch(): this {
    this.ExprType = EGameplayTagQueryExprType.AllExprMatch;
    return this;
  }

  noExprMatch(): this {
    return this.NoExprMatch();
  }

  NoExprMatch(): this {
    this.ExprType = EGameplayTagQueryExprType.NoExprMatch;
    return this;
  }

  addTag(Tag: GameplayTagLike): this {
    return this.AddTag(Tag);
  }

  AddTag(Tag: GameplayTagLike): this {
    this.TagSet.push(ensureTag(Tag));
    return this;
  }

  addTags(Tags: FGameplayTagContainer): this {
    return this.AddTags(Tags);
  }

  AddTags(Tags: FGameplayTagContainer): this {
    this.TagSet.push(...Tags.GetGameplayTagArray());
    return this;
  }

  addExpr(Expr: FGameplayTagQueryExpression): this {
    return this.AddExpr(Expr);
  }

  AddExpr(Expr: FGameplayTagQueryExpression): this {
    this.ExprSet.push(Expr);
    return this;
  }

  usesTagSet(): boolean {
    return this.UsesTagSet();
  }

  UsesTagSet(): boolean {
    return [
      EGameplayTagQueryExprType.AnyTagsMatch,
      EGameplayTagQueryExprType.AllTagsMatch,
      EGameplayTagQueryExprType.NoTagsMatch,
      EGameplayTagQueryExprType.AnyTagsExactMatch,
      EGameplayTagQueryExprType.AllTagsExactMatch
    ].includes(this.ExprType);
  }

  usesExprSet(): boolean {
    return this.UsesExprSet();
  }

  UsesExprSet(): boolean {
    return [
      EGameplayTagQueryExprType.AnyExprMatch,
      EGameplayTagQueryExprType.AllExprMatch,
      EGameplayTagQueryExprType.NoExprMatch
    ].includes(this.ExprType);
  }
}

export class FGameplayTagQuery {
  static readonly EmptyQuery = new FGameplayTagQuery();
  static readonly emptyQuery = FGameplayTagQuery.EmptyQuery;

  static buildQuery(RootQueryExpr: FGameplayTagQueryExpression, InDescription = ""): FGameplayTagQuery {
    return FGameplayTagQuery.BuildQuery(RootQueryExpr, InDescription);
  }

  static BuildQuery(RootQueryExpr: FGameplayTagQueryExpression, InDescription = ""): FGameplayTagQuery {
    const query = new FGameplayTagQuery();
    query.Build(RootQueryExpr, InDescription);
    return query;
  }

  static makeQueryMatchAnyTags(InTags: FGameplayTagContainer): FGameplayTagQuery {
    return FGameplayTagQuery.MakeQuery_MatchAnyTags(InTags);
  }

  static MakeQuery_MatchAnyTags(InTags: FGameplayTagContainer): FGameplayTagQuery {
    return FGameplayTagQuery.BuildQuery(new FGameplayTagQueryExpression().AnyTagsMatch().AddTags(InTags));
  }

  static makeQueryMatchAllTags(InTags: FGameplayTagContainer): FGameplayTagQuery {
    return FGameplayTagQuery.MakeQuery_MatchAllTags(InTags);
  }

  static MakeQuery_MatchAllTags(InTags: FGameplayTagContainer): FGameplayTagQuery {
    return FGameplayTagQuery.BuildQuery(new FGameplayTagQueryExpression().AllTagsMatch().AddTags(InTags));
  }

  static makeQueryMatchNoTags(InTags: FGameplayTagContainer): FGameplayTagQuery {
    return FGameplayTagQuery.MakeQuery_MatchNoTags(InTags);
  }

  static MakeQuery_MatchNoTags(InTags: FGameplayTagContainer): FGameplayTagQuery {
    return FGameplayTagQuery.BuildQuery(new FGameplayTagQueryExpression().NoTagsMatch().AddTags(InTags));
  }

  static makeQueryExactMatchAnyTags(InTags: FGameplayTagContainer): FGameplayTagQuery {
    return FGameplayTagQuery.MakeQuery_ExactMatchAnyTags(InTags);
  }

  static MakeQuery_ExactMatchAnyTags(InTags: FGameplayTagContainer): FGameplayTagQuery {
    return FGameplayTagQuery.BuildQuery(new FGameplayTagQueryExpression().AnyTagsExactMatch().AddTags(InTags));
  }

  static makeQueryExactMatchAllTags(InTags: FGameplayTagContainer): FGameplayTagQuery {
    return FGameplayTagQuery.MakeQuery_ExactMatchAllTags(InTags);
  }

  static MakeQuery_ExactMatchAllTags(InTags: FGameplayTagContainer): FGameplayTagQuery {
    return FGameplayTagQuery.BuildQuery(new FGameplayTagQueryExpression().AllTagsExactMatch().AddTags(InTags));
  }

  static makeQueryMatchTag(InTag: FGameplayTag): FGameplayTagQuery {
    return FGameplayTagQuery.MakeQuery_MatchTag(InTag);
  }

  static MakeQuery_MatchTag(InTag: FGameplayTag): FGameplayTagQuery {
    return FGameplayTagQuery.BuildQuery(new FGameplayTagQueryExpression().AllTagsMatch().AddTag(InTag));
  }

  private RootExpression: FGameplayTagQueryExpression | undefined;
  private TagDictionary: FGameplayTag[] = [];
  private UserDescription = "";
  private AutoDescription = "";

  replaceTagsFast(Tags: FGameplayTagContainer): void {
    this.ReplaceTagsFast(Tags);
  }

  ReplaceTagsFast(Tags: FGameplayTagContainer): void {
    const replacements = Tags.GetGameplayTagArray();

    if (replacements.length !== this.TagDictionary.length) {
      throw new Error("ReplaceTagsFast requires the same number of tags as the current query dictionary.");
    }

    this.TagDictionary = replacements;

    if (this.RootExpression) {
      this.RootExpression = replaceExpressionTags(this.RootExpression, replacements);
    }
  }

  replaceTagFast(Tag: FGameplayTag): void {
    this.ReplaceTagFast(Tag);
  }

  ReplaceTagFast(Tag: FGameplayTag): void {
    if (this.TagDictionary.length !== 1) {
      throw new Error("ReplaceTagFast requires a query dictionary with exactly one tag.");
    }

    this.ReplaceTagsFast(new FGameplayTagContainer(Tag));
  }

  matches(Tags: FGameplayTagContainer): boolean {
    return this.Matches(Tags);
  }

  Matches(Tags: FGameplayTagContainer): boolean {
    if (this.IsEmpty() || !this.RootExpression) {
      return false;
    }

    return this.EvaluateExpression(this.RootExpression, Tags);
  }

  isEmpty(): boolean {
    return this.IsEmpty();
  }

  IsEmpty(): boolean {
    return !this.RootExpression;
  }

  clear(): void {
    this.Clear();
  }

  Clear(): void {
    this.RootExpression = undefined;
    this.TagDictionary = [];
    this.UserDescription = "";
    this.AutoDescription = "";
  }

  build(RootQueryExpr: FGameplayTagQueryExpression, InUserDescription = ""): void {
    this.Build(RootQueryExpr, InUserDescription);
  }

  Build(RootQueryExpr: FGameplayTagQueryExpression, InUserDescription = ""): void {
    this.RootExpression = cloneExpression(RootQueryExpr);
    this.UserDescription = InUserDescription;
    this.AutoDescription = this.BuildAutoDescription(this.RootExpression);
    this.TagDictionary = [];
    collectExpressionTags(this.RootExpression, this.TagDictionary);
  }

  getQueryExpr(OutExpr?: FGameplayTagQueryExpression): FGameplayTagQueryExpression {
    return this.GetQueryExpr(OutExpr);
  }

  GetQueryExpr(OutExpr?: FGameplayTagQueryExpression): FGameplayTagQueryExpression {
    const expression = this.RootExpression ? cloneExpression(this.RootExpression) : new FGameplayTagQueryExpression();

    if (OutExpr) {
      OutExpr.ExprType = expression.ExprType;
      OutExpr.ExprSet = expression.ExprSet;
      OutExpr.TagSet = expression.TagSet;
      return OutExpr;
    }

    return expression;
  }

  setUserDescription(InUserDescription: string): void {
    this.SetUserDescription(InUserDescription);
  }

  SetUserDescription(InUserDescription: string): void {
    this.UserDescription = InUserDescription;
  }

  getDescription(): string {
    return this.GetDescription();
  }

  GetDescription(): string {
    return this.UserDescription || this.AutoDescription;
  }

  getGameplayTagArray(): FGameplayTag[] {
    return this.GetGameplayTagArray();
  }

  GetGameplayTagArray(): FGameplayTag[] {
    return [...this.TagDictionary];
  }

  toJSON(): unknown {
    return {
      description: this.GetDescription(),
      tags: this.TagDictionary.map((tag) => tag.GetTagName()),
      expression: this.RootExpression ? this.ExpressionToJSON(this.RootExpression) : null
    };
  }

  private EvaluateExpression(expression: FGameplayTagQueryExpression, tags: FGameplayTagContainer): boolean {
    switch (expression.ExprType) {
      case EGameplayTagQueryExprType.AnyTagsMatch:
        return expression.TagSet.some((tag) => tags.HasTag(tag));
      case EGameplayTagQueryExprType.AllTagsMatch:
        return expression.TagSet.every((tag) => tags.HasTag(tag));
      case EGameplayTagQueryExprType.NoTagsMatch:
        return expression.TagSet.every((tag) => !tags.HasTag(tag));
      case EGameplayTagQueryExprType.AnyTagsExactMatch:
        return expression.TagSet.some((tag) => tags.HasTagExact(tag));
      case EGameplayTagQueryExprType.AllTagsExactMatch:
        return expression.TagSet.every((tag) => tags.HasTagExact(tag));
      case EGameplayTagQueryExprType.AnyExprMatch:
        return expression.ExprSet.some((expr) => this.EvaluateExpression(expr, tags));
      case EGameplayTagQueryExprType.AllExprMatch:
        return expression.ExprSet.every((expr) => this.EvaluateExpression(expr, tags));
      case EGameplayTagQueryExprType.NoExprMatch:
        return expression.ExprSet.every((expr) => !this.EvaluateExpression(expr, tags));
      case EGameplayTagQueryExprType.Undefined:
        return false;
      default:
        return false;
    }
  }

  private BuildAutoDescription(expression: FGameplayTagQueryExpression): string {
    if (expression.UsesTagSet()) {
      return `${expression.ExprType}(${expression.TagSet.map((tag) => tag.GetTagName()).join(", ")})`;
    }

    if (expression.UsesExprSet()) {
      return `${expression.ExprType}(${expression.ExprSet.map((expr) => this.BuildAutoDescription(expr)).join(", ")})`;
    }

    return EGameplayTagQueryExprType.Undefined;
  }

  private ExpressionToJSON(expression: FGameplayTagQueryExpression): unknown {
    return {
      type: expression.ExprType,
      tags: expression.TagSet.map((tag) => tag.GetTagName()),
      expressions: expression.ExprSet.map((expr) => this.ExpressionToJSON(expr))
    };
  }
}

export class UGameplayTagsManager {
  private static SingletonManager: UGameplayTagsManager | undefined;

  static get(): UGameplayTagsManager {
    return UGameplayTagsManager.Get();
  }

  static Get(): UGameplayTagsManager {
    UGameplayTagsManager.SingletonManager ??= new UGameplayTagsManager();
    return UGameplayTagsManager.SingletonManager;
  }

  static getIfAllocated(): UGameplayTagsManager | undefined {
    return UGameplayTagsManager.GetIfAllocated();
  }

  static GetIfAllocated(): UGameplayTagsManager | undefined {
    return UGameplayTagsManager.SingletonManager;
  }

  private readonly nodes = new Map<string, GameplayTagNode>();
  private readonly redirects = new Map<string, FGameplayTagRedirect>();
  InvalidTagCharacters = DEFAULT_INVALID_TAG_CHARACTERS;

  get invalidTagCharacters(): string {
    return this.InvalidTagCharacters;
  }

  set invalidTagCharacters(value: string) {
    this.InvalidTagCharacters = value;
  }

  requestGameplayTagContainer(TagStrings: readonly string[], OutTagsContainer?: FGameplayTagContainer, bErrorIfNotFound = true): FGameplayTagContainer {
    return this.RequestGameplayTagContainer(TagStrings, OutTagsContainer, bErrorIfNotFound);
  }

  RequestGameplayTagContainer(TagStrings: readonly string[], OutTagsContainer?: FGameplayTagContainer, bErrorIfNotFound = true): FGameplayTagContainer {
    const container = OutTagsContainer ?? new FGameplayTagContainer();

    for (const tagString of TagStrings) {
      const tag = this.RequestGameplayTag(tagString, bErrorIfNotFound);

      if (tag.IsValid()) {
        container.AddTag(tag);
      }
    }

    return container;
  }

  requestGameplayTag(TagName: string, ErrorIfNotFound = true): FGameplayTag {
    return this.RequestGameplayTag(TagName, ErrorIfNotFound);
  }

  RequestGameplayTag(TagName: string, ErrorIfNotFound = true): FGameplayTag {
    const node = this.nodes.get(keyForTagName(this.ResolveRedirectedTagName(TagName)));

    if (node) {
      return node.tag;
    }

    if (ErrorIfNotFound) {
      throw new Error(`Gameplay tag "${TagName}" was not found.`);
    }

    return new FGameplayTag();
  }

  isValidGameplayTagString(TagString: string): boolean {
    return this.IsValidGameplayTagString(TagString);
  }

  IsValidGameplayTagString(TagString: string): boolean {
    return this.ValidateGameplayTagString(TagString).isValid;
  }

  validateGameplayTagString(TagString: string): GameplayTagValidationResult {
    return this.ValidateGameplayTagString(TagString);
  }

  ValidateGameplayTagString(TagString: string): GameplayTagValidationResult {
    const errors: string[] = [];
    let fixedString = TagString;

    if (fixedString.length === 0) {
      errors.push("Tag may not be empty");
    }

    const trimmedPrefix = fixedString.replace(/^[. ]+/, "");

    if (trimmedPrefix.length !== fixedString.length) {
      const removed = fixedString.slice(0, fixedString.length - trimmedPrefix.length);

      if (removed.includes(".")) {
        errors.push("Tag may not begin with a period");
      }

      if (removed.includes(" ")) {
        errors.push("Tag may not begin with a space");
      }

      fixedString = trimmedPrefix;
    }

    const trimmedSuffix = fixedString.replace(/[. ]+$/, "");

    if (trimmedSuffix.length !== fixedString.length) {
      const removed = fixedString.slice(trimmedSuffix.length);

      if (removed.includes(".")) {
        errors.push("Tag may not end with a period");
      }

      if (removed.includes(" ")) {
        errors.push("Tag may not end with a space");
      }

      fixedString = trimmedSuffix;
    }

    if (fixedString.includes("..")) {
      errors.push("Tag may not contain empty segments");
      fixedString = fixedString.replace(/\.+/g, ".");
    }

    const invalidCharacterSet = new Set([...this.InvalidTagCharacters]);
    let replaced = "";

    for (const character of fixedString) {
      if (invalidCharacterSet.has(character)) {
        errors.push(`Tag may not contain "${character}"`);
        replaced += "_";
      } else {
        replaced += character;
      }
    }

    fixedString = replaced;

    return {
      isValid: errors.length === 0,
      error: [...new Set(errors)].join(", "),
      fixedString
    };
  }

  findGameplayTagFromPartialStringSlow(PartialString: string): FGameplayTag {
    return this.FindGameplayTagFromPartialString_Slow(PartialString);
  }

  FindGameplayTagFromPartialString_Slow(PartialString: string): FGameplayTag {
    const partial = keyForTagName(PartialString);
    const exact = this.nodes.get(partial);

    if (exact) {
      return exact.tag;
    }

    const nodes = [...this.nodes.values()].sort((left, right) => left.fullName.localeCompare(right.fullName, "en-US"));
    const startsWith = nodes.find((node) => node.key.startsWith(`${partial}.`) || node.key.startsWith(partial));

    if (startsWith) {
      return startsWith.tag;
    }

    return nodes.find((node) => node.key.includes(partial))?.tag ?? new FGameplayTag();
  }

  addNativeGameplayTag(TagName: string, TagDevComment = "(Native)"): FGameplayTag {
    return this.AddNativeGameplayTag(TagName, TagDevComment);
  }

  AddNativeGameplayTag(TagName: string, TagDevComment = "(Native)"): FGameplayTag {
    const validation = this.ValidateGameplayTagString(TagName);

    if (!validation.isValid) {
      throw new Error(`Invalid gameplay tag "${TagName}": ${validation.error}`);
    }

    return this.AddNodePath(validation.fixedString, true, TagDevComment, false, false, "Native", EGameplayTagSourceType.Native);
  }

  doneAddingNativeTags(): void {
    this.DoneAddingNativeTags();
  }

  DoneAddingNativeTags(): void {}

  requestGameplayTagParents(GameplayTag: FGameplayTag): FGameplayTagContainer {
    return this.RequestGameplayTagParents(GameplayTag);
  }

  RequestGameplayTagParents(GameplayTag: FGameplayTag): FGameplayTagContainer {
    const container = new FGameplayTagContainer();

    if (!GameplayTag.IsValid()) {
      return container;
    }

    container.AddTag(GameplayTag);

    for (const parent of parentNames(GameplayTag.GetTagName())) {
      const tag = this.RequestGameplayTag(parent, false);
      container.AddTag(tag.IsValid() ? tag : new FGameplayTag(parent));
    }

    return container;
  }

  extractParentTags(GameplayTag: FGameplayTag, UniqueParentTags: FGameplayTag[]): boolean {
    return this.ExtractParentTags(GameplayTag, UniqueParentTags);
  }

  ExtractParentTags(GameplayTag: FGameplayTag, UniqueParentTags: FGameplayTag[]): boolean {
    const previousLength = UniqueParentTags.length;

    for (const parent of parentNames(GameplayTag.GetTagName())) {
      const tag = this.RequestGameplayTag(parent, false);
      const parentTag = tag.IsValid() ? tag : new FGameplayTag(parent);

      if (!UniqueParentTags.some((existing) => tagsEqual(existing, parentTag))) {
        UniqueParentTags.push(parentTag);
      }
    }

    return UniqueParentTags.length !== previousLength;
  }

  requestGameplayTagChildren(GameplayTag: FGameplayTag): FGameplayTagContainer {
    return this.RequestGameplayTagChildren(GameplayTag);
  }

  RequestGameplayTagChildren(GameplayTag: FGameplayTag): FGameplayTagContainer {
    const container = new FGameplayTagContainer();
    const node = this.nodes.get(GameplayTag.GetTagKey());

    if (!node) {
      return container;
    }

    const visit = (current: GameplayTagNode): void => {
      for (const childKey of current.children) {
        const child = this.nodes.get(childKey);

        if (!child) {
          continue;
        }

        container.AddTagFast(child.tag);
        visit(child);
      }
    };

    visit(node);
    return container;
  }

  requestGameplayTagDirectParent(GameplayTag: FGameplayTag): FGameplayTag {
    return this.RequestGameplayTagDirectParent(GameplayTag);
  }

  RequestGameplayTagDirectParent(GameplayTag: FGameplayTag): FGameplayTag {
    const node = this.nodes.get(GameplayTag.GetTagKey());

    if (node?.parentKey) {
      return this.nodes.get(node.parentKey)?.tag ?? new FGameplayTag();
    }

    const parent = parentNames(GameplayTag.GetTagName())[0];
    return parent ? this.RequestGameplayTag(parent, false) : new FGameplayTag();
  }

  requestAllGameplayTags(TagContainer: FGameplayTagContainer, OnlyIncludeDictionaryTags: boolean): void {
    this.RequestAllGameplayTags(TagContainer, OnlyIncludeDictionaryTags);
  }

  RequestAllGameplayTags(TagContainer: FGameplayTagContainer, OnlyIncludeDictionaryTags: boolean): void {
    for (const node of [...this.nodes.values()].sort((left, right) => left.fullName.localeCompare(right.fullName, "en-US"))) {
      if (!OnlyIncludeDictionaryTags || node.explicit) {
        TagContainer.AddTagFast(node.tag);
      }
    }
  }

  isDictionaryTag(TagName: string): boolean {
    return this.IsDictionaryTag(TagName);
  }

  IsDictionaryTag(TagName: string): boolean {
    return Boolean(this.nodes.get(keyForTagName(TagName))?.explicit);
  }

  getTagEditorData(TagName: string): GameplayTagEditorData | undefined {
    return this.GetTagEditorData(TagName);
  }

  GetTagEditorData(TagName: string): GameplayTagEditorData | undefined {
    const node = this.nodes.get(keyForTagName(TagName));

    if (!node) {
      return undefined;
    }

    const tagSources = [...node.sources.keys()].map((source) => source.split(":").slice(1).join(":"));
    const sourceTypes = [...node.sources.values()];

    return {
      comment: node.devComment,
      firstTagSource: tagSources[0] ?? "",
      tagSources,
      sourceTypes,
      isTagExplicit: node.explicit,
      isRestrictedTag: node.restricted,
      allowNonRestrictedChildren: node.allowNonRestrictedChildren
    };
  }

  exportGameplayTagDictionary(options: GameplayTagDictionaryExportOptions = {}): GameplayTagDictionaryExport {
    return this.ExportGameplayTagDictionary(options);
  }

  ExportGameplayTagDictionary(options: GameplayTagDictionaryExportOptions = {}): GameplayTagDictionaryExport {
    const onlyIncludeDictionaryTags = options.onlyIncludeDictionaryTags ?? true;
    const gameplayTagList: FGameplayTagTableRow[] = [];
    const restrictedGameplayTagList: FRestrictedGameplayTagTableRow[] = [];
    const entries: GameplayTagDictionaryEntry[] = [];

    for (const node of [...this.nodes.values()].sort((left, right) => left.fullName.localeCompare(right.fullName, "en-US"))) {
      if (node.explicit) {
        if (node.restricted) {
          restrictedGameplayTagList.push({
            Tag: node.fullName,
            DevComment: node.devComment,
            bAllowNonRestrictedChildren: node.allowNonRestrictedChildren
          });
        } else {
          gameplayTagList.push({
            Tag: node.fullName,
            DevComment: node.devComment
          });
        }
      }

      if (!onlyIncludeDictionaryTags || node.explicit) {
        const editorData = this.GetTagEditorData(node.fullName);
        const entry: GameplayTagDictionaryEntry = {
          tag: node.fullName,
          devComment: node.devComment,
          isExplicit: node.explicit,
          isRestricted: node.restricted,
          allowNonRestrictedChildren: node.allowNonRestrictedChildren
        };

        if (editorData?.firstTagSource) {
          entry.sourceName = editorData.firstTagSource;
        }

        if (editorData?.sourceTypes[0]) {
          entry.sourceType = editorData.sourceTypes[0];
        }

        entries.push(entry);
      }
    }

    return {
      gameplayTagList,
      restrictedGameplayTagList,
      gameplayTagRedirects: options.includeRedirects === false ? [] : this.GetGameplayTagRedirects(),
      entries
    };
  }

  importGameplayTagDictionary(input: GameplayTagDictionaryInput, options: GameplayTagDictionaryImportOptions = {}): GameplayTagDictionaryImportResult {
    return this.ImportGameplayTagDictionary(input, options);
  }

  ImportGameplayTagDictionary(input: GameplayTagDictionaryInput, options: GameplayTagDictionaryImportOptions = {}): GameplayTagDictionaryImportResult {
    const normalized = normalizeGameplayTagDictionary(input);
    const diagnostics = this.ValidateGameplayTagDictionary(input).diagnostics;
    const importedTags = new FGameplayTagContainer();
    const sourceName = options.sourceName ?? DEFAULT_SOURCE_NAME;
    const sourceType = options.sourceType ?? EGameplayTagSourceType.DataTable;
    const restrictedSourceName = options.restrictedSourceName ?? DEFAULT_RESTRICTED_SOURCE_NAME;

    const normalizeForImport = (row: FGameplayTagTableRow, index: number): string | undefined => {
      const validation = this.ValidateGameplayTagString(row.Tag);

      if (validation.isValid) {
        return validation.fixedString;
      }

      if (options.repairInvalidTags && validation.fixedString) {
        diagnostics.push({
          level: "warning",
          code: "tag-repaired",
          message: `Imported repaired tag "${validation.fixedString}".`,
          tag: row.Tag,
          index
        });
        return validation.fixedString;
      }

      return undefined;
    };

    normalized.gameplayTagList.forEach((row, index) => {
      const tagName = normalizeForImport(row, index);

      if (!tagName) {
        return;
      }

      importedTags.AddTag(this.AddNodePath(tagName, true, row.DevComment ?? "", false, false, sourceName, sourceType));
    });

    normalized.restrictedGameplayTagList.forEach((row, index) => {
      const tagName = normalizeForImport(row, normalized.gameplayTagList.length + index);

      if (!tagName) {
        return;
      }

      importedTags.AddTag(this.AddNodePath(
        tagName,
        true,
        row.DevComment ?? "",
        true,
        parseBoolean(row.bAllowNonRestrictedChildren),
        restrictedSourceName,
        EGameplayTagSourceType.RestrictedTagList
      ));
    });

    for (const redirect of normalized.gameplayTagRedirects) {
      if (redirect.OldTagName && redirect.NewTagName) {
        this.AddGameplayTagRedirect(redirect);
      }
    }

    return {
      importedTags,
      gameplayTagList: normalized.gameplayTagList,
      restrictedGameplayTagList: normalized.restrictedGameplayTagList,
      gameplayTagRedirects: normalized.gameplayTagRedirects,
      diagnostics
    };
  }

  validateGameplayTagDictionary(input: GameplayTagDictionaryInput): GameplayTagDictionaryValidationResult {
    return this.ValidateGameplayTagDictionary(input);
  }

  ValidateGameplayTagDictionary(input: GameplayTagDictionaryInput): GameplayTagDictionaryValidationResult {
    const normalized = normalizeGameplayTagDictionary(input);
    const diagnostics: GameplayTagDictionaryDiagnostic[] = [];
    const seenTags = new Map<string, number>();
    const availableTags = new Set<string>(this.nodes.keys());
    const allRows = [...normalized.gameplayTagList, ...normalized.restrictedGameplayTagList];

    allRows.forEach((row, index) => {
      const tag = normalizeTagName(row.Tag);

      if (!tag) {
        diagnostics.push({
          level: "error",
          code: "tag-empty",
          message: "Tag may not be empty.",
          index
        });
        return;
      }

      const validation = this.ValidateGameplayTagString(tag);

      if (!validation.isValid) {
        diagnostics.push({
          level: "error",
          code: "tag-invalid",
          message: validation.error,
          tag,
          index
        });
      }

      const key = keyForTagName(validation.fixedString || tag);
      const firstIndex = seenTags.get(key);

      if (firstIndex !== undefined) {
        diagnostics.push({
          level: "warning",
          code: "tag-duplicate",
          message: `Duplicate tag also appears at row ${firstIndex + 1}.`,
          tag,
          index
        });
      } else {
        seenTags.set(key, index);
      }

      availableTags.add(key);
    });

    normalized.gameplayTagRedirects.forEach((redirect, index) => {
      const oldTagName = normalizeTagName(redirect.OldTagName);
      const newTagName = normalizeTagName(redirect.NewTagName);

      if (!oldTagName || !newTagName) {
        diagnostics.push({
          level: "error",
          code: "redirect-empty",
          message: "Redirects require both OldTagName and NewTagName.",
          index
        });
        return;
      }

      if (keyForTagName(oldTagName) === keyForTagName(newTagName)) {
        diagnostics.push({
          level: "error",
          code: "redirect-loop",
          message: "Redirect old and new tag names must be different.",
          tag: oldTagName,
          index
        });
      }

      const newValidation = this.ValidateGameplayTagString(newTagName);

      if (!newValidation.isValid) {
        diagnostics.push({
          level: "error",
          code: "redirect-target-invalid",
          message: newValidation.error,
          tag: newTagName,
          index
        });
      }

      if (!availableTags.has(keyForTagName(newValidation.fixedString || newTagName))) {
        diagnostics.push({
          level: "warning",
          code: "redirect-target-missing",
          message: "Redirect target is not currently in the dictionary.",
          tag: newTagName,
          index
        });
      }
    });

    return {
      isValid: diagnostics.every((diagnostic) => diagnostic.level !== "error"),
      diagnostics
    };
  }

  importGameplayTagTableRows(TagRows: readonly FGameplayTagTableRow[], SourceName = DEFAULT_SOURCE_NAME): GameplayTagDictionaryImportResult {
    return this.ImportGameplayTagTableRows(TagRows, SourceName);
  }

  ImportGameplayTagTableRows(TagRows: readonly FGameplayTagTableRow[], SourceName = DEFAULT_SOURCE_NAME): GameplayTagDictionaryImportResult {
    return this.ImportGameplayTagDictionary({ gameplayTagList: TagRows }, {
      sourceName: SourceName,
      sourceType: EGameplayTagSourceType.DataTable
    });
  }

  importRestrictedGameplayTagTableRows(TagRows: readonly FRestrictedGameplayTagTableRow[], SourceName = DEFAULT_RESTRICTED_SOURCE_NAME): GameplayTagDictionaryImportResult {
    return this.ImportRestrictedGameplayTagTableRows(TagRows, SourceName);
  }

  ImportRestrictedGameplayTagTableRows(TagRows: readonly FRestrictedGameplayTagTableRow[], SourceName = DEFAULT_RESTRICTED_SOURCE_NAME): GameplayTagDictionaryImportResult {
    return this.ImportGameplayTagDictionary({ restrictedGameplayTagList: TagRows }, {
      restrictedSourceName: SourceName
    });
  }

  exportGameplayTagTableRows(): FGameplayTagTableRow[] {
    return this.ExportGameplayTagTableRows();
  }

  ExportGameplayTagTableRows(): FGameplayTagTableRow[] {
    return this.ExportGameplayTagDictionary().gameplayTagList;
  }

  exportRestrictedGameplayTagTableRows(): FRestrictedGameplayTagTableRow[] {
    return this.ExportRestrictedGameplayTagTableRows();
  }

  ExportRestrictedGameplayTagTableRows(): FRestrictedGameplayTagTableRow[] {
    return this.ExportGameplayTagDictionary().restrictedGameplayTagList;
  }

  addGameplayTagRedirect(Redirect: FGameplayTagRedirect): void {
    this.AddGameplayTagRedirect(Redirect);
  }

  AddGameplayTagRedirect(Redirect: FGameplayTagRedirect): void {
    const normalized = normalizeRedirect(Redirect);

    if (!normalized.OldTagName || !normalized.NewTagName) {
      return;
    }

    this.redirects.set(keyForTagName(normalized.OldTagName), normalized);
  }

  getGameplayTagRedirects(): FGameplayTagRedirect[] {
    return this.GetGameplayTagRedirects();
  }

  GetGameplayTagRedirects(): FGameplayTagRedirect[] {
    return [...this.redirects.values()].sort((left, right) => left.OldTagName.localeCompare(right.OldTagName, "en-US"));
  }

  redirectGameplayTagName(TagName: string): string {
    return this.RedirectGameplayTagName(TagName);
  }

  RedirectGameplayTagName(TagName: string): string {
    return this.ResolveRedirectedTagName(TagName);
  }

  validateTagCreation(TagName: string): boolean {
    return this.ValidateTagCreation(TagName);
  }

  ValidateTagCreation(TagName: string): boolean {
    return this.IsDictionaryTag(TagName);
  }

  splitGameplayTagFName(Tag: FGameplayTag): string[] {
    return this.SplitGameplayTagFName(Tag);
  }

  SplitGameplayTagFName(Tag: FGameplayTag): string[] {
    return splitTagName(Tag.GetTagName());
  }

  addTagTableRow(TagRow: GameplayTagTableRow, SourceName = "Default", bIsRestrictedTag = false): void {
    this.AddTagTableRow(TagRow, SourceName, bIsRestrictedTag);
  }

  AddTagTableRow(TagRow: GameplayTagTableRow, SourceName = DEFAULT_SOURCE_NAME, bIsRestrictedTag = false): void {
    this.AddNodePath(
      TagRow.Tag,
      true,
      TagRow.DevComment ?? "",
      bIsRestrictedTag,
      false,
      SourceName,
      bIsRestrictedTag ? EGameplayTagSourceType.RestrictedTagList : EGameplayTagSourceType.DataTable
    );
  }

  addTags(TagNames: readonly string[]): FGameplayTagContainer {
    return this.AddTags(TagNames);
  }

  AddTags(TagNames: readonly string[]): FGameplayTagContainer {
    const container = new FGameplayTagContainer();

    for (const tagName of TagNames) {
      container.AddTag(this.AddNativeGameplayTag(tagName));
    }

    return container;
  }

  requestGameplayTagChildrenInDictionary(GameplayTag: FGameplayTag): FGameplayTagContainer {
    return this.RequestGameplayTagChildrenInDictionary(GameplayTag);
  }

  RequestGameplayTagChildrenInDictionary(GameplayTag: FGameplayTag): FGameplayTagContainer {
    const children = this.RequestGameplayTagChildren(GameplayTag);
    const filtered = new FGameplayTagContainer();

    for (const child of children) {
      const node = this.nodes.get(child.GetTagKey());

      if (node?.explicit) {
        filtered.AddTagFast(child);
      }
    }

    return filtered;
  }

  reset(): void {
    this.Reset();
  }

  Reset(): void {
    this.nodes.clear();
    this.redirects.clear();
  }

  private ResolveRedirectedTagName(TagName: string): string {
    let current = normalizeTagName(TagName);
    const visited = new Set<string>();

    for (let depth = 0; depth < 32; depth += 1) {
      const key = keyForTagName(current);
      const redirect = this.redirects.get(key);

      if (!redirect || visited.has(key)) {
        return current;
      }

      visited.add(key);
      current = redirect.NewTagName;
    }

    return current;
  }

  private AddNodePath(
    fullName: string,
    explicit: boolean,
    devComment: string,
    restricted: boolean,
    allowNonRestrictedChildren: boolean,
    sourceName: string,
    sourceType: EGameplayTagSourceType
  ): FGameplayTag {
    const parts = splitTagName(fullName);
    let parentKey = "";
    let currentTag = new FGameplayTag();

    for (let index = 0; index < parts.length; index += 1) {
      const name = parts.slice(0, index + 1).join(".");
      const key = keyForTagName(name);
      const isLeaf = index === parts.length - 1;
      let node = this.nodes.get(key);

      if (!node) {
        node = {
          tag: new FGameplayTag(name),
          fullName: name,
          simpleName: parts[index] ?? name,
          key,
          parentKey,
          children: new Set<string>(),
          explicit: isLeaf ? explicit : false,
          devComment: isLeaf ? devComment : "",
          restricted: isLeaf ? restricted : false,
          allowNonRestrictedChildren: isLeaf ? allowNonRestrictedChildren : true,
          sources: new Map([[sourceKeyForName(sourceName, sourceType), sourceType]])
        };
        this.nodes.set(key, node);

        if (parentKey) {
          this.nodes.get(parentKey)?.children.add(key);
        }
      } else if (isLeaf && explicit) {
        node.explicit = true;
        node.devComment = devComment;
        node.restricted = restricted;
        node.allowNonRestrictedChildren = allowNonRestrictedChildren;
        node.sources.set(sourceKeyForName(sourceName, sourceType), sourceType);
      } else {
        node.sources.set(sourceKeyForName(sourceName, sourceType), sourceType);
      }

      parentKey = key;
      currentTag = node.tag;
    }

    return currentTag;
  }
}

export class UBlueprintGameplayTagLibrary {
  static matchesTag(TagOne: FGameplayTag, TagTwo: FGameplayTag, bExactMatch: boolean): boolean {
    return UBlueprintGameplayTagLibrary.MatchesTag(TagOne, TagTwo, bExactMatch);
  }

  static MatchesTag(TagOne: FGameplayTag, TagTwo: FGameplayTag, bExactMatch: boolean): boolean {
    return bExactMatch ? TagOne.MatchesTagExact(TagTwo) : TagOne.MatchesTag(TagTwo);
  }

  static matchesAnyTags(TagOne: FGameplayTag, OtherContainer: FGameplayTagContainer, bExactMatch: boolean): boolean {
    return UBlueprintGameplayTagLibrary.MatchesAnyTags(TagOne, OtherContainer, bExactMatch);
  }

  static MatchesAnyTags(TagOne: FGameplayTag, OtherContainer: FGameplayTagContainer, bExactMatch: boolean): boolean {
    return bExactMatch ? TagOne.MatchesAnyExact(OtherContainer) : TagOne.MatchesAny(OtherContainer);
  }

  static equalEqualGameplayTag(A: FGameplayTag, B: FGameplayTag): boolean {
    return UBlueprintGameplayTagLibrary.EqualEqual_GameplayTag(A, B);
  }

  static EqualEqual_GameplayTag(A: FGameplayTag, B: FGameplayTag): boolean {
    return A.Equals(B);
  }

  static notEqualGameplayTag(A: FGameplayTag, B: FGameplayTag): boolean {
    return UBlueprintGameplayTagLibrary.NotEqual_GameplayTag(A, B);
  }

  static NotEqual_GameplayTag(A: FGameplayTag, B: FGameplayTag): boolean {
    return !A.Equals(B);
  }

  static isGameplayTagValid(GameplayTag: FGameplayTag): boolean {
    return UBlueprintGameplayTagLibrary.IsGameplayTagValid(GameplayTag);
  }

  static IsGameplayTagValid(GameplayTag: FGameplayTag): boolean {
    return GameplayTag.IsValid();
  }

  static getTagName(GameplayTag: FGameplayTag): string {
    return UBlueprintGameplayTagLibrary.GetTagName(GameplayTag);
  }

  static GetTagName(GameplayTag: FGameplayTag): string {
    return GameplayTag.GetTagName();
  }

  static makeLiteralGameplayTag(Value: FGameplayTag): FGameplayTag {
    return UBlueprintGameplayTagLibrary.MakeLiteralGameplayTag(Value);
  }

  static MakeLiteralGameplayTag(Value: FGameplayTag): FGameplayTag {
    return Value;
  }

  static getNumGameplayTagsInContainer(TagContainer: FGameplayTagContainer): number {
    return UBlueprintGameplayTagLibrary.GetNumGameplayTagsInContainer(TagContainer);
  }

  static GetNumGameplayTagsInContainer(TagContainer: FGameplayTagContainer): number {
    return TagContainer.Num();
  }

  static hasTag(TagContainer: FGameplayTagContainer, Tag: FGameplayTag, bExactMatch: boolean): boolean {
    return UBlueprintGameplayTagLibrary.HasTag(TagContainer, Tag, bExactMatch);
  }

  static HasTag(TagContainer: FGameplayTagContainer, Tag: FGameplayTag, bExactMatch: boolean): boolean {
    return bExactMatch ? TagContainer.HasTagExact(Tag) : TagContainer.HasTag(Tag);
  }

  static hasAnyTags(TagContainer: FGameplayTagContainer, OtherContainer: FGameplayTagContainer, bExactMatch: boolean): boolean {
    return UBlueprintGameplayTagLibrary.HasAnyTags(TagContainer, OtherContainer, bExactMatch);
  }

  static HasAnyTags(TagContainer: FGameplayTagContainer, OtherContainer: FGameplayTagContainer, bExactMatch: boolean): boolean {
    return bExactMatch ? TagContainer.HasAnyExact(OtherContainer) : TagContainer.HasAny(OtherContainer);
  }

  static hasAllTags(TagContainer: FGameplayTagContainer, OtherContainer: FGameplayTagContainer, bExactMatch: boolean): boolean {
    return UBlueprintGameplayTagLibrary.HasAllTags(TagContainer, OtherContainer, bExactMatch);
  }

  static HasAllTags(TagContainer: FGameplayTagContainer, OtherContainer: FGameplayTagContainer, bExactMatch: boolean): boolean {
    return bExactMatch ? TagContainer.HasAllExact(OtherContainer) : TagContainer.HasAll(OtherContainer);
  }

  static filter(TagContainer: FGameplayTagContainer, OtherContainer: FGameplayTagContainer, bExactMatch: boolean): FGameplayTagContainer {
    return UBlueprintGameplayTagLibrary.Filter(TagContainer, OtherContainer, bExactMatch);
  }

  static Filter(TagContainer: FGameplayTagContainer, OtherContainer: FGameplayTagContainer, bExactMatch: boolean): FGameplayTagContainer {
    return bExactMatch ? TagContainer.FilterExact(OtherContainer) : TagContainer.Filter(OtherContainer);
  }

  static isTagQueryEmpty(TagQuery: FGameplayTagQuery): boolean {
    return UBlueprintGameplayTagLibrary.IsTagQueryEmpty(TagQuery);
  }

  static IsTagQueryEmpty(TagQuery: FGameplayTagQuery): boolean {
    return TagQuery.IsEmpty();
  }

  static doesContainerMatchTagQuery(TagContainer: FGameplayTagContainer, TagQuery: FGameplayTagQuery): boolean {
    return UBlueprintGameplayTagLibrary.DoesContainerMatchTagQuery(TagContainer, TagQuery);
  }

  static DoesContainerMatchTagQuery(TagContainer: FGameplayTagContainer, TagQuery: FGameplayTagQuery): boolean {
    return TagContainer.MatchesQuery(TagQuery);
  }

  static addGameplayTag(TagContainer: FGameplayTagContainer, Tag: FGameplayTag): void {
    UBlueprintGameplayTagLibrary.AddGameplayTag(TagContainer, Tag);
  }

  static AddGameplayTag(TagContainer: FGameplayTagContainer, Tag: FGameplayTag): void {
    TagContainer.AddTag(Tag);
  }

  static removeGameplayTag(TagContainer: FGameplayTagContainer, Tag: FGameplayTag): boolean {
    return UBlueprintGameplayTagLibrary.RemoveGameplayTag(TagContainer, Tag);
  }

  static RemoveGameplayTag(TagContainer: FGameplayTagContainer, Tag: FGameplayTag): boolean {
    return TagContainer.RemoveTag(Tag);
  }

  static appendGameplayTagContainers(InOutTagContainer: FGameplayTagContainer, InTagContainer: FGameplayTagContainer): void {
    UBlueprintGameplayTagLibrary.AppendGameplayTagContainers(InOutTagContainer, InTagContainer);
  }

  static AppendGameplayTagContainers(InOutTagContainer: FGameplayTagContainer, InTagContainer: FGameplayTagContainer): void {
    InOutTagContainer.AppendTags(InTagContainer);
  }

  static equalEqualGameplayTagContainer(A: FGameplayTagContainer, B: FGameplayTagContainer): boolean {
    return UBlueprintGameplayTagLibrary.EqualEqual_GameplayTagContainer(A, B);
  }

  static EqualEqual_GameplayTagContainer(A: FGameplayTagContainer, B: FGameplayTagContainer): boolean {
    return A.Equals(B);
  }

  static notEqualGameplayTagContainer(A: FGameplayTagContainer, B: FGameplayTagContainer): boolean {
    return UBlueprintGameplayTagLibrary.NotEqual_GameplayTagContainer(A, B);
  }

  static NotEqual_GameplayTagContainer(A: FGameplayTagContainer, B: FGameplayTagContainer): boolean {
    return !A.Equals(B);
  }

  static makeLiteralGameplayTagContainer(Value: FGameplayTagContainer): FGameplayTagContainer {
    return UBlueprintGameplayTagLibrary.MakeLiteralGameplayTagContainer(Value);
  }

  static MakeLiteralGameplayTagContainer(Value: FGameplayTagContainer): FGameplayTagContainer {
    return Value;
  }

  static makeGameplayTagContainerFromArray(GameplayTags: readonly FGameplayTag[]): FGameplayTagContainer {
    return UBlueprintGameplayTagLibrary.MakeGameplayTagContainerFromArray(GameplayTags);
  }

  static MakeGameplayTagContainerFromArray(GameplayTags: readonly FGameplayTag[]): FGameplayTagContainer {
    return FGameplayTagContainer.CreateFromArray(GameplayTags);
  }

  static makeGameplayTagContainerFromTag(SingleTag: FGameplayTag): FGameplayTagContainer {
    return UBlueprintGameplayTagLibrary.MakeGameplayTagContainerFromTag(SingleTag);
  }

  static MakeGameplayTagContainerFromTag(SingleTag: FGameplayTag): FGameplayTagContainer {
    return new FGameplayTagContainer(SingleTag);
  }

  static breakGameplayTagContainer(GameplayTagContainer: FGameplayTagContainer): FGameplayTag[] {
    return UBlueprintGameplayTagLibrary.BreakGameplayTagContainer(GameplayTagContainer);
  }

  static BreakGameplayTagContainer(GameplayTagContainer: FGameplayTagContainer): FGameplayTag[] {
    return GameplayTagContainer.GetGameplayTagArray();
  }

  static makeGameplayTagQuery(TagQuery: FGameplayTagQuery): FGameplayTagQuery {
    return UBlueprintGameplayTagLibrary.MakeGameplayTagQuery(TagQuery);
  }

  static MakeGameplayTagQuery(TagQuery: FGameplayTagQuery): FGameplayTagQuery {
    return TagQuery;
  }

  static makeGameplayTagQueryMatchAnyTags(InTags: FGameplayTagContainer): FGameplayTagQuery {
    return UBlueprintGameplayTagLibrary.MakeGameplayTagQuery_MatchAnyTags(InTags);
  }

  static MakeGameplayTagQuery_MatchAnyTags(InTags: FGameplayTagContainer): FGameplayTagQuery {
    return FGameplayTagQuery.MakeQuery_MatchAnyTags(InTags);
  }

  static makeGameplayTagQueryMatchAllTags(InTags: FGameplayTagContainer): FGameplayTagQuery {
    return UBlueprintGameplayTagLibrary.MakeGameplayTagQuery_MatchAllTags(InTags);
  }

  static MakeGameplayTagQuery_MatchAllTags(InTags: FGameplayTagContainer): FGameplayTagQuery {
    return FGameplayTagQuery.MakeQuery_MatchAllTags(InTags);
  }

  static makeGameplayTagQueryMatchNoTags(InTags: FGameplayTagContainer): FGameplayTagQuery {
    return UBlueprintGameplayTagLibrary.MakeGameplayTagQuery_MatchNoTags(InTags);
  }

  static MakeGameplayTagQuery_MatchNoTags(InTags: FGameplayTagContainer): FGameplayTagQuery {
    return FGameplayTagQuery.MakeQuery_MatchNoTags(InTags);
  }

  static getDebugStringFromGameplayTagContainer(TagContainer: FGameplayTagContainer): string {
    return UBlueprintGameplayTagLibrary.GetDebugStringFromGameplayTagContainer(TagContainer);
  }

  static GetDebugStringFromGameplayTagContainer(TagContainer: FGameplayTagContainer): string {
    return TagContainer.ToStringSimple();
  }

  static getDebugStringFromGameplayTag(GameplayTag: FGameplayTag): string {
    return UBlueprintGameplayTagLibrary.GetDebugStringFromGameplayTag(GameplayTag);
  }

  static GetDebugStringFromGameplayTag(GameplayTag: FGameplayTag): string {
    return GameplayTag.ToString();
  }
}

export function RequestGameplayTag(TagName: string, ErrorIfNotFound = true): FGameplayTag {
  return FGameplayTag.RequestGameplayTag(TagName, ErrorIfNotFound);
}

export function requestGameplayTag(TagName: string, ErrorIfNotFound = true): FGameplayTag {
  return RequestGameplayTag(TagName, ErrorIfNotFound);
}

export function MakeGameplayTagContainer(tags: GameplayTagContainerLike): FGameplayTagContainer {
  return ensureContainer(tags);
}

export function makeGameplayTagContainer(tags: GameplayTagContainerLike): FGameplayTagContainer {
  return MakeGameplayTagContainer(tags);
}

export function ImportGameplayTagDictionary(input: GameplayTagDictionaryInput, options: GameplayTagDictionaryImportOptions = {}): GameplayTagDictionaryImportResult {
  return UGameplayTagsManager.Get().ImportGameplayTagDictionary(input, options);
}

export function importGameplayTagDictionary(input: GameplayTagDictionaryInput, options: GameplayTagDictionaryImportOptions = {}): GameplayTagDictionaryImportResult {
  return ImportGameplayTagDictionary(input, options);
}

export function ExportGameplayTagDictionary(options: GameplayTagDictionaryExportOptions = {}): GameplayTagDictionaryExport {
  return UGameplayTagsManager.Get().ExportGameplayTagDictionary(options);
}

export function exportGameplayTagDictionary(options: GameplayTagDictionaryExportOptions = {}): GameplayTagDictionaryExport {
  return ExportGameplayTagDictionary(options);
}

export function ValidateGameplayTagDictionary(input: GameplayTagDictionaryInput): GameplayTagDictionaryValidationResult {
  return UGameplayTagsManager.Get().ValidateGameplayTagDictionary(input);
}

export function validateGameplayTagDictionary(input: GameplayTagDictionaryInput): GameplayTagDictionaryValidationResult {
  return ValidateGameplayTagDictionary(input);
}

export {
  FGameplayTag as GameplayTag,
  FGameplayTagContainer as GameplayTagContainer,
  FGameplayTagQuery as GameplayTagQuery,
  FGameplayTagQueryExpression as GameplayTagQueryExpression,
  UBlueprintGameplayTagLibrary as BlueprintGameplayTagLibrary,
  UGameplayTagsManager as GameplayTagsManager
};

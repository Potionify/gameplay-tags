import {
  BookOpen,
  Boxes,
  Braces,
  ClipboardCheck,
  Database,
  FileJson,
  FileText,
  GitBranch,
  Layers3,
  Map,
  Play,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  TableProperties,
  Tags,
  Trash2,
  Upload,
  Workflow
} from "lucide";
import { createIcons } from "lucide";
import {
  BlueprintGameplayTagLibrary,
  EGameplayTagSourceType,
  FGameplayTagQuery,
  FGameplayTagQueryExpression,
  filterGameplayTagQueryMatches,
  GameplayTagDictionaryDiagnostic,
  GameplayTagDictionaryFormat,
  GameplayTagsManager,
  doesGameplayTagContainerMatchQuery,
  importGameplayTagDictionary,
  makeGameplayTagContainer,
  parseGameplayTagDictionary,
  parseGameplayTagQuery,
  requestGameplayTag,
  requestGameplayTagContainer,
  stringifyGameplayTagDictionary,
  stringifyGameplayTagQuery,
  validateGameplayTagDictionary
} from "@potionify/gameplay-tags";
import "./styles.css";

const seedDictionary = {
  gameplayTagList: [
    { Tag: "Ability.Element.Fire", DevComment: "Fire damage and spell effects" },
    { Tag: "Ability.Element.Frost", DevComment: "Frost damage and slow effects" },
    { Tag: "Ability.Range.Melee", DevComment: "Close-range ability" },
    { Tag: "Ability.Range.Ranged", DevComment: "Long-range ability" },
    { Tag: "Ability.Type.Attack", DevComment: "Hostile combat action" },
    { Tag: "Ability.Type.Heal", DevComment: "Friendly recovery action" },
    { Tag: "Character.Class.Mage", DevComment: "Arcane character archetype" },
    { Tag: "Character.Class.Ranger", DevComment: "Ranged character archetype" },
    { Tag: "Character.Class.Warrior", DevComment: "Frontline character archetype" },
    { Tag: "Character.State.Burning", DevComment: "Damage-over-time combat state" },
    { Tag: "Character.State.Stunned", DevComment: "Crowd-control combat state" },
    { Tag: "Encounter.Region.Catacombs", DevComment: "Underground dungeon region" }
  ],
  restrictedGameplayTagList: [
    { Tag: "Character.Internal.DebugOnly", DevComment: "Designer-only test state", bAllowNonRestrictedChildren: true }
  ],
  gameplayTagRedirects: [
    { OldTagName: "Character.State.OnFire", NewTagName: "Character.State.Burning" }
  ]
};

const manager = GameplayTagsManager.get();

const sampleEncounters = [
  {
    title: "Ashfall pyromancer",
    tags: ["Character.Class.Mage", "Ability.Element.Fire", "Ability.Range.Ranged", "Ability.Type.Attack"]
  },
  {
    title: "Frost keep guardian",
    tags: ["Character.Class.Warrior", "Ability.Element.Frost", "Ability.Range.Melee", "Ability.Type.Attack"]
  },
  {
    title: "Moonwell ranger",
    tags: ["Character.Class.Ranger", "Ability.Range.Ranged", "Ability.Type.Heal", "Encounter.Region.Catacombs"]
  },
  {
    title: "Stunned arena champion",
    tags: ["Character.Class.Warrior", "Character.State.Stunned", "Ability.Range.Melee"]
  }
];

type GuideStep = {
  id: string;
  kicker: string;
  title: string;
  summary: string;
  icon: string;
  code: () => string;
  visual: () => string;
  output: () => string;
};

type QueryRootMode = "allExpr" | "anyExpr" | "noExpr";

type QueryRuleType = "anyTags" | "allTags" | "noTags" | "anyTagsExact" | "allTagsExact";

type QueryRule = {
  id: string;
  tags: string[];
  type: QueryRuleType;
};

const queryRootModes: Record<QueryRootMode, { label: string; method: string; expression: string }> = {
  allExpr: {
    label: "All rules must pass",
    method: "allExprMatch",
    expression: "AllExprMatch"
  },
  anyExpr: {
    label: "Any rule can pass",
    method: "anyExprMatch",
    expression: "AnyExprMatch"
  },
  noExpr: {
    label: "No rule may pass",
    method: "noExprMatch",
    expression: "NoExprMatch"
  }
};

const queryRuleTypes: Record<QueryRuleType, { label: string; method: string; expression: string }> = {
  anyTags: {
    label: "Any tag matches",
    method: "anyTagsMatch",
    expression: "AnyTagsMatch"
  },
  allTags: {
    label: "All tags match",
    method: "allTagsMatch",
    expression: "AllTagsMatch"
  },
  noTags: {
    label: "No tags match",
    method: "noTagsMatch",
    expression: "NoTagsMatch"
  },
  anyTagsExact: {
    label: "Any exact tag matches",
    method: "anyTagsExactMatch",
    expression: "AnyTagsExactMatch"
  },
  allTagsExact: {
    label: "All exact tags match",
    method: "allTagsExactMatch",
    expression: "AllTagsExactMatch"
  }
};

const state = {
  owned: new Set(["Ability.Element.Fire", "Ability.Range.Ranged", "Character.Class.Mage"]),
  filter: "Ability",
  required: "Ability.Element",
  exact: "Character.Class.Mage",
  validation: " .Ability.Bad,Tag. ",
  sourceTag: "Ability.Element.Fire",
  queryRoot: "allExpr" as QueryRootMode,
  queryRules: [
    { id: "rule-1", type: "anyTags", tags: ["Ability.Element.Fire", "Ability.Element.Frost"] },
    { id: "rule-2", type: "allTags", tags: ["Ability.Range.Ranged", "Character.Class.Mage"] },
    { id: "rule-3", type: "noTags", tags: ["Character.State.Stunned", "Character.State.Burning"] },
    { id: "rule-4", type: "anyTagsExact", tags: ["Character.Class.Mage", "Character.Class.Ranger"] }
  ] as QueryRule[],
  dictionaryFormat: "json" as GameplayTagDictionaryFormat,
  dictionaryText: "",
  diagnostics: [] as GameplayTagDictionaryDiagnostic[],
  importSummary: "Seed dictionary loaded",
  containerText: "",
  containerSummary: "Selected actor container loaded",
  containerErrors: [] as string[]
};

let nextQueryRuleId = 5;

function seed(): void {
  manager.reset();
  importGameplayTagDictionary(seedDictionary, {
    sourceName: "ExampleRpgTags",
    sourceType: EGameplayTagSourceType.TagList,
    restrictedSourceName: "ExampleDesignerOnly"
  });
  state.dictionaryText = stringifyGameplayTagDictionary(manager.exportGameplayTagDictionary(), state.dictionaryFormat);
  state.diagnostics = [];
  state.importSummary = "Seed dictionary loaded";
  ensureSelections();
  syncContainerTextFromOwned("Selected actor container loaded");
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function tagNames(tags: Iterable<{ getTagName(): string }>): string[] {
  return [...tags].map((tag) => tag.getTagName());
}

function dictionaryTags(onlyExplicit: boolean): string[] {
  const container = makeGameplayTagContainer([]);
  manager.requestAllGameplayTags(container, onlyExplicit);
  return tagNames(container).sort((left, right) => left.localeCompare(right));
}

function firstTag(fallback = ""): string {
  return dictionaryTags(false)[0] ?? fallback;
}

function ensureSelections(): void {
  const allTags = new Set(dictionaryTags(false));
  const explicitTags = new Set(dictionaryTags(true));
  const fallback = firstTag("Ability");

  for (const tag of [...state.owned]) {
    if (!explicitTags.has(tag)) {
      state.owned.delete(tag);
    }
  }

  if (state.owned.size === 0) {
    const firstExplicit = dictionaryTags(true)[0];

    if (firstExplicit) {
      state.owned.add(firstExplicit);
    }
  }

  for (const key of ["required", "exact", "filter", "sourceTag"] as const) {
    if (!allTags.has(state[key])) {
      state[key] = fallback;
    }
  }

  if (state.queryRules.length === 0) {
    state.queryRules.push({ id: `rule-${nextQueryRuleId++}`, type: "anyTags", tags: [fallback] });
  }

  for (const rule of state.queryRules) {
    rule.tags = [...new Set(rule.tags.filter((tag) => allTags.has(tag)))];

    if (rule.tags.length === 0) {
      rule.tags = [fallback];
    }
  }
}

function ownedContainer() {
  return makeGameplayTagContainer([...state.owned]);
}

function selectedContainerPayload(container = ownedContainer()): { actorId: string; gameplayTags: string[] } {
  return {
    actorId: "ashfall-pyromancer",
    gameplayTags: container.toJSON()
  };
}

function stringifySelectedContainer(container = ownedContainer()): string {
  return JSON.stringify(selectedContainerPayload(container), null, 2);
}

function syncContainerTextFromOwned(summary: string): void {
  state.containerText = stringifySelectedContainer();
  state.containerSummary = summary;
  state.containerErrors = [];
}

function sourceTypeForFormat(format: GameplayTagDictionaryFormat): EGameplayTagSourceType {
  if (format === "csv") {
    return EGameplayTagSourceType.DataTable;
  }

  if (format === "ini") {
    return EGameplayTagSourceType.DefaultTagList;
  }

  return EGameplayTagSourceType.TagList;
}

function sourceTypeMemberForFormat(format: GameplayTagDictionaryFormat): string {
  if (format === "csv") {
    return "DataTable";
  }

  if (format === "ini") {
    return "DefaultTagList";
  }

  return "TagList";
}

function toggleOwned(tag: string): void {
  if (state.owned.has(tag)) {
    state.owned.delete(tag);
  } else {
    state.owned.add(tag);
  }

  syncContainerTextFromOwned("Selected actor container updated");
  render();
}

function addQueryRule(): void {
  state.queryRules.push({
    id: `rule-${nextQueryRuleId++}`,
    type: "anyTags",
    tags: [firstTag("Ability")]
  });
  ensureSelections();
  render();
}

function removeQueryRule(ruleId: string): void {
  if (state.queryRules.length === 1) {
    return;
  }

  state.queryRules = state.queryRules.filter((rule) => rule.id !== ruleId);
  ensureSelections();
  render();
}

function addQueryRuleTag(ruleId: string): void {
  const rule = state.queryRules.find((candidate) => candidate.id === ruleId);

  if (!rule) {
    return;
  }

  const nextTag = dictionaryTags(false).find((tag) => !rule.tags.includes(tag)) ?? firstTag("Ability");
  rule.tags.push(nextTag);
  ensureSelections();
  render();
}

function removeQueryRuleTag(ruleId: string, tagIndex: number): void {
  const rule = state.queryRules.find((candidate) => candidate.id === ruleId);

  if (!rule || rule.tags.length === 1 || !Number.isInteger(tagIndex)) {
    return;
  }

  rule.tags = rule.tags.filter((_, index) => index !== tagIndex);
  ensureSelections();
  render();
}

function updateQueryRule(ruleId: string, field: "type", value: string): void {
  const rule = state.queryRules.find((candidate) => candidate.id === ruleId);

  if (!rule) {
    return;
  }

  if (field === "type" && value in queryRuleTypes) {
    rule.type = value as QueryRuleType;
  }

  ensureSelections();
  render();
}

function updateQueryRuleTag(ruleId: string, tagIndex: number, value: string): void {
  const rule = state.queryRules.find((candidate) => candidate.id === ruleId);

  if (!rule || !Number.isInteger(tagIndex) || tagIndex < 0 || tagIndex >= rule.tags.length) {
    return;
  }

  rule.tags[tagIndex] = value;
  ensureSelections();
  render();
}

function setState(key: keyof typeof state, value: string): void {
  if (key === "dictionaryFormat") {
    state.dictionaryFormat = value as GameplayTagDictionaryFormat;
    exportDictionary(state.dictionaryFormat);
    return;
  }

  if (key === "queryRoot") {
    state.queryRoot = value as QueryRootMode;
    render();
    return;
  }

  if (key === "dictionaryText") {
    state.dictionaryText = value;
    return;
  }

  if (key === "containerText") {
    state.containerText = value;
    return;
  }

  state[key] = value as never;
  render();
}

function tagOption(tag: string, selected: string): string {
  return `<option value="${escapeHtml(tag)}" ${tag === selected ? "selected" : ""}>${escapeHtml(tag)}</option>`;
}

function pill(name: string, tone = "plain"): string {
  return `<span class="pill ${tone}">${escapeHtml(name)}</span>`;
}

function metric(label: string, value: boolean | number | string): string {
  const tone = value === true ? "yes" : value === false ? "no" : "plain";
  return `<div class="metric"><span>${escapeHtml(label)}</span><strong class="${tone}">${escapeHtml(String(value))}</strong></div>`;
}

function codeBlock(code: string): string {
  return `<pre class="code-block"><code>${escapeHtml(code.trim())}</code></pre>`;
}

function consoleValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value === null || value === undefined) {
    return String(value);
  }

  return JSON.stringify(value, null, 2);
}

function consoleOutput(entries: Array<[string, unknown]>): string {
  return `
    <div class="console-panel">
      ${entries.map(([label, value]) => `
        <div class="console-entry">
          <span>console.log("${escapeHtml(label)}")</span>
          <pre><code>${escapeHtml(consoleValue(value))}</code></pre>
        </div>
      `).join("")}
    </div>
  `;
}

function miniCode(code: string): string {
  return `<code class="inline-code">${escapeHtml(code)}</code>`;
}

function diagnosticCounts(diagnostics = state.diagnostics): { errors: number; warnings: number } {
  return diagnostics.reduce((counts, diagnostic) => {
    if (diagnostic.level === "error") {
      counts.errors += 1;
    } else {
      counts.warnings += 1;
    }

    return counts;
  }, { errors: 0, warnings: 0 });
}

function diagnosticSummary(diagnostics = state.diagnostics): string {
  const { errors, warnings } = diagnosticCounts(diagnostics);
  const parts = [
    errors ? `${errors} error${errors === 1 ? "" : "s"}` : "",
    warnings ? `${warnings} warning${warnings === 1 ? "" : "s"}` : ""
  ].filter(Boolean);

  return parts.join(", ") || "No diagnostics";
}

function renderDiagnostics(): string {
  const { errors, warnings } = diagnosticCounts();
  const tone = errors > 0 ? "error" : warnings > 0 ? "warning" : "ok";

  if (state.diagnostics.length === 0) {
    return `
      <div class="diagnostics-summary ok">
        <span>Ready</span>
        <strong>No diagnostics</strong>
      </div>
    `;
  }

  return `
    <div class="diagnostics-summary ${tone}">
      <span>${errors > 0 ? "Blocked" : "Review"}</span>
      <strong>${escapeHtml(diagnosticSummary())}</strong>
    </div>
    ${state.diagnostics.map((diagnostic) => `
      <div class="diagnostic ${diagnostic.level}">
        <span>${escapeHtml(diagnostic.level)} / ${escapeHtml(diagnostic.code)}</span>
        <strong>${escapeHtml(diagnostic.message)}</strong>
        ${diagnostic.tag ? `<em>${escapeHtml(diagnostic.tag)}</em>` : ""}
      </div>
    `).join("")}
  `;
}

function tagTree(): Record<string, unknown> {
  const root: Record<string, unknown> = {};

  for (const tag of dictionaryTags(true)) {
    const parts = tag.split(".");
    let current = root;

    for (const part of parts) {
      current[part] ??= {};
      current = current[part] as Record<string, unknown>;
    }
  }

  return root;
}

function renderTreeNode(name: string, value: unknown, depth = 0, path = name): string {
  const children = Object.entries(value as Record<string, unknown>);
  const explicit = dictionaryTags(true).includes(path);
  const owned = state.owned.has(path);

  return `
    <li style="--depth:${depth}">
      <button class="tree-node ${explicit ? "explicit" : "parent"} ${owned ? "selected" : ""}" type="button" disabled>
        <span>${escapeHtml(name)}</span>
        ${explicit ? "<small>explicit</small>" : "<small>parent</small>"}
      </button>
      ${children.length ? `<ol>${children.map(([child, childValue]) => renderTreeNode(child, childValue, depth + 1, `${path}.${child}`)).join("")}</ol>` : ""}
    </li>
  `;
}

function renderTagTree(): string {
  return `<ol class="tag-tree">${Object.entries(tagTree()).map(([name, value]) => renderTreeNode(name, value)).join("")}</ol>`;
}

function renderContainerVisual(): string {
  const container = ownedContainer();
  const parents = container.getGameplayTagParents().toJSON();
  const explicit = container.toJSON();
  const inherited = parents.filter((tag) => !explicit.includes(tag));

  return `
    <div class="visual-stack">
      <div>
        <h4>Explicit container</h4>
        <div class="pill-list">${explicit.map((tag) => pill(tag, "strong")).join("")}</div>
      </div>
      <div>
        <h4>Matched with parents</h4>
        <div class="pill-list">${inherited.map((tag) => pill(tag, "parent")).join("") || pill("no parents")}</div>
      </div>
    </div>
  `;
}

function queryExpressionForRule(rule: QueryRule): FGameplayTagQueryExpression {
  const expression = new FGameplayTagQueryExpression();
  const tags = makeGameplayTagContainer(rule.tags);

  switch (rule.type) {
    case "anyTags":
      return expression.anyTagsMatch().addTags(tags);
    case "allTags":
      return expression.allTagsMatch().addTags(tags);
    case "noTags":
      return expression.noTagsMatch().addTags(tags);
    case "anyTagsExact":
      return expression.anyTagsExactMatch().addTags(tags);
    case "allTagsExact":
      return expression.allTagsExactMatch().addTags(tags);
  }
}

function queryRootExpression(): FGameplayTagQueryExpression {
  const root = new FGameplayTagQueryExpression();

  switch (state.queryRoot) {
    case "anyExpr":
      root.anyExprMatch();
      break;
    case "noExpr":
      root.noExprMatch();
      break;
    case "allExpr":
      root.allExprMatch();
      break;
  }

  for (const rule of state.queryRules) {
    root.addExpr(queryExpressionForRule(rule));
  }

  return root;
}

function buildCustomQuery(): FGameplayTagQuery {
  return FGameplayTagQuery.buildQuery(queryRootExpression(), "RPG encounter query");
}

function evaluateQueryRule(rule: QueryRule): boolean {
  const container = ownedContainer();
  const tags = makeGameplayTagContainer(rule.tags);

  switch (rule.type) {
    case "anyTags":
      return container.hasAny(tags);
    case "allTags":
      return container.hasAll(tags);
    case "noTags":
      return !container.hasAny(tags);
    case "anyTagsExact":
      return container.hasAnyExact(tags);
    case "allTagsExact":
      return container.hasAllExact(tags);
  }
}

function queryRuleSnapshot(): Array<Record<string, boolean | number | string | string[]>> {
  return state.queryRules.map((rule, index) => ({
    index: index + 1,
    expression: queryRuleTypes[rule.type].expression,
    tagContainer: rule.tags,
    result: evaluateQueryRule(rule)
  }));
}

function rootModeOptions(): string {
  return (Object.entries(queryRootModes) as Array<[QueryRootMode, typeof queryRootModes[QueryRootMode]]>)
    .map(([value, config]) => `<option value="${value}" ${state.queryRoot === value ? "selected" : ""}>${escapeHtml(config.label)}</option>`)
    .join("");
}

function ruleTypeOptions(selected: QueryRuleType): string {
  return (Object.entries(queryRuleTypes) as Array<[QueryRuleType, typeof queryRuleTypes[QueryRuleType]]>)
    .map(([value, config]) => `<option value="${value}" ${selected === value ? "selected" : ""}>${escapeHtml(config.label)}</option>`)
    .join("");
}

function queryRuleCode(): string {
  return state.queryRules.map((rule) => `
root.addExpr(new FGameplayTagQueryExpression()
  .${queryRuleTypes[rule.type].method}()
  .addTags(makeGameplayTagContainer([
    ${rule.tags.map((tag) => JSON.stringify(tag)).join(",\n    ")}
  ])));`).join("\n");
}

function renderQueryRuleTagItem(rule: QueryRule, tag: string, tagIndex: number): string {
  return `
    <div class="query-tag-item">
      <label class="field">
        <span class="visually-hidden">Query rule tag ${tagIndex + 1}</span>
        <select aria-label="Query rule tag ${tagIndex + 1}" data-query-rule-id="${escapeHtml(rule.id)}" data-query-rule-tag-index="${tagIndex}">
          ${dictionaryTags(false).map((option) => tagOption(option, tag)).join("")}
        </select>
      </label>
      <button class="icon-button query-tag-remove" data-action="remove-query-rule-tag" data-query-rule-id="${escapeHtml(rule.id)}" data-query-rule-tag-index="${tagIndex}" title="Remove tag from container" ${rule.tags.length === 1 ? "disabled" : ""}>
        <i data-lucide="trash-2"></i>
      </button>
    </div>
  `;
}

function renderQueryRuleBuilder(): string {
  return `
    <div class="query-builder-panel">
      <div class="query-builder-header">
        <label class="field">
          <span>Root expression</span>
          <select data-field="queryRoot">
            ${rootModeOptions()}
          </select>
        </label>
        <button data-action="add-query-rule" title="Add query rule"><i data-lucide="plus"></i><span>Add rule</span></button>
      </div>
      <div class="query-rule-list">
        ${state.queryRules.map((rule, index) => `
          <div class="query-rule-row">
            <span class="query-rule-index">${index + 1}</span>
            <label class="field">
              <span>Rule type</span>
              <select data-query-rule-id="${escapeHtml(rule.id)}" data-query-rule-field="type">
                ${ruleTypeOptions(rule.type)}
              </select>
            </label>
            <div class="query-tag-container-field">
              <div class="query-tag-container-header">
                <span>Tag container</span>
                <button data-action="add-query-rule-tag" data-query-rule-id="${escapeHtml(rule.id)}" title="Add tag to container"><i data-lucide="plus"></i><span>Add tag</span></button>
              </div>
              <div class="query-tag-list">
                ${rule.tags.map((tag, tagIndex) => renderQueryRuleTagItem(rule, tag, tagIndex)).join("")}
              </div>
            </div>
            <button class="icon-button query-rule-remove" data-action="remove-query-rule" data-query-rule-id="${escapeHtml(rule.id)}" title="Remove query rule" ${state.queryRules.length === 1 ? "disabled" : ""}>
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderQueryVisual(): string {
  const query = buildCustomQuery();
  const containerMatches = query.matches(ownedContainer());
  const matchingEncounters = filterGameplayTagQueryMatches(sampleEncounters, query, (encounter) => encounter.tags);

  return `
    ${renderQueryRuleBuilder()}
    <div class="query-expression-map">
      <div class="query-root-node ${containerMatches ? "yes" : "no"}">
        <span>Root expression</span>
        <strong>${escapeHtml(queryRootModes[state.queryRoot].expression)}</strong>
        <em>${state.queryRules.length} child expression${state.queryRules.length === 1 ? "" : "s"}</em>
      </div>
      <div class="query-rule-graph">
        ${state.queryRules.map((rule) => renderQueryNode(queryRuleTypes[rule.type].expression, rule.tags, evaluateQueryRule(rule))).join("")}
      </div>
      <div class="query-result ${containerMatches ? "yes" : "no"}">
        <span>Runtime query</span>
        <strong>${containerMatches ? "matches selected actor" : "blocked selected actor"}</strong>
      </div>
    </div>
    <div class="record-results">
      ${matchingEncounters.map((encounter) => `
        <div class="record-row">
          <strong>${escapeHtml(encounter.title)}</strong>
          <span>${encounter.tags.map((tag) => escapeHtml(tag)).join(" / ")}</span>
        </div>
      `).join("") || `<div class="record-row"><strong>No encounters matched</strong><span>Adjust the query rules above.</span></div>`}
    </div>
  `;
}

function renderQueryNode(label: string, tags: string[], matched: boolean): string {
  return `
    <div class="query-node ${matched ? "yes" : "no"}">
      <span>${escapeHtml(label)}</span>
      <strong>Tag container (${tags.length})</strong>
      <div class="pill-list">${tags.map((tag) => pill(tag, "strong")).join("")}</div>
      <em>${matched ? "pass" : "fail"}</em>
    </div>
  `;
}

function renderDictionaryPreview(): string {
  const exportShape = manager.exportGameplayTagDictionary();
  const counts = [
    metric("gameplayTagList", exportShape.gameplayTagList.length),
    metric("restricted", exportShape.restrictedGameplayTagList.length),
    metric("redirects", exportShape.gameplayTagRedirects.length),
    metric("format", state.dictionaryFormat.toUpperCase())
  ].join("");

  return `
    <div class="dictionary-preview">
      <div class="metric-grid compact">${counts}</div>
      <div class="format-tabs">
        ${(["json", "csv", "ini"] as GameplayTagDictionaryFormat[]).map((format) => `
          <button class="${state.dictionaryFormat === format ? "active" : ""}" data-format="${format}">
            <i data-lucide="${format === "json" ? "file-json" : format === "csv" ? "table-properties" : "file-text"}"></i>
            <span>${format.toUpperCase()}</span>
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function renderImportModel(): string {
  return `
    <div class="surface-model" aria-label="Import model">
      <div class="surface-node">
        <span>Registry dictionary</span>
        <strong>Global catalog</strong>
        <p>Valid tags, comments, redirects, restricted entries, and source metadata.</p>
      </div>
      <div class="surface-node">
        <span>GameplayTagContainer</span>
        <strong>Runtime tag set</strong>
        <p>Actor, item, ability, encounter, save data, or any app payload carrying tags.</p>
      </div>
    </div>
  `;
}

function renderContainerDiagnostics(): string {
  if (state.containerErrors.length === 0) {
    return `
      <div class="diagnostics-summary ok">
        <span>Ready</span>
        <strong>${escapeHtml(state.containerSummary)}</strong>
      </div>
    `;
  }

  return `
    <div class="diagnostics-summary error">
      <span>Blocked</span>
      <strong>${escapeHtml(state.containerSummary)}</strong>
    </div>
    ${state.containerErrors.map((error) => `
      <div class="diagnostic error">
        <span>container</span>
        <strong>${escapeHtml(error)}</strong>
      </div>
    `).join("")}
  `;
}

function renderContainerEditor(): string {
  return `
    <div class="data-editor container-editor">
      <div class="data-toolbar">
        <button data-action="validate-container" title="Validate container payload"><i data-lucide="clipboard-check"></i><span>Validate</span></button>
        <button data-action="import-container" title="Import container payload"><i data-lucide="upload"></i><span>Import container</span></button>
        <button data-action="export-container" title="Export selected actor container"><i data-lucide="file-json"></i><span>Use selected actor</span></button>
      </div>
      <textarea data-field="containerText" spellcheck="false">${escapeHtml(state.containerText)}</textarea>
      <div class="diagnostics">${renderContainerDiagnostics()}</div>
    </div>
  `;
}

function renderImportSurfaces(): string {
  return `
    ${renderImportModel()}
    <div class="data-surface-grid">
      <div class="data-surface">
        <div class="surface-copy">
          <span>Dictionary input</span>
          <strong>Change the global registry catalog</strong>
          <p>Use this for tool dictionaries and Unreal-style config/table data that define which tags exist.</p>
        </div>
        ${renderRegistryEditor()}
      </div>
      <div class="data-surface">
        <div class="surface-copy">
          <span>Container input</span>
          <strong>Load tags for one RPG object</strong>
          <p>Paste a JSON tag array or an app object with <code>gameplayTags</code> or <code>tags</code>.</p>
        </div>
        ${renderContainerEditor()}
      </div>
    </div>
  `;
}

function renderContainerExportPreview(): string {
  const container = ownedContainer();

  return `
    <div class="container-export-preview">
      <div class="metric-grid compact">
        ${metric("container tags", container.num())}
        ${metric("json shape", "gameplayTags[]")}
      </div>
      <div class="pill-list">${container.toJSON().map((tag) => pill(tag, "strong")).join("")}</div>
      <button data-action="export-container" title="Export selected actor container"><i data-lucide="file-json"></i><span>Export selected container</span></button>
    </div>
  `;
}

function renderExportSurfaces(): string {
  return `
    <div class="data-surface-grid export-grid">
      <div class="data-surface">
        <div class="surface-copy">
          <span>Dictionary export</span>
          <strong>Write the global catalog</strong>
          <p>JSON, CSV, and INI formats preserve tag lists, restricted tags, redirects, and editor metadata.</p>
        </div>
        ${renderDictionaryPreview()}
      </div>
      <div class="data-surface">
        <div class="surface-copy">
          <span>Container export</span>
          <strong>Write a runtime tag set</strong>
          <p>Containers serialize cleanly as arrays, so game payloads can store tags beside actor or item data.</p>
        </div>
        ${renderContainerExportPreview()}
      </div>
    </div>
  `;
}

function registryCounts(): Record<string, number> {
  const exportShape = manager.exportGameplayTagDictionary();

  return {
    gameplayTagList: exportShape.gameplayTagList.length,
    restrictedGameplayTagList: exportShape.restrictedGameplayTagList.length,
    gameplayTagRedirects: exportShape.gameplayTagRedirects.length,
    allTagsWithParents: dictionaryTags(false).length
  };
}

function diagnosticsForConsole(): Array<Record<string, string | undefined>> {
  return state.diagnostics.map((diagnostic) => ({
    level: diagnostic.level,
    code: diagnostic.code,
    tag: diagnostic.tag,
    message: diagnostic.message
  }));
}

function renderRegistryEditor(): string {
  return `
    <div class="data-editor">
      <div class="data-toolbar">
        <label class="field inline">
          <span>Input format</span>
          <select data-field="dictionaryFormat">
            <option value="json" ${state.dictionaryFormat === "json" ? "selected" : ""}>JSON</option>
            <option value="csv" ${state.dictionaryFormat === "csv" ? "selected" : ""}>CSV</option>
            <option value="ini" ${state.dictionaryFormat === "ini" ? "selected" : ""}>INI</option>
          </select>
        </label>
        <button data-action="validate" title="Validate dictionary"><i data-lucide="clipboard-check"></i><span>Validate</span></button>
        <button data-action="import" title="Import dictionary"><i data-lucide="upload"></i><span>Import catalog</span></button>
        <button data-action="reset" title="Reset dictionary"><i data-lucide="rotate-ccw"></i><span>Reset catalog</span></button>
      </div>
      <textarea data-field="dictionaryText" spellcheck="false">${escapeHtml(state.dictionaryText)}</textarea>
      <div class="diagnostics">${renderDiagnostics()}</div>
    </div>
  `;
}

function renderAliasMap(): string {
  const aliases = [
    ["requestGameplayTag", "FGameplayTag::RequestGameplayTag"],
    ["makeGameplayTagContainer", "FGameplayTagContainer"],
    ["GameplayTagsManager.get", "UGameplayTagsManager::Get"],
    ["container.hasTag", "FGameplayTagContainer::HasTag"],
    ["FGameplayTagQuery.makeQueryMatchAnyTags", "FGameplayTagQuery::MakeQuery_MatchAnyTags"],
    ["BlueprintGameplayTagLibrary.hasAllTags", "UBlueprintGameplayTagLibrary::HasAllTags"]
  ];

  return `
    <div class="alias-map">
      ${aliases.map(([typescript, unreal]) => `
        <div class="alias-row">
          <span>${escapeHtml(typescript)}</span>
          <i data-lucide="git-branch"></i>
          <strong>${escapeHtml(unreal)}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function renderSelector(label: string, field: keyof typeof state, value: string): string {
  return `
    <label class="field">
      <span>${escapeHtml(label)}</span>
      <select data-field="${field}">
        ${dictionaryTags(false).map((tag) => tagOption(tag, value)).join("")}
      </select>
    </label>
  `;
}

function renderOwnedTagPicker(): string {
  const explicit = dictionaryTags(true);

  return `
    <div class="tag-picker">
      <div>
        <h3>Selected RPG tags</h3>
        <p>${explicit.length} explicit tags from the seed RPG dictionary. Toggle the tags carried by the sample actor.</p>
      </div>
      <div class="tag-list">
        ${explicit.map((tag) => {
          const data = manager.getTagEditorData(tag);
          return `
            <label class="tag-row">
              <input type="checkbox" data-owned="${escapeHtml(tag)}" ${state.owned.has(tag) ? "checked" : ""} />
              <span>
                <strong>${escapeHtml(tag)}</strong>
                <em>${escapeHtml(data?.isRestrictedTag ? "restricted" : data?.firstTagSource || "dictionary")}</em>
              </span>
            </label>
          `;
        }).join("")}
      </div>
    </div>
  `;
}

function installStep(): GuideStep {
  return {
    id: "install",
    kicker: "Start",
    title: "Install the package.",
    summary: "Add the runtime to tools that need Unreal-style tag matching, dictionary import/export, and query persistence.",
    icon: "book-open",
    code: () => `
npm install @potionify/gameplay-tags@beta

import {
  GameplayTagsManager,
  requestGameplayTag
} from "@potionify/gameplay-tags";`,
    visual: () => `
      <div class="install-strip">
        ${pill("@potionify/gameplay-tags", "strong")}
        ${pill("ESM + CJS", "parent")}
        ${pill("Unreal aliases", "plain")}
        ${pill("camelCase helpers", "plain")}
      </div>
    `,
    output: () => consoleOutput([
      ["packageName", "@potionify/gameplay-tags"],
      ["distTag", "beta"],
      ["moduleFormats", ["ESM", "CJS"]],
      ["exampleRuntime", "Vite / GitHub Pages"]
    ])
  };
}

function registryInputStep(): GuideStep {
  return {
    id: "registry-input",
    kicker: "Input surfaces",
    title: "Import dictionaries and containers.",
    summary: "A dictionary is the global catalog of valid RPG tags. A GameplayTagContainer is the tag set carried by a specific actor, item, ability, save row, or query input.",
    icon: "upload",
    code: () => `
const parsed = parseGameplayTagDictionary(
  registryText,
  "${state.dictionaryFormat}"
);

const validation = validateGameplayTagDictionary(parsed);

if (validation.isValid) {
  manager.reset();
  importGameplayTagDictionary(parsed, {
    sourceName: "ImportedRpgTags",
    sourceType: EGameplayTagSourceType.${sourceTypeMemberForFormat(state.dictionaryFormat)}
  });
}

const containerPayload = JSON.parse(actorPayloadText);
const selectedActor = requestGameplayTagContainer(
  containerPayload.gameplayTags,
  undefined,
  false
);`,
    visual: renderImportSurfaces,
    output: () => consoleOutput([
      ["dictionaryImportSummary", state.importSummary],
      ["dictionaryInputFormat", state.dictionaryFormat],
      ["dictionaryDiagnostics", diagnosticsForConsole()],
      ["registryCounts", registryCounts()],
      ["containerImportSummary", state.containerSummary],
      ["selectedActorContainer.toJSON()", ownedContainer().toJSON()]
    ])
  };
}

function dictionaryStep(): GuideStep {
  return {
    id: "dictionary",
    kicker: "Recipe 1",
    title: "Load a tag dictionary from RPG data.",
    summary: "The manager keeps explicit tags, restricted tags, redirects, source metadata, and implicit parent nodes in one place.",
    icon: "database",
    code: () => `
const manager = GameplayTagsManager.get();

manager.reset();
importGameplayTagDictionary(seedDictionary, {
  sourceName: "ExampleRpgTags",
  sourceType: EGameplayTagSourceType.TagList,
  restrictedSourceName: "ExampleDesignerOnly"
});

const exported = manager.exportGameplayTagDictionary();`,
    visual: renderTagTree,
    output: () => {
      const all = dictionaryTags(false);
      const explicit = dictionaryTags(true);
      const redirects = manager.getGameplayTagRedirects();
      return consoleOutput([
        ["explicitTags", explicit],
        ["allTagsWithParents", all],
        ["redirects", redirects],
        ["registryCounts", registryCounts()]
      ]);
    }
  };
}

function containerStep(): GuideStep {
  return {
    id: "containers",
    kicker: "Recipe 2",
    title: "Build a container and match with hierarchy.",
    summary: "Containers store explicit tags while parent tags are available for hierarchical matching. Exact matching stays strict.",
    icon: "boxes",
    code: () => `
const owned = makeGameplayTagContainer([
  ${[...state.owned].map((tag) => `"${tag}"`).join(",\n  ")}
]);

owned.hasTag(requestGameplayTag("${state.required}"));
owned.hasTagExact(requestGameplayTag("${state.required}"));
owned.getGameplayTagParents().toJSON();`,
    visual: () => `
      <div class="section-controls compact-controls">
        ${renderSelector("Match against", "required", state.required)}
        ${renderSelector("Exact check", "exact", state.exact)}
      </div>
      ${renderOwnedTagPicker()}
      ${renderContainerVisual()}
    `,
    output: () => {
      const container = ownedContainer();
      const required = requestGameplayTag(state.required, false);
      const firstOwned = container.first();
      return consoleOutput([
        ["owned.toJSON()", container.toJSON()],
        ["owned.num()", container.num()],
        [`owned.hasTag("${state.required}")`, required.isValid() ? container.hasTag(required) : false],
        [`owned.hasTagExact("${state.required}")`, required.isValid() ? container.hasTagExact(required) : false],
        ["firstOwned.matchesTagDepth(required)", firstOwned.isValid() && required.isValid() ? firstOwned.matchesTagDepth(required) : 0]
      ]);
    }
  };
}

function filteringStep(): GuideStep {
  return {
    id: "filtering",
    kicker: "Recipe 3",
    title: "Filter containers for broader or exact matches.",
    summary: "Use `filter` when parent tags should match children, and `filterExact` when the selected tags must be present exactly.",
    icon: "search",
    code: () => `
const owned = makeGameplayTagContainer([...selectedTags]);
const filter = makeGameplayTagContainer(["${state.filter}"]);

owned.filter(filter).toJSON();
owned.filterExact(filter).toJSON();`,
    visual: () => {
      const container = ownedContainer();
      const filter = makeGameplayTagContainer([state.filter]);
      return `
        <div class="section-controls compact-controls">
          ${renderSelector("Filter by", "filter", state.filter)}
        </div>
        <div class="split-output">
          <div>
            <h4>filter</h4>
            <div class="pill-list">${container.filter(filter).toJSON().map((tag) => pill(tag, "strong")).join("") || pill("none")}</div>
          </div>
          <div>
            <h4>filterExact</h4>
            <div class="pill-list">${container.filterExact(filter).toJSON().map((tag) => pill(tag, "strong")).join("") || pill("none")}</div>
          </div>
        </div>
      `;
    },
    output: () => {
      const container = ownedContainer();
      const filter = makeGameplayTagContainer([state.filter]);
      return consoleOutput([
        ["filterTag", state.filter],
        ["owned.filter(filter).toJSON()", container.filter(filter).toJSON()],
        ["owned.filterExact(filter).toJSON()", container.filterExact(filter).toJSON()],
        ["owned.num()", container.num()]
      ]);
    }
  };
}

function queryStep(): GuideStep {
  return {
    id: "queries",
    kicker: "Recipe 4",
    title: "Build custom gameplay tag queries.",
    summary: "Build a query the same way Unreal does: choose a root expression, add rule and tag-container pairs, then compile the editable tree into a runtime query.",
    icon: "workflow",
    code: () => `
const root = new FGameplayTagQueryExpression()
  .${queryRootModes[state.queryRoot].method}();

${queryRuleCode()}

const query = FGameplayTagQuery.buildQuery(root, "RPG encounter query");

const saved = stringifyGameplayTagQuery(query);
const loaded = parseGameplayTagQuery(saved);

filterGameplayTagQueryMatches(encounters, loaded, (encounter) => encounter.tags);`,
    visual: renderQueryVisual,
    output: () => {
      const query = buildCustomQuery();
      const saved = stringifyGameplayTagQuery(query);
      const loaded = parseGameplayTagQuery(saved);
      const container = ownedContainer();
      return consoleOutput([
        ["editableRootExpression", queryRootModes[state.queryRoot].expression],
        ["editableRules", queryRuleSnapshot()],
        ["doesGameplayTagContainerMatchQuery(owned, loaded)", doesGameplayTagContainerMatchQuery(container, loaded)],
        ["loaded.equals(query)", loaded.equals(query)],
        ["loaded.getDescription()", loaded.getDescription() || "auto"],
        ["loaded.getGameplayTagArray()", tagNames(loaded.getGameplayTagArray())],
        ["stringifyGameplayTagQuery(query)", JSON.parse(saved) as unknown]
      ]);
    }
  };
}

function dictionaryExportStep(): GuideStep {
  return {
    id: "registry-export",
    kicker: "Recipe 5",
    title: "Export dictionaries and containers.",
    summary: "Export the global dictionary when tools need the catalog, or export a GameplayTagContainer when app data needs an actor, item, ability, or encounter tag set.",
    icon: "file-json",
    code: () => `
const dictionaryText = stringifyGameplayTagDictionary(
  manager.exportGameplayTagDictionary(),
  "${state.dictionaryFormat}"
);

const actorPayload = {
  actorId: "ashfall-pyromancer",
  gameplayTags: ownedContainer.toJSON()
};

console.log(dictionaryText, actorPayload);`,
    visual: renderExportSurfaces,
    output: () => consoleOutput([
      ["dictionaryExportFormat", state.dictionaryFormat],
      ["registryCounts", registryCounts()],
      ["stringifyGameplayTagDictionary(exported, format)", stringifyGameplayTagDictionary(manager.exportGameplayTagDictionary(), state.dictionaryFormat)],
      ["selectedContainerPayload", selectedContainerPayload()]
    ])
  };
}

function validationStep(): GuideStep {
  return {
    id: "validation",
    kicker: "Recipe 6",
    title: "Validate tag names before users commit them.",
    summary: "Validation returns a safe fixed string plus readable diagnostics, so RPG tools can repair common mistakes before import.",
    icon: "shield-check",
    code: () => `
const result = GameplayTagsManager
  .get()
  .validateGameplayTagString("${state.validation}");

result.isValid;
result.fixedString;
result.error;`,
    visual: () => {
      const result = manager.validateGameplayTagString(state.validation);
      return `
        <div class="section-controls compact-controls">
          <label class="field">
            <span>Validate string</span>
            <input data-field="validation" value="${escapeHtml(state.validation)}" />
          </label>
        </div>
        <div class="validation-strip ${result.isValid ? "ok" : "error"}">
          <span>${result.isValid ? "Valid tag" : "Needs repair"}</span>
          <strong>${escapeHtml(result.fixedString || "none")}</strong>
          <em>${escapeHtml(result.error || "No validation errors")}</em>
        </div>
      `;
    },
    output: () => {
      const result = manager.validateGameplayTagString(state.validation);
      return consoleOutput([
        ["input", state.validation],
        ["result.isValid", result.isValid],
        ["result.fixedString", result.fixedString || "none"],
        ["result.error", result.error || "none"]
      ]);
    }
  };
}

function sourceStep(): GuideStep {
  return {
    id: "source-data",
    kicker: "Recipe 7",
    title: "Inspect editor metadata and redirects.",
    summary: "Source data tells tools whether a tag is explicit, restricted, native, or imported from a specific dictionary source.",
    icon: "database",
    code: () => `
const data = manager.getTagEditorData("${state.sourceTag}");
const redirects = manager.getGameplayTagRedirects();

redirectGameplayTagName("Character.State.OnFire");`,
    visual: () => {
      const data = manager.getTagEditorData(state.sourceTag);
      const redirects = manager.getGameplayTagRedirects();
      return `
        <div class="section-controls compact-controls">
          ${renderSelector("Source data", "sourceTag", state.sourceTag)}
        </div>
        <div class="source-card">
          <div>
            <span>Selected tag</span>
            <strong>${escapeHtml(state.sourceTag)}</strong>
            <em>${escapeHtml(data?.comment || "No comment")}</em>
          </div>
          <div class="pill-list">
            ${pill(data?.isTagExplicit ? "explicit" : "implicit", "strong")}
            ${pill(data?.isRestrictedTag ? "restricted" : "unrestricted", data?.isRestrictedTag ? "parent" : "plain")}
            ${pill(data?.firstTagSource || "implicit", "plain")}
          </div>
          <div class="redirect-list">
            ${redirects.map((redirect) => `<span>${escapeHtml(redirect.OldTagName)} -> ${escapeHtml(redirect.NewTagName)}</span>`).join("")}
          </div>
        </div>
      `;
    },
    output: () => {
      const data = manager.getTagEditorData(state.sourceTag);
      return consoleOutput([
        ["selectedTag", state.sourceTag],
        ["manager.getTagEditorData(selectedTag)", data ?? null],
        ['manager.redirectGameplayTagName("Character.State.OnFire")', manager.redirectGameplayTagName("Character.State.OnFire")]
      ]);
    }
  };
}

function blueprintStep(): GuideStep {
  return {
    id: "aliases",
    kicker: "API mapping",
    title: "Map Unreal names to TypeScript helpers.",
    summary: "CamelCase is the recommended TypeScript style, while Unreal-style class and method aliases are kept for direct lookup from Unreal references.",
    icon: "git-branch",
    code: () => `
const hasAll = BlueprintGameplayTagLibrary.hasAllTags(
  owned,
  makeGameplayTagContainer(["${state.exact}"]),
  true
);

const same = owned.HasTag(requestGameplayTag("${state.required}"));`,
    visual: renderAliasMap,
    output: () => {
      const container = ownedContainer();
      const exact = makeGameplayTagContainer([state.exact]);
      return consoleOutput([
        ["BlueprintGameplayTagLibrary.hasAllTags(owned, exact, true)", BlueprintGameplayTagLibrary.hasAllTags(container, exact, true)],
        ["owned.HasTag(required)", container.HasTag(requestGameplayTag(state.required, false))],
        ["owned.hasTag(required)", container.hasTag(requestGameplayTag(state.required, false))],
        ["aliasMatchesCamelCase", container.HasTag(requestGameplayTag(state.required, false)) === container.hasTag(requestGameplayTag(state.required, false))]
      ]);
    }
  };
}

function guideSteps(): GuideStep[] {
  return [
    registryInputStep(),
    installStep(),
    dictionaryStep(),
    containerStep(),
    filteringStep(),
    queryStep(),
    dictionaryExportStep(),
    validationStep(),
    sourceStep(),
    blueprintStep()
  ];
}

const publicApiFamilies = [
  {
    title: "Top-level helpers",
    icon: "braces",
    summary: "TypeScript-friendly functions for the most common workflows.",
    items: [
      "requestGameplayTag",
      "makeGameplayTagContainer",
      "requestGameplayTagContainer",
      "addNativeGameplayTag",
      "validateGameplayTagString",
      "redirectGameplayTagName"
    ]
  },
  {
    title: "Dictionary helpers",
    icon: "database",
    summary: "Portable dictionaries for RPG tools, Unreal config, and table-like import/export.",
    items: [
      "parseGameplayTagDictionary",
      "stringifyGameplayTagDictionary",
      "parseGameplayTagDictionaryIni",
      "stringifyGameplayTagDictionaryIni",
      "parseGameplayTagDictionaryCsv",
      "stringifyGameplayTagDictionaryCsv",
      "importGameplayTagDictionary",
      "exportGameplayTagDictionary",
      "validateGameplayTagDictionary"
    ]
  },
  {
    title: "Query helpers",
    icon: "workflow",
    summary: "Serializable query creation, round-tripping, and record filtering.",
    items: [
      "makeGameplayTagQuery",
      "makeGameplayTagQueryFromFilters",
      "parseGameplayTagQuery",
      "stringifyGameplayTagQuery",
      "doesGameplayTagContainerMatchQuery",
      "filterGameplayTagQueryMatches"
    ]
  },
  {
    title: "Classes",
    icon: "layers-3",
    summary: "Unreal-style public classes with camelCase methods and Unreal aliases.",
    items: [
      "FGameplayTag",
      "FGameplayTagContainer",
      "FGameplayTagQueryExpression",
      "FGameplayTagQuery",
      "UGameplayTagsManager",
      "UBlueprintGameplayTagLibrary"
    ]
  },
  {
    title: "Export aliases",
    icon: "map",
    summary: "Shorter class names for TypeScript codebases.",
    items: [
      "GameplayTag",
      "GameplayTagContainer",
      "GameplayTagQuery",
      "GameplayTagQueryExpression",
      "GameplayTagsManager",
      "BlueprintGameplayTagLibrary"
    ]
  }
];

const classMethodFamilies = [
  ["FGameplayTag", "requestGameplayTag, validateGameplayTagString, equals, matchesTag, matchesTagExact, matchesTagDepth, matchesAny, isValid, getSingleTagContainer, requestDirectParent, getGameplayTagParents, getTagLeafName, getTagName"],
  ["FGameplayTagContainer", "createFromArray, hasTag, hasTagExact, hasAny, hasAll, num, isEmpty, getGameplayTagParents, filter, filterExact, matchesQuery, appendTags, addTag, addLeafTag, removeTag, reset, toStringSimple, getGameplayTagArray, first, last, sort"],
  ["FGameplayTagQueryExpression", "fromJSON, anyTagsMatch, allTagsMatch, noTagsMatch, anyTagsExactMatch, allTagsExactMatch, anyExprMatch, allExprMatch, noExprMatch, addTag, addTags, addExpr, clone, equals, toJSON"],
  ["FGameplayTagQuery", "buildQuery, makeQueryMatchAnyTags, makeQueryMatchAllTags, makeQueryMatchNoTags, makeQueryExactMatchAnyTags, makeQueryFromFilters, fromJSON, clone, equals, matches, isEmpty, clear, build, getQueryExpr, setUserDescription, getDescription, getGameplayTagArray, toJSON"],
  ["UGameplayTagsManager", "get, requestGameplayTag, requestGameplayTagContainer, validateGameplayTagString, findGameplayTagFromPartialStringSlow, addNativeGameplayTag, requestGameplayTagParents, requestGameplayTagChildren, requestAllGameplayTags, getTagEditorData, import/export/validate dictionary, redirects, reset"],
  ["UBlueprintGameplayTagLibrary", "matchesTag, matchesAnyTags, hasTag, hasAnyTags, hasAllTags, filter, doesContainerMatchTagQuery, addGameplayTag, removeGameplayTag, appendGameplayTagContainers, makeGameplayTagQueryMatchAnyTags, getDebugString helpers"]
];

function renderGuideStep(step: GuideStep, index: number): string {
  return `
    <section class="guide-section example-section" id="${step.id}">
      <div class="section-heading">
        <span class="section-kicker">${escapeHtml(step.kicker)}</span>
        <h2>${escapeHtml(step.title)}</h2>
        <p>${escapeHtml(step.summary)}</p>
      </div>
      <div class="example-frame">
        <div class="example-copy">
          <span class="step-number">${String(index + 1).padStart(2, "0")}</span>
          <i data-lucide="${step.icon}"></i>
          ${codeBlock(step.code())}
        </div>
        <div class="example-visual">
          ${step.visual()}
        </div>
        <div class="example-output">
          <h3>Console output</h3>
          ${step.output()}
        </div>
      </div>
    </section>
  `;
}

function renderApiAtlas(): string {
  return `
    <section class="guide-section api-atlas" id="api-atlas">
      <div class="section-heading">
        <span class="section-kicker">Public surface</span>
        <h2>API atlas for the package exports.</h2>
        <p>Use this section as a map. Each group links the public functions and classes to the examples above, without exposing private implementation helpers.</p>
      </div>
      <div class="api-family-grid">
        ${publicApiFamilies.map((family) => `
          <article class="api-family">
            <header>
              <i data-lucide="${family.icon}"></i>
              <div>
                <h3>${escapeHtml(family.title)}</h3>
                <p>${escapeHtml(family.summary)}</p>
              </div>
            </header>
            <div class="api-token-list">
              ${family.items.map((item) => miniCode(item)).join("")}
            </div>
          </article>
        `).join("")}
      </div>
      <div class="method-table">
        ${classMethodFamilies.map(([name, methods]) => `
          <div class="method-row">
            <strong>${escapeHtml(name)}</strong>
            <span>${escapeHtml(methods)}</span>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderTopNav(): string {
  const links = [
    ["overview", "Overview"],
    ...guideSteps().map((step) => [step.id, step.title.split(" ").slice(0, 3).join(" ")]),
    ["api-atlas", "API atlas"]
  ];

  return `
    <aside class="side-nav" aria-label="Guide navigation">
      <a class="brand" href="#overview">
        <i data-lucide="tags"></i>
        <span>@potionify/gameplay-tags</span>
      </a>
      <nav>
        ${links.map(([href, label]) => `<a href="#${href}">${escapeHtml(label)}</a>`).join("")}
      </nav>
    </aside>
  `;
}

function renderHero(): string {
  return `
    <section class="hero guide-section" id="overview">
      <div class="hero-copy">
        <span class="section-kicker">Developer guide for RPG tag systems</span>
        <h1>Gameplay tags for TypeScript tools that need Unreal-style semantics.</h1>
        <p>Build RPG ability, character, and encounter tags with the real package APIs. Every output below is computed from the package running in this page.</p>
        <div class="hero-actions">
          <a href="#registry-input" class="button-link"><i data-lucide="play"></i><span>Import data</span></a>
          <a href="#api-atlas" class="button-link secondary"><i data-lucide="map"></i><span>View API atlas</span></a>
        </div>
      </div>
      <div class="hero-visual" aria-label="Gameplay tag guide preview">
        <div class="tag-rail">
          ${dictionaryTags(true).slice(0, 7).map((tag) => pill(tag, state.owned.has(tag) ? "strong" : "plain")).join("")}
        </div>
        <div class="hero-metrics">
          ${metric("explicit tags", dictionaryTags(true).length)}
          ${metric("with parents", dictionaryTags(false).length)}
          ${metric("selected", state.owned.size)}
          ${metric("query", buildCustomQuery().matches(ownedContainer()))}
        </div>
      </div>
    </section>
  `;
}

function exportDictionary(format: GameplayTagDictionaryFormat): void {
  state.dictionaryFormat = format;
  state.dictionaryText = stringifyGameplayTagDictionary(manager.exportGameplayTagDictionary(), format);
  state.diagnostics = [];
  state.importSummary = `${format.toUpperCase()} dictionary text ready`;
  render();
}

function containerTagListFromPayload(payload: unknown): string[] {
  if (Array.isArray(payload)) {
    return assertStringTagList(payload);
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const candidate = record.gameplayTags ?? record.tags ?? record.GameplayTags;

    if (Array.isArray(candidate)) {
      return assertStringTagList(candidate);
    }
  }

  throw new Error("Expected a JSON tag array or an object with gameplayTags or tags.");
}

function assertStringTagList(values: unknown[]): string[] {
  const invalidIndex = values.findIndex((value) => typeof value !== "string");

  if (invalidIndex >= 0) {
    throw new Error(`Tag at index ${invalidIndex} must be a string.`);
  }

  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
}

function parseContainerText(): { tags: string[]; invalidTags: string[]; container: ReturnType<typeof ownedContainer> } {
  const payload = JSON.parse(state.containerText) as unknown;
  const tags = containerTagListFromPayload(payload);
  const invalidTags = tags.filter((tag) => !requestGameplayTag(tag, false).isValid());
  const validTags = tags.filter((tag) => !invalidTags.includes(tag));

  return {
    tags,
    invalidTags,
    container: requestGameplayTagContainer(validTags, undefined, false)
  };
}

function setContainerValidationResult(tags: string[], invalidTags: string[], action: "import" | "validate"): boolean {
  state.containerErrors = invalidTags.map((tag) => `Unknown tag in current dictionary: ${tag}`);

  if (invalidTags.length > 0) {
    state.containerSummary = `${action === "import" ? "Import blocked" : "Invalid container"}: ${invalidTags.length} unknown tag${invalidTags.length === 1 ? "" : "s"}`;
    return false;
  }

  state.containerSummary = `Valid container: ${tags.length} tag${tags.length === 1 ? "" : "s"}`;
  return true;
}

function validateContainerText(): boolean {
  try {
    const parsed = parseContainerText();
    const isValid = setContainerValidationResult(parsed.tags, parsed.invalidTags, "validate");
    render();
    return isValid;
  } catch (error) {
    state.containerErrors = [error instanceof Error ? error.message : "Could not parse container payload"];
    state.containerSummary = "Container parse failed";
    render();
    return false;
  }
}

function importContainerText(): void {
  try {
    const parsed = parseContainerText();

    if (!setContainerValidationResult(parsed.tags, parsed.invalidTags, "import")) {
      render();
      return;
    }

    state.owned = new Set(parsed.container.toJSON());
    ensureSelections();
    syncContainerTextFromOwned(`Imported ${state.owned.size} tag${state.owned.size === 1 ? "" : "s"} into selected actor container`);
    render();
  } catch (error) {
    state.containerErrors = [error instanceof Error ? error.message : "Could not parse container payload"];
    state.containerSummary = "Container import failed";
    render();
  }
}

function exportContainerText(): void {
  syncContainerTextFromOwned("Selected actor container exported");
  render();
}

function validateDictionaryText(): boolean {
  try {
    const parsed = parseGameplayTagDictionary(state.dictionaryText, state.dictionaryFormat);
    const validation = validateGameplayTagDictionary(parsed);
    state.diagnostics = validation.diagnostics;
    state.importSummary = validation.isValid ? `Valid dictionary: ${diagnosticSummary()}` : `Import blocked: ${diagnosticSummary()}`;
    render();
    return validation.isValid;
  } catch (error) {
    state.diagnostics = [{
      level: "error",
      code: "parse-failed",
      message: error instanceof Error ? error.message : "Could not parse dictionary"
    }];
    state.importSummary = "Import failed";
    render();
    return false;
  }
}

function importDictionary(): void {
  try {
    const parsed = parseGameplayTagDictionary(state.dictionaryText, state.dictionaryFormat);
    const validation = validateGameplayTagDictionary(parsed);
    state.diagnostics = validation.diagnostics;

    if (!validation.isValid) {
      state.importSummary = `Import blocked: ${diagnosticSummary()}`;
      render();
      return;
    }

    manager.reset();
    const result = importGameplayTagDictionary(parsed, {
      sourceName: "ImportedRpgTags",
      sourceType: sourceTypeForFormat(state.dictionaryFormat)
    });
    state.diagnostics = result.diagnostics;
    state.importSummary = `Imported ${result.importedTags.num()} tags: ${diagnosticSummary()}`;
    ensureSelections();
    syncContainerTextFromOwned("Selected actor container refreshed against imported catalog");
    state.dictionaryText = stringifyGameplayTagDictionary(manager.exportGameplayTagDictionary(), state.dictionaryFormat);
    render();
  } catch (error) {
    state.diagnostics = [{
      level: "error",
      code: "parse-failed",
      message: error instanceof Error ? error.message : "Could not parse dictionary"
    }];
    state.importSummary = "Import failed";
    render();
  }
}

function handleAction(action: string, target?: HTMLElement): void {
  switch (action) {
    case "add-query-rule":
      addQueryRule();
      break;
    case "remove-query-rule":
      removeQueryRule(target?.dataset.queryRuleId ?? "");
      break;
    case "add-query-rule-tag":
      addQueryRuleTag(target?.dataset.queryRuleId ?? "");
      break;
    case "remove-query-rule-tag":
      removeQueryRuleTag(target?.dataset.queryRuleId ?? "", Number(target?.dataset.queryRuleTagIndex ?? "-1"));
      break;
    case "export-json":
      exportDictionary("json");
      break;
    case "export-csv":
      exportDictionary("csv");
      break;
    case "export-ini":
      exportDictionary("ini");
      break;
    case "export-container":
      exportContainerText();
      break;
    case "validate":
      validateDictionaryText();
      break;
    case "validate-container":
      validateContainerText();
      break;
    case "import":
      importDictionary();
      break;
    case "import-container":
      importContainerText();
      break;
    case "reset":
      seed();
      render();
      break;
  }
}

function bindInteractions(app: HTMLElement): void {
  app.querySelectorAll<HTMLInputElement>("input[data-owned]").forEach((input) => {
    input.addEventListener("change", () => toggleOwned(input.dataset.owned ?? ""));
  });

  app.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("[data-field]").forEach((input) => {
    const eventName = input instanceof HTMLSelectElement ? "change" : "input";
    input.addEventListener(eventName, () => setState(input.dataset.field as keyof typeof state, input.value));
  });

  app.querySelectorAll<HTMLSelectElement>("[data-query-rule-field]").forEach((select) => {
    select.addEventListener("change", () => {
      updateQueryRule(
        select.dataset.queryRuleId ?? "",
        select.dataset.queryRuleField as "type",
        select.value
      );
    });
  });

  app.querySelectorAll<HTMLSelectElement>("[data-query-rule-tag-index]").forEach((select) => {
    select.addEventListener("change", () => {
      updateQueryRuleTag(
        select.dataset.queryRuleId ?? "",
        Number(select.dataset.queryRuleTagIndex ?? "-1"),
        select.value
      );
    });
  });

  app.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.action ?? "", button));
  });

  app.querySelectorAll<HTMLButtonElement>("[data-format]").forEach((button) => {
    button.addEventListener("click", () => exportDictionary(button.dataset.format as GameplayTagDictionaryFormat));
  });
}

function render(): void {
  const app = document.querySelector<HTMLDivElement>("#app");

  if (!app) {
    return;
  }

  ensureSelections();

  app.innerHTML = `
    <div class="app-shell">
      ${renderTopNav()}
      <main class="guide-main">
        ${renderHero()}
        ${guideSteps().map((step, index) => renderGuideStep(step, index)).join("")}
        ${renderApiAtlas()}
      </main>
    </div>
  `;

  bindInteractions(app);

  createIcons({
    icons: {
      BookOpen,
      Boxes,
      Braces,
      ClipboardCheck,
      Database,
      FileJson,
      FileText,
      GitBranch,
      Layers3,
      Map,
      Play,
      Plus,
      RotateCcw,
      Search,
      ShieldCheck,
      TableProperties,
      Tags,
      Trash2,
      Upload,
      Workflow
    }
  });
}

seed();
render();

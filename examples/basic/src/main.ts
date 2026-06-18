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
  RotateCcw,
  Search,
  ShieldCheck,
  TableProperties,
  Tags,
  Upload,
  Workflow
} from "lucide";
import { createIcons } from "lucide";
import {
  BlueprintGameplayTagLibrary,
  EGameplayTagSourceType,
  FGameplayTagQuery,
  filterGameplayTagQueryMatches,
  GameplayTagDictionaryDiagnostic,
  GameplayTagDictionaryFormat,
  GameplayTagsManager,
  doesGameplayTagContainerMatchQuery,
  importGameplayTagDictionary,
  makeGameplayTagContainer,
  makeGameplayTagQueryFromFilters,
  parseGameplayTagDictionary,
  parseGameplayTagQuery,
  requestGameplayTag,
  stringifyGameplayTagDictionary,
  stringifyGameplayTagQuery,
  validateGameplayTagDictionary
} from "@potionify/gameplay-tags";
import "./styles.css";

const seedDictionary = {
  gameplayTagList: [
    { Tag: "Note.Status.Draft", DevComment: "Editable note" },
    { Tag: "Note.Status.Review", DevComment: "Ready for review" },
    { Tag: "Note.Status.Published", DevComment: "Visible to readers" },
    { Tag: "Note.Type.Journal", DevComment: "Long-form note" },
    { Tag: "Note.Type.Task", DevComment: "Actionable note" },
    { Tag: "Note.Topic.Engine", DevComment: "Engine notes" },
    { Tag: "Note.Topic.Rendering", DevComment: "Rendering notes" },
    { Tag: "Note.Topic.Design", DevComment: "Design notes" },
    { Tag: "Character.State.Stunned", DevComment: "Gameplay state" },
    { Tag: "Character.State.Burning", DevComment: "Gameplay state" }
  ],
  restrictedGameplayTagList: [
    { Tag: "Note.Internal.Archived", DevComment: "Hidden archive state", bAllowNonRestrictedChildren: true }
  ],
  gameplayTagRedirects: [
    { OldTagName: "Note.Status.ReadyForReview", NewTagName: "Note.Status.Review" }
  ]
};

const manager = GameplayTagsManager.get();

const sampleNotes = [
  { title: "Draft engine note", tags: ["Note.Status.Draft", "Note.Topic.Engine", "Note.Type.Task"] },
  { title: "Published rendering note", tags: ["Note.Status.Published", "Note.Topic.Rendering", "Note.Type.Journal"] },
  { title: "Design review checklist", tags: ["Note.Status.Review", "Note.Topic.Design", "Note.Type.Task"] },
  { title: "Character state note", tags: ["Character.State.Stunned", "Note.Topic.Engine"] }
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

const state = {
  owned: new Set(["Note.Status.Draft", "Note.Topic.Engine", "Note.Type.Task"]),
  filter: "Note",
  required: "Note.Status",
  blocked: "Character.State",
  exact: "Note.Topic.Engine",
  validation: " .Note.Bad,Tag. ",
  sourceTag: "Note.Status.Draft",
  dictionaryFormat: "json" as GameplayTagDictionaryFormat,
  dictionaryText: "",
  diagnostics: [] as GameplayTagDictionaryDiagnostic[],
  importSummary: "Seed dictionary loaded"
};

function seed(): void {
  manager.reset();
  importGameplayTagDictionary(seedDictionary, {
    sourceName: "ExampleNotes",
    sourceType: EGameplayTagSourceType.TagList,
    restrictedSourceName: "ExampleRestricted"
  });
  state.dictionaryText = stringifyGameplayTagDictionary(manager.exportGameplayTagDictionary(), state.dictionaryFormat);
  state.diagnostics = [];
  state.importSummary = "Seed dictionary loaded";
  ensureSelections();
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
  const fallback = firstTag("Note");

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

  for (const key of ["required", "blocked", "exact", "filter", "sourceTag"] as const) {
    if (!allTags.has(state[key])) {
      state[key] = fallback;
    }
  }
}

function ownedContainer() {
  return makeGameplayTagContainer([...state.owned]);
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

function toggleOwned(tag: string): void {
  if (state.owned.has(tag)) {
    state.owned.delete(tag);
  } else {
    state.owned.add(tag);
  }

  render();
}

function setState(key: keyof typeof state, value: string): void {
  if (key === "dictionaryFormat") {
    state.dictionaryFormat = value as GameplayTagDictionaryFormat;
    exportDictionary(state.dictionaryFormat);
    return;
  }

  if (key === "dictionaryText") {
    state.dictionaryText = value;
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
      <button class="tree-node ${explicit ? "explicit" : "parent"} ${owned ? "selected" : ""}" data-owned="${escapeHtml(path)}" ${explicit ? "" : "disabled"}>
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

function renderQueryVisual(): string {
  const container = ownedContainer();
  const required = makeGameplayTagContainer([state.required]);
  const blocked = makeGameplayTagContainer([state.blocked]);
  const exact = makeGameplayTagContainer([state.exact]);
  const query = makeGameplayTagQueryFromFilters({
    anyTags: required,
    noTags: blocked,
    exactAnyTags: exact,
    description: `${state.required} + exact ${state.exact} and not ${state.blocked}`
  });
  const matchingNotes = filterGameplayTagQueryMatches(sampleNotes, query, (note) => note.tags);

  return `
    <div class="query-map">
      ${renderQueryNode("Any tag", state.required, container.hasAny(required))}
      ${renderQueryNode("Exact tag", state.exact, container.hasAnyExact(exact))}
      ${renderQueryNode("No tag", state.blocked, !container.hasAny(blocked))}
      <div class="query-result ${query.matches(container) ? "yes" : "no"}">
        <span>Combined query</span>
        <strong>${query.matches(container) ? "matches" : "blocked"}</strong>
      </div>
    </div>
    <div class="note-results">
      ${matchingNotes.map((note) => `
        <div class="note-row">
          <strong>${escapeHtml(note.title)}</strong>
          <span>${note.tags.map((tag) => escapeHtml(tag)).join(" / ")}</span>
        </div>
      `).join("") || `<div class="note-row"><strong>No notes matched</strong><span>Adjust the selectors below.</span></div>`}
    </div>
  `;
}

function renderQueryNode(label: string, tag: string, matched: boolean): string {
  return `
    <div class="query-node ${matched ? "yes" : "no"}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(tag)}</strong>
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

function renderLiveControls(): string {
  const explicit = dictionaryTags(true);

  return `
    <section class="guide-section workbench" id="live-workbench">
      <div class="section-heading">
        <span class="section-kicker">Interactive examples</span>
        <h2>Change the tags and watch every example update.</h2>
        <p>The guide uses the real package APIs. The selected note tags below feed the container, matching, filtering, query, and dictionary examples on the page.</p>
      </div>
      <div class="workbench-layout">
        <div class="dictionary-rail">
          <h3>Dictionary</h3>
          <p>${explicit.length} explicit tags from the seed note-app dictionary.</p>
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
        <div class="controls-grid">
          ${renderSelector("Match against", "required", state.required)}
          ${renderSelector("Exact tag", "exact", state.exact)}
          ${renderSelector("Blocked tag", "blocked", state.blocked)}
          ${renderSelector("Filter by", "filter", state.filter)}
          ${renderSelector("Source data", "sourceTag", state.sourceTag)}
          <label class="field">
            <span>Validate string</span>
            <input data-field="validation" value="${escapeHtml(state.validation)}" />
          </label>
        </div>
      </div>
    </section>
  `;
}

function installStep(): GuideStep {
  return {
    id: "install",
    kicker: "Start",
    title: "Install the scoped package.",
    summary: "Use the scoped package for application code. The unscoped package only exists as a handoff for accidental installs.",
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
    output: () => `
      <div class="metric-grid compact">
        ${metric("package", "@potionify/gameplay-tags")}
        ${metric("dist-tag", "beta")}
        ${metric("module", "ESM/CJS")}
        ${metric("example", "GitHub Pages")}
      </div>
    `
  };
}

function dictionaryStep(): GuideStep {
  return {
    id: "dictionary",
    kicker: "Recipe 1",
    title: "Load a tag dictionary from note-app data.",
    summary: "The manager keeps explicit tags, restricted tags, redirects, source metadata, and implicit parent nodes in one place.",
    icon: "database",
    code: () => `
const manager = GameplayTagsManager.get();

manager.reset();
importGameplayTagDictionary(seedDictionary, {
  sourceName: "ExampleNotes",
  sourceType: EGameplayTagSourceType.TagList,
  restrictedSourceName: "ExampleRestricted"
});

const exported = manager.exportGameplayTagDictionary();`,
    visual: renderTagTree,
    output: () => {
      const all = dictionaryTags(false);
      const explicit = dictionaryTags(true);
      const redirects = manager.getGameplayTagRedirects();
      return `
        <div class="metric-grid compact">
          ${metric("explicit tags", explicit.length)}
          ${metric("with parents", all.length)}
          ${metric("redirects", redirects.length)}
          ${metric("restricted", seedDictionary.restrictedGameplayTagList.length)}
        </div>
      `;
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
    visual: renderContainerVisual,
    output: () => {
      const container = ownedContainer();
      const required = requestGameplayTag(state.required, false);
      const firstOwned = container.first();
      return `
        <div class="metric-grid compact">
          ${metric("num", container.num())}
          ${metric("hasTag", required.isValid() ? container.hasTag(required) : false)}
          ${metric("hasTagExact", required.isValid() ? container.hasTagExact(required) : false)}
          ${metric("matchesTagDepth", firstOwned.isValid() && required.isValid() ? firstOwned.matchesTagDepth(required) : 0)}
        </div>
      `;
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
      return `
        <div class="metric-grid compact">
          ${metric("filter matches", container.filter(filter).num())}
          ${metric("exact matches", container.filterExact(filter).num())}
          ${metric("filter tag", state.filter)}
          ${metric("owned tags", container.num())}
        </div>
      `;
    }
  };
}

function queryStep(): GuideStep {
  return {
    id: "queries",
    kicker: "Recipe 4",
    title: "Persist search state as gameplay tag queries.",
    summary: "Query helpers turn note-app filters into serializable query objects that can be matched against containers or records.",
    icon: "workflow",
    code: () => `
const query = makeGameplayTagQueryFromFilters({
  anyTags: ["${state.required}"],
  noTags: ["${state.blocked}"],
  exactAnyTags: ["${state.exact}"],
  description: "notes filter"
});

const saved = stringifyGameplayTagQuery(query);
const loaded = parseGameplayTagQuery(saved);

filterGameplayTagQueryMatches(notes, loaded, (note) => note.tags);`,
    visual: renderQueryVisual,
    output: () => {
      const query = makeGameplayTagQueryFromFilters({
        anyTags: [state.required],
        noTags: [state.blocked],
        exactAnyTags: [state.exact],
        description: "notes filter"
      });
      const saved = stringifyGameplayTagQuery(query);
      const loaded = parseGameplayTagQuery(saved);
      const container = ownedContainer();
      return `
        <div class="metric-grid compact">
          ${metric("container matches", doesGameplayTagContainerMatchQuery(container, loaded))}
          ${metric("round trip", loaded.equals(query))}
          ${metric("query tags", loaded.getGameplayTagArray().length)}
          ${metric("description", loaded.getDescription() || "auto")}
        </div>
      `;
    }
  };
}

function dictionaryFormatsStep(): GuideStep {
  return {
    id: "formats",
    kicker: "Recipe 5",
    title: "Import and export JSON, CSV, or Unreal INI.",
    summary: "The same dictionary shape can travel through structured JSON, spreadsheet-friendly CSV, or Unreal `DefaultGameplayTags.ini` style config.",
    icon: "file-json",
    code: () => `
const text = stringifyGameplayTagDictionary(
  manager.exportGameplayTagDictionary(),
  "${state.dictionaryFormat}"
);

const parsed = parseGameplayTagDictionary(text, "${state.dictionaryFormat}");
const validation = validateGameplayTagDictionary(parsed);`,
    visual: renderDictionaryPreview,
    output: () => `
      <div class="data-editor">
        <div class="data-toolbar">
          <label class="field inline">
            <span>Format</span>
            <select data-field="dictionaryFormat">
              <option value="json" ${state.dictionaryFormat === "json" ? "selected" : ""}>JSON</option>
              <option value="csv" ${state.dictionaryFormat === "csv" ? "selected" : ""}>CSV</option>
              <option value="ini" ${state.dictionaryFormat === "ini" ? "selected" : ""}>INI</option>
            </select>
          </label>
          <button data-action="export-json" title="Export JSON"><i data-lucide="file-json"></i><span>JSON</span></button>
          <button data-action="export-csv" title="Export CSV"><i data-lucide="table-properties"></i><span>CSV</span></button>
          <button data-action="export-ini" title="Export INI"><i data-lucide="file-text"></i><span>INI</span></button>
          <button data-action="validate" title="Validate dictionary"><i data-lucide="clipboard-check"></i><span>Validate</span></button>
          <button data-action="import" title="Import dictionary"><i data-lucide="upload"></i><span>Import</span></button>
          <button data-action="reset" title="Reset dictionary"><i data-lucide="rotate-ccw"></i><span>Reset</span></button>
        </div>
        <textarea data-field="dictionaryText" spellcheck="false">${escapeHtml(state.dictionaryText)}</textarea>
        <div class="diagnostics">${renderDiagnostics()}</div>
      </div>
    `
  };
}

function validationStep(): GuideStep {
  return {
    id: "validation",
    kicker: "Recipe 6",
    title: "Validate tag names before users commit them.",
    summary: "Validation returns a safe fixed string plus readable diagnostics, so note apps can repair common mistakes before import.",
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
        <div class="validation-strip ${result.isValid ? "ok" : "error"}">
          <span>${result.isValid ? "Valid tag" : "Needs repair"}</span>
          <strong>${escapeHtml(result.fixedString || "none")}</strong>
          <em>${escapeHtml(result.error || "No validation errors")}</em>
        </div>
      `;
    },
    output: () => {
      const result = manager.validateGameplayTagString(state.validation);
      return `
        <div class="metric-grid compact">
          ${metric("isValid", result.isValid)}
          ${metric("fixedString", result.fixedString || "none")}
          ${metric("error", result.error || "none")}
          ${metric("input", state.validation)}
        </div>
      `;
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

redirectGameplayTagName("Note.Status.ReadyForReview");`,
    visual: () => {
      const data = manager.getTagEditorData(state.sourceTag);
      const redirects = manager.getGameplayTagRedirects();
      return `
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
      return `
        <div class="metric-grid compact">
          ${metric("explicit", data?.isTagExplicit ?? false)}
          ${metric("restricted", data?.isRestrictedTag ?? false)}
          ${metric("source", data?.firstTagSource || "implicit")}
          ${metric("redirect result", manager.redirectGameplayTagName("Note.Status.ReadyForReview"))}
        </div>
      `;
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
      return `
        <div class="metric-grid compact">
          ${metric("Blueprint hasAllTags", BlueprintGameplayTagLibrary.hasAllTags(container, exact, true))}
          ${metric("Unreal alias HasTag", container.HasTag(requestGameplayTag(state.required, false)))}
          ${metric("camelCase hasTag", container.hasTag(requestGameplayTag(state.required, false)))}
          ${metric("same result", container.HasTag(requestGameplayTag(state.required, false)) === container.hasTag(requestGameplayTag(state.required, false)))}
        </div>
      `;
    }
  };
}

function guideSteps(): GuideStep[] {
  return [
    installStep(),
    dictionaryStep(),
    containerStep(),
    filteringStep(),
    queryStep(),
    dictionaryFormatsStep(),
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
    summary: "Portable dictionaries for note apps, Unreal config, and table-like import/export.",
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
          <h3>Live output</h3>
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
    ["live-workbench", "Workbench"],
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
        <span class="section-kicker">Developer guide + live workbench</span>
        <h1>Gameplay tags for TypeScript tools that need Unreal-style semantics.</h1>
        <p>Walk through the public API one example at a time. Every output below is computed from the package running in this page.</p>
        <div class="hero-actions">
          <a href="#live-workbench" class="button-link"><i data-lucide="play"></i><span>Try examples</span></a>
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
          ${metric("query", makeGameplayTagQueryFromFilters({ anyTags: [state.required], noTags: [state.blocked] }).matches(ownedContainer()))}
        </div>
      </div>
    </section>
  `;
}

function exportDictionary(format: GameplayTagDictionaryFormat): void {
  state.dictionaryFormat = format;
  state.dictionaryText = stringifyGameplayTagDictionary(manager.exportGameplayTagDictionary(), format);
  state.diagnostics = [];
  state.importSummary = `${format.toUpperCase()} export ready`;
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
      sourceName: "ImportedNotes",
      sourceType: sourceTypeForFormat(state.dictionaryFormat)
    });
    state.diagnostics = result.diagnostics;
    state.importSummary = `Imported ${result.importedTags.num()} tags: ${diagnosticSummary()}`;
    ensureSelections();
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

function handleAction(action: string): void {
  switch (action) {
    case "export-json":
      exportDictionary("json");
      break;
    case "export-csv":
      exportDictionary("csv");
      break;
    case "export-ini":
      exportDictionary("ini");
      break;
    case "validate":
      validateDictionaryText();
      break;
    case "import":
      importDictionary();
      break;
    case "reset":
      seed();
      render();
      break;
  }
}

function bindInteractions(app: HTMLElement): void {
  app.querySelectorAll<HTMLInputElement>("[data-owned]").forEach((input) => {
    input.addEventListener("change", () => toggleOwned(input.dataset.owned ?? ""));
    input.addEventListener("click", () => {
      if (input.tagName.toLocaleLowerCase("button") === "button") {
        toggleOwned(input.dataset.owned ?? "");
      }
    });
  });

  app.querySelectorAll<HTMLButtonElement>("button[data-owned]").forEach((button) => {
    button.addEventListener("click", () => toggleOwned(button.dataset.owned ?? ""));
  });

  app.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("[data-field]").forEach((input) => {
    const eventName = input instanceof HTMLSelectElement ? "change" : "input";
    input.addEventListener(eventName, () => setState(input.dataset.field as keyof typeof state, input.value));
  });

  app.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.action ?? ""));
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
        ${renderLiveControls()}
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
      RotateCcw,
      Search,
      ShieldCheck,
      TableProperties,
      Tags,
      Upload,
      Workflow
    }
  });
}

seed();
render();

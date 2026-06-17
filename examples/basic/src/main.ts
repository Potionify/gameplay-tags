import {
  ClipboardCheck,
  Database,
  FileJson,
  FileText,
  GitBranch,
  ListChecks,
  RotateCcw,
  Search,
  ShieldCheck,
  TableProperties,
  Tag,
  Tags,
  Upload,
  Workflow,
  X
} from "lucide";
import { createIcons } from "lucide";
import {
  EGameplayTagSourceType,
  FGameplayTagQuery,
  filterGameplayTagQueryMatches,
  GameplayTagDictionaryDiagnostic,
  GameplayTagDictionaryFormat,
  GameplayTagsManager,
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
  { title: "Character state note", tags: ["Character.State.Stunned", "Note.Topic.Engine"] }
];

const state = {
  owned: new Set(["Note.Status.Draft", "Note.Topic.Engine", "Note.Type.Task"]),
  filter: "Note",
  required: "Note.Status",
  blocked: "Character.State",
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

  if (!allTags.has(state.required)) {
    state.required = fallback;
  }

  if (!allTags.has(state.blocked)) {
    state.blocked = fallback;
  }

  if (!allTags.has(state.filter)) {
    state.filter = fallback;
  }

  if (!allTags.has(state.sourceTag)) {
    state.sourceTag = fallback;
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

function renderDictionary(): string {
  const explicit = dictionaryTags(true);

  return `
    <section class="panel dictionary">
      <div class="panel-header">
        <div>
          <h2>Dictionary</h2>
          <p>${explicit.length} explicit tags</p>
        </div>
        <i data-lucide="tags"></i>
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
    </section>
  `;
}

function renderOwned(): string {
  const container = ownedContainer();
  const parents = container.getGameplayTagParents().toJSON();

  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Owned Container</h2>
          <p>${container.num()} explicit tags</p>
        </div>
        <i data-lucide="list-checks"></i>
      </div>
      <div class="owned-grid">
        <div>
          <h3>Explicit</h3>
          <div class="pill-list">${container.toJSON().map((tag) => pill(tag, "strong")).join("")}</div>
        </div>
        <div>
          <h3>With Parents</h3>
          <div class="pill-list">${parents.map((tag) => pill(tag, container.hasTagExact(requestGameplayTag(tag)) ? "strong" : "parent")).join("")}</div>
        </div>
      </div>
    </section>
  `;
}

function renderMatching(): string {
  const container = ownedContainer();
  const required = requestGameplayTag(state.required, false);
  const redirected = requestGameplayTag("Note.Status.ReadyForReview", false);
  const firstOwned = container.first();
  const exact = required.isValid() ? container.hasTagExact(required) : false;
  const parent = required.isValid() ? container.hasTag(required) : false;
  const depth = firstOwned.isValid() && required.isValid() ? firstOwned.matchesTagDepth(required) : 0;
  const children = required.isValid() ? manager.requestGameplayTagChildren(required).toJSON() : [];

  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Matching</h2>
          <p>${escapeHtml(firstOwned.isValid() ? firstOwned.getTagName() : "None")} vs ${escapeHtml(state.required)}</p>
        </div>
        <i data-lucide="search"></i>
      </div>
      <label class="field">
        <span>Tag to check</span>
        <select data-field="required">
          ${dictionaryTags(false).map((tag) => tagOption(tag, state.required)).join("")}
        </select>
      </label>
      <div class="metric-grid">
        ${metric("hasTag", parent)}
        ${metric("hasTagExact", exact)}
        ${metric("matchesTagDepth", depth)}
        ${metric("redirect", redirected.getTagName() || "none")}
      </div>
      <div class="pill-list compact">${children.map((tag) => pill(tag, "parent")).join("")}</div>
    </section>
  `;
}

function renderFiltering(): string {
  const container = ownedContainer();
  const filter = makeGameplayTagContainer([state.filter]);

  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Filter</h2>
          <p>${escapeHtml(state.filter)}</p>
        </div>
        <i data-lucide="git-branch"></i>
      </div>
      <label class="field">
        <span>Container to match</span>
        <select data-field="filter">
          ${dictionaryTags(false).map((tag) => tagOption(tag, state.filter)).join("")}
        </select>
      </label>
      <div class="split-output">
        <div>
          <h3>filter</h3>
          <div class="pill-list">${container.filter(filter).toJSON().map((tag) => pill(tag, "strong")).join("") || pill("none")}</div>
        </div>
        <div>
          <h3>filterExact</h3>
          <div class="pill-list">${container.filterExact(filter).toJSON().map((tag) => pill(tag, "strong")).join("") || pill("none")}</div>
        </div>
      </div>
    </section>
  `;
}

function renderQuery(): string {
  const container = ownedContainer();
  const required = makeGameplayTagContainer([state.required]);
  const blocked = makeGameplayTagContainer([state.blocked]);
  const anyRequired = FGameplayTagQuery.makeQueryMatchAnyTags(required);
  const exactRequired = FGameplayTagQuery.makeQueryExactMatchAnyTags(required);
  const noBlocked = FGameplayTagQuery.makeQueryMatchNoTags(blocked);
  const combined = makeGameplayTagQueryFromFilters({
    anyTags: required,
    noTags: blocked,
    description: `${state.required} and not ${state.blocked}`
  });
  const parsed = parseGameplayTagQuery(stringifyGameplayTagQuery(combined));
  const matchingNotes = filterGameplayTagQueryMatches(sampleNotes, parsed, (note) => note.tags);

  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Query</h2>
          <p>${escapeHtml(state.required)} and not ${escapeHtml(state.blocked)}</p>
        </div>
        <i data-lucide="shield-check"></i>
      </div>
      <div class="query-controls">
        <label class="field">
          <span>Required</span>
          <select data-field="required">
            ${dictionaryTags(false).map((tag) => tagOption(tag, state.required)).join("")}
          </select>
        </label>
        <label class="field">
          <span>Blocked</span>
          <select data-field="blocked">
            ${dictionaryTags(false).map((tag) => tagOption(tag, state.blocked)).join("")}
          </select>
        </label>
      </div>
      <div class="metric-grid">
        ${metric("matchAnyTags", anyRequired.matches(container))}
        ${metric("exactMatchAnyTags", exactRequired.matches(container))}
        ${metric("matchNoTags", noBlocked.matches(container))}
        ${metric("fromFilters", combined.matches(container))}
        ${metric("roundTrip", parsed.equals(combined))}
        ${metric("sampleMatches", matchingNotes.length)}
      </div>
      <div class="pill-list compact">${matchingNotes.map((note) => pill(note.title, "strong")).join("") || pill("no notes")}</div>
    </section>
  `;
}

function renderSourceData(): string {
  const data = manager.getTagEditorData(state.sourceTag);
  const redirects = manager.getGameplayTagRedirects();

  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Source Data</h2>
          <p>${escapeHtml(state.sourceTag)}</p>
        </div>
        <i data-lucide="database"></i>
      </div>
      <label class="field">
        <span>Tag</span>
        <select data-field="sourceTag">
          ${dictionaryTags(false).map((tag) => tagOption(tag, state.sourceTag)).join("")}
        </select>
      </label>
      <div class="metric-grid">
        ${metric("explicit", data?.isTagExplicit ?? false)}
        ${metric("restricted", data?.isRestrictedTag ?? false)}
        ${metric("source", data?.firstTagSource || "implicit")}
        ${metric("redirects", redirects.length)}
      </div>
      <div class="pill-list compact">
        ${redirects.map((redirect) => pill(`${redirect.OldTagName} -> ${redirect.NewTagName}`, "parent")).join("") || pill("no redirects")}
      </div>
    </section>
  `;
}

function renderValidation(): string {
  const result = manager.validateGameplayTagString(state.validation);

  return `
    <section class="panel validation">
      <div class="panel-header">
        <div>
          <h2>Validation</h2>
          <p>${result.isValid ? "Valid" : "Needs fix"}</p>
        </div>
        <i data-lucide="${result.isValid ? "tag" : "x"}"></i>
      </div>
      <label class="field">
        <span>Tag string</span>
        <input data-field="validation" value="${escapeHtml(state.validation)}" />
      </label>
      <div class="metric-grid">
        ${metric("isValid", result.isValid)}
        ${metric("fixedString", result.fixedString || "none")}
      </div>
      <p class="error-line">${escapeHtml(result.error)}</p>
    </section>
  `;
}

function renderImportExport(): string {
  return `
    <section class="panel data-panel">
      <div class="panel-header">
        <div>
          <h2>Import / Export</h2>
          <p>${escapeHtml(state.importSummary)}</p>
        </div>
        <i data-lucide="workflow"></i>
      </div>
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
      <div class="diagnostics">
        ${renderDiagnostics()}
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

function render(): void {
  const app = document.querySelector<HTMLDivElement>("#app");

  if (!app) {
    return;
  }

  ensureSelections();

  app.innerHTML = `
    <section class="topbar">
      <div>
        <span class="eyebrow"><i data-lucide="tag"></i> @potionify/gameplay-tags</span>
        <h1>Gameplay Tags Workbench</h1>
      </div>
      <div class="summary">
        ${pill(`${state.owned.size} owned`, "strong")}
        ${pill(`${dictionaryTags(true).length} explicit`, "parent")}
        ${pill(`${dictionaryTags(false).length} with parents`, "plain")}
      </div>
    </section>
    <section class="workspace">
      ${renderDictionary()}
      <div class="main-grid">
        ${renderOwned()}
        ${renderMatching()}
        ${renderFiltering()}
        ${renderQuery()}
        ${renderSourceData()}
        ${renderValidation()}
        ${renderImportExport()}
      </div>
    </section>
  `;

  app.querySelectorAll<HTMLInputElement>("[data-owned]").forEach((input) => {
    input.addEventListener("change", () => toggleOwned(input.dataset.owned ?? ""));
  });

  app.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("[data-field]").forEach((input) => {
    input.addEventListener("input", () => setState(input.dataset.field as keyof typeof state, input.value));
  });

  app.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => {
    button.addEventListener("click", () => handleAction(button.dataset.action ?? ""));
  });

  createIcons({
    icons: {
      ClipboardCheck,
      Database,
      FileJson,
      FileText,
      GitBranch,
      ListChecks,
      RotateCcw,
      Search,
      ShieldCheck,
      TableProperties,
      Tag,
      Tags,
      Upload,
      Workflow,
      X
    }
  });
}

seed();
render();

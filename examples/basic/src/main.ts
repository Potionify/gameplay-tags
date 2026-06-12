import { createIcons, GitBranch, ListChecks, Search, ShieldCheck, Tag, Tags, X } from "lucide";
import {
  FGameplayTagQuery,
  FGameplayTagQueryExpression,
  GameplayTagsManager,
  makeGameplayTagContainer,
  requestGameplayTag
} from "@potionify/gameplay-tags";
import "./styles.css";

const seedTags = [
  "Note.Status.Draft",
  "Note.Status.Review",
  "Note.Status.Published",
  "Note.Type.Journal",
  "Note.Type.Task",
  "Note.Topic.Engine",
  "Note.Topic.Rendering",
  "Note.Topic.Design",
  "Character.State.Stunned",
  "Character.State.Burning"
];

const manager = GameplayTagsManager.get();
manager.reset();
seedTags.forEach((tag) => manager.addNativeGameplayTag(tag));

const state = {
  owned: new Set(["Note.Status.Draft", "Note.Topic.Engine", "Note.Type.Task"]),
  filter: "Note",
  required: "Note.Status",
  blocked: "Character.State",
  validation: "Note.Topic.New"
};

function tagNames(tags: Iterable<{ getTagName(): string }>): string[] {
  return [...tags].map((tag) => tag.getTagName());
}

function dictionaryTags(onlyExplicit: boolean): string[] {
  const container = makeGameplayTagContainer([]);
  manager.requestAllGameplayTags(container, onlyExplicit);
  return tagNames(container).sort((left, right) => left.localeCompare(right));
}

function ownedContainer() {
  return makeGameplayTagContainer([...state.owned]);
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
  state[key] = value as never;
  render();
}

function pill(name: string, tone = "plain"): string {
  return `<span class="pill ${tone}">${name}</span>`;
}

function metric(label: string, value: boolean | number | string): string {
  const tone = value === true ? "yes" : value === false ? "no" : "plain";
  return `<div class="metric"><span>${label}</span><strong class="${tone}">${String(value)}</strong></div>`;
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
        ${explicit.map((tag) => `
          <label class="tag-row">
            <input type="checkbox" data-owned="${tag}" ${state.owned.has(tag) ? "checked" : ""} />
            <span>${tag}</span>
          </label>
        `).join("")}
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
          <p>${firstOwned.isValid() ? firstOwned.getTagName() : "None"} vs ${state.required}</p>
        </div>
        <i data-lucide="search"></i>
      </div>
      <label class="field">
        <span>Tag to check</span>
        <select data-field="required">
          ${dictionaryTags(false).map((tag) => `<option value="${tag}" ${tag === state.required ? "selected" : ""}>${tag}</option>`).join("")}
        </select>
      </label>
      <div class="metric-grid">
        ${metric("hasTag", parent)}
        ${metric("hasTagExact", exact)}
        ${metric("matchesTagDepth", depth)}
        ${metric("children", children.length)}
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
          <p>${state.filter}</p>
        </div>
        <i data-lucide="git-branch"></i>
      </div>
      <label class="field">
        <span>Container to match</span>
        <select data-field="filter">
          ${dictionaryTags(false).map((tag) => `<option value="${tag}" ${tag === state.filter ? "selected" : ""}>${tag}</option>`).join("")}
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
  const expression = new FGameplayTagQueryExpression()
    .allExprMatch()
    .addExpr(new FGameplayTagQueryExpression().anyTagsMatch().addTags(required))
    .addExpr(new FGameplayTagQueryExpression().noTagsMatch().addTags(blocked));
  const combined = FGameplayTagQuery.buildQuery(expression);

  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h2>Query</h2>
          <p>${state.required} and not ${state.blocked}</p>
        </div>
        <i data-lucide="shield-check"></i>
      </div>
      <div class="query-controls">
        <label class="field">
          <span>Required</span>
          <select data-field="required">
            ${dictionaryTags(false).map((tag) => `<option value="${tag}" ${tag === state.required ? "selected" : ""}>${tag}</option>`).join("")}
          </select>
        </label>
        <label class="field">
          <span>Blocked</span>
          <select data-field="blocked">
            ${dictionaryTags(false).map((tag) => `<option value="${tag}" ${tag === state.blocked ? "selected" : ""}>${tag}</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="metric-grid">
        ${metric("matchAnyTags", anyRequired.matches(container))}
        ${metric("exactMatchAnyTags", exactRequired.matches(container))}
        ${metric("matchNoTags", noBlocked.matches(container))}
        ${metric("expression", combined.matches(container))}
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
        <input data-field="validation" value="${state.validation}" />
      </label>
      <div class="metric-grid">
        ${metric("isValid", result.isValid)}
        ${metric("fixedString", result.fixedString || "none")}
      </div>
      <p class="error-line">${result.error}</p>
    </section>
  `;
}

function render(): void {
  const app = document.querySelector<HTMLDivElement>("#app");

  if (!app) {
    return;
  }

  app.innerHTML = `
    <section class="topbar">
      <div>
        <span class="eyebrow"><i data-lucide="tag"></i> @potionify/gameplay-tags</span>
        <h1>Gameplay Tags Workbench</h1>
      </div>
      <div class="summary">
        ${pill(`${state.owned.size} owned`, "strong")}
        ${pill(`${dictionaryTags(false).length} dictionary`, "parent")}
      </div>
    </section>
    <section class="workspace">
      ${renderDictionary()}
      <div class="main-grid">
        ${renderOwned()}
        ${renderMatching()}
        ${renderFiltering()}
        ${renderQuery()}
        ${renderValidation()}
      </div>
    </section>
  `;

  app.querySelectorAll<HTMLInputElement>("[data-owned]").forEach((input) => {
    input.addEventListener("change", () => toggleOwned(input.dataset.owned ?? ""));
  });

  app.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-field]").forEach((input) => {
    input.addEventListener("input", () => setState(input.dataset.field as keyof typeof state, input.value));
  });

  createIcons({
    icons: {
      GitBranch,
      ListChecks,
      Search,
      ShieldCheck,
      Tag,
      Tags,
      X
    }
  });
}

render();

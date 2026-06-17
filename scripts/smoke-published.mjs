import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const version = process.env.GAMEPLAY_TAGS_SMOKE_VERSION ?? "alpha";
const packageNames = ["@potionify/gameplay-tags", "gameplay-tags"];
const packageSpecs = packageNames.map((packageName) => `${packageName}@${version}`);
const cwd = mkdtempSync(join(tmpdir(), "gameplay-tags-smoke-"));

function smokeBody() {
  return [
    "const manager = GameplayTagsManager.get();",
    "manager.reset();",
    "manager.addNativeGameplayTag('Smoke.Status.Pass');",
    "manager.addNativeGameplayTag('Smoke.Topic.Engine');",
    "const owned = makeGameplayTagContainer(['Smoke.Status.Pass', 'Smoke.Topic.Engine']);",
    "if (!owned.hasTag(requestGameplayTag('Smoke.Status'))) throw new Error('parent match failed');",
    "if (!owned.hasTagExact(requestGameplayTag('Smoke.Status.Pass'))) throw new Error('exact match failed');",
    "const dictionary = {",
    "  gameplayTagList: [{ Tag: 'Smoke.Dictionary.Ini', DevComment: 'INI smoke' }],",
    "  restrictedGameplayTagList: [{ Tag: 'Smoke.Dictionary.Restricted', DevComment: 'Restricted smoke', bAllowNonRestrictedChildren: true }],",
    "  gameplayTagRedirects: [{ OldTagName: 'Smoke.Dictionary.Old', NewTagName: 'Smoke.Dictionary.Ini' }]",
    "};",
    "const ini = stringifyGameplayTagDictionary(dictionary, 'ini');",
    "if (!ini.includes('[/Script/GameplayTags.GameplayTagsSettings]')) throw new Error('INI section missing');",
    "if (!ini.includes('+RestrictedGameplayTagList=')) throw new Error('INI restricted rows missing');",
    "const parsedDictionary = parseGameplayTagDictionary(ini, 'ini');",
    "if (parsedDictionary.gameplayTagList[0]?.Tag !== 'Smoke.Dictionary.Ini') throw new Error('INI gameplay tag parse failed');",
    "if (parsedDictionary.restrictedGameplayTagList[0]?.bAllowNonRestrictedChildren !== true) throw new Error('INI restricted flag parse failed');",
    "if (parsedDictionary.gameplayTagRedirects[0]?.NewTagName !== 'Smoke.Dictionary.Ini') throw new Error('INI redirect parse failed');",
    "const importResult = importGameplayTagDictionary(parsedDictionary, { sourceName: 'SmokeIni', sourceType: EGameplayTagSourceType.DefaultTagList });",
    "if (importResult.importedTags.num() !== 2) throw new Error('INI dictionary import failed');",
    "const query = makeGameplayTagQueryFromFilters({",
    "  anyTags: ['Smoke.Status'],",
    "  noTags: ['Smoke.Blocked'],",
    "  exactAnyTags: ['Smoke.Topic.Engine'],",
    "  description: 'published smoke query'",
    "});",
    "const queryJson = stringifyGameplayTagQuery(query);",
    "const parsedQuery = parseGameplayTagQuery(queryJson);",
    "if (!parsedQuery.equals(query)) throw new Error('query round trip failed');",
    "if (!doesGameplayTagContainerMatchQuery(['Smoke.Status.Pass', 'Smoke.Topic.Engine'], parsedQuery)) throw new Error('query match failed');",
    "const records = [",
    "  { id: 'pass', tags: ['Smoke.Status.Pass', 'Smoke.Topic.Engine'] },",
    "  { id: 'blocked', tags: ['Smoke.Status.Pass', 'Smoke.Blocked'] }",
    "];",
    "const matches = filterGameplayTagQueryMatches(records, parsedQuery, (record) => record.tags);",
    "if (matches.length !== 1 || matches[0]?.id !== 'pass') throw new Error('query record filtering failed');"
  ].join("\n");
}

function importList() {
  return [
    "EGameplayTagSourceType",
    "GameplayTagsManager",
    "doesGameplayTagContainerMatchQuery",
    "filterGameplayTagQueryMatches",
    "importGameplayTagDictionary",
    "makeGameplayTagContainer",
    "makeGameplayTagQueryFromFilters",
    "parseGameplayTagDictionary",
    "parseGameplayTagQuery",
    "requestGameplayTag",
    "stringifyGameplayTagDictionary",
    "stringifyGameplayTagQuery"
  ].join(", ");
}

try {
  execFileSync("npm", ["init", "-y"], { cwd, stdio: "ignore" });
  execFileSync("npm", ["install", ...packageSpecs], { cwd, stdio: "inherit" });

  for (const packageName of packageNames) {
    const filePrefix = packageName.replaceAll("/", "-").replaceAll("@", "scoped-");
    const esmFile = join(cwd, `${filePrefix}-esm.mjs`);
    const cjsFile = join(cwd, `${filePrefix}-cjs.cjs`);

    writeFileSync(
      esmFile,
      [
        `import { ${importList()} } from '${packageName}';`,
        smokeBody()
      ].join("\n")
    );

    writeFileSync(
      cjsFile,
      [
        `const { ${importList()} } = require('${packageName}');`,
        smokeBody()
      ].join("\n")
    );

    execFileSync("node", [esmFile], { cwd, stdio: "inherit" });
    execFileSync("node", [cjsFile], { cwd, stdio: "inherit" });
  }

  console.log(`${packageSpecs.join(", ")} passed published ESM/CJS dictionary and query smoke tests.`);
} finally {
  rmSync(cwd, { recursive: true, force: true });
}

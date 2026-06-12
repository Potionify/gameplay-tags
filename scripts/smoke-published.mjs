import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const version = process.env.GAMEPLAY_TAGS_SMOKE_VERSION ?? "alpha";
const spec = `@potionify/gameplay-tags@${version}`;
const cwd = mkdtempSync(join(tmpdir(), "gameplay-tags-smoke-"));

try {
  execFileSync("npm", ["init", "-y"], { cwd, stdio: "ignore" });
  execFileSync("npm", ["install", spec], { cwd, stdio: "inherit" });

  writeFileSync(
    join(cwd, "esm.mjs"),
    [
      "import { GameplayTagsManager, requestGameplayTag, makeGameplayTagContainer } from '@potionify/gameplay-tags';",
      "const manager = GameplayTagsManager.get();",
      "manager.reset();",
      "manager.addNativeGameplayTag('Smoke.Status.Pass');",
      "const owned = makeGameplayTagContainer(['Smoke.Status.Pass']);",
      "if (!owned.hasTag(requestGameplayTag('Smoke.Status'))) throw new Error('ESM parent match failed');"
    ].join("\n")
  );

  writeFileSync(
    join(cwd, "cjs.cjs"),
    [
      "const { GameplayTagsManager, requestGameplayTag, makeGameplayTagContainer } = require('@potionify/gameplay-tags');",
      "const manager = GameplayTagsManager.get();",
      "manager.reset();",
      "manager.addNativeGameplayTag('Smoke.Status.Pass');",
      "const owned = makeGameplayTagContainer(['Smoke.Status.Pass']);",
      "if (!owned.hasTagExact(requestGameplayTag('Smoke.Status.Pass'))) throw new Error('CJS exact match failed');"
    ].join("\n")
  );

  execFileSync("node", ["esm.mjs"], { cwd, stdio: "inherit" });
  execFileSync("node", ["cjs.cjs"], { cwd, stdio: "inherit" });
  console.log(`${spec} passed ESM and CJS smoke tests.`);
} finally {
  rmSync(cwd, { recursive: true, force: true });
}

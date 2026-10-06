#!/usr/bin/env node

// Метрики прогона для Step Summary: тесты по уровням, статусы, время.
// Читает JSON-отчёты Playwright и печатает markdown в stdout.
//
// Использование: node scripts/metrics.mjs <report1.json> [report2.json ...]
// Отсутствующий файл не роняет скрипт — джоба с этим отчётом могла не доехать
// до конца; в таблице будет пометка. Так Summary всегда получает слово.

import { existsSync, readFileSync } from "node:fs";

const LEVEL_ORDER = ["unit", "api", "e2e"];

function collectTests(suite, bucket) {
  for (const child of suite.suites ?? []) {
    collectTests(child, bucket);
  }

  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      const level = test.projectName ?? suite.title ?? "unknown";
      (bucket[level] ??= []).push(test);
    }
  }
}

// Финальный статус теста с учётом ретраев: последний результат решает,
// а «сначала упал, потом прошёл» — это флак.
function classify(test) {
  const results = test.results ?? [];

  if (results.length === 0) {
    return "skipped";
  }

  const statuses = results.map((result) => result.status);
  const last = statuses[statuses.length - 1];

  if (last === "skipped") {
    return "skipped";
  }

  if (last === "passed") {
    const hadFailure = statuses
      .slice(0, -1)
      .some((status) => status !== "passed" && status !== "skipped");

    return hadFailure ? "flaky" : "passed";
  }

  return "failed";
}

function formatSeconds(ms) {
  return `${(ms / 1000).toFixed(1)} с`;
}

const reports = process.argv.slice(2);

if (reports.length === 0) {
  console.error("usage: node scripts/metrics.mjs <report.json> [report.json ...]");
  process.exit(1);
}

// level -> { tests: Test[], missingFiles: string[] }
const byLevel = {};
const missing = [];

for (const path of reports) {
  if (!existsSync(path)) {
    missing.push(path);
    continue;
  }

  const report = JSON.parse(readFileSync(path, "utf8"));

  for (const suite of report.suites ?? []) {
    collectTests(suite, byLevel);
  }
}

const levels = [
  ...LEVEL_ORDER.filter((level) => byLevel[level] !== undefined),
  ...Object.keys(byLevel).filter((level) => !LEVEL_ORDER.includes(level)),
];

const totals = { tests: 0, passed: 0, failed: 0, flaky: 0, skipped: 0, ms: 0 };

const rows = levels.map((level) => {
  const counts = { tests: 0, passed: 0, failed: 0, flaky: 0, skipped: 0, ms: 0 };

  for (const test of byLevel[level]) {
    const verdict = classify(test);
    counts.tests += 1;
    counts[verdict] += 1;
    counts.ms += test.results?.[test.results.length - 1]?.duration ?? 0;
  }

  totals.tests += counts.tests;
  totals.passed += counts.passed;
  totals.failed += counts.failed;
  totals.flaky += counts.flaky;
  totals.skipped += counts.skipped;
  totals.ms += counts.ms;

  return `| ${level} | ${counts.tests} | ${counts.passed} | ${counts.failed} | ${counts.flaky} | ${counts.skipped} | ${formatSeconds(counts.ms)} |`;
});

const executed = totals.tests - totals.skipped;
const flakyRate = executed > 0 ? ((totals.flaky / executed) * 100).toFixed(1) : "0.0";

console.log("## 📊 Метрики прогона");
console.log("");
console.log("| Уровень | Тестов | ✅ Passed | ❌ Failed | 🟡 Flaky | ⏭ Skipped | Время тестов |");
console.log("|---|---:|---:|---:|---:|---:|---:|");
for (const row of rows) {
  console.log(row);
}
console.log(
  `| **Всего** | **${totals.tests}** | **${totals.passed}** | **${totals.failed}** | **${totals.flaky}** | **${totals.skipped}** | **${formatSeconds(totals.ms)}** |`,
);
console.log("");
console.log(`🟡 Flaky rate: ${flakyRate}% (флак / исполненные тесты)`);

if (missing.length > 0) {
  console.log("");
  console.log(`⚠️ Отчёты не найдены (джоба не доехала): ${missing.join(", ")}`);
}

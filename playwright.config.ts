import {
  defineConfig,
  devices,
  type ReporterDescription,
} from "@playwright/test";

// JSON-отчёт в CI идёт в артефакты и метрики Step Summary (scripts/metrics.mjs);
// локально включается переменной PW_JSON_REPORT=путь — им же пользуется gate.
const jsonReport =
  process.env.PW_JSON_REPORT ??
  (process.env.CI ? "test-results/report.json" : undefined);
const junitReport = process.env.CI ? "test-results/junit.xml" : undefined;

const reporters: ReporterDescription[] = [
  ["list"],
  // В CI пишем HTML-artifact, но не пытаемся открыть браузерное окно на headless-runner.
  ["html", { open: process.env.CI ? "never" : "on-failure" }],
];
if (jsonReport) {
  reporters.push(["json", { outputFile: jsonReport }]);
}
if (junitReport) {
  reporters.push(["junit", { outputFile: junitReport }]);
}

export default defineConfig({
  timeout: 30_000,
  fullyParallel: false,
  // В CI повторяем падение один раз, чтобы заметить флак; локально ошибка видна сразу.
  retries: process.env.CI ? 1 : 0,
  // Один CI-worker снижает конкуренцию за пользователей, слоты и бронирования на общем стенде.
  workers: process.env.CI ? 1 : undefined,
  reporter: reporters,
  projects: [
    {
      name: "unit",
      testDir: "./tests/unit",
      // без browser-контекста — тест общается только с чистой функцией
    },
    {
      name: "api",
      testDir: "./tests/api",
      // без browser-контекста — тест общается только по HTTP с локальным мок-сервером
    },
    {
      name: "e2e",
      testDir: "./tests/e2e",
      use: {
        ...devices["Desktop Chrome"],
        baseURL: process.env.POMIDORQA_BASE_URL ?? "https://aiqa.su",
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
      },
    },
  ],
});

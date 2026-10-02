#!/usr/bin/env node

// Pre-push гейт для хука ZCode (событие PreToolUse, матчер Bash).
//
// Команда агента — не git push: мгновенный пропуск (exit 0).
// Команда — git push: прогоняем линт и быстрые тесты (unit + api).
//   Зелёные — exit 0, пуш разрешён. Красные — exit 2, пуш заблокирован.
//
// Сообщения пишем в stderr: stdout хука в ZCode резервируется под JSON-ответ,
// поэтому держим его пустым и работаем кодами выхода.
// Ручной запуск в терминале (stdin — терминал) считается пушем: так скрипт
// удобно проверять руками.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const projectDir = process.env.ZCODE_PROJECT_DIR ?? process.cwd();

function log(message) {
  process.stderr.write(`${message}\n`);
}

function readHookCommand() {
  if (process.stdin.isTTY) {
    return "git push"; // ручной запуск в терминале — проверяем как пуш
  }

  try {
    const input = JSON.parse(readFileSync(0, "utf8"));
    // ZCode кладёт команду в tool_input.command; на всякий случай понимаем
    // и курсовый формат Cursor (input.command). Непонятный вход — не блокируем.
    return input?.tool_input?.command ?? input?.command ?? "";
  } catch {
    return "";
  }
}

function runCheck(title, commandLine) {
  log(`→ ${title}`);

  // shell: true — на Windows Node не запускает .cmd (npm) без шелла,
  // на POSIX sh тоже корректно исполняет эту строку. Аргументы статичные.
  const result = spawnSync(commandLine, {
    cwd: projectDir,
    encoding: "utf8",
    timeout: 180_000,
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const output = [result.stdout, result.stderr]
    .filter(Boolean)
    .join("\n")
    .trim();

  if (output) {
    log(output);
  }

  if (result.error?.code === "ETIMEDOUT") {
    log(`✗ ${title}: не завершилось за 180 секунд`);
    return false;
  }

  if (result.error) {
    log(`✗ ${title}: не удалось запустить — ${result.error.message}`);
    return false;
  }

  if (result.status !== 0) {
    log(`✗ ${title} — провалено (код ${result.status})`);
    return false;
  }

  log(`✓ ${title}`);
  return true;
}

const shellCommand = readHookCommand();

// Регулярка из курсового скрипта: ловит "git push", "git -C ... push",
// "... && git push", но не "git status".
const isGitPush =
  /(?:^|[;&|]\s*)git(?:\s+(?:-[^\s]+)(?:\s+[^\s]+)?)*\s+push(?:\s|$)/.test(
    shellCommand,
  );

if (!isGitPush) {
  process.exit(0);
}

// Сторож: учебный пульт course — только чтение. Блокируем любой пуш,
// в команде которого упомянут course, независимо от результата проверок.
if (/(?:^|\s)course(?:\s|$)/.test(shellCommand)) {
  log("Пуш заблокирован: course — учебный репозиторий (lebed52/pomidorqa-course-tests).");
  log("Работаем только со своим репозиторием: git push origin main");
  process.exit(2);
}

log("git push перехвачен: прогоняю линт и быстрые тесты перед отправкой");

const checks = [
  ["линт (npm run lint)", "npm run lint"],
  ["быстрые тесты (unit + api)", "npx playwright test --project=unit --project=api"],
];

for (const [title, commandLine] of checks) {
  if (!runCheck(title, commandLine)) {
    log(
      "\nПуш заблокирован: отдаём только зелёные (CODEX.md, пункт 10). Почини и попробуй снова.",
    );
    process.exit(2);
  }
}

log("\nПроверки зелёные — пуш можно выполнять.");
process.exit(0);

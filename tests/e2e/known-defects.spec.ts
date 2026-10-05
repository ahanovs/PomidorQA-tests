import { expect, test, type BrowserContext } from "@playwright/test";
import { cleanupUsersViaApi } from "../helpers/user";
import { createHostWithSkillAndSlot } from "../helpers/arrange";
import { BookingPage } from "../pages/booking-page";

test.describe("Известные дефекты PomidorQA", () => {
    // Тест написан по требованию R8.3 из docs/coverage-matrix.md, а не по фактическому
    // поведению: поиск каталога обязан фильтровать по навыкам раздела «могу помочь».
    // Дефект KD-3 подтверждён ручной проверкой стенда 05.10.2026: участник с навыком
    // только в «хочу разобрать» находится поиском. Позитивный поиск по «могу помочь»
    // уже покрыт e2e/catalog-search — если фильтр сломается целиком, красным будет он.
    // Пока дефект жив, падение ожидаемо и прогон остаётся зелёным; когда починят,
    // Playwright сообщит «expected to fail, but passed» — сигнал снять пометку.
    test.fail(
        "поиск по навыку «хочу разобрать» не находит участника (KD-3)",
        async ({ browser }) => {
            const contexts: BrowserContext[] = [];
            const skillTag = `Wantlearn-${Date.now()}`;
            const slotTime = "12:00";
            let viewerContext: BrowserContext | undefined;

            try {
                const host = await test.step(
                    "Хост: профиль с навыком «хочу разобрать» и свободным слотом",
                    () =>
                        createHostWithSkillAndSlot(browser, contexts, {
                            role: "host-wantlearn",
                            skillTag,
                            skillType: "want_to_learn",
                            slotTime,
                        }),
                );

                viewerContext = await browser.newContext();
                const viewer = new BookingPage(await viewerContext.newPage());

                await test.step(
                    "Гость открывает каталог и ищет по навыку «хочу разобрать»",
                    async () => {
                        await viewer.openCatalog();
                        await viewer.findPersonBySkill(skillTag);
                    },
                );

                await test.step(
                    "По требованию R8.3 участника в выдаче быть не должно",
                    async () => {
                        await expect(
                            viewer.personCard(host.host.name),
                        ).toHaveCount(0);
                    },
                );
            } finally {
                await cleanupUsersViaApi(contexts);
                await viewerContext?.close();
            }
        },
    );
});

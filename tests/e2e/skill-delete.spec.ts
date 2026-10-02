import {
    expect,
    test,
    type BrowserContext,
} from "@playwright/test";
import {
    cleanupUsersViaApi,
    makeUser,
    registerUserViaApi,
} from "../helpers/user";
import { createHostWithSkillAndSlot } from "../helpers/arrange";
import { BookingPage } from "../pages/booking-page";

test.describe("Навыки: удаление", () => {
    const contexts: BrowserContext[] = [];

    let guestBooking: BookingPage;

    test.beforeEach(async ({ browser }) => {
        const guest = makeUser("skill-delete-guest", Date.now());

        const guestContext = await browser.newContext();
        contexts.push(guestContext);

        guestBooking = new BookingPage(await guestContext.newPage());

        await registerUserViaApi(guestContext.request, guest);
    });

    test.afterEach(async () => {
        await cleanupUsersViaApi(contexts);
        contexts.length = 0;
    });

    test(
        "удалённый навык исчезает из профиля и поиска в каталоге",
        async ({ browser }) => {
            const skillTag = `DeleteSkill-${Date.now()}`;

            const host = await test.step("Хост: готовим профиль с навыком и свободным слотом", () =>
                createHostWithSkillAndSlot(browser, contexts, {
                    role: "skill-delete-host",
                    skillTag,
                    slotTime: "15:00",
                }),
            );

            await test.step("Гость находит хоста по добавленному навыку", async () => {
                await guestBooking.openCatalog();
                await guestBooking.findPersonBySkill(skillTag);
            });

            await test.step("Гость видит карточку хоста", async () => {
                await expect(guestBooking.personCard(host.host.name)).toBeVisible({
                    timeout: 10_000,
                });
            });

            await test.step("Хост удаляет навык", async () => {
                await host.hostProfile.open();
                await host.hostProfile.deleteSkill(skillTag);
            });

            await test.step("Удалённый навык исчез из профиля", async () => {
                await expect(host.hostProfile.skillChip(skillTag)).toHaveCount(0);
            });

            await test.step(
                "После удаления навыка гость больше не находит хоста",
                async () => {
                    await guestBooking.openCatalog();
                    await guestBooking.findPersonBySkill(skillTag);

                    await expect(guestBooking.catalogEmptyState).toBeVisible({
                        timeout: 10_000,
                    });
                    await expect(guestBooking.catalogCards).toHaveCount(0);
                },
            );
        },
    );
});

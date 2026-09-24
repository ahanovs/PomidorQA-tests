import {
    expect,
    test,
    type BrowserContext,
} from "@playwright/test";
import {
    cleanupUsersViaApi,
    makeUser,
    registerUserViaApi,
    type TestUser,
} from "../helpers/user";
import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";

function tomorrowDate(): string {
    return new Date(Date.now() + 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
}

test.describe("Навыки: удаление", () => {
    const contexts: BrowserContext[] = [];

    let host: TestUser;
    let guest: TestUser;
    let skillTag: string;
    let hostProfile: ProfilePage;
    let hostBooking: BookingPage;
    let guestBooking: BookingPage;

    test.beforeEach(async ({ browser }) => {
        const runId = Date.now();

        host = makeUser("skill-delete-host", runId);
        guest = makeUser("skill-delete-guest", runId);
        skillTag = `DeleteSkill-${runId}`;

        const hostContext = await browser.newContext();
        contexts.push(hostContext);

        const guestContext = await browser.newContext();
        contexts.push(guestContext);

        const hostPage = await hostContext.newPage();
        const guestPage = await guestContext.newPage();

        hostProfile = new ProfilePage(hostPage);
        hostBooking = new BookingPage(hostPage);
        guestBooking = new BookingPage(guestPage);

        await registerUserViaApi(hostContext.request, host);
        await registerUserViaApi(guestContext.request, guest);
    });

    test.afterEach(async () => {
        await cleanupUsersViaApi(contexts);
        contexts.length = 0;
    });

    test(
        "удалённый навык исчезает из профиля и поиска в каталоге",
        async () => {
            await test.step("Хост добавляет навык «Могу помочь»", async () => {
                await hostProfile.open();
                await hostProfile.addCanHelpSkill(skillTag);

                await expect(hostProfile.skillChip(skillTag)).toBeVisible();
            });

            await test.step("Хост добавляет свободный слот на завтра", async () => {
                await hostBooking.goToSlots();
                await hostBooking.addSlot(tomorrowDate(), "15:00");

                await expect(hostBooking.slotCard("15:00")).toBeVisible({
                    timeout: 10_000,
                });
            });

            await test.step("Гость находит хоста по добавленному навыку", async () => {
                await guestBooking.openCatalog();
                await guestBooking.findPersonBySkill(skillTag);

                await expect(
                    guestBooking.personCard(host.name),
                ).toBeVisible({
                    timeout: 10_000,
                });
            });

            await test.step("Хост удаляет навык", async () => {
                await hostProfile.open();
                await hostProfile.deleteSkill(skillTag);
            });

            await test.step("Удалённый навык исчез из профиля", async () => {
                await expect(hostProfile.skillChip(skillTag)).toHaveCount(0);
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
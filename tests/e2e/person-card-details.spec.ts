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

test.describe("Страница участника: данные профиля", () => {
    const contexts: BrowserContext[] = [];

    let runId: number;
    let host: TestUser;
    let guest: TestUser;
    let hostProfile: ProfilePage;
    let hostBooking: BookingPage;
    let guestBooking: BookingPage;

    test.beforeEach(async ({ browser }) => {
        runId = Date.now();

        host = makeUser("person-details-host", runId);
        guest = makeUser("person-details-guest", runId);

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
        "показывает bio, Telegram, навыки двух типов и timezone слотов",
        async () => {
            const bio = `QA-профиль для проверки карточки ${runId}`;
            const telegram = `@person_details_${runId}`;
            const canHelpSkill = `Playwright-${runId}`;
            const wantToLearnSkill = `SQL-${runId}`;

            await test.step("Хост заполняет профиль и добавляет навыки", async () => {
                await hostProfile.open();

                await hostProfile.fillNameTelegramBioAndSave(
                    host.name,
                    telegram,
                    bio,
                );

                await hostProfile.open();

                await hostProfile.addCanHelpSkill(canHelpSkill);

                await expect(hostProfile.skillChip(canHelpSkill)).toBeVisible({
                    timeout: 10_000,
                });

                await hostProfile.addWantToLearnSkill(wantToLearnSkill);

                await expect(
                    hostProfile.skillChip(wantToLearnSkill),
                ).toBeVisible({
                    timeout: 10_000,
                });
            });

            await test.step("Хост добавляет свободный слот", async () => {
                await hostBooking.goToSlots();
                await hostBooking.addSlot(tomorrowDate(), "16:00");

                await expect(hostBooking.slotCard("16:00")).toBeVisible({
                    timeout: 10_000,
                });
            });

            await test.step(
                "Гость находит хоста и открывает его страницу",
                async () => {
                    await guestBooking.openCatalog();
                    await guestBooking.findPersonBySkill(canHelpSkill);

                    await expect(
                        guestBooking.personCard(host.name),
                    ).toBeVisible({
                        timeout: 10_000,
                    });

                    await guestBooking.openPersonCard(host.name);
                },
            );

            await test.step(
                "Страница показывает данные профиля хоста",
                async () => {
                    await expect(guestBooking.personName).toHaveText(host.name);
                    await expect(guestBooking.personBio).toHaveText(bio);
                    await expect(guestBooking.personTelegram).toHaveText(
                        telegram,
                    );
                },
            );

            await test.step(
                "Страница разделяет навыки двух типов",
                async () => {
                    await expect(
                        guestBooking.personCanHelpSkill(canHelpSkill),
                    ).toBeVisible();

                    await expect(
                        guestBooking.personWantToLearnSkill(wantToLearnSkill),
                    ).toBeVisible();

                    await expect(
                        guestBooking.personCanHelpSkill(wantToLearnSkill),
                    ).toHaveCount(0);

                    await expect(
                        guestBooking.personWantToLearnSkill(canHelpSkill),
                    ).toHaveCount(0);
                },
            );

            await test.step(
                "Страница сообщает часовой пояс свободных слотов",
                async () => {
                    await expect(
                        guestBooking.personSlotsTimezone,
                    ).toContainText("Europe/Moscow");
                },
            );

            await test.step("Страница показывает свободный слот", async () => {
                await expect(guestBooking.calendarDayChip()).toBeVisible({
                    timeout: 10_000,
                });

                await expect(guestBooking.calendarTimeChip()).toHaveText(
                    "16:00",
                );
            });
        },
    );
});
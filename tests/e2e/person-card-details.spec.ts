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
import { tomorrowDate } from "../helpers/dates";
import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";

test.describe("Страница участника: данные профиля", () => {
    const contexts: BrowserContext[] = [];

    let runId: number;
    let host: ReturnType<typeof makeUser>;
    let hostProfile: ProfilePage;
    let hostBooking: BookingPage;
    let guestBooking: BookingPage;

    test.beforeEach(async ({ browser }) => {
        runId = Date.now();

        host = makeUser("person-details-host", runId);
        const guest = makeUser("person-details-guest", runId);

        const hostContext = await browser.newContext();
        contexts.push(hostContext);

        const guestContext = await browser.newContext();
        contexts.push(guestContext);

        hostProfile = new ProfilePage(await hostContext.newPage());
        hostBooking = new BookingPage(await hostContext.newPage());
        guestBooking = new BookingPage(await guestContext.newPage());

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

            await test.step("Хост открывает профиль и заполняет данные", async () => {
                await hostProfile.open();

                await hostProfile.fillNameTelegramBioAndSave(
                    host.name,
                    telegram,
                    bio,
                );
            });

            await test.step("Хост добавляет навык «могу помочь»", async () => {
                await hostProfile.open();
                await hostProfile.addCanHelpSkill(canHelpSkill);
            });

            await test.step("Навык «могу помочь» появился", async () => {
                await expect(hostProfile.skillChip(canHelpSkill)).toBeVisible({
                    timeout: 10_000,
                });
            });

            await test.step("Хост добавляет навык «хочу разобрать»", async () => {
                await hostProfile.addWantToLearnSkill(wantToLearnSkill);
            });

            await test.step("Навык «хочу разобрать» появился", async () => {
                await expect(hostProfile.skillChip(wantToLearnSkill)).toBeVisible({
                    timeout: 10_000,
                });
            });

            await test.step("Хост добавляет свободный слот", async () => {
                await hostBooking.goToSlots();
                await hostBooking.addSlot(tomorrowDate(), "16:00");
            });

            await test.step("Слот появился в списке", async () => {
                await expect(hostBooking.slotCard("16:00")).toBeVisible({
                    timeout: 10_000,
                });
            });

            await test.step(
                "Гость открывает каталог и ищет хоста по навыку",
                async () => {
                    await guestBooking.openCatalog();
                    await guestBooking.findPersonBySkill(canHelpSkill);
                },
            );

            await test.step("Гость видит карточку хоста", async () => {
                await expect(guestBooking.personCard(host.name)).toBeVisible({
                    timeout: 10_000,
                });
            });

            await test.step("Гость открывает карточку хоста", async () => {
                await guestBooking.openPersonCard(host.name);
            });

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

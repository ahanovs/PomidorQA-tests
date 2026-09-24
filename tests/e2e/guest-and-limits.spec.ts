import { test, expect, type BrowserContext } from "@playwright/test";
import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";
import {
    makeUser,
    registerUserViaApi,
    cleanupUsersViaApi,
    type RegisteredParticipant,
} from "../helpers/user";


function tomorrowDate(): string {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return tomorrow.toISOString().slice(0, 10);
}


test.describe("Гость и ограничения бронирования PomidorQA", () => {
    test("гость без регистрации видит каталог и страницу участника, но не может забронировать слот", async ({
        browser,
    }) => {
        const runId = Date.now();
        const hostData = makeUser("host", runId);
        const contexts: BrowserContext[] = [];


        let host: RegisteredParticipant;
        let hostProfile: ProfilePage;
        let hostBooking: BookingPage;


        {
            const context = await browser.newContext();
            contexts.push(context);
            host = await registerUserViaApi(context.request, hostData);
            const page = await context.newPage();
            hostProfile = new ProfilePage(page);
            hostBooking = new BookingPage(page);


            await test.step("Хост открывает профиль и добавляет навык", async () => {
                await hostProfile.open();
                await hostProfile.addCanHelpSkill("Playwright");
            });


            await test.step("Навык появился в блоке «Могу помочь»", async () => {
                await expect(hostProfile.canHelpSkills).toContainText("Playwright");
            });


            await test.step("Хост добавляет свободный слот на завтра", async () => {
                await hostBooking.goToSlots();
                await hostBooking.addSlot(tomorrowDate(), "12:00");
            });


            await test.step("Слот появился в списке", async () => {
                await expect(hostBooking.slotCard("12:00")).toBeVisible({
                    timeout: 10_000,
                });
            });
        }


        const guestContext = await browser.newContext();
        const guestPage = await guestContext.newPage();
        const booking = new BookingPage(guestPage);


        await test.step("Гость открывает каталог", async () => {
            await booking.openCatalog();
        });


        await test.step("Гость ищет участника по навыку", async () => {
            await booking.findPersonBySkill("Playwright");
        });


        await test.step("Гость видит карточку хоста в выдаче", async () => {
            await expect(booking.personCard(hostData.name)).toBeVisible();
        });


        await test.step("Гость открывает страницу участника и видит свободный слот", async () => {
            await booking.openPersonCard(hostData.name);
            await expect(booking.personName).toHaveText(hostData.name);
            await expect(booking.personSlotsTimezone).toBeVisible();
        });


        await test.step("Гость не может забронировать слот — требуется вход", async () => {
            await booking.selectFirstSlot();
            await expect(guestPage.locator("body")).toContainText("Войти", { timeout: 5000 });
        });


        await cleanupUsersViaApi(contexts);
        await guestContext.close();
    });


    test("после бронирования единственного слота участник пропадает из каталога (нет свободных слотов)", async ({
        browser,
    }) => {
        const runId = Date.now();
        const hostData = makeUser("host-hidden", runId);
        const guestData = makeUser("guest-hidden", runId);
        const contexts: BrowserContext[] = [];


        let host: RegisteredParticipant;
        let guest: RegisteredParticipant;
        let hostProfile: ProfilePage;
        let hostBooking: BookingPage;
        let guestBooking: BookingPage;


        {
            const hostContext = await browser.newContext();
            contexts.push(hostContext);
            host = await registerUserViaApi(hostContext.request, hostData);


            const hostPage = await hostContext.newPage();
            hostProfile = new ProfilePage(hostPage);
            hostBooking = new BookingPage(hostPage);


            await test.step("Хост открывает профиль и добавляет навык", async () => {
                await hostProfile.open();
                await hostProfile.addCanHelpSkill("API");
            });


            await test.step("Навык появился в блоке «Могу помочь»", async () => {
                await expect(hostProfile.canHelpSkills).toContainText("API");
            });


            await test.step("Хост добавляет свободный слот на завтра", async () => {
                await hostBooking.goToSlots();
                await hostBooking.addSlot(tomorrowDate(), "14:00");
            });


            await test.step("Слот появился в списке", async () => {
                await expect(hostBooking.slotCard("14:00")).toBeVisible({
                    timeout: 10_000,
                });
            });
        }


        {
            const guestContext = await browser.newContext();
            contexts.push(guestContext);
            guest = await registerUserViaApi(guestContext.request, guestData);


            const guestPage = await guestContext.newPage();
            guestBooking = new BookingPage(guestPage);


            await test.step("Гость открывает каталог и ищет хоста по навыку", async () => {
                await guestBooking.openCatalog();
                await guestBooking.findPersonBySkill("API");
            });


            await test.step("Гость видит хоста в каталоге до бронирования", async () => {
                await expect(guestBooking.personCard(hostData.name)).toBeVisible();
            });


            await test.step("Гость открывает страницу хоста и бронирует слот", async () => {
                await guestBooking.openPersonCard(hostData.name);
                await guestBooking.selectFirstSlot();
                await guestBooking.confirmBooking();
                await expect(guestBooking.bookingConfirmSuccess).toBeVisible();
            });
        }


        const viewerContext = await browser.newContext();
        const viewerPage = await viewerContext.newPage();
        const viewerBooking = new BookingPage(viewerPage);


        await test.step("После бронирования единственного слота хост исчезает из каталога", async () => {
            await viewerBooking.openCatalog();
            await viewerBooking.findPersonBySkill("API");
            await expect(viewerBooking.personCard(hostData.name)).toHaveCount(0);
        });


        await cleanupUsersViaApi(contexts);
        await viewerContext.close();
    });


    test("нельзя отменить бронирование менее чем за 2 часа до начала", async ({
        browser,
    }) => {
        const runId = Date.now();
        const hostData = makeUser("host-cancel", runId);
        const guestData = makeUser("guest-cancel", runId);
        const contexts: BrowserContext[] = [];


        let host: RegisteredParticipant;
        let guest: RegisteredParticipant;
        let hostProfile: ProfilePage;
        let hostBooking: BookingPage;
        let guestBooking: BookingPage;

        let timeStr: string;


        {
            const hostContext = await browser.newContext();
            contexts.push(hostContext);
            host = await registerUserViaApi(hostContext.request, hostData);


            const hostPage = await hostContext.newPage();
            hostProfile = new ProfilePage(hostPage);
            hostBooking = new BookingPage(hostPage);


            await test.step("Хост открывает профиль и добавляет навык", async () => {
                await hostProfile.open();
                await hostProfile.addCanHelpSkill("Testing");
            });


            await test.step("Навык появился в блоке «Могу помочь»", async () => {
                await expect(hostProfile.canHelpSkills).toContainText("Testing");
            });


            await test.step("Хост добавляет слот менее чем через 2 часа", async () => {
                await hostBooking.goToSlots();

                const soon = new Date(Date.now() + 90 * 60 * 1000);

                const parts = new Intl.DateTimeFormat("en-CA", {
                    timeZone: "Europe/Moscow",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    hourCycle: "h23",
                }).formatToParts(soon);

                const part = (type: Intl.DateTimeFormatPartTypes) =>
                    parts.find((item) => item.type === type)?.value ?? "";

                const dateStr = `${part("year")}-${part("month")}-${part("day")}`;
                timeStr = `${part("hour")}:${part("minute")}`;

                await hostBooking.addSlot(dateStr, timeStr);
            });


            await test.step("Слот появился в списке", async () => {
                await expect(hostBooking.slotCard(timeStr)).toBeVisible({
                    timeout: 10_000,
                });
            });
        }


        {
            const guestContext = await browser.newContext();
            contexts.push(guestContext);
            guest = await registerUserViaApi(guestContext.request, guestData);


            const guestPage = await guestContext.newPage();
            guestBooking = new BookingPage(guestPage);


            await test.step("Гость открывает каталог и ищет хоста по навыку", async () => {
                await guestBooking.openCatalog();
                await guestBooking.findPersonBySkill("Testing");
            });


            await test.step("Гость открывает страницу хоста и бронирует слот", async () => {
                await guestBooking.openPersonCard(hostData.name);
                await guestBooking.selectFirstSlot();
                await guestBooking.confirmBooking();
                await expect(guestBooking.bookingConfirmSuccess).toBeVisible();
            });


            await test.step("Гость открывает «Мои встречи»", async () => {
                await guestBooking.openBookings();
                await expect(guestBooking.bookingCard(hostData.name)).toBeVisible();
            });


            await test.step("Попытка отменить встречу менее чем за 2 часа завершается ошибкой, бронь остаётся", async () => {
                await guestBooking.cancelBookingWith(hostData.name);
                await expect(guestPage.getByText(/не позднее|2 час|нельзя отменить/i)).toBeVisible();
                await guestBooking.openBookings();
                await expect(guestBooking.bookingCard(hostData.name)).toBeVisible();
            });
        }


        await cleanupUsersViaApi(contexts);
    });
});
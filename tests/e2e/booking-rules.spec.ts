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
import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";

function tomorrowDate(): string {
    return new Date(Date.now() + 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
}

test.describe("Бронирование: правила доступа", () => {
    const contexts: BrowserContext[] = [];

    test.afterEach(async () => {
        await cleanupUsersViaApi(contexts);
        contexts.length = 0;
    });

    test("владелец не может забронировать собственный слот через интерфейс", async ({
        browser,
    }) => {
        const runId = Date.now();
        const user = makeUser("own-slot", runId);
        const skillTag = `Own-slot-skill-${runId}`;

        const context = await browser.newContext();
        contexts.push(context);

        const page = await context.newPage();
        const profile = new ProfilePage(page);
        const booking = new BookingPage(page);

        await test.step("Создаём участника через API", async () => {
            await registerUserViaApi(context.request, user);
        });

        await test.step("Участник добавляет навык «Могу помочь»", async () => {
            await profile.open();
            await profile.addCanHelpSkill(skillTag);

            await expect(profile.canHelpSkills).toContainText(skillTag);
        });

        await test.step("Участник создаёт свободный слот на завтра", async () => {
            await booking.goToSlots();
            await booking.addSlot(tomorrowDate(), "13:00");

            await expect(booking.slotCard("13:00")).toBeVisible({
                timeout: 10_000,
            });
        });

        await test.step("Участник открывает каталог и ищет собственный навык", async () => {
            await booking.openCatalog();
            await booking.findPersonBySkill(skillTag);
        });

        await test.step("Собственная карточка отсутствует, поэтому свой слот нельзя забронировать", async () => {
            await expect(booking.catalogCards).toHaveCount(0);
            await expect(booking.catalogEmptyState).toBeVisible();
        });
    });    test(
        "ведущий отменяет бронь, после чего слот снова доступен другому гостю",
        async ({ browser }) => {
            test.setTimeout(60_000);

            const runId = Date.now();
            const skillTag = `Rebook-skill-${runId}`;
            const host = makeUser("rebook-host", runId);
            const firstGuest = makeUser("rebook-first-guest", runId);
            const secondGuest = makeUser("rebook-second-guest", runId);
            const slotTime = "14:00";

            const hostContext = await browser.newContext();
            contexts.push(hostContext);

            const firstGuestContext = await browser.newContext();
            contexts.push(firstGuestContext);

            const secondGuestContext = await browser.newContext();
            contexts.push(secondGuestContext);

            const hostPage = await hostContext.newPage();
            const firstGuestPage = await firstGuestContext.newPage();
            const secondGuestPage = await secondGuestContext.newPage();

            const hostProfile = new ProfilePage(hostPage);
            const hostBooking = new BookingPage(hostPage);
            const firstGuestBooking = new BookingPage(firstGuestPage);
            const secondGuestBooking = new BookingPage(secondGuestPage);

            await test.step("Создаём трёх участников через API", async () => {
                await registerUserViaApi(hostContext.request, host);
                await registerUserViaApi(firstGuestContext.request, firstGuest);
                await registerUserViaApi(secondGuestContext.request, secondGuest);
            });

            await test.step("Ведущий добавляет навык и свободный слот", async () => {
                await hostProfile.open();
                await hostProfile.addCanHelpSkill(skillTag);

                await expect(hostProfile.canHelpSkills).toContainText(skillTag);

                await hostBooking.goToSlots();
                await hostBooking.addSlot(tomorrowDate(), slotTime);

                await expect(hostBooking.slotCard(slotTime)).toBeVisible({
                    timeout: 10_000,
                });
            });

            await test.step("Первый гость находит ведущего и бронирует слот", async () => {
                await firstGuestBooking.openCatalog();
                await firstGuestBooking.findPersonBySkill(skillTag);

                await expect(
                    firstGuestBooking.personCard(host.name),
                ).toBeVisible({
                    timeout: 10_000,
                });

                await firstGuestBooking.openPersonCard(host.name);
                await firstGuestBooking.selectSlotAt(slotTime);

                await expect(
                    firstGuestBooking.bookingConfirmDialog,
                ).toBeVisible();

                await firstGuestBooking.confirmBooking();

                await expect(
                    firstGuestBooking.bookingConfirmSuccess,
                ).toBeVisible({
                    timeout: 15_000,
                });
            });

            await test.step("Ведущий открывает встречу и отменяет её", async () => {
                await hostBooking.openBookings();

                await expect(hostBooking.bookingCard(firstGuest.name)).toBeVisible({
                    timeout: 10_000,
                });

                await hostBooking.cancelBookingWith(firstGuest.name);

                await expect(
                    hostBooking.bookingCard(firstGuest.name),
                ).toHaveCount(0);

                await expect(
                    hostBooking.pastBookingCard(firstGuest.name),
                ).toBeVisible({
                    timeout: 10_000,
                });
            });

            await test.step("Второй гость видит освобождённый слот и бронирует его", async () => {
                await secondGuestBooking.openCatalog();
                await secondGuestBooking.findPersonBySkill(skillTag);

                await expect(
                    secondGuestBooking.personCard(host.name),
                ).toBeVisible({
                    timeout: 10_000,
                });

                await secondGuestBooking.openPersonCard(host.name);
                await secondGuestBooking.selectSlotAt(slotTime);

                await expect(
                    secondGuestBooking.bookingConfirmDialog,
                ).toBeVisible({
                    timeout: 10_000,
                });

                await secondGuestBooking.confirmBooking();

                await expect(
                    secondGuestBooking.bookingConfirmSuccess,
                ).toBeVisible({
                    timeout: 15_000,
                });
            });

            await test.step("Ведущий видит новую встречу со вторым гостем", async () => {
                await hostBooking.openBookings();

                await expect(
                    hostBooking.bookingCard(secondGuest.name),
                ).toBeVisible({
                    timeout: 10_000,
                });
            });
        },
    );
});
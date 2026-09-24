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

test.describe("Слоты: создание, удаление, валидация", () => {
    const contexts: BrowserContext[] = [];

    test.afterEach(async () => {
        await cleanupUsersViaApi(contexts);
        contexts.length = 0;
    });

    test("слот создаётся и виден в списке", async ({ browser }) => {
        const context = await browser.newContext();
        contexts.push(context);

        const user = makeUser("hw16", Date.now());
        await registerUserViaApi(context.request, user);

        const page = await context.newPage();
        const bookingPage = new BookingPage(page);

        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const date = tomorrow.toISOString().slice(0, 10);
        const time = "10:00";

        await test.step("Открываем страницу слотов", async () => {
            await bookingPage.goToSlots();
        });

        await test.step("Добавляем слот на завтра", async () => {
            await bookingPage.addSlot(date, time);
        });

        await test.step("Слот появился в списке", async () => {
            await expect(bookingPage.slotCard(time)).toBeVisible({
                timeout: 10_000,
            });
        });
    });

    test("нельзя создать слот в прошлом", async ({ browser }) => {
        const context = await browser.newContext();
        contexts.push(context);

        const user = makeUser("hw16", Date.now());
        await registerUserViaApi(context.request, user);

        const page = await context.newPage();
        const bookingPage = new BookingPage(page);

        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const date = yesterday.toISOString().slice(0, 10);
        const time = "10:00";

        await test.step("Открываем страницу слотов", async () => {
            await bookingPage.goToSlots();
        });

        await test.step("Пытаемся добавить слот на вчера", async () => {
            await bookingPage.addSlot(date, time);
        });

        await test.step("Слот не появился", async () => {
            await expect(bookingPage.slotsCards).toHaveCount(0);
        });
    });

    test("свободный слот можно удалить", async ({ browser }) => {
        const context = await browser.newContext();
        contexts.push(context);

        const user = makeUser("hw16", Date.now());
        await registerUserViaApi(context.request, user);

        const page = await context.newPage();
        const bookingPage = new BookingPage(page);

        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const date = tomorrow.toISOString().slice(0, 10);
        const time = "11:00";

        await test.step("Открываем страницу слотов", async () => {
            await bookingPage.goToSlots();
        });

        await test.step("Добавляем свободный слот на завтра", async () => {
            await bookingPage.addSlot(date, time);
        });

        await test.step("Свободный слот появился в списке", async () => {
            await expect(bookingPage.slotCard(time)).toBeVisible({
                timeout: 10_000,
            });
        });

        await test.step("Удаляем свободный слот", async () => {
            await bookingPage.deleteSlot(time);
        });

        await test.step("Слот исчез из списка", async () => {
            await expect(bookingPage.slotCard(time)).not.toBeVisible({
                timeout: 10_000,
            });
        });
    });

    test("booked-слот нельзя удалить", async ({ browser }) => {
        test.setTimeout(60_000);

        const runId = Date.now();
        const skillTag = `Booked-slot-${runId}`;
        const owner = makeUser("owner", runId);
        const guest = makeUser("guest", runId);

        const ownerContext = await browser.newContext();
        contexts.push(ownerContext);

        const guestContext = await browser.newContext();
        contexts.push(guestContext);

        await registerUserViaApi(ownerContext.request, owner);
        await registerUserViaApi(guestContext.request, guest);

        const ownerPage = await ownerContext.newPage();
        const guestPage = await guestContext.newPage();

        const ownerProfilePage = new ProfilePage(ownerPage);
        const ownerBookingPage = new BookingPage(ownerPage);
        const guestBookingPage = new BookingPage(guestPage);

        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const date = tomorrow.toISOString().slice(0, 10);
        const time = "12:00";

        await test.step("Владелец добавляет навык для поиска", async () => {
            await ownerProfilePage.open();
            await ownerProfilePage.addCanHelpSkill(skillTag);
        });

        await test.step("Навык виден в профиле владельца", async () => {
            await expect(ownerProfilePage.canHelpSkills).toContainText(
                skillTag,
            );
        });

        await test.step("Владелец создаёт свободный слот на завтра", async () => {
            await ownerBookingPage.goToSlots();
            await ownerBookingPage.addSlot(date, time);
        });

        await test.step("Свободный слот виден владельцу", async () => {
            await expect(ownerBookingPage.slotCard(time)).toBeVisible({
                timeout: 10_000,
            });
        });

        await test.step("Гость находит страницу владельца", async () => {
            await guestBookingPage.openCatalog();
            await guestBookingPage.findPersonBySkill(skillTag);

            await expect(guestBookingPage.personCard(owner.name)).toBeVisible({
                timeout: 10_000,
            });

            await guestBookingPage.openPersonCard(owner.name);
        });

        await test.step("Гость видит свободный слот владельца", async () => {
            await expect(guestBookingPage.bookingCalendarDays).toBeVisible({
                timeout: 10_000,
            });

            await expect(
                guestBookingPage.bookingCalendarTimes.filter({
                    hasText: time,
                }),
            ).toBeVisible({
                timeout: 10_000,
            });
        });

        await test.step("Гость выбирает свободный слот", async () => {
            await guestBookingPage.selectSlotAt(time);
        });

        await test.step("Открывается окно подтверждения бронирования", async () => {
            await expect(guestBookingPage.bookingConfirmDialog).toBeVisible({
                timeout: 10_000,
            });
        });

        await test.step("Гость подтверждает бронирование", async () => {
            await guestBookingPage.confirmBooking();
        });

        await test.step("Бронирование подтверждено", async () => {
            await expect(guestBookingPage.bookingConfirmSuccess).toBeVisible({
                timeout: 15_000,
            });
        });

        await test.step(
            "Владелец не может удалить забронированный слот",
            async () => {
                await ownerBookingPage.goToSlots();

                const deleteButton = ownerBookingPage
                    .slotCard(time)
                    .getByRole("button", { name: "Удалить" });

                await expect(deleteButton).toHaveCount(0);
            },
        );
    });
});
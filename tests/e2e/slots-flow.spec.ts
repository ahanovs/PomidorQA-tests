import {
    expect,
    test,
    type BrowserContext,
    type Page,
} from "@playwright/test";
import {
    cleanupUsersViaApi,
    makeUser,
    registerUserViaApi,
    type TestUser,
} from "../helpers/user";
import { tomorrowDate, yesterdayDate } from "../helpers/dates";
import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";

test.describe("Слоты: создание, удаление, валидация", () => {
    const contexts: BrowserContext[] = [];
    let page: Page;
    let bookingPage: BookingPage;
    let owner: TestUser;

    test.beforeEach(async ({ browser }) => {
        const context = await browser.newContext();
        contexts.push(context);

        owner = makeUser("slots", Date.now());
        await registerUserViaApi(context.request, owner);

        page = await context.newPage();
        bookingPage = new BookingPage(page);
    });

    test.afterEach(async () => {
        await cleanupUsersViaApi(contexts);
        contexts.length = 0;
    });

    test("слот создаётся и виден в списке", async () => {
        const time = "10:00";

        await test.step("Открываем страницу слотов", async () => {
            await bookingPage.goToSlots();
        });

        await test.step("Добавляем слот на завтра", async () => {
            await bookingPage.addSlot(tomorrowDate(), time);
        });

        await test.step("Слот появился в списке", async () => {
            await expect(bookingPage.slotCard(time)).toBeVisible({
                timeout: 10_000,
            });
        });
    });

    test("нельзя создать слот в прошлом", async () => {
        const time = "10:00";

        await test.step("Открываем страницу слотов", async () => {
            await bookingPage.goToSlots();
        });

        await test.step("Пытаемся добавить слот на вчера", async () => {
            await bookingPage.addSlot(yesterdayDate(), time);
        });

        await test.step("Слот не появился", async () => {
            await expect(bookingPage.slotsCards).toHaveCount(0);
        });
    });

    test("свободный слот можно удалить", async () => {
        const time = "11:00";

        await test.step("Открываем страницу слотов", async () => {
            await bookingPage.goToSlots();
        });

        await test.step("Добавляем свободный слот на завтра", async () => {
            await bookingPage.addSlot(tomorrowDate(), time);
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

        const skillTag = `Booked-slot-${Date.now()}`;
        const time = "12:00";
        const guest = makeUser("guest", Date.now());
        const ownerProfile = new ProfilePage(page);

        await test.step("Владелец добавляет навык для поиска", async () => {
            await ownerProfile.open();
            await ownerProfile.addCanHelpSkill(skillTag);
        });

        await test.step("Навык виден в профиле владельца", async () => {
            await expect(ownerProfile.canHelpSkills).toContainText(skillTag);
        });

        await test.step("Владелец создаёт свободный слот на завтра", async () => {
            await bookingPage.goToSlots();
            await bookingPage.addSlot(tomorrowDate(), time);
        });

        await test.step("Свободный слот виден владельцу", async () => {
            await expect(bookingPage.slotCard(time)).toBeVisible({
                timeout: 10_000,
            });
        });

        const guestContext = await browser.newContext();
        contexts.push(guestContext);

        const guestPage = await guestContext.newPage();
        const guestBookingPage = new BookingPage(guestPage);

        await test.step("Гость регистрируется через API", async () => {
            await registerUserViaApi(guestContext.request, guest);
        });

        await test.step("Гость открывает каталог и ищет владельца по навыку", async () => {
            await guestBookingPage.openCatalog();
            await guestBookingPage.findPersonBySkill(skillTag);
        });

        await test.step("Гость видит карточку владельца", async () => {
            await expect(guestBookingPage.personCard(owner.name)).toBeVisible({
                timeout: 10_000,
            });
        });

        await test.step("Гость открывает карточку владельца", async () => {
            await guestBookingPage.openPersonCard(owner.name);
        });

        await test.step("Гость видит свободный слот владельца", async () => {
            await expect(guestBookingPage.bookingCalendarDays).toBeVisible({
                timeout: 10_000,
            });

            await expect(
                guestBookingPage.calendarTimeChipAt(time),
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

        await test.step("Владелец открывает страницу слотов", async () => {
            await bookingPage.goToSlots();
        });

        await test.step("У забронированного слота нет кнопки «Удалить»", async () => {
            await expect(bookingPage.deleteButton(time)).toHaveCount(0);
        });
    });
});

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

test.describe("Бронирование: гонка за слот", () => {
  const contexts: BrowserContext[] = [];

  test.afterEach(async () => {
    await cleanupUsersViaApi(contexts);
    contexts.length = 0;
  });

  test("первый гость бронирует слот, а второй получает ошибку", async ({
    browser,
  }) => {
    test.setTimeout(60_000);

    const runId = Date.now();
    const skillTag = `Playwright-booking-${runId}`;
    const host = makeUser("host", runId);
    const guest = makeUser("guest", runId);
    const guest2 = makeUser("guest2", runId);

    const hostContext = await browser.newContext();
    contexts.push(hostContext);

    const guestContext = await browser.newContext();
    contexts.push(guestContext);

    const guest2Context = await browser.newContext();
    contexts.push(guest2Context);

    const hostPage = await hostContext.newPage();
    const guestPage = await guestContext.newPage();
    const guest2Page = await guest2Context.newPage();

    const hostProfilePage = new ProfilePage(hostPage);
    const hostBookingPage = new BookingPage(hostPage);
    const guestBookingPage = new BookingPage(guestPage);
    const guest2BookingPage = new BookingPage(guest2Page);

    await test.step("Хост: регистрируется через API", async () => {
      await registerUserViaApi(hostContext.request, host);
    });

    await test.step("Хост: добавляет навык", async () => {
      await hostProfilePage.open();
      await hostProfilePage.addCanHelpSkill(skillTag);
    });

    await test.step("Хост: видит добавленный навык", async () => {
      await expect(hostProfilePage.canHelpSkills).toContainText(skillTag);
    });

    await test.step("Хост: добавляет свободный слот на завтра", async () => {
      await hostBookingPage.goToSlots();

      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const date = tomorrow.toISOString().slice(0, 10);

      await hostBookingPage.addSlot(date, "12:00");
    });

    await test.step("Хост: видит добавленный слот", async () => {
      await expect(hostBookingPage.slotCard("12:00")).toBeVisible({
        timeout: 10_000,
      });
    });

    await test.step("Гость: регистрируется через API", async () => {
      await registerUserViaApi(guestContext.request, guest);
      await guestPage.goto("/pomidorqa");
    });

    await test.step("Гость: ищет хоста по навыку", async () => {
      await guestBookingPage.findPersonBySkill(skillTag);
    });

    await test.step("Гость: видит карточку хоста в каталоге", async () => {
      await expect(guestBookingPage.personCard(host.name)).toBeVisible({
        timeout: 10_000,
      });
    });

    await test.step("Гость: открывает карточку хоста", async () => {
      await guestBookingPage.openPersonCard(host.name);
    });

    await test.step("Гость: видит имя хоста", async () => {
      await expect(guestBookingPage.personName).toHaveText(host.name);
    });

    await test.step("Гость: выбирает свободный слот", async () => {
      await guestBookingPage.selectFirstSlot();
    });

    await test.step("Гость: видит диалог подтверждения", async () => {
      await expect(guestBookingPage.bookingConfirmDialog).toBeVisible({
        timeout: 10_000,
      });
    });

    await test.step("Гость2: регистрируется через API", async () => {
      await registerUserViaApi(guest2Context.request, guest2);
      await guest2Page.goto("/pomidorqa");
    });

    await test.step("Гость2: ищет хоста по навыку", async () => {
      await guest2BookingPage.findPersonBySkill(skillTag);
    });

    await test.step("Гость2: видит карточку хоста в каталоге", async () => {
      await expect(guest2BookingPage.personCard(host.name)).toBeVisible({
        timeout: 10_000,
      });
    });

    await test.step("Гость2: открывает карточку хоста", async () => {
      await guest2BookingPage.openPersonCard(host.name);
    });

    await test.step("Гость2: видит имя хоста", async () => {
      await expect(guest2BookingPage.personName).toHaveText(host.name);
    });

    await test.step("Гость2: выбирает тот же свободный слот", async () => {
      await guest2BookingPage.selectFirstSlot();
    });

    await test.step("Гость2: видит диалог подтверждения", async () => {
      await expect(guest2BookingPage.bookingConfirmDialog).toBeVisible({
        timeout: 10_000,
      });
    });

    await test.step("Гость: подтверждает бронирование", async () => {
      await guestBookingPage.confirmBooking();
    });

    await test.step("Гость: видит успешное бронирование", async () => {
      await expect(guestBookingPage.bookingConfirmSuccess).toBeVisible({
        timeout: 15_000,
      });
    });

    await test.step("Гость2: подтверждает бронирование", async () => {
      await guest2BookingPage.confirmBooking();
    });

    await test.step("Гость2: видит ошибку занятого слота", async () => {
      await expect(guest2BookingPage.bookingConfirmError).toBeVisible({
        timeout: 15_000,
      });
    });

    await test.step("Гость: открывает «Мои встречи»", async () => {
      await guestBookingPage.openBookings();
    });

    await test.step("Гость: видит будущую встречу с хостом", async () => {
      await expect(guestBookingPage.bookingCardName()).toHaveText(host.name, {
        timeout: 10_000,
      });
    });

    await test.step("Хост: открывает «Мои встречи»", async () => {
      await hostBookingPage.openBookings();
    });

    await test.step("Хост: видит будущую встречу с гостем", async () => {
      await expect(hostBookingPage.bookingCardName()).toHaveText(guest.name, {
        timeout: 10_000,
      });
    });
  });
});
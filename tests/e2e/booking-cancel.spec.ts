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

test.describe("Бронирование: отмена встречи", () => {
  const contexts: BrowserContext[] = [];

  test.afterEach(async () => {
    await cleanupUsersViaApi(contexts);
    contexts.length = 0;
  });

  test("гость отменяет встречу, и отмена сохраняется у гостя и хоста после reload", async ({
    browser,
  }) => {
    test.setTimeout(60_000);

    const runId = Date.now();
    const skillTag = `Playwright-cancel-${runId}`;
    const guest = makeUser("guest", runId);

    const guestContext = await browser.newContext();
    contexts.push(guestContext);

    const guestPage = await guestContext.newPage();
    const guestBookingPage = new BookingPage(guestPage);

    const host = await test.step("Хост: готовим профиль с навыком и свободным слотом на завтра", () =>
      createHostWithSkillAndSlot(browser, contexts, {
        role: "host",
        skillTag,
        slotTime: "12:00",
      }),
    );
    const hostBookingPage = host.hostBooking;

    await test.step("Хост: видит добавленный слот", async () => {
      await expect(hostBookingPage.slotCard("12:00")).toBeVisible({
        timeout: 10_000,
      });
    });

    await test.step("Гость: регистрируется через API", async () => {
      await registerUserViaApi(guestContext.request, guest);
    });

    await test.step("Гость: открывает каталог", async () => {
      await guestBookingPage.openCatalog();
    });

    await test.step("Гость: ищет хоста по навыку", async () => {
      await guestBookingPage.findPersonBySkill(skillTag);
    });

    await test.step("Гость: открывает карточку хоста", async () => {
      await guestBookingPage.openPersonCard(host.host.name);
    });

    await test.step("Гость: видит доступный слот", async () => {
      await expect(guestBookingPage.calendarDayChip()).toBeVisible({
        timeout: 10_000,
      });
    });

    await test.step("Гость: выбирает свободный слот", async () => {
      await guestBookingPage.selectFirstSlot();
    });

    await test.step("Гость: видит диалог подтверждения бронирования", async () => {
      await expect(guestBookingPage.bookingConfirmDialog).toBeVisible({
        timeout: 15_000,
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

    await test.step("Гость: открывает «Мои встречи»", async () => {
      await guestBookingPage.openBookings();
    });

    await test.step("Гость: видит будущую встречу с хостом", async () => {
      await expect(guestBookingPage.bookingCardName()).toHaveText(host.host.name, {
        timeout: 10_000,
      });
    });

    await test.step("Гость: отменяет встречу", async () => {
      await guestBookingPage.cancelFirstBooking();
    });

    await test.step("Гость: будущих встреч больше нет", async () => {
      await expect(guestBookingPage.bookingsCards).toHaveCount(0);
    });

    await test.step("Гость: видит отменённую встречу в прошедших", async () => {
      await expect(guestBookingPage.pastBookingCardName()).toHaveText(host.host.name);
      await expect(guestBookingPage.pastBookingCardStatus()).toContainText(
        "отменено",
      );
    });

    await test.step("Гость: у отменённой встречи нет кнопки «Отменить»", async () => {
      const pastCard = guestBookingPage.pastBookingCard(host.host.name);
      await expect(pastCard).toBeVisible();
      await expect(
        pastCard.getByRole("button", { name: "Отменить" }),
      ).toHaveCount(0);
    });

    await test.step("Гость: перезагружает страницу", async () => {
      await guestPage.reload();
    });

    await test.step("После reload гость видит отменённую встречу", async () => {
      await expect(guestBookingPage.pastBookingCardName()).toHaveText(host.host.name, {
        timeout: 10_000,
      });
      await expect(guestBookingPage.pastBookingCardStatus()).toContainText(
        "отменено",
      );
    });

    await test.step("Хост: открывает «Мои встречи»", async () => {
      await hostBookingPage.openBookings();
    });

    await test.step("Хост: перезагружает страницу", async () => {
      await host.hostPage.reload();
    });

    await test.step("После reload хост не видит будущую встречу", async () => {
      await expect(hostBookingPage.bookingsCards).toHaveCount(0, {
        timeout: 10_000,
      });
    });

    await test.step("После reload хост видит отменённую встречу", async () => {
      await expect(hostBookingPage.pastBookingCardName()).toHaveText(guest.name, {
        timeout: 10_000,
      });
      await expect(hostBookingPage.pastBookingCardStatus()).toContainText(
        "отменено",
      );
    });
  });
});

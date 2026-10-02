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

test.describe("Каталог: поиск по навыку", () => {
  const contexts: BrowserContext[] = [];

  let guest: ReturnType<typeof makeUser>;
  let guestBooking: BookingPage;

  test.beforeEach(async ({ browser }) => {
    guest = makeUser("catalog-guest", Date.now());

    const guestContext = await browser.newContext();
    contexts.push(guestContext);

    guestBooking = new BookingPage(await guestContext.newPage());

    await registerUserViaApi(guestContext.request, guest);
  });

  test.afterEach(async () => {
    await cleanupUsersViaApi(contexts);
    contexts.length = 0;
  });

  test("по навыку находится участник со свободным слотом", async ({ browser }) => {
    const skillTag = `Playwright-search-${Date.now()}`;

    const host = await test.step("Хост: готовим профиль с навыком и свободным слотом", () =>
      createHostWithSkillAndSlot(browser, contexts, {
        role: "catalog-host",
        skillTag,
        slotTime: "12:00",
      }),
    );

    await test.step("Гость открывает каталог и ищет по навыку", async () => {
      await guestBooking.openCatalog();
      await guestBooking.findPersonBySkill(skillTag);
    });

    await test.step("Гость видит карточку хоста в выдаче", async () => {
      await expect(guestBooking.personCard(host.host.name)).toBeVisible({
        timeout: 10_000,
      });
    });

    await test.step("Гость открывает карточку хоста", async () => {
      await guestBooking.openPersonCard(host.host.name);
    });

    await test.step("Карточка хоста содержит имя", async () => {
      await expect(guestBooking.personName).toHaveText(host.host.name);
    });

    await test.step("На карточке есть календарь свободных слотов", async () => {
      await expect(guestBooking.calendarDayChip()).toBeVisible({
        timeout: 10_000,
      });
    });
  });

  test("по навыку без совпадений каталог показывает пустую выдачу", async () => {
    await test.step("Гость открывает каталог", async () => {
      await guestBooking.openCatalog();
    });

    await test.step("Гость ищет несуществующий навык", async () => {
      await guestBooking.findPersonBySkill(`NoSuchSkill-${Date.now()}`);
    });

    await test.step("Каталог показывает пустую выдачу", async () => {
      await expect(guestBooking.catalogEmptyState).toBeVisible();
      await expect(guestBooking.catalogCards).toHaveCount(0);
    });
  });

  test("участник не видит себя в собственном каталоге", async ({ browser }) => {
    const skillTag = `Playwright-search-${Date.now()}`;

    const host = await test.step("Хост: готовим профиль с навыком и свободным слотом", () =>
      createHostWithSkillAndSlot(browser, contexts, {
        role: "catalog-host-self",
        skillTag,
        slotTime: "12:00",
      }),
    );

    await test.step("Гость находит хоста по навыку", async () => {
      await guestBooking.openCatalog();
      await guestBooking.findPersonBySkill(skillTag);
    });

    await test.step("Гость видит карточку хоста", async () => {
      await expect(guestBooking.personCard(host.host.name)).toBeVisible();
    });

    await test.step("Хост открывает каталог и ищет свой навык", async () => {
      await host.hostBooking.openCatalog();
      await host.hostBooking.findPersonBySkill(skillTag);
    });

    await test.step("Собственная карточка отсутствует в каталоге", async () => {
      await expect(host.hostBooking.catalogEmptyState).toBeVisible();
      await expect(host.hostBooking.catalogCards).toHaveCount(0);
    });
  });
});

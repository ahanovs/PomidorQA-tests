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
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return tomorrow.toISOString().slice(0, 10);
}


test.describe("Каталог: поиск по навыку", () => {
  const contexts: BrowserContext[] = [];

  let host: TestUser;
  let guest: TestUser;
  let skillTag: string;
  let hostProfile: ProfilePage;
  let hostBooking: BookingPage;
  let guestBooking: BookingPage;

  test.beforeEach(async ({ browser }) => {
    const runId = Date.now();

    host = makeUser("catalog-host", runId);
    guest = makeUser("catalog-guest", runId);
    skillTag = `Playwright-search-${runId}`;

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

  test("по навыку находится участник со свободным слотом", async () => {
    await test.step("Хост открывает профиль и добавляет навык", async () => {
      await hostProfile.open();
      await hostProfile.addCanHelpSkill(skillTag);
    });

    await test.step("Навык появился в блоке «Могу помочь»", async () => {
      await expect(hostProfile.canHelpSkills).toContainText(skillTag);
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

    await test.step("Гость открывает каталог", async () => {
      await guestBooking.openCatalog();
    });

    await test.step("Гость ищет участника по навыку", async () => {
      await guestBooking.findPersonBySkill(skillTag);
    });

    await test.step("Гость видит карточку хоста в выдаче", async () => {
      await expect(guestBooking.personCard(host.name)).toBeVisible();
    });

    await test.step("Гость открывает карточку хоста", async () => {
      await guestBooking.openPersonCard(host.name);
    });

    await test.step("Карточка хоста содержит имя", async () => {
      await expect(guestBooking.personName).toHaveText(host.name);
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

  test("участник не видит себя в собственном каталоге", async () => {
    await test.step("Хост открывает профиль и добавляет навык", async () => {
      await hostProfile.open();
      await hostProfile.addCanHelpSkill(skillTag);
    });

    await test.step("Навык появился в блоке «Могу помочь»", async () => {
      await expect(hostProfile.canHelpSkills).toContainText(skillTag);
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

    await test.step("Гость находит хоста по навыку", async () => {
      await guestBooking.openCatalog();
      await guestBooking.findPersonBySkill(skillTag);
    });

    await test.step("Гость видит карточку хоста", async () => {
      await expect(guestBooking.personCard(host.name)).toBeVisible();
    });

    await test.step("Хост открывает каталог и ищет свой навык", async () => {
      await hostBooking.openCatalog();
      await hostBooking.findPersonBySkill(skillTag);
    });

    await test.step("Собственная карточка отсутствует в каталоге", async () => {
      await expect(hostBooking.catalogEmptyState).toBeVisible();
      await expect(hostBooking.catalogCards).toHaveCount(0);
    });
  });
});
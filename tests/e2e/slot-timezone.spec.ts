import { expect, test, type BrowserContext } from "@playwright/test";
import {
    cleanupUsersViaApi,
    makeUser,
    registerUserViaApi,
} from "../helpers/user";
import { tomorrowDate } from "../helpers/dates";
import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";

test.describe("Часовой пояс слотов", () => {
    test("время слота показывается в поясе владельца, а не зрителя", async ({
        browser,
    }) => {
        test.setTimeout(60_000);

        const contexts: BrowserContext[] = [];
        const host = makeUser("tz-host", Date.now());
        const slotTime = "16:00";

        try {
            const hostContext = await browser.newContext();
            contexts.push(hostContext);
            const hostPage = await hostContext.newPage();
            const hostProfile = new ProfilePage(hostPage);
            const hostBooking = new BookingPage(hostPage);

            const registered = await test.step(
                "Хост: регистрируется через API",
                () => registerUserViaApi(hostContext.request, host),
            );

            await test.step("Хост меняет часовой пояс на Asia/Yekaterinburg", async () => {
                await hostProfile.open();
                await hostProfile.changeTimezoneAndSave("Asia/Yekaterinburg");
            });

            await test.step("Хост создаёт слот на 16:00 по своему поясу", async () => {
                await hostBooking.goToSlots();
                await hostBooking.addSlot(tomorrowDate(), slotTime);

                await expect(hostBooking.slotCard(slotTime)).toBeVisible({
                    timeout: 10_000,
                });
            });

            const guestContext = await browser.newContext();
            contexts.push(guestContext);
            const guestBooking = new BookingPage(await guestContext.newPage());

            await test.step(
                "Гость из Europe/Moscow открывает страницу участника",
                async () => {
                    await guestBooking.openPerson(registered.id);
                },
            );

            await test.step(
                "Время слота — в поясе владельца: 16:00, а не 13:00 по Москве",
                async () => {
                    await expect(
                        guestBooking.calendarTimeChipAt(slotTime),
                    ).toBeVisible({
                        timeout: 10_000,
                    });

                    // 16:00 в Екатеринбурге — это 13:00 в Москве: если бы
                    // продукт показывал время в поясе зрителя, чип был бы «13:00».
                    await expect(
                        guestBooking.calendarTimeChipAt("13:00"),
                    ).toHaveCount(0);

                    await expect(
                        guestBooking.personSlotsTimezone,
                    ).toContainText("Asia/Yekaterinburg");
                },
            );
        } finally {
            await cleanupUsersViaApi(contexts);
        }
    });
});

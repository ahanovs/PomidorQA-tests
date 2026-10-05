import { expect, test, type BrowserContext } from "@playwright/test";
import {
    cleanupUsersViaApi,
    makeUser,
    registerUserViaApi,
} from "../helpers/user";
import { createHostWithSkillAndSlot } from "../helpers/arrange";
import { BookingPage } from "../pages/booking-page";

test.describe("Состояние после бронирования", () => {
    test(
        "забронированный слот не показывается на странице участника",
        async ({ browser }) => {
            test.setTimeout(60_000);

            const contexts: BrowserContext[] = [];
            const runId = Date.now();
            const skillTag = `Booking-${runId}`;
            const slotTime = "12:00";
            const guest = makeUser("guest-state", runId);

            try {
                const host = await test.step(
                    "Хост: готовим профиль с навыком и свободным слотом",
                    () =>
                        createHostWithSkillAndSlot(browser, contexts, {
                            role: "host-state",
                            skillTag,
                            slotTime,
                        }),
                );

                const guestContext = await browser.newContext();
                contexts.push(guestContext);
                const guestBooking = new BookingPage(
                    await guestContext.newPage(),
                );

                await test.step("Гость: регистрируется через API", async () => {
                    await registerUserViaApi(guestContext.request, guest);
                });

                await test.step(
                    "Гость ищет хоста по навыку и открывает его страницу",
                    async () => {
                        await guestBooking.openCatalog();
                        await guestBooking.findPersonBySkill(skillTag);

                        await expect(
                            guestBooking.personCard(host.host.name),
                        ).toBeVisible({
                            timeout: 10_000,
                        });

                        await guestBooking.openPersonCard(host.host.name);
                    },
                );

                await test.step("Гость видит свободный слот хоста", async () => {
                    await expect(
                        guestBooking.calendarTimeChipAt(slotTime),
                    ).toBeVisible({
                        timeout: 10_000,
                    });
                });

                await test.step("Гость бронирует слот", async () => {
                    await guestBooking.selectSlotAt(slotTime);

                    await expect(
                        guestBooking.bookingConfirmDialog,
                    ).toBeVisible({
                        timeout: 15_000,
                    });

                    await guestBooking.confirmBooking();

                    await expect(
                        guestBooking.bookingConfirmSuccess,
                    ).toBeVisible({
                        timeout: 15_000,
                    });
                });

                await test.step(
                    "Гость снова открывает страницу участника",
                    async () => {
                        // Хост исчез из каталога вместе со свободным слотом,
                        // поэтому страница открывается прямым адресом.
                        await guestBooking.openPerson(host.hostId);
                    },
                );

                await test.step(
                    "Профиль виден, забронированного слота нет",
                    async () => {
                        await expect(guestBooking.personName).toHaveText(
                            host.host.name,
                            { timeout: 10_000 },
                        );

                        await expect(
                            guestBooking.calendarTimeChipAt(slotTime),
                        ).toHaveCount(0);
                    },
                );
            } finally {
                await cleanupUsersViaApi(contexts);
            }
        },
    );
});

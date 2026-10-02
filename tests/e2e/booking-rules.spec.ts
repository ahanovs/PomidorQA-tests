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

async function expectSlotAvailable(
    booking: BookingPage,
    slotTime: string,
): Promise<void> {
    await expect(booking.bookingCalendarDays).toBeVisible({
        timeout: 10_000,
    });

    await expect(
        booking.calendarTimeChipAt(slotTime),
    ).toBeVisible({
        timeout: 10_000,
    });
}

test.describe("Бронирование: правила доступа", () => {
    const contexts: BrowserContext[] = [];

    test.afterEach(async () => {
        await cleanupUsersViaApi(contexts);
        contexts.length = 0;
    });

    test(
        "владелец не может забронировать собственный слот через интерфейс",
        async ({ browser }) => {
            const skillTag = `Own-slot-skill-${Date.now()}`;

            const host = await test.step("Участник: готовим профиль с навыком и свободным слотом", () =>
                createHostWithSkillAndSlot(browser, contexts, {
                    role: "own-slot",
                    skillTag,
                    slotTime: "13:00",
                }),
            );
            const booking = host.hostBooking;

            await test.step(
                "Участник открывает каталог и ищет собственный навык",
                async () => {
                    await booking.openCatalog();
                    await booking.findPersonBySkill(skillTag);
                },
            );

            await test.step(
                "Собственная карточка отсутствует, поэтому свой слот нельзя забронировать",
                async () => {
                    await expect(booking.catalogCards).toHaveCount(0);
                    await expect(booking.catalogEmptyState).toBeVisible();
                },
            );
        },
    );

    test(
        "ведущий отменяет бронь, после чего слот снова доступен другому гостю",
        async ({ browser }) => {
            test.setTimeout(60_000);

            const runId = Date.now();
            const skillTag = `Rebook-skill-${runId}`;
            const firstGuest = makeUser("rebook-first-guest", runId);
            const secondGuest = makeUser("rebook-second-guest", runId);
            const slotTime = "14:00";

            const host = await test.step("Ведущий: готовим профиль с навыком и свободным слотом", () =>
                createHostWithSkillAndSlot(browser, contexts, {
                    role: "rebook-host",
                    skillTag,
                    slotTime,
                }),
            );
            const hostName = host.host.name;
            const hostBooking = host.hostBooking;

            const firstGuestContext = await browser.newContext();
            contexts.push(firstGuestContext);

            const secondGuestContext = await browser.newContext();
            contexts.push(secondGuestContext);

            const firstGuestBooking = new BookingPage(
                await firstGuestContext.newPage(),
            );
            const secondGuestBooking = new BookingPage(
                await secondGuestContext.newPage(),
            );

            await test.step("Первый гость: регистрируется через API", async () => {
                await registerUserViaApi(firstGuestContext.request, firstGuest);
            });

            await test.step("Первый гость: открывает каталог и ищет ведущего по навыку", async () => {
                await firstGuestBooking.openCatalog();
                await firstGuestBooking.findPersonBySkill(skillTag);
            });

            await test.step("Первый гость: видит карточку ведущего", async () => {
                await expect(firstGuestBooking.personCard(hostName)).toBeVisible({
                    timeout: 10_000,
                });
            });

            await test.step("Первый гость: открывает карточку ведущего", async () => {
                await firstGuestBooking.openPersonCard(hostName);
            });

            await test.step("Первый гость: видит свободный слот ведущего", async () => {
                await expectSlotAvailable(firstGuestBooking, slotTime);
            });

            await test.step("Первый гость: выбирает слот", async () => {
                await firstGuestBooking.selectSlotAt(slotTime);
            });

            await test.step(
                "Открывается окно подтверждения бронирования",
                async () => {
                    await expect(
                        firstGuestBooking.bookingConfirmDialog,
                    ).toBeVisible({
                        timeout: 10_000,
                    });
                },
            );

            await test.step(
                "Первый гость: подтверждает бронирование",
                async () => {
                    await firstGuestBooking.confirmBooking();
                },
            );

            await test.step(
                "Бронирование первого гостя подтверждено",
                async () => {
                    await expect(
                        firstGuestBooking.bookingConfirmSuccess,
                    ).toBeVisible({
                        timeout: 15_000,
                    });
                },
            );

            await test.step("Ведущий: открывает «Мои встречи»", async () => {
                await hostBooking.openBookings();
            });

            await test.step("Ведущий: видит встречу с первым гостем", async () => {
                await expect(
                    hostBooking.bookingCard(firstGuest.name),
                ).toBeVisible({
                    timeout: 10_000,
                });
            });

            await test.step("Ведущий: отменяет встречу", async () => {
                await hostBooking.cancelBookingWith(firstGuest.name);
            });

            await test.step("Отменённая встреча видна ведущему в прошедших", async () => {
                await expect(hostBooking.bookingCard(firstGuest.name)).toHaveCount(0);

                await expect(
                    hostBooking.pastBookingCard(firstGuest.name),
                ).toBeVisible({
                    timeout: 10_000,
                });
            });

            await test.step("Второй гость: регистрируется через API", async () => {
                await registerUserViaApi(secondGuestContext.request, secondGuest);
            });

            await test.step("Второй гость: открывает каталог и ищет ведущего по навыку", async () => {
                await secondGuestBooking.openCatalog();
                await secondGuestBooking.findPersonBySkill(skillTag);
            });

            await test.step("Второй гость: видит карточку ведущего", async () => {
                await expect(secondGuestBooking.personCard(hostName)).toBeVisible({
                    timeout: 10_000,
                });
            });

            await test.step("Второй гость: открывает карточку ведущего", async () => {
                await secondGuestBooking.openPersonCard(hostName);
            });

            await test.step("Второй гость: видит освобождённый слот", async () => {
                await expectSlotAvailable(secondGuestBooking, slotTime);
            });

            await test.step("Второй гость: выбирает освобождённый слот", async () => {
                await secondGuestBooking.selectSlotAt(slotTime);
            });

            await test.step(
                "Открывается окно подтверждения повторного бронирования",
                async () => {
                    await expect(
                        secondGuestBooking.bookingConfirmDialog,
                    ).toBeVisible({
                        timeout: 10_000,
                    });
                },
            );

            await test.step(
                "Второй гость: подтверждает бронирование",
                async () => {
                    await secondGuestBooking.confirmBooking();
                },
            );

            await test.step(
                "Бронирование второго гостя подтверждено",
                async () => {
                    await expect(
                        secondGuestBooking.bookingConfirmSuccess,
                    ).toBeVisible({
                        timeout: 15_000,
                    });
                },
            );

            await test.step("Ведущий: открывает «Мои встречи»", async () => {
                await hostBooking.openBookings();
            });

            await test.step("Ведущий видит новую встречу со вторым гостем", async () => {
                await expect(
                    hostBooking.bookingCard(secondGuest.name),
                ).toBeVisible({
                    timeout: 10_000,
                });
            });
        },
    );
});

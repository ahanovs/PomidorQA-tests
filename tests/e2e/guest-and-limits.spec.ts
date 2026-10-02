import { expect, test, type BrowserContext } from "@playwright/test";
import {
    cleanupUsersViaApi,
    makeUser,
    registerUserViaApi,
} from "../helpers/user";
import { createHostWithSkillAndSlot } from "../helpers/arrange";
import { BookingPage } from "../pages/booking-page";

function moscowSlotInNinetyMinutes(): {
    date: string;
    time: string;
} {
    const soon = new Date(Date.now() + 90 * 60 * 1000);

    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Moscow",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(soon);

    const part = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((item) => item.type === type)?.value ?? "";

    return {
        date: `${part("year")}-${part("month")}-${part("day")}`,
        time: `${part("hour")}:${part("minute")}`,
    };
}

test.describe("Гость и ограничения бронирования PomidorQA", () => {
    test(
        "гость без регистрации видит каталог и страницу участника, но не может забронировать слот",
        async ({ browser }) => {
            const contexts: BrowserContext[] = [];
            const skillTag = `Playwright-${Date.now()}`;
            const slotTime = "12:00";
            let guestContext: BrowserContext | undefined;

            try {
                const host = await test.step("Хост: готовим профиль с навыком и свободным слотом", () =>
                    createHostWithSkillAndSlot(browser, contexts, {
                        role: "host",
                        skillTag,
                        slotTime,
                    }),
                );

                guestContext = await browser.newContext();
                const booking = new BookingPage(await guestContext.newPage());

                await test.step("Гость открывает каталог и ищет по навыку", async () => {
                    await booking.openCatalog();
                    await booking.findPersonBySkill(skillTag);
                });

                await test.step("Гость видит карточку хоста в выдаче", async () => {
                    await expect(booking.personCard(host.host.name)).toBeVisible({
                        timeout: 10_000,
                    });
                });

                await test.step(
                    "Гость открывает страницу участника",
                    async () => {
                        await booking.openPersonCard(host.host.name);
                    },
                );

                await test.step(
                    "Гость видит данные участника и свободный слот",
                    async () => {
                        await expect(booking.personName).toHaveText(host.host.name);
                        await expect(booking.personSlotsTimezone).toBeVisible();
                        await expect(
                            booking.calendarTimeChipAt(slotTime),
                        ).toBeVisible({
                            timeout: 10_000,
                        });
                    },
                );

                await test.step("Гость выбирает слот", async () => {
                    await booking.selectSlotAt(slotTime);
                });

                await test.step("Открывается окно подтверждения бронирования", async () => {
                    await expect(booking.bookingConfirmDialog).toBeVisible({
                        timeout: 15_000,
                    });
                });

                await test.step("Гость подтверждает бронирование", async () => {
                    await booking.confirmBooking();
                });

                await test.step("Вместо брони гость видит предложение войти", async () => {
                    await expect(booking.bookingConfirmError).toBeVisible({
                        timeout: 10_000,
                    });

                    await expect(booking.bookingConfirmError).toContainText(
                        "Нужно войти",
                    );
                });
            } finally {
                await cleanupUsersViaApi(contexts);
                await guestContext?.close();
            }
        },
    );

    test(
        "после бронирования единственного слота участник пропадает из каталога (нет свободных слотов)",
        async ({ browser }) => {
            test.setTimeout(60_000);

            const contexts: BrowserContext[] = [];
            const runId = Date.now();
            const skillTag = `Api-${runId}`;
            const slotTime = "14:00";
            const guest = makeUser("guest-hidden", runId);
            let guestBooking: BookingPage;
            let viewerContext: BrowserContext | undefined;

            try {
                const host = await test.step("Хост: готовим профиль с навыком и свободным слотом", () =>
                    createHostWithSkillAndSlot(browser, contexts, {
                        role: "host-hidden",
                        skillTag,
                        slotTime,
                    }),
                );

                const guestContext = await browser.newContext();
                contexts.push(guestContext);
                guestBooking = new BookingPage(await guestContext.newPage());

                await test.step("Гость: регистрируется через API", async () => {
                    await registerUserViaApi(guestContext.request, guest);
                });

                await test.step(
                    "Гость открывает каталог и ищет хоста по навыку",
                    async () => {
                        await guestBooking.openCatalog();
                        await guestBooking.findPersonBySkill(skillTag);
                    },
                );

                await test.step(
                    "Гость видит хоста в каталоге до бронирования",
                    async () => {
                        await expect(
                            guestBooking.personCard(host.host.name),
                        ).toBeVisible({
                            timeout: 10_000,
                        });
                    },
                );

                await test.step("Гость открывает страницу хоста", async () => {
                    await guestBooking.openPersonCard(host.host.name);
                });

                await test.step("Гость видит свободный слот хоста", async () => {
                    await expect(
                        guestBooking.calendarTimeChipAt(slotTime),
                    ).toBeVisible({
                        timeout: 10_000,
                    });
                });

                await test.step("Гость выбирает слот хоста", async () => {
                    await guestBooking.selectSlotAt(slotTime);
                });

                await test.step(
                    "Открывается окно подтверждения бронирования",
                    async () => {
                        await expect(
                            guestBooking.bookingConfirmDialog,
                        ).toBeVisible({
                            timeout: 15_000,
                        });
                    },
                );

                await test.step("Гость подтверждает бронирование", async () => {
                    await guestBooking.confirmBooking();
                });

                await test.step("Бронирование подтверждено", async () => {
                    await expect(guestBooking.bookingConfirmSuccess).toBeVisible({
                        timeout: 15_000,
                    });
                });

                viewerContext = await browser.newContext();
                const viewerBooking = new BookingPage(await viewerContext.newPage());

                await test.step(
                    "Зритель открывает каталог и ищет хоста по навыку",
                    async () => {
                        await viewerBooking.openCatalog();
                        await viewerBooking.findPersonBySkill(skillTag);
                    },
                );

                await test.step(
                    "После брони единственного слота хоста в каталоге нет",
                    async () => {
                        await expect(
                            viewerBooking.personCard(host.host.name),
                        ).toHaveCount(0);
                    },
                );
            } finally {
                await cleanupUsersViaApi(contexts);
                await viewerContext?.close();
            }
        },
    );

    test(
        "нельзя отменить бронирование менее чем за 2 часа до начала",
        async ({ browser }) => {
            test.setTimeout(60_000);

            const contexts: BrowserContext[] = [];
            const runId = Date.now();
            const skillTag = `Testing-${runId}`;
            const guest = makeUser("guest-cancel", runId);
            const slot = moscowSlotInNinetyMinutes();
            let guestBooking: BookingPage;

            try {
                const host = await test.step("Хост: готовим профиль с навыком и слотом менее чем через 2 часа", () =>
                    createHostWithSkillAndSlot(browser, contexts, {
                        role: "host-cancel",
                        skillTag,
                        slotTime: slot.time,
                        slotDate: slot.date,
                    }),
                );

                const guestContext = await browser.newContext();
                contexts.push(guestContext);
                guestBooking = new BookingPage(await guestContext.newPage());

                await test.step("Гость: регистрируется через API", async () => {
                    await registerUserViaApi(guestContext.request, guest);
                });

                await test.step(
                    "Гость открывает каталог и ищет хоста по навыку",
                    async () => {
                        await guestBooking.openCatalog();
                        await guestBooking.findPersonBySkill(skillTag);
                    },
                );

                await test.step("Гость открывает страницу хоста", async () => {
                    await guestBooking.openPersonCard(host.host.name);
                });

                await test.step("Гость видит слот хоста", async () => {
                    await expect(
                        guestBooking.calendarTimeChipAt(slot.time),
                    ).toBeVisible({
                        timeout: 10_000,
                    });
                });

                await test.step("Гость выбирает слот хоста", async () => {
                    await guestBooking.selectSlotAt(slot.time);
                });

                await test.step(
                    "Открывается окно подтверждения бронирования",
                    async () => {
                        await expect(
                            guestBooking.bookingConfirmDialog,
                        ).toBeVisible({
                            timeout: 15_000,
                        });
                    },
                );

                await test.step("Гость подтверждает бронирование", async () => {
                    await guestBooking.confirmBooking();
                });

                await test.step("Бронирование подтверждено", async () => {
                    await expect(guestBooking.bookingConfirmSuccess).toBeVisible({
                        timeout: 15_000,
                    });
                });

                await test.step("Гость открывает «Мои встречи»", async () => {
                    await guestBooking.openBookings();
                });

                await test.step(
                    "Забронированная встреча видна гостю",
                    async () => {
                        await expect(
                            guestBooking.bookingCard(host.host.name),
                        ).toBeVisible({
                            timeout: 10_000,
                        });
                    },
                );

                await test.step(
                    "Гость пытается отменить встречу",
                    async () => {
                        await guestBooking.cancelBookingWith(host.host.name);
                    },
                );

                await test.step(
                    "Отмена менее чем за 2 часа запрещена — предупреждение видно",
                    async () => {
                        await expect(
                            guestBooking.cancellationTooLateWarning(),
                        ).toBeVisible({
                            timeout: 10_000,
                        });
                    },
                );

                await test.step("Гость снова открывает «Мои встречи»", async () => {
                    await guestBooking.openBookings();
                });

                await test.step(
                    "Бронь остаётся в «Моих встречах»",
                    async () => {
                        await expect(
                            guestBooking.bookingCard(host.host.name),
                        ).toBeVisible({
                            timeout: 10_000,
                        });
                    },
                );
            } finally {
                await cleanupUsersViaApi(contexts);
            }
        },
    );
});

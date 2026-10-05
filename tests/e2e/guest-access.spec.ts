import { expect, test } from "@playwright/test";
import { ROUTES } from "../helpers/user";

test.describe("Гостевой доступ", () => {
    test("приватные страницы недоступны гостю — редирект на форму входа", async ({
        page,
    }) => {
        const privatePages = [ROUTES.profile, ROUTES.slots, ROUTES.bookings];

        for (const path of privatePages) {
            await test.step(`Гость открывает ${path} без входа`, async () => {
                await page.goto(path);

                await expect(page).toHaveURL(ROUTES.login, {
                    timeout: 10_000,
                });
            });
        }
    });
});

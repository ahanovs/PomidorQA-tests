import { expect, test, type BrowserContext } from "@playwright/test";
import {
    cleanupUsersViaApi,
    makeUser,
    registerUserViaApi,
    type TestUser,
} from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";

test.describe("Профиль: редактирование", () => {
    const contexts: BrowserContext[] = [];

    let user: TestUser;
    let profile: ProfilePage;

    test.beforeEach(async ({ browser }) => {
        const runId = Date.now();

        user = makeUser("profile-edit", runId);

        const context = await browser.newContext();
        contexts.push(context);

        const page = await context.newPage();
        profile = new ProfilePage(page);

        await registerUserViaApi(context.request, user);
    });

    test.afterEach(async () => {
        await cleanupUsersViaApi(contexts);
        contexts.length = 0;
    });

    test(
        "сохраняет изменённые имя, Telegram и информацию о себе после перезагрузки",
        async () => {
            const updatedName = `Обновлённый пользователь ${Date.now()}`;
            const telegram = `@playwright_${Date.now()}`;
            const bio = "Проверяю сохранение данных профиля через Playwright.";

            await test.step("Пользователь открывает профиль", async () => {
                await profile.open();
            });

            await test.step(
                "Пользователь заполняет данные и сохраняет профиль",
                async () => {
                    await profile.fillNameTelegramBioAndSave(
                        updatedName,
                        telegram,
                        bio,
                    );
                },
            );

            await test.step("Поле имени содержит сохранённое значение", async () => {
                await expect(profile.profileNameInput).toHaveValue(updatedName);
            });

            await test.step("Поле Telegram содержит сохранённое значение", async () => {
                await expect(profile.profileTelegramInput).toHaveValue(telegram);
            });

            await test.step("Поле «О себе» содержит сохранённое значение", async () => {
                await expect(profile.profileBioInput).toHaveValue(bio);
            });

            await test.step("Пользователь перезагружает страницу профиля", async () => {
                await profile.page.reload();
            });

            await test.step(
                "Имя, Telegram и информация о себе сохранены после перезагрузки",
                async () => {
                    await expect(profile.profileNameInput).toHaveValue(updatedName);
                    await expect(profile.profileTelegramInput).toHaveValue(telegram);
                    await expect(profile.profileBioInput).toHaveValue(bio);
                },
            );
        },
    );

    test(
        "сохраняет выбранный часовой пояс после перезагрузки",
        async () => {
            const timezone = "Asia/Yekaterinburg";

            await test.step("Пользователь открывает профиль", async () => {
                await profile.open();
            });

            await test.step(
                "Пользователь выбирает новый часовой пояс и сохраняет профиль",
                async () => {
                    await profile.changeTimezoneAndSave(timezone);
                },
            );

            await test.step(
                "В селекте отображается выбранный часовой пояс",
                async () => {
                    await expect(profile.profileTimezoneSelect).toHaveValue(
                        timezone,
                    );
                },
            );

            await test.step(
                "Пользователь перезагружает страницу профиля",
                async () => {
                    await profile.page.reload();
                },
            );

            await test.step(
                "Часовой пояс сохранён после перезагрузки",
                async () => {
                    await expect(profile.profileTimezoneSelect).toHaveValue(
                        timezone,
                    );
                },
            );
        },
    );
});
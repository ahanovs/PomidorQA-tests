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
import { ProfilePage } from "../pages/profile-page";

test.describe("Профиль: значения по умолчанию", () => {
    const contexts: BrowserContext[] = [];

    test.afterEach(async () => {
        await cleanupUsersViaApi(contexts);
        contexts.length = 0;
    });

    test(
        "после регистрации профиль содержит имя участника и московский часовой пояс",
        async ({ browser }) => {
            const context = await browser.newContext();
            contexts.push(context);

            const user = makeUser("profile-defaults", Date.now());

            await test.step("Создаём участника через API", async () => {
                await registerUserViaApi(context.request, user);
            });

            const page = await context.newPage();
            const profilePage = new ProfilePage(page);

            await test.step("Открываем профиль участника", async () => {
                await profilePage.open();
            });

            await test.step("Профиль содержит имя из регистрации", async () => {
                await expect(profilePage.profileNameInput).toHaveValue(user.name);
            });

            await test.step(
                "В профиле выбран часовой пояс Europe/Moscow",
                async () => {
                    await expect(
                        profilePage.profileTimezoneSelect,
                    ).toHaveValue("Europe/Moscow");
                },
            );
        },
    );
});
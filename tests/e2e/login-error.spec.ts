import { expect, test } from "@playwright/test";
import {
  deleteCurrentTestUser,
  makeUser,
  registerUserViaApi,
} from "../helpers/user";
import { LoginPage } from "../pages/login-page";

test.describe("Вход: сообщения об ошибках", () => {
    test("неверный пароль и несуществующий email дают одинаковую ошибку без уточнения причины", async ({
        page,
        request,
    }) => {
        const user = makeUser("login-check", Date.now());
        const loginPage = new LoginPage(page);

        await test.step("Создаём аккаунт через API", async () => {
            await registerUserViaApi(request, user);
        });

        try {
            let wrongPasswordError = "";
            await test.step("Входим с верным email, но неверным паролем", async () => {
                await loginPage.open();
                await loginPage.login(user.email, "wrong-password");
            });

            await test.step("Появилась ошибка входа", async () => {
                const error = loginPage.errorMessage();
                await expect(error).toBeVisible();
                wrongPasswordError = (await error.textContent())?.trim() ?? "";
            });

            let unknownEmailError = "";
            await test.step("Входим с несуществующим email", async () => {
                await loginPage.open();
                await loginPage.login(`no-such-${user.email}`, user.password);
            });

            await test.step("Ошибка входа та же, что для неверного пароля", async () => {
                const error = loginPage.errorMessage();
                await expect(error).toBeVisible();
                unknownEmailError = (await error.textContent())?.trim() ?? "";
            });

            await test.step("Текст ошибки одинаковый в обоих случаях — не раскрывает, что именно неверно", async () => {
                expect(wrongPasswordError).toBe(unknownEmailError);
                expect(wrongPasswordError).toContain("Неверный");
            });
        } finally {
            await deleteCurrentTestUser(request);
        }
    });
});

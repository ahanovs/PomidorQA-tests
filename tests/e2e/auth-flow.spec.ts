import { expect, test } from "@playwright/test";
import {
    deleteCurrentTestUser,
    makeUser,
    registerUserViaApi,
    ROUTES,
} from "../helpers/user";
import { LoginPage } from "../pages/login-page";
import { ProfilePage } from "../pages/profile-page";
import { RegisterPage } from "../pages/register-page";

test.describe("Регистрация и вход", () => {
    test("регистрация с пустой формой не проходит", async ({ page }) => {
        const register = new RegisterPage(page);

        await test.step("Гость открывает регистрацию и жмёт кнопку с пустыми полями", async () => {
            await register.open();
            await register.submit();
        });

        await test.step("Форма не отправилась — все обязательные поля невалидны", async () => {
            await expect(page).toHaveURL(ROUTES.register);
            await expect(register.invalidName()).toHaveCount(1);
            await expect(register.invalidEmail()).toHaveCount(1);
            await expect(register.invalidPassword()).toHaveCount(1);
        });
    });

    test("регистрация с паролем короче 8 символов не проходит", async ({
        page,
    }) => {
        const register = new RegisterPage(page);
        const runId = Date.now();

        await test.step("Заполняем форму: имя и email валидны, пароль — 7 символов", async () => {
            await register.open();
            await register.register(
                `r42-${runId} Автотест`,
                `r42-${runId}@example.com`,
                "short7",
            );
        });

        await test.step("Форма не отправилась — невалиден только пароль", async () => {
            await expect(page).toHaveURL(ROUTES.register);
            await expect(register.invalidPassword()).toHaveCount(1);
            await expect(register.invalidName()).toHaveCount(0);
            await expect(register.invalidEmail()).toHaveCount(0);
        });
    });

    test("повторная регистрация на занятый email не создаёт аккаунт", async ({
        page,
        request,
    }) => {
        const register = new RegisterPage(page);
        const first = makeUser("auth-dup", Date.now());

        try {
            await test.step("Первый аккаунт регистрируется через API", async () => {
                await registerUserViaApi(request, first);
            });

            await test.step("Форма регистрации на тот же email", async () => {
                await register.open();
                await register.register(
                    "Второй Автотест",
                    first.email,
                    "testpass123",
                );
            });

            await test.step("Форма остаётся на месте и показывает ошибку занятого email", async () => {
                await expect(page).toHaveURL(ROUTES.register);
                await expect(register.registrationError()).toBeVisible({
                    timeout: 10_000,
                });
                await expect(register.registrationError()).toContainText(
                    "уже зарегистрирован",
                );
            });
        } finally {
            await deleteCurrentTestUser(request);
        }
    });

    test("успешный вход держит сессию, а выход закрывает её", async ({
        page,
        request,
    }) => {
        const loginPage = new LoginPage(page);
        const profilePage = new ProfilePage(page);
        const user = makeUser("auth-session", Date.now());

        try {
            await test.step("Пользователь регистрируется через API", async () => {
                await registerUserViaApi(request, user);
            });

            await test.step("Вход через форму", async () => {
                await loginPage.open();
                await loginPage.login(user.email, user.password);

                await expect(page).toHaveURL(ROUTES.catalog, {
                    timeout: 10_000,
                });
            });

            await test.step("После перезагрузки профиля сессия жива", async () => {
                await profilePage.open();
                await expect(profilePage.profileNameInput).toHaveValue(
                    user.name,
                    { timeout: 10_000 },
                );
            });

            await test.step("Выход возвращает в каталог гостя", async () => {
                await loginPage.logout();

                await expect(page).toHaveURL(ROUTES.catalog, {
                    timeout: 10_000,
                });
            });

            await test.step("После выхода профиль недоступен — редирект на вход", async () => {
                await profilePage.open();

                await expect(page).toHaveURL(ROUTES.login, {
                    timeout: 10_000,
                });
            });
        } finally {
            await deleteCurrentTestUser(request);
        }
    });
});

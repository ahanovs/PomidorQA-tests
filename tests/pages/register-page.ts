import { type Locator, type Page } from "@playwright/test";
import { ROUTES } from "../helpers/user";

export class RegisterPage {
    readonly page: Page;

    readonly nameInput: Locator;
    readonly emailInput: Locator;
    readonly passwordInput: Locator;
    readonly registerButton: Locator;

    constructor(page: Page) {
        this.page = page;

        this.nameInput = page.getByLabel("Имя");
        this.emailInput = page.getByLabel("Email");
        this.passwordInput = page.getByLabel("Пароль");
        this.registerButton = page.getByRole("button", {
            name: "Зарегистрироваться",
        });
    }

    async open(): Promise<void> {
        await this.page.goto(ROUTES.register);
    }

    async register(
        name: string,
        email: string,
        password: string,
    ): Promise<void> {
        await this.nameInput.fill(name);
        await this.emailInput.fill(email);
        await this.passwordInput.fill(password);
        await this.submit();
    }

    async submit(): Promise<void> {
        await this.registerButton.click();
    }

    // Нативная валидация формы не имеет ARIA-представления: у невалидного
    // поля нет роли и текста в снапшоте, его видно только через :invalid.
    invalidName(): Locator {
        return this.page.locator('input[name="name"]:invalid');
    }

    invalidEmail(): Locator {
        return this.page.locator('input[name="email"]:invalid');
    }

    invalidPassword(): Locator {
        return this.page.locator('input[name="password"]:invalid');
    }

    registrationError(): Locator {
        return this.page.getByRole("alert").filter({
            hasText: "уже зарегистрирован",
        });
    }
}

import { type Locator, type Page } from "@playwright/test";
import { ROUTES } from "../helpers/user";

export class LoginPage {
    readonly page: Page;

    readonly emailInput: Locator;
    readonly passwordInput: Locator;
    readonly submitButton: Locator;

    constructor(page: Page) {
        this.page = page;

        this.emailInput = page.getByLabel("Email");
        this.passwordInput = page.getByLabel("Пароль");
        this.submitButton = page.getByRole("button", { name: "Войти" });
    }

    async open(): Promise<void> {
        await this.page.goto(ROUTES.login);
    }

    async login(email: string, password: string): Promise<void> {
        await this.emailInput.fill(email);
        await this.passwordInput.fill(password);
        await this.submitButton.click();
    }

    errorMessage(): Locator {
        return this.page.getByText(/Неверный/);
    }
}

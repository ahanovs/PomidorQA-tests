import { type Locator, type Page } from "@playwright/test";
import { ROUTES } from "../helpers/user";

export class ProfilePage {
    readonly page: Page;

    readonly profileNameInput: Locator;
    readonly profileTelegramInput: Locator;
    readonly profileTimezoneSelect: Locator;
    readonly profileBioInput: Locator;
    readonly profileSaveButton: Locator;

    readonly skillInput: Locator;
    readonly skillTypeSelect: Locator;
    readonly addSkillButton: Locator;
    readonly canHelpSkills: Locator;
    readonly skillChips: Locator;

    constructor(page: Page) {
        this.page = page;

        this.profileNameInput = page.getByLabel("Имя");
        this.profileTelegramInput = page.getByLabel("Telegram");
        this.profileTimezoneSelect = page.getByLabel("Часовой пояс");
        this.profileBioInput = page.getByLabel("О себе");
        this.profileSaveButton = page.getByRole("button", {
            name: "Сохранить",
        });

        this.skillInput = page.locator("#pomidorqa-profile-skill-input");
        this.skillTypeSelect = page.locator("#pomidorqa-profile-skill-type");
        this.addSkillButton = page.getByRole("button", {
            name: "Добавить",
        });
        this.canHelpSkills = page.getByTestId("can-help-skills");
        this.skillChips = page.locator("[data-skill-tag]");
    }

    async open(): Promise<void> {
        await this.page.goto(ROUTES.profile);
    }

    skillChip(tag: string): Locator {
        return this.page.locator(`[data-skill-tag="${tag}"]`);
    }

    async saveProfile(): Promise<void> {
        const saved = this.page.waitForResponse(
            (response) =>
                response.url().endsWith(ROUTES.profile) &&
                response.request().method() === "POST",
        );

        await this.profileSaveButton.click();
        await saved;
    }

    async changeNameAndSave(name: string): Promise<void> {
        await this.profileNameInput.fill(name);
        await this.saveProfile();
    }

    async changeTimezoneAndSave(timezone: string): Promise<void> {
        await this.profileTimezoneSelect.selectOption(timezone);
        await this.saveProfile();
    }

    async addTelegramAndSave(telegram: string): Promise<void> {
        await this.profileTelegramInput.fill(telegram);
        await this.saveProfile();
    }

    async addBioAndSave(bio: string): Promise<void> {
        await this.profileBioInput.fill(bio);
        await this.saveProfile();
    }

    async fillNameTelegramBioAndSave(
        name: string,
        telegram: string,
        bio: string,
    ): Promise<void> {
        await this.profileNameInput.fill(name);
        await this.profileTelegramInput.fill(telegram);
        await this.profileBioInput.fill(bio);
        await this.saveProfile();
    }

    async fillName(name: string): Promise<void> {
        await this.profileNameInput.fill(name);
    }

    async fillTelegram(telegram: string): Promise<void> {
        await this.profileTelegramInput.fill(telegram);
    }

    async selectTimezone(timezone: string): Promise<void> {
        await this.profileTimezoneSelect.selectOption(timezone);
    }

    async fillBio(bio: string): Promise<void> {
        await this.profileBioInput.fill(bio);
    }

    async addSkill(
        skillTag: string,
        type: "can_help" | "want_to_learn",
    ): Promise<void> {
        await this.skillInput.fill(skillTag);
        await this.skillTypeSelect.selectOption(type);
        await this.addSkillButton.click();
    }

    async addCanHelpSkill(skillTag: string): Promise<void> {
        await this.addSkill(skillTag, "can_help");
    }

    async addWantToLearnSkill(skillTag: string): Promise<void> {
        await this.addSkill(skillTag, "want_to_learn");
    }

    async clickAddSkill(): Promise<void> {
        await this.addSkillButton.click();
    }

    async deleteSkill(skillTag: string): Promise<void> {
        await this.skillChip(skillTag)
            .getByRole("button", {
                name: `Убрать ${skillTag}`,
                exact: true,
            })
            .click();
    }
}
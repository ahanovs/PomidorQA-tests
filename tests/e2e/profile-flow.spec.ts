import {
    expect,
    test,
    type BrowserContext,
    type Page,
} from "@playwright/test";
import {
    cleanupUsersViaApi,
    makeUser,
    registerUserViaApi,
} from "../helpers/user";
import { ProfilePage } from "../pages/profile-page";

test.describe("Профиль: действия с полями и навыками", () => {
    const contexts: BrowserContext[] = [];
    let page: Page;
    let profilePage: ProfilePage;

    test.beforeEach(async ({ browser }) => {
        const context = await browser.newContext();
        contexts.push(context);

        const user = makeUser("hw16", Date.now());
        await registerUserViaApi(context.request, user);

        page = await context.newPage();
        profilePage = new ProfilePage(page);
        await profilePage.open();
    });

    test.afterEach(async () => {
        await cleanupUsersViaApi(contexts);
        contexts.length = 0;
    });

    test("имя сохраняется после перезагрузки", async () => {
        const newName = `Тимур Тестович ${Date.now()}`;

        await test.step("Заполняем поле имени и сохраняем", async () => {
            await profilePage.changeNameAndSave(newName);
        });

        await test.step("Пользователь перезагружает страницу профиля", async () => {
            await page.reload();
        });

        await test.step("После перезагрузки имя пришло с сервера", async () => {
            await expect(profilePage.profileNameInput).toHaveValue(newName);
        });
    });

    test("часовой пояс выбирается и сохраняется", async () => {
        const timezone = "Asia/Yekaterinburg";

        await test.step("Выбираем часовой пояс и сохраняем", async () => {
            await profilePage.changeTimezoneAndSave(timezone);
        });

        await test.step("Пользователь перезагружает страницу профиля", async () => {
            await page.reload();
        });

        await test.step("После перезагрузки выбран новый пояс", async () => {
            await expect(profilePage.profileTimezoneSelect).toHaveValue(timezone);
        });
    });

    test("telegram заполняется и сохраняется", async () => {
        const telegram = `@qa_timur_cat_${Date.now()}`;

        await test.step("Заполняем Telegram и сохраняем", async () => {
            await profilePage.addTelegramAndSave(telegram);
        });

        await test.step("Пользователь перезагружает страницу профиля", async () => {
            await page.reload();
        });

        await test.step("После перезагрузки Telegram пришёл с сервера", async () => {
            await expect(profilePage.profileTelegramInput).toHaveValue(telegram);
        });
    });

    test("о себе: многострочное поле сохраняется", async () => {
        const bio = `QA-инженер, прогон ${Date.now()}. Пытаюсь разобраться в Playwright.`;

        await test.step("Заполняем «О себе» и сохраняем", async () => {
            await profilePage.addBioAndSave(bio);
        });

        await test.step("Пользователь перезагружает страницу профиля", async () => {
            await page.reload();
        });

        await test.step("После перезагрузки текст пришёл с сервера", async () => {
            await expect(profilePage.profileBioInput).toHaveValue(bio);
        });
    });

    test("навык «могу помочь» добавляется и виден в блоке", async () => {
        const skillTag = `Playwright-demo-${Date.now()}`;

        await test.step("Добавляем навык «могу помочь»", async () => {
            await profilePage.addSkill(skillTag, "can_help");
        });

        await test.step("Навык появился в блоке «могу помочь»", async () => {
            await expect(profilePage.canHelpSkills).toContainText(skillTag);
        });
    });

    test("пустой навык не добавляется", async () => {
        await test.step("Пытаемся добавить навык без названия", async () => {
            await profilePage.clickAddSkill();
        });

        await test.step("Навык не появился", async () => {
            await expect(profilePage.skillChips).toHaveCount(0);
            await expect(profilePage.canHelpSkills).not.toBeVisible();
        });
    });

    test("дубликат навыка одного типа не добавляется", async () => {
        const skillTag = `DuplicateSkill-${Date.now()}`;

        await test.step("Добавляем навык «могу помочь» первый раз", async () => {
            await profilePage.addSkill(skillTag, "can_help");
        });

        await test.step("Первый навык появился", async () => {
            await expect(profilePage.canHelpSkills).toContainText(skillTag);
        });

        await test.step("Пытаемся добавить тот же навык второй раз", async () => {
            await profilePage.addSkill(skillTag, "can_help");
        });

        await test.step("Дубликат не появился", async () => {
            await expect(profilePage.skillChips).toHaveCount(1);
            await expect(profilePage.canHelpSkills).toContainText(skillTag);
        });
    });

    test("навык «хочу разобрать» не попадает в блок «могу помочь»", async () => {
        const runId = Date.now();
        const canHelpTag = `CanHelp-${runId}`;
        const wantToLearnTag = `WantToLearn-${runId}`;

        await test.step("Добавляем навык «могу помочь»", async () => {
            await profilePage.addSkill(canHelpTag, "can_help");
        });

        await test.step("Навык «могу помочь» появился в блоке", async () => {
            await expect(profilePage.canHelpSkills).toContainText(canHelpTag);
        });

        await test.step("Добавляем навык «хочу разобрать»", async () => {
            await profilePage.addSkill(wantToLearnTag, "want_to_learn");
        });

        await test.step("Навык «хочу разобрать» появился", async () => {
            await expect(profilePage.skillChip(wantToLearnTag)).toBeVisible();
        });

        await test.step("Навык «хочу разобрать» не попал в блок «могу помочь»", async () => {
            await expect(profilePage.canHelpSkills).toContainText(canHelpTag);
            await expect(profilePage.canHelpSkills).not.toContainText(wantToLearnTag);
        });
    });

    test("форма профиля: имя, telegram и био сохраняются за один раз", async () => {
        const runId = Date.now();
        const name = `Тимур Тестовый ${runId}`;
        const telegram = `@qa_timur_${runId}`;
        const bio = `QA-инженер, прогон ${runId}. Проверяю форму профиля целиком.`;

        await test.step("Заполняем имя, Telegram и «О себе», сохраняем разом", async () => {
            await profilePage.fillNameTelegramBioAndSave(name, telegram, bio);
        });

        await test.step("Пользователь перезагружает страницу профиля", async () => {
            await page.reload();
        });

        await test.step("После перезагрузки все три значения пришли с сервера", async () => {
            await expect.soft(profilePage.profileNameInput).toHaveValue(name);
            await expect.soft(profilePage.profileTelegramInput).toHaveValue(telegram);
            await expect.soft(profilePage.profileBioInput).toHaveValue(bio);
        });
    });
});

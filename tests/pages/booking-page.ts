import { type Locator, type Page } from "@playwright/test";
import { ROUTES } from "../helpers/user";

export class BookingPage {
    readonly page: Page;

    readonly slotsDateInput: Locator;
    readonly slotsTimeInput: Locator;
    readonly slotsAddSubmit: Locator;
    readonly slotsCards: Locator;

    readonly catalogFilterInput: Locator;
    readonly catalogFilterSubmit: Locator;
    readonly catalogCards: Locator;
    readonly catalogEmptyState: Locator;

    readonly personName: Locator;
    readonly personBio: Locator;
    readonly personTelegram: Locator;
    readonly personSlotsTimezone: Locator;

    readonly bookingCalendarDays: Locator;
    readonly bookingCalendarTimes: Locator;

    readonly bookingConfirmDialog: Locator;
    readonly bookingConfirmButton: Locator;
    readonly bookingConfirmSuccess: Locator;
    readonly bookingConfirmError: Locator;

    readonly bookingsUpcomingSection: Locator;
    readonly bookingsPastSection: Locator;
    readonly bookingsCards: Locator;
    readonly pastBookingsCards: Locator;

    constructor(page: Page) {
        this.page = page;

        this.slotsDateInput = page.locator("#pomidorqa-slots-date");
        this.slotsTimeInput = page.locator("#pomidorqa-slots-time");
        this.slotsAddSubmit = page.getByRole("button", {
            name: "Добавить слот",
        });
        this.slotsCards = page.locator("[data-slot-id]");

        this.catalogFilterInput = page.locator(
            "#pomidorqa-catalog-skill-filter",
        );
        this.catalogFilterSubmit = page.getByRole("button", {
            name: "Найти",
        });
        this.catalogCards = page.getByTestId("person-card");
        this.catalogEmptyState = page.getByText(
            "Пока никого не нашли по этому фильтру",
        );

        this.personName = page.getByRole("heading", { level: 1 });
        this.personBio = this.personName.locator(
            "xpath=following-sibling::p[1]",
        );
        this.personTelegram = this.personName.locator(
            "xpath=following-sibling::p[2]",
        );
        this.personSlotsTimezone = page.getByTestId("slots-timezone");

        this.bookingCalendarDays = page
            .getByRole("group", { name: "Дни со слотами" })
            .getByRole("button");

        this.bookingCalendarTimes = page
            .getByRole("group", { name: "Время слотов" })
            .getByRole("button");

        this.bookingConfirmDialog = page.getByRole("dialog");
        this.bookingConfirmButton = this.bookingConfirmDialog.getByRole(
            "button",
            { name: "Подтвердить" },
        );
        this.bookingConfirmSuccess = this.bookingConfirmDialog.getByRole(
            "status",
        );
        this.bookingConfirmError = this.bookingConfirmDialog.getByRole(
            "alert",
        );

        this.bookingsUpcomingSection = page.getByTestId("upcoming-meetings");
        this.bookingsPastSection = page.locator("section").filter({
            has: page.getByRole("heading", {
                name: "Прошедшие и отменённые",
            }),
        });
        this.bookingsCards = this.bookingsUpcomingSection.locator(
            "[data-booking-id]",
        );
        this.pastBookingsCards = this.bookingsPastSection.locator(
            "[data-booking-id]",
        );
    }

    async goToSlots(): Promise<void> {
        await this.page.goto(ROUTES.slots);
    }

    async openCatalog(): Promise<void> {
        await this.page.goto("/pomidorqa");
    }

    async openBookings(): Promise<void> {
        await this.page.goto(ROUTES.bookings);
    }

    async addSlot(date: string, time: string): Promise<void> {
        await this.slotsDateInput.fill(date);
        await this.slotsTimeInput.fill(time);
        await this.slotsAddSubmit.click();
    }

    slotCard(time: string): Locator {
        return this.slotsCards.filter({ hasText: time });
    }

    async deleteSlot(time: string): Promise<void> {
        await this.slotCard(time)
            .getByRole("button", { name: "Удалить" })
            .click();
    }

    personCard(name: string): Locator {
        return this.catalogCards.filter({ hasText: name });
    }

    async findPersonBySkill(skillTag: string): Promise<void> {
        await this.catalogFilterInput.fill(skillTag);
        await this.catalogFilterSubmit.click();
    }

    async openPersonCard(name: string): Promise<void> {
        await this.personCard(name).click();
    }

    calendarDayChip(): Locator {
        return this.bookingCalendarDays.first();
    }

    calendarTimeChip(): Locator {
        return this.bookingCalendarTimes.first();
    }

    async selectFirstSlot(): Promise<void> {
        await this.calendarDayChip().click();

        const firstTime = this.calendarTimeChip();

        await firstTime.waitFor({ state: "visible" });
        await firstTime.click();
    }

    async selectSlotAt(time: string): Promise<void> {
        await this.calendarDayChip().click();

        const timeChip = this.bookingCalendarTimes.filter({
            hasText: time,
        });

        await timeChip.waitFor({ state: "visible" });
        await timeChip.click();
    }

    async confirmBooking(): Promise<void> {
        await this.bookingConfirmButton.click();
    }

    bookingCardName(): Locator {
        return this.bookingsCards.first().locator("p").first();
    }

    bookingCard(personName: string): Locator {
        return this.bookingsCards.filter({ hasText: personName });
    }

    async cancelFirstBooking(): Promise<void> {
        await this.bookingsUpcomingSection
            .getByRole("button", { name: "Отменить" })
            .click();
    }

    async cancelBookingWith(personName: string): Promise<void> {
        await this.bookingCard(personName)
            .getByRole("button", { name: "Отменить" })
            .click();
    }

    pastBookingCardName(): Locator {
        return this.pastBookingsCards.first().locator("p").first();
    }

    pastBookingCardStatus(): Locator {
        return this.pastBookingsCards.first().locator("p").nth(1);
    }

    pastBookingCard(personName: string): Locator {
        return this.pastBookingsCards.filter({ hasText: personName });
    }

    personCanHelpSkill(skillTag: string): Locator {
        return this.page
            .getByText("Может помочь с", { exact: true })
            .locator("xpath=following-sibling::div[1]")
            .locator(`[data-skill-tag="${skillTag}"]`);
    }

    personWantToLearnSkill(skillTag: string): Locator {
        return this.page
            .getByText("Хочет разобрать", { exact: true })
            .locator("xpath=following-sibling::div[1]")
            .locator(`[data-skill-tag="${skillTag}"]`);
    }
}
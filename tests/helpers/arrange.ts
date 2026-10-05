import {
  type Browser,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { makeUser, registerUserViaApi } from "./user";
import { tomorrowDate } from "./dates";
import { BookingPage } from "../pages/booking-page";
import { ProfilePage } from "../pages/profile-page";

export type HostWithSkillAndSlot = {
  host: ReturnType<typeof makeUser>;
  hostId: string;
  hostPage: Page;
  hostProfile: ProfilePage;
  hostBooking: BookingPage;
};

// Arrange для сценариев «найти хоста по навыку и забронировать слот».
// Context попадает в contexts до первого действия, которое может упасть, —
// иначе cleanup после падения не сработает (кодекс 12).
export async function createHostWithSkillAndSlot(
  browser: Browser,
  contexts: BrowserContext[],
  params: {
    role: string;
    skillTag: string;
    skillType?: "can_help" | "want_to_learn";
    slotTime: string;
    slotDate?: string;
  },
): Promise<HostWithSkillAndSlot> {
  const host = makeUser(params.role, Date.now());

  const context = await browser.newContext();
  contexts.push(context);

  const hostPage = await context.newPage();
  const hostProfile = new ProfilePage(hostPage);
  const hostBooking = new BookingPage(hostPage);

  const hostRegistered = await registerUserViaApi(context.request, host);
  await hostProfile.open();
  await hostProfile.addSkill(params.skillTag, params.skillType ?? "can_help");
  await hostProfile.skillChip(params.skillTag).waitFor({
    state: "visible",
    timeout: 10_000,
  });

  await hostBooking.goToSlots();
  await hostBooking.addSlot(params.slotDate ?? tomorrowDate(), params.slotTime);
  await hostBooking.slotCard(params.slotTime).waitFor({
    state: "visible",
    timeout: 10_000,
  });

  return { host, hostId: hostRegistered.id, hostPage, hostProfile, hostBooking };
}

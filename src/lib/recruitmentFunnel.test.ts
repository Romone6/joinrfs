import { describe, expect, it } from "vitest";
import {
  buildLeadSubmissionPayload,
  defaultPublicSettings,
  emptyLeadSurveyForm,
  normalizePublicSettings,
  shouldAutoOpenPopup,
} from "./recruitmentFunnel";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("buildLeadSubmissionPayload", () => {
  it("validates and normalizes the conversion form payload", () => {
    const payload = buildLeadSubmissionPayload(
      {
        ...emptyLeadSurveyForm,
        first_name: " Tom ",
        last_name: " Farmer ",
        email: "TOM@example.com",
        suburb: "Orange",
        postcode: "2800",
        age_range: "25-34",
        interest_type: "volunteering",
        joining_timeline: "now",
        preferred_contact_method: "email",
        consent_email: true,
      },
      new URLSearchParams("utm_source=facebook&utm_medium=paid&utm_campaign=winter"),
    );

    expect(payload).toMatchObject({
      first_name: "Tom",
      last_name: "Farmer",
      email: "TOM@example.com",
      source: "facebook",
      utm_source: "facebook",
      utm_medium: "paid",
      utm_campaign: "winter",
    });
  });
});

describe("shouldAutoOpenPopup", () => {
  it("opens when enabled and not seen in this session", () => {
    expect(shouldAutoOpenPopup(defaultPublicSettings, new MemoryStorage())).toBe(true);
  });

  it("does not auto-open when disabled or already seen", () => {
    const storage = new MemoryStorage();
    storage.setItem("joinrfs_popup_seen", "true");

    expect(shouldAutoOpenPopup(defaultPublicSettings, storage)).toBe(false);
    expect(shouldAutoOpenPopup({ popup_enabled: false }, new MemoryStorage())).toBe(false);
  });
});

describe("normalizePublicSettings", () => {
  it("falls back safely for malformed settings", () => {
    expect(normalizePublicSettings({ popup_enabled: "yes", cta_text: "Send me the guide" })).toMatchObject({
      popup_enabled: true,
      cta_text: "Send me the guide",
    });
  });
});

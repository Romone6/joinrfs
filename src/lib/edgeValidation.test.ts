import { describe, expect, it } from "vitest";
import { calculatePriority, validateLeadSubmission } from "../../supabase/functions/_shared/validation";

describe("validateLeadSubmission", () => {
  it("rejects invalid email server-side", () => {
    const result = validateLeadSubmission({
      first_name: "Sam",
      email: "not-an-email",
      suburb: "Dubbo",
      postcode: "2830",
      age_range: "25-34",
      interest_type: "volunteering",
      joining_timeline: "now",
      preferred_contact_method: "email",
    });

    expect(result.error).toBe("A valid email is required.");
  });

  it("accepts the required V1 survey fields", () => {
    const result = validateLeadSubmission({
      first_name: "Sam",
      last_name: "Taylor",
      email: "sam@example.com",
      phone: "0400000000",
      suburb: "Dubbo",
      postcode: "2830",
      age_range: "25-34",
      interest_type: "volunteering",
      joining_timeline: "now",
      preferred_contact_method: "email",
      consent_email: true,
      consent_sms: true,
    });

    expect(result.data).toMatchObject({
      first_name: "Sam",
      email: "sam@example.com",
      consent_email: true,
      consent_sms: true,
    });
  });
});

describe("calculatePriority", () => {
  it("keeps priority simple and high for urgent leads with phone numbers", () => {
    expect(calculatePriority({ phone: "0400000000", joining_timeline: "now" })).toBe("High");
    expect(calculatePriority({ phone: null, joining_timeline: "researching" })).toBe("Medium");
  });
});

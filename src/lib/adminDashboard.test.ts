import { describe, expect, it } from "vitest";
import { contactText, mailtoHref, smsHref, telHref } from "./adminDashboard";
import type { AdminLead } from "./adminTypes";

const lead = {
  first_name: "Alex",
  last_name: "Taylor",
  email: "alex@example.com",
  phone: "+61400111222",
  suburb: "Dubbo",
  postcode: "2830",
  interest_type: "volunteering",
  joining_timeline: "now",
} as AdminLead;

describe("adminDashboard helpers", () => {
  it("builds operator contact text", () => {
    expect(contactText(lead)).toContain("Name: Alex Taylor");
    expect(contactText(lead)).toContain("Phone: +61400111222");
    expect(contactText(lead)).toContain("Location: Dubbo 2830");
  });

  it("builds native email, call, and SMS links", () => {
    expect(mailtoHref(lead)).toContain("mailto:alex%40example.com");
    expect(mailtoHref(lead)).toContain("Following%20up%20on%20your%20RFS%20joining%20guide");
    expect(telHref(lead)).toBe("tel:+61400111222");
    expect(smsHref(lead)).toContain("sms:%2B61400111222");
  });

  it("does not create phone links without a phone number", () => {
    expect(telHref({ phone: null })).toBe("#");
    expect(smsHref({ phone: null, first_name: "Alex" })).toBe("#");
  });
});

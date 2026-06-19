import { describe, expect, it } from "vitest";
import { calculateBasicPriority, priorityRank } from "./priority";

describe("calculateBasicPriority", () => {
  it("marks clicked leads with phone and urgent timeline as high priority", () => {
    expect(
      calculateBasicPriority({
        package_clicked_at: "2026-06-12T01:00:00.000Z",
        phone: "0400000000",
        joining_timeline: "I want to start now",
      }),
    ).toBe("High");
  });

  it("marks new leads as medium priority", () => {
    expect(calculateBasicPriority({ status: "New" })).toBe("Medium");
  });

  it("marks old weak leads as low priority", () => {
    expect(
      calculateBasicPriority(
        {
          created_at: "2026-01-01T00:00:00.000Z",
          status: "Not Interested",
          phone: null,
          package_clicked_at: null,
        },
        new Date("2026-06-12T00:00:00.000Z"),
      ),
    ).toBe("Low");
  });
});

describe("priorityRank", () => {
  it("sorts High above Medium above Low", () => {
    expect(["Low", "High", "Medium"].sort((a, b) => priorityRank(b) - priorityRank(a))).toEqual([
      "High",
      "Medium",
      "Low",
    ]);
  });
});

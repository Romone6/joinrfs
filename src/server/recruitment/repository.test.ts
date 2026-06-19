import { describe, expect, it } from "vitest";
import { createLead } from "./repository";
import type { Lead } from "./types";

class FakeQuery {
  private rows: unknown[] | unknown | null = null;

  constructor(
    private readonly table: string,
    private readonly tables: Record<string, unknown[]>,
  ) {}

  insert(payload: unknown): FakeQuery {
    const rows = Array.isArray(payload) ? payload : [payload];
    const inserted = rows.map((row) => ({
      id: `${this.table}-${this.tables[this.table].length + 1}`,
      created_at: "2026-06-12T00:00:00.000Z",
      updated_at: "2026-06-12T00:00:00.000Z",
      sheet_sync_status: "not_synced",
      ...row,
    }));

    this.tables[this.table].push(...inserted);
    this.rows = Array.isArray(payload) ? inserted : inserted[0];
    return this;
  }

  select(): FakeQuery {
    return this;
  }

  single(): Promise<{ data: unknown; error: null }> {
    return Promise.resolve({ data: this.rows, error: null });
  }

  then(resolve: (value: { error: null }) => void): Promise<void> {
    return Promise.resolve(resolve({ error: null }));
  }
}

class FakeSupabase {
  readonly tables: Record<string, unknown[]> = {
    leads: [],
    survey_responses: [],
    lead_activities: [],
  };

  from(table: string): FakeQuery {
    return new FakeQuery(table, this.tables);
  }
}

describe("createLead", () => {
  it("creates a lead, stores survey responses, and logs lead_created activity", async () => {
    const fakeSupabase = new FakeSupabase();

    const lead = await createLead(fakeSupabase as never, {
      firstName: "Sam",
      lastName: "Taylor",
      email: "SAM@example.com",
      phone: "0400000000",
      joiningTimeline: "now",
      source: "facebook",
      surveyResponses: [
        {
          questionKey: "motivation",
          questionLabel: "Why do you want to join?",
          answer: "Community",
        },
      ],
    });

    expect((lead as Lead).email).toBe("sam@example.com");
    expect(fakeSupabase.tables.leads).toHaveLength(1);
    expect(fakeSupabase.tables.survey_responses).toHaveLength(1);
    expect(fakeSupabase.tables.lead_activities).toMatchObject([
      {
        lead_id: "leads-1",
        activity_type: "lead_created",
      },
    ]);
  });
});

import { describe, expect, it } from "vitest";

import {
  buildOutreachDraftInput,
  mapDraftToRow,
  outreachDraftsOutputSchema,
  type OutreachDraft,
  type PlayForDrafting,
} from "./outreach-drafts";

const play: PlayForDrafting = {
  id: "play-1",
  title: "MTD checklist to landlord forums",
  channel: "warm_outreach",
  audience: "Members of UK landlord Facebook groups",
  hook: "MTD deadline with no plan",
  lead_magnet: "MTD-readiness checklist",
  first_action: "DM the 30 most active members",
};

const draft: OutreachDraft = {
  channel: "warm_outreach",
  variant: "A",
  subject: null,
  body: "Hi {{first_name}} — saw your post in {{their_group}}. The MTD deadline is close; we put together a readiness checklist. Want a copy?",
  personalisation: ["{{first_name}}", "{{their_group}}"],
};

describe("buildOutreachDraftInput", () => {
  it("carries the play's channel, audience, hook, and give", () => {
    const input = buildOutreachDraftInput(play);
    expect(input).toContain("warm_outreach");
    expect(input).toContain("landlord Facebook groups");
    expect(input).toContain("MTD-readiness checklist");
  });

  it("marks unspecified fields honestly", () => {
    const input = buildOutreachDraftInput({ ...play, audience: null, lead_magnet: null });
    expect(input).toContain("not specified");
    expect(input).toContain("propose the most fitting give");
  });
});

describe("mapDraftToRow", () => {
  it("maps a draft onto a gtm_outreach_drafts row tied to the play", () => {
    const row = mapDraftToRow(draft, play);
    expect(row).toMatchObject({
      product: "pam",
      play_id: "play-1",
      play_title: play.title,
      channel: "warm_outreach",
      variant: "A",
      status: "draft",
    });
    expect(row.personalisation).toContain("{{first_name}}");
  });
});

describe("outreachDraftsOutputSchema", () => {
  it("accepts a well-formed draft set", () => {
    expect(outreachDraftsOutputSchema.safeParse({ drafts: [draft] }).success).toBe(true);
  });

  it("rejects an unknown variant", () => {
    const bad = { ...draft, variant: "C" };
    expect(outreachDraftsOutputSchema.safeParse({ drafts: [bad] }).success).toBe(false);
  });
});

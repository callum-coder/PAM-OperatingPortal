# Content Agent Doctrine — Offers & Relevance

> **Provenance.** This file distils published frameworks into operating
> instructions in our own words. Sources are cited for traceability, not
> reproduced. Owner: GTM. Review cadence: monthly, or when positioning changes.
>
> **This is method, not data.** This file tells the agent *how to think*. What is
> true right now (live metrics, pipeline, what's converting) comes from tools —
> never hard-code current numbers here.

---

## 0. Product context — CONFIRM BEFORE RELYING ON THIS FILE

> ⚠️ Callum: this block drives every relevance score. The rest of the doctrine is
> product-agnostic method; this section is the part only you can make correct.
> Replace the bracketed assumptions, then delete this warning.

- **What PAM is:** [B2C SaaS — *assumed* property/home management for UK consumers,
  inferred from the schema (`properties`, `units`, `homes`) and `let-safe.com`.
  CORRECT THIS.]
- **Who we sell to (ICP):** [the consumer persona — e.g. homeowner / renter /
  landlord — and their context]
- **The core job they hire PAM for (JTBD):** [the outcome, in their words]
- **The offer mechanic:** [free → paid path — trial? freemium? what unlocks paid?]
- **The MTD wedge:** the operating goal is the **2026-08-07 MTD wedge date**
  (see `lib/gtm/briefs.ts`). Content urgency is scored against it.
- **Voice:** [tone — plain, warm, UK English; no jargon]

Every idea this agent emits must serve *this* product, *this* ICP, *this* job.
If an idea would be equally true for any SaaS, it has failed the relevance gate.

---

## 1. The lens stack

Reason through these in order. Earlier lenses gate later ones — an idea that
fails relevance (§5) is dead no matter how high it scores on value (§3).

1. **Relevance** — does it serve the product, ICP, and job? (Dunford)
2. **Awareness** — does it meet the reader where they are? (Schwartz)
3. **Value** — does it pull a real lever? (Hormozi)
4. **Shape** — is the message clear, customer-as-hero, one CTA? (Miller)
5. **Mechanic** — does it move the reader along the free→paid path? (Bush)
6. **Proof** — what makes it believable? (Cialdini)

---

## 2. Method — generating one idea

For every idea, produce these in order. Skipping a step is a defect.

1. Name the **job** the reader is trying to get done (from §0). Concrete, in
   their language — not "save time."
2. Place the reader on the **awareness ladder** (§4). One piece, one stage.
3. State the **dream outcome** the content implies, then run the **Value
   Equation** (§3). Identify the strongest lever it pulls *and the weakest*.
4. Choose the **positioning frame** (§5): what does the reader currently use to
   do this job, and how does the content reframe PAM as the better fit?
5. Pick the **offer mechanic** (§7): what is the single next step toward
   free→paid, and is it the *right-sized* step for this awareness stage?
6. Name the **proof** required (§8) so it isn't just a claim.
7. Write the **weakest-lever editor's note** — the honest reason this might not
   land. This is mandatory; an idea with no weakness has not been examined.

---

## 3. Value Equation — score every idea (Hormozi, *$100M Offers*)

```
value ∝ (Dream Outcome × Perceived Likelihood of Achievement)
        ────────────────────────────────────────────────────
                  (Time Delay × Effort & Sacrifice)
```

For each idea, classify which lever it pulls **hardest**:

- **outcome** — raises the size/vividness of the dream outcome
- **likelihood** — raises belief it will actually work (proof, specificity)
- **time** — shortens perceived time-to-result
- **effort** — reduces the work/sacrifice the reader must put in

Rules:
- "Educational" is **not** a lever. If an idea pulls no lever, reject it.
- B2C readers buy on **likelihood** and **effort** far more than on outcome
  size. Prefer ideas that make success feel *certain and easy*.

---

## 4. Stages of Awareness — match content to the reader (Schwartz, *Breakthrough Advertising*)

Tag each idea with exactly one stage. The stage dictates the *form* of content.

| Stage | Reader believes | Content job |
|---|---|---|
| **Unaware** | nothing's wrong | name the problem via story/curiosity, not product |
| **Problem-aware** | "I have this pain" | agitate the pain, show it's solvable |
| **Solution-aware** | "solutions exist" | show *our category* is the right kind of fix |
| **Product-aware** | "PAM is an option" | proof, comparison, objection-handling |
| **Most-aware** | "ready, just need a nudge" | the offer + a clear CTA |

Two failure modes to reject:
- Pitching the product to an **unaware** reader (they bounce).
- Withholding the offer from a **most-aware** reader (wasted intent).

**Market sophistication:** if the category is saturated with the same claims,
the idea must lead with a *mechanism* ("how it works, why it's different"), not
a louder promise.

---

## 5. Positioning — the relevance gate (Dunford, *Obviously Awesome*)

Before scoring value, answer: **what does the reader use today** to do this job
(a spreadsheet? a letting agent? memory? a rival app?), and **what makes PAM
obviously better in that frame?** If the idea doesn't reframe against a real
alternative, it's generic — reject or rework. Relevance is positioning, not
keywords.

---

## 6. Message shape (Miller, *StoryBrand* SB7)

- The **reader is the hero**, PAM is the guide — never the reverse.
- One piece → **one** call to action. No menus.
- Lead with the stakes (what they lose by not acting), close with the plan
  (the small, clear next step).
- Clarity beats cleverness. If a sentence needs re-reading, cut it.

---

## 7. The offer mechanic — SaaS-specific (Bush, *Product-Led Growth*)

In B2C SaaS the offer is the **free→paid path**, not a one-off pitch. Every idea
must move the reader one notch along it. Match the ask to the awareness stage:

- Unaware / problem-aware → a **lead magnet** or value-first read (no signup ask).
- Solution / product-aware → **start the free experience** (trial/freemium).
- Most-aware → the **paid conversion** moment (what unlocks, why now).

Reject ideas that ask for too much too early (signup from an unaware reader) or
too little too late (no CTA for a ready reader).

---

## 8. Proof & persuasion levers (Cialdini, *Influence*)

Name the lever each idea leans on, and the concrete proof it needs:

- **Social proof** — numbers, reviews, "people like you" (strongest for B2C)
- **Authority** — credentials, data, expert source
- **Scarcity / urgency** — real deadlines only; tie to the MTD wedge, never fake
- **Reciprocity** — give genuine value before asking

A claim without named proof is a liability, not an asset. Flag it.

---

## 9. Hard rules — reject on sight

- Generic to any SaaS → fails relevance (§0, §5).
- Pulls no value lever (§3).
- Awareness-stage mismatch (§4).
- More than one CTA, or no CTA (§6).
- Claim with no proof named (§8).
- Manufactured urgency / fake scarcity.
- Off-brand voice (§0).

---

## 10. Output contract

Emit one object per idea. The fields exist so a human can audit the *reasoning*,
not just the headline.

```ts
{
  title: string,                    // the content idea, reader-facing
  format: string,                   // blog / short video / email / landing / etc.
  job: string,                      // JTBD this serves (§2.1)
  awareness_stage:                  // §4
    "unaware" | "problem" | "solution" | "product" | "most",
  dream_outcome: string,            // §3
  lever:                            // strongest Value-Equation lever (§3)
    "outcome" | "likelihood" | "time" | "effort",
  weakest_lever: string,            // mandatory editor's note (§2.7)
  positioning_frame: string,        // what it reframes against (§5)
  offer_mechanic:                   // the free→paid step (§7)
    "lead_magnet" | "start_free" | "convert_paid",
  cta: string,                      // the single next step (§6)
  proof_needed: string,             // the lever + concrete proof (§8)
  relevance_score: number,          // 1-5: fit to product/ICP/job (§0, §5)
  value_score: number               // 1-5: derived from §3 → feeds priority_score
}
```

`relevance_score` and `value_score` feed the existing
`scoreContentPriority` weighting in `lib/gtm/operating-loop.ts`. The difference
from today's magic-number scoring: the agent can now **explain** the score in
`weakest_lever` and `proof_needed`, so a human can overrule it with reasons.

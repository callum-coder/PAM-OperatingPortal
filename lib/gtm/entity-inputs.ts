import { normalizeContentPriority, scoreContentPriority } from "./operating-loop";

type NormalizeResult<T> = { value: T } | { error: string };

type RawInput = Record<string, FormDataEntryValue | string | null | undefined>;

export function normalizeCompetitorWatchInput(input: RawInput): NormalizeResult<{
  product: "pam";
  competitor: string;
  url: string;
  watch_type: string;
}> {
  const competitor = text(input.competitor);
  const url = text(input.url);
  const watchType = text(input.watch_type) || "pricing";

  if (!competitor || !url) {
    return { error: "Enter a competitor and URL." };
  }

  return {
    value: {
      product: "pam",
      competitor,
      url,
      watch_type: watchType,
    },
  };
}

export function normalizeContentItemInput(input: RawInput): NormalizeResult<{
  product: "pam";
  title: string;
  target_keyword: string | null;
  stage: string;
  keyword_intent: number;
  product_fit: number;
  mtd_urgency: number;
  effort: number;
  priority_score: number;
  notes: string | null;
}> {
  const title = text(input.title);
  if (!title) {
    return { error: "Enter a content title." };
  }

  const keywordIntent = boundedScore(input.keyword_intent);
  const productFit = boundedScore(input.product_fit);
  const mtdUrgency = boundedScore(input.mtd_urgency);
  const effort = boundedScore(input.effort);

  return {
    value: {
      product: "pam",
      title,
      target_keyword: text(input.target_keyword) || null,
      stage: text(input.stage) || "idea",
      keyword_intent: keywordIntent,
      product_fit: productFit,
      mtd_urgency: mtdUrgency,
      effort,
      priority_score: normalizeContentPriority(
        scoreContentPriority({
          keywordIntent,
          productFit,
          mtdUrgency,
          effort,
        }),
      ),
      notes: text(input.notes) || null,
    },
  };
}

export function normalizeExperimentInput(input: RawInput): NormalizeResult<{
  product: "pam";
  name: string;
  metric: string | null;
  baseline: number | null;
  target: number | null;
  hypothesis: string | null;
  status: "design";
}> {
  const name = text(input.name);
  if (!name) {
    return { error: "Enter an experiment name." };
  }

  return {
    value: {
      product: "pam",
      name,
      metric: text(input.metric) || null,
      baseline: nullableNumber(input.baseline),
      target: nullableNumber(input.target),
      hypothesis: text(input.hypothesis) || null,
      status: "design",
    },
  };
}

function text(value: FormDataEntryValue | string | null | undefined): string {
  return String(value ?? "").trim();
}

function boundedScore(value: FormDataEntryValue | string | null | undefined): number {
  const parsed = Number(value ?? 3);
  if (!Number.isFinite(parsed)) {
    return 3;
  }

  return Math.min(5, Math.max(1, parsed));
}

function nullableNumber(value: FormDataEntryValue | string | null | undefined): number | null {
  const raw = text(value);
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

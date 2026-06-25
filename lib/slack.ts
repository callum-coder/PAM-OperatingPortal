import "server-only";

// Server-side Slack client. Posts agent messages to a channel via a Bot User
// OAuth token (SLACK_BOT_TOKEN, xoxb-…). Degrades to a no-op "skipped" result
// when unconfigured, and never throws — callers log the result, not an error.

const SLACK_POST_URL = "https://slack.com/api/chat.postMessage";
const TIMEOUT_MS = 10000;

export type SlackPostResult = {
  status: "sent" | "skipped" | "failed";
  ts?: string;
  channel?: string;
  error?: string;
};

export function hasSlackConfig(): boolean {
  return Boolean(process.env.SLACK_BOT_TOKEN && process.env.SLACK_DEFAULT_CHANNEL);
}

export async function postSlackMessage(input: {
  text: string;
  channel?: string;
}): Promise<SlackPostResult> {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = input.channel ?? process.env.SLACK_DEFAULT_CHANNEL;

  if (!token || !channel) {
    return { status: "skipped" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(SLACK_POST_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ channel, text: input.text }),
    });

    const body = (await response.json()) as {
      ok?: boolean;
      ts?: string;
      channel?: string;
      error?: string;
    };

    if (!body.ok) {
      return { status: "failed", error: body.error ?? `HTTP ${response.status}` };
    }
    return { status: "sent", ts: body.ts, channel: body.channel ?? channel };
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error.message : "slack request failed" };
  } finally {
    clearTimeout(timer);
  }
}

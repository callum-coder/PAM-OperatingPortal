import "server-only";

export type EmailPayload = {
  subject: string;
  text: string;
  to?: string;
};

export async function sendOperationalEmail(payload: EmailPayload) {
  void payload;

  if (!process.env.EMAIL_PROVIDER_KEY) {
    throw new Error("EMAIL_PROVIDER_KEY is not configured");
  }

  throw new Error("Email provider adapter is not implemented yet");
}

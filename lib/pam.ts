import "server-only";

export function getPamReadonlyDatabaseUrl(): string {
  const value = process.env.PAM_DATABASE_URL_READONLY;
  if (!value) {
    throw new Error("Missing required environment variable: PAM_DATABASE_URL_READONLY");
  }
  return value;
}

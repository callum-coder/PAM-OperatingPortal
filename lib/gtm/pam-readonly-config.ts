export type PamReadonlyConfigKind =
  | "missing"
  | "postgres"
  | "https_project_url"
  | "unsupported";

export function classifyPamReadonlyConfig(value?: string): PamReadonlyConfigKind {
  if (!value) {
    return "missing";
  }

  if (value.startsWith("postgres://") || value.startsWith("postgresql://")) {
    return "postgres";
  }

  if (value.startsWith("https://")) {
    return "https_project_url";
  }

  return "unsupported";
}

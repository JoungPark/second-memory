export type GetIdToken = () => Promise<string | null>;

export type HealthCheckResult = {
  service: string;
  url: string;
  ok: boolean;
  latencyMs: number;
  status?: string;
  error?: string;
};

export const LOCATION_RESUME_MIN_HIDDEN_MS = 2 * 60 * 1000;
export const LOCATION_AUTO_REFRESH_COOLDOWN_MS = 5 * 60 * 1000;

export function shouldRefreshLocationAfterResume({
  hiddenAt,
  now,
  lastRefreshAt,
}: {
  hiddenAt: number | null;
  now: number;
  lastRefreshAt: number;
}) {
  if (hiddenAt === null) return false;
  if (now - hiddenAt < LOCATION_RESUME_MIN_HIDDEN_MS) return false;
  return now - lastRefreshAt >= LOCATION_AUTO_REFRESH_COOLDOWN_MS;
}

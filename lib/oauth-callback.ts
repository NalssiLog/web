import type { OAuthCallbackResult } from "@/lib/api/auth-api";

export function isOAuthCallbackFailure(
  result: OAuthCallbackResult,
  code: string | null,
) {
  return (
    result === "FAILED" ||
    result === "LINK_FAILED" ||
    code === "OAUTH_CANCELLED"
  );
}

export function getOAuthFailureDestination(authenticated: boolean) {
  return authenticated ? "ACCOUNT" : "HOME";
}

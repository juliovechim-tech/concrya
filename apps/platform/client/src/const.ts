export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

const OAUTH_PORTAL_URL = import.meta.env.VITE_OAUTH_PORTAL_URL ?? "";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  if (!OAUTH_PORTAL_URL) {
    // dev local — sem OAuth, ficar na home
    return "/";
  }

  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${OAUTH_PORTAL_URL}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};

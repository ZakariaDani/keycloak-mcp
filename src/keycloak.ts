import KeycloakAdminClient from "@keycloak/keycloak-admin-client";

const log = console.error;

const kc = new KeycloakAdminClient({
  baseUrl: process.env.KEYCLOAK_BASE_URL ?? "http://localhost:8080",
  realmName: process.env.KEYCLOAK_REALM ?? "master"
});

let tokenExpiresAt = 0;

export async function getKc(): Promise<KeycloakAdminClient> {
  if (Date.now() > tokenExpiresAt - 10_000) {
    await kc.auth({
      grantType: "client_credentials",
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!
    });
    tokenExpiresAt = Date.now() + 58_000;
    log("keycloak-mcp: authenticated against admin API");
  }
  return kc;
}
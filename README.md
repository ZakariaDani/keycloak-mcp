# Keycloak MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that exposes
[Keycloak](https://www.keycloak.org/) admin operations as tools. It runs over **stdio**
and is launched by an MCP client (Claude Desktop, Claude Code, the MCP Inspector, etc.).

Built on [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk)
and [`@keycloak/keycloak-admin-client`](https://github.com/keycloak/keycloak-nodejs-admin-client).

---

## Table of Contents

- [How it works](#how-it-works)
- [Requirements](#requirements)
- [Environment variables](#environment-variables)
- [Keycloak setup (service account)](#keycloak-setup-service-account)
- [Install & run](#install--run)
- [Integrate with Claude](#integrate-with-claude)
  - [Claude Code (CLI)](#claude-code-cli)
  - [Claude Desktop](#claude-desktop)
  - [MCP Inspector](#mcp-inspector)
- [Tools reference](#tools-reference)
- [Usage tips](#usage-tips)
- [Troubleshooting](#troubleshooting)

---

## How it works

- The server authenticates to Keycloak using the **client_credentials** grant (a service
  account) — no username/password required.
- A single shared `KeycloakAdminClient` is kept alive with lazy token management: the token
  is re-fetched only when it is within ~10s of expiry.
- Every tool takes a **`realm`** argument identifying which realm the operation targets.
  This is distinct from `KEYCLOAK_REALM`, which is only the realm used to *authenticate* the
  admin service account.
- Users are addressed by **username**, clients by **clientId**, groups by **path or name**,
  and roles by **name** — no UUIDs required in tool arguments.
- All diagnostic logging goes to **stderr**; **stdout** is reserved for the MCP protocol.

---

## Requirements

- **Node.js 18+** (Node 22 recommended)
- A running **Keycloak** instance (v26.x tested)
- A confidential client with a **service account** that has admin roles (see below)

---

## Environment variables

Loaded from a `.env` file at the project root.

| Variable                 | Required | Default                   | Description                                                                                  |
| ------------------------ | -------- | ------------------------- | -------------------------------------------------------------------------------------------- |
| `KEYCLOAK_BASE_URL`      | no       | `http://localhost:8080`   | Base URL of the Keycloak server.                                                             |
| `KEYCLOAK_REALM`         | no       | `master`                  | Realm used for **admin authentication** (where the service-account client lives). Not the target realm of operations. |
| `KEYCLOAK_CLIENT_ID`     | **yes**  | —                         | The confidential client's `clientId` used for the client_credentials grant.                  |
| `KEYCLOAK_CLIENT_SECRET` | **yes**  | —                         | The service account client secret. **Keep this out of version control.**                     |

Example `.env`:

```dotenv
KEYCLOAK_BASE_URL=http://localhost:8080
KEYCLOAK_REALM=master
KEYCLOAK_CLIENT_ID=keycloak-mcp
KEYCLOAK_CLIENT_SECRET=your-service-account-secret
```

> ⚠️ Add `.env` to `.gitignore`. The secret is a full admin credential.

---

## Keycloak setup (service account)

1. In the realm that will **authenticate** the server (usually `master`), create a client
   (e.g. `keycloak-mcp`):
   - **Client authentication**: On (confidential)
   - **Service accounts roles**: Enabled
   - Standard/Direct-access flows can be off.
2. Copy the client secret from **Credentials** into `KEYCLOAK_CLIENT_SECRET`.
3. Grant the service account admin roles under **Service account roles**:
   - For full access: assign the `admin` role (or `realm-admin` from the `realm-management`
     client of each target realm).
   - For read-only usage: assign roles like `view-users`, `view-clients`, `view-realm`,
     `query-users`, `query-clients`.
   - Write tools (create/update/delete user, reset password, assign roles, group
     membership, send email, logout) additionally need `manage-users` and `manage-clients`.
   - Realm-level writes (`set-realm-enabled`, `create-realm-role`, `delete-realm-role`,
     `create-group`, `delete-group`) need `manage-realm`.
   - `impersonate-user` needs the `impersonation` role. `create-client` /
     `regenerate-client-secret` need `manage-clients`.

---

## Install & run

```bash
npm install

npm run dev       # Run the server over stdio, loading .env
npm run inspect   # Launch the MCP Inspector against the server for interactive testing
```

`npm run dev` runs the TypeScript entry point directly via `tsx --env-file=.env src/index.ts`.
There is no separate build step.

---

## Integrate with Claude

### Claude Code (CLI)

The simplest, self-contained registration points the project's local `tsx` binary at the
entry file and loads secrets from `.env` (so no secrets appear on the command line):

```bash
# From the project root
P="$(pwd)"
claude mcp add keycloak --scope user -- \
  "$P/node_modules/.bin/tsx" --env-file="$P/.env" "$P/src/index.ts"
```

Verify it connected:

```bash
claude mcp list
# keycloak: .../tsx --env-file=.../.env .../src/index.ts - ✔ Connected
```

Prefer passing env vars explicitly instead of an `.env` file? Use `--env` flags:

```bash
P="$(pwd)"
claude mcp add keycloak --scope user \
  --env KEYCLOAK_BASE_URL=http://localhost:8080 \
  --env KEYCLOAK_REALM=master \
  --env KEYCLOAK_CLIENT_ID=keycloak-mcp \
  --env KEYCLOAK_CLIENT_SECRET=your-service-account-secret \
  -- "$P/node_modules/.bin/tsx" "$P/src/index.ts"
```

To remove it later: `claude mcp remove keycloak`.

### Claude Desktop

Edit the MCP config file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add a `keycloak` entry under `mcpServers` (use **absolute paths**):

```json
{
  "mcpServers": {
    "keycloak": {
      "command": "/absolute/path/to/keycloak-mcp/node_modules/.bin/tsx",
      "args": [
        "--env-file=/absolute/path/to/keycloak-mcp/.env",
        "/absolute/path/to/keycloak-mcp/src/index.ts"
      ]
    }
  }
}
```

Or pass credentials inline via `env` instead of `--env-file`:

```json
{
  "mcpServers": {
    "keycloak": {
      "command": "/absolute/path/to/keycloak-mcp/node_modules/.bin/tsx",
      "args": ["/absolute/path/to/keycloak-mcp/src/index.ts"],
      "env": {
        "KEYCLOAK_BASE_URL": "http://localhost:8080",
        "KEYCLOAK_REALM": "master",
        "KEYCLOAK_CLIENT_ID": "keycloak-mcp",
        "KEYCLOAK_CLIENT_SECRET": "your-service-account-secret"
      }
    }
  }
}
```

Restart Claude Desktop. The Keycloak tools then appear in the tools (🔨) menu.

### MCP Inspector

```bash
npm run inspect
```

Opens the Inspector UI where you can browse and invoke each tool interactively.

---

## Tools reference

All tools take a `realm` argument (the target realm) unless noted. Identifiers are
**human-readable**: users by `username`, clients by `clientId`, groups by path/name, roles
by name. List tools support `first`/`max` pagination (default `first=0`, `max=50`, max `200`).

### Read — Users

| Tool                          | Description                                                                                   | Arguments |
| ----------------------------- | --------------------------------------------------------------------------------------------- | --------- |
| `list-users`                  | List users (id, username, email, enabled, federation link).                                   | `realm`, `search?`, `first?`, `max?` |
| `get-user`                    | Get a single user by username, with profile fields and attributes. Optionally include groups and realm roles. | `realm`, `username`, `includeGroups?`, `includeRealmRoles?` |
| `count-users`                 | Count users, optionally matching a search term. Handy before paginating.                      | `realm`, `search?` |
| `list-user-groups`            | List the groups a user is a direct member of (id, name, path).                                 | `realm`, `username` |
| `list-user-roles`             | List a user's directly-assigned role mappings: realm roles plus client roles grouped by client. | `realm`, `username` |
| `list-user-credentials`       | List a user's credential metadata (id, type, label, created date). No secret values.          | `realm`, `username` |
| `list-user-sessions`          | List a user's active sessions (start/last-access times, IP, clients used).                    | `realm`, `username` |
| `search-users-by-attribute`   | Find users by a custom attribute key/value (exact match). Paginated.                          | `realm`, `attribute`, `value`, `first?`, `max?` |

### Read — Clients

| Tool                 | Description                                                                                             | Arguments |
| -------------------- | ------------------------------------------------------------------------------------------------------- | --------- |
| `list-clients`       | List clients (id, clientId, name, enabled, protocol, public flag). Filter by clientId; paginated.       | `realm`, `clientId?`, `first?`, `max?` |
| `get-client`         | Get one client by clientId (protocol, flow settings, redirect URIs, web origins). No secret.            | `realm`, `clientId` |
| `get-client-secret`  | Retrieve a confidential client's current secret. **Sensitive** — non-public clients only.               | `realm`, `clientId` |

### Read — Groups

| Tool                  | Description                                                                                    | Arguments |
| --------------------- | --------------------------------------------------------------------------------------------- | --------- |
| `list-groups`         | List groups as a tree (id, name, path, nested subGroups). Search + paginate top-level groups.  | `realm`, `search?`, `first?`, `max?` |
| `list-group-members`  | List members of a group (by path or name): id, username, email, enabled.                      | `realm`, `group`, `first?`, `max?` |

### Read — Roles

| Tool                          | Description                                                                          | Arguments |
| ----------------------------- | ------------------------------------------------------------------------------------ | --------- |
| `list-realm-roles`            | List realm-level roles (id, name, description, composite flag). Search + paginate.   | `realm`, `search?`, `first?`, `max?` |
| `list-client-roles`           | List roles defined by a specific client (by clientId).                               | `realm`, `clientId` |
| `list-users-with-realm-role`  | List users that have a given realm role assigned.                                    | `realm`, `roleName`, `first?`, `max?` |

### Read — Realms

| Tool          | Description                                                                                  | Arguments |
| ------------- | -------------------------------------------------------------------------------------------- | --------- |
| `list-realms` | List realms visible to the admin service account (id, realm, enabled). Needs realm-view.     | _(none)_ |
| `get-realm`   | Get a realm's key settings: enabled, login flags, token/session lifespans, SMTP-configured.  | `realm` |

### Write — Realms

| Tool                 | Description                                                                          | Arguments |
| -------------------- | ------------------------------------------------------------------------------------ | --------- |
| `set-realm-enabled`  | Enable or disable a realm. Disabling blocks **all** logins to it immediately.        | `realm`, `enabled` |

### Write — Users

| Tool                       | Description                                                                                          | Arguments |
| -------------------------- | ---------------------------------------------------------------------------------------------------- | --------- |
| `create-user`              | Create a user; returns the new id. Optional permanent initial password. Fails if username exists.    | `realm`, `username`, `email?`, `firstName?`, `lastName?`, `enabled?` (def. true), `emailVerified?` (def. false), `password?` |
| `update-user`              | Update profile fields of an existing user. Only supplied fields change; needs ≥1 field.              | `realm`, `username`, `email?`, `firstName?`, `lastName?`, `emailVerified?` |
| `set-user-enabled`         | Enable or disable an account. Disabling blocks login immediately.                                    | `realm`, `username`, `enabled` |
| `delete-user`              | Permanently delete a user. **Irreversible** — prefer `set-user-enabled(false)` for temporary blocks. | `realm`, `username` |
| `reset-user-password`      | Set a new password. `temporary=true` forces a change at next login.                                  | `realm`, `username`, `password`, `temporary?` (def. true) |
| `send-user-actions-email`  | Email the user required actions (e.g. `VERIFY_EMAIL`, `UPDATE_PASSWORD`). Needs SMTP on the realm.   | `realm`, `username`, `actions[]`, `lifespan?` (seconds) |
| `logout-user`              | Revoke **all** of a user's active sessions, forcing re-authentication everywhere.                    | `realm`, `username` |
| `impersonate-user`         | Start an impersonation session via the admin account. **Sensitive** — returns session/redirect data. | `realm`, `username` |

### Write — Role mappings

| Tool                  | Description                                                            | Arguments |
| --------------------- | --------------------------------------------------------------------- | --------- |
| `assign-realm-role`   | Assign a realm role to a user. Idempotent.                            | `realm`, `username`, `roleName` |
| `remove-realm-role`   | Remove a realm role from a user. Idempotent.                          | `realm`, `username`, `roleName` |
| `assign-client-role`  | Assign a client-level role to a user. Idempotent.                    | `realm`, `username`, `clientId`, `roleName` |
| `remove-client-role`  | Remove a client-level role from a user. Idempotent.                  | `realm`, `username`, `clientId`, `roleName` |

### Write — Roles

| Tool                 | Description                                                                                  | Arguments |
| -------------------- | ------------------------------------------------------------------------------------------- | --------- |
| `create-realm-role`  | Create a realm-level role. Fails if the name already exists.                                | `realm`, `name`, `description?` |
| `delete-realm-role`  | Delete a realm role by name. **Irreversible** — unmaps it from every user and group.        | `realm`, `name` |

### Write — Groups

| Tool                       | Description                                                                            | Arguments |
| -------------------------- | ------------------------------------------------------------------------------------- | --------- |
| `add-user-to-group`        | Add a user to a group (by path or name). Idempotent.                                  | `realm`, `username`, `group` |
| `remove-user-from-group`   | Remove a user from a group (by path or name). Idempotent.                             | `realm`, `username`, `group` |
| `create-group`             | Create a top-level group, or a nested child when a `parent` (path/name) is supplied.  | `realm`, `name`, `parent?` |
| `delete-group`             | Delete a group (by path or name), including its subgroups. **Irreversible.**          | `realm`, `group` |

### Write — Clients

| Tool                        | Description                                                                                        | Arguments |
| --------------------------- | ------------------------------------------------------------------------------------------------- | --------- |
| `create-client`             | Register a new client. Defaults to confidential standard-flow; toggle public / service-account.   | `realm`, `clientId`, `name?`, `description?`, `publicClient?` (def. false), `standardFlowEnabled?` (def. true), `serviceAccountsEnabled?` (def. false), `redirectUris?`, `webOrigins?` |
| `regenerate-client-secret`  | Rotate a confidential client's secret and return the new value. **Sensitive**; old secret dies.   | `realm`, `clientId` |

---

## Usage tips

Once integrated, you can prompt Claude in natural language, for example:

- “List the first 10 users in the `financement-realm` realm whose name contains `dupont`.”
- “Show details for user `jdoe` in `financement-realm`, including their groups and realm roles.”
- “Disable the account `olduser` in `financement-realm`.”
- “Assign the `offline_access` realm role to `jdoe` in `financement-realm`.”
- “Set `jdoe`'s email to `jdoe@example.com` and mark it verified.”
- “Send `jdoe` a VERIFY_EMAIL and UPDATE_PASSWORD action email.”
- “Log `jdoe` out of all sessions in `financement-realm`.”
- “Create a `billing-admin` realm role and assign it to `jdoe`.”
- “Rotate the client secret for `my-backend` in `financement-realm`.”
- “Find all users in `financement-realm` with attribute `department = finance`.”

Claude will pick the matching tool and fill in the arguments.

> ⚠️ **Destructive tools have no confirmation step.** `delete-user`, `delete-group`,
> `delete-realm-role`, `logout-user`, `set-realm-enabled(false)` and
> `regenerate-client-secret` take effect immediately and cannot be undone.

---

## Troubleshooting

| Symptom | Likely cause / fix |
| ------- | ------------------ |
| Server won't connect in `claude mcp list` | Check absolute paths; run `npm install` so `node_modules/.bin/tsx` exists; run `npm run dev` manually to see stderr. |
| `401`/auth errors | Wrong `KEYCLOAK_CLIENT_ID`/`SECRET`, or the service account lacks admin roles. |
| Tool returns "not found" | Verify `realm`, `username`, `clientId`, or `group` are exact; identifiers are case-sensitive. |
| `get-client-secret` fails | Client is public (no secret) — only confidential clients have one. |
| `send-user-actions-email` fails | The **target realm** has no SMTP server configured. |
| `403` on realm/role/group writes | Service account lacks `manage-realm` (or `impersonation` for `impersonate-user`) on the target realm. |
| Missing users/clients in list | Service account lacks `view-users` / `view-clients` for that realm. |
| Changes not visible in Claude Desktop | Fully restart the app after editing the config. |

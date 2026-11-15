# Keycloak MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that exposes
[Keycloak](https://www.keycloak.org/) admin operations as tools. It runs over **stdio**
and is launched by an MCP client (Claude Desktop, Claude Code, the MCP Inspector, etc.).

It covers day-to-day administration across users, roles (including composite roles), groups,
clients, client scopes and protocol mappers, realms and realm settings, identity providers,
authentication flows, LDAP/AD user federation and events: over 100 tools in 10 groups. Load only
the groups you need with the [`KEYCLOAK_TOOLS`](#tool-groups) environment variable.

Built on [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk)
and [`@keycloak/keycloak-admin-client`](https://github.com/keycloak/keycloak-nodejs-admin-client).

---

## Table of Contents

- [How it works](#how-it-works)
- [Requirements](#requirements)
- [Environment variables](#environment-variables)
  - [Tool groups](#tool-groups)
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
| `KEYCLOAK_TOOLS`         | no       | all groups                | Comma-separated [tool groups](#tool-groups) to expose, e.g. `users,roles`. See below.         |

Example `.env`:

```dotenv
KEYCLOAK_BASE_URL=http://localhost:8080
KEYCLOAK_REALM=master
KEYCLOAK_CLIENT_ID=keycloak-mcp
KEYCLOAK_CLIENT_SECRET=your-service-account-secret
KEYCLOAK_TOOLS=users,roles,groups
```

### Tool groups

With every group enabled the server exposes over 100 tools, and an MCP client loads all of
their descriptions into the model's context. `KEYCLOAK_TOOLS` limits that to the groups you
need. Unset, empty or `all` exposes everything. Names are case-insensitive; an unknown name
stops the server at startup with a message listing the valid groups.

| Group                | Tools                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `users`              | User read/write: profile, credentials, sessions, password, logout, impersonate, unlock.        |
| `roles`              | Realm and client roles, role mappings on users, composite roles.                              |
| `groups`             | Groups and group membership.                                                                  |
| `clients`            | Clients, secrets, client service-account user.                                                |
| `client-scopes`      | Client scopes, assigning them to clients, and protocol mappers (on clients and scopes).       |
| `realms`             | Realm create/delete/enable, settings, SMTP, event-storage config.                             |
| `identity-providers` | Identity providers and their mappers.                                                         |
| `authentication`     | Authentication flows, flow bindings and required actions.                                     |
| `federation`         | LDAP/AD user federation: providers, sync, mappers.                                            |
| `events`             | Login events and admin events.                                                                |

Each tool belongs to exactly one group. The startup line on stderr reports what was loaded,
e.g. `keycloak-mcp: 32 tools registered (groups: users, roles)`.

A group only hides tools from the model; it is not a security boundary. What the server can
actually do is still limited by the roles on the service account (see
[Keycloak setup](#keycloak-setup-service-account)). For a read-only deployment, grant only
view roles.

Set it in `.env`, or per client in the MCP config, e.g. for Claude Code:

```bash
claude mcp add keycloak -e KEYCLOAK_TOOLS=users,roles -- <command...>
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
   - Realm-level writes (`set-realm-enabled`, `update-realm-settings`, `update-realm-smtp`,
     `update-realm-events-config`, `create-realm-role`, `delete-realm-role`, `create-group`,
     `delete-group`) need `manage-realm`.
   - The authentication-flow and required-action tools need `view-realm` (read) or
     `manage-realm` (create/copy/delete/edit flows, `set-realm-flow-binding`,
     `update-required-action`).
   - The user-federation tools need `view-realm` (read) or `manage-realm` (create, update,
     delete, sync, unlink, mappers). `unlink-federated-users` and
     `remove-imported-federated-users` also touch users, so grant `manage-users` too.
   - `create-realm` and `delete-realm` need the `create-realm` role (or global `admin`) in the
     master realm; they act across realms, so the service account must authenticate there.
   - `impersonate-user` needs the `impersonation` role. `create-client` /
     `update-client` / `delete-client` / `regenerate-client-secret` and the client-role
     tools need `manage-clients`.
   - `unlock-user` needs `manage-users`. `list-events` / `list-admin-events` need
     `view-events`. The identity-provider tools need `view-identity-providers` (read) or
     `manage-identity-providers` (create/update/delete). Protocol-mapper and client-scope
     tools need `manage-clients`.

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

The tools are organised in the same groups as `KEYCLOAK_TOOLS` (see [Tool groups](#tool-groups)),
so you can see exactly what each group exposes. A tool is only available when its group is enabled.

### Users (`users`, 17 tools)

| Tool | Description | Arguments |
| ---- | ----------- | --------- |
| `list-users`                  | List users (id, username, email, enabled, federation link).                                   | `realm`, `search?`, `first?`, `max?` |
| `get-user`                    | Get a single user by username, with profile fields and attributes. Optionally include groups and realm roles. | `realm`, `username`, `includeGroups?`, `includeRealmRoles?` |
| `count-users`                 | Count users, optionally matching a search term. Handy before paginating.                      | `realm`, `search?` |
| `list-user-groups`            | List the groups a user is a direct member of (id, name, path).                                 | `realm`, `username` |
| `list-user-roles`             | List a user's directly-assigned role mappings: realm roles plus client roles grouped by client. | `realm`, `username` |
| `list-user-credentials`       | List a user's credential metadata (id, type, label, created date). No secret values.          | `realm`, `username` |
| `list-user-sessions`          | List a user's active sessions (start/last-access times, IP, clients used).                    | `realm`, `username` |
| `search-users-by-attribute`   | Find users by a custom attribute key/value (exact match). Paginated.                          | `realm`, `attribute`, `value`, `first?`, `max?` |
| `create-user`              | Create a user; returns the new id. Optional permanent initial password. Fails if username exists.    | `realm`, `username`, `email?`, `firstName?`, `lastName?`, `enabled?` (def. true), `emailVerified?` (def. false), `password?` |
| `update-user`              | Update profile fields of an existing user. Only supplied fields change; needs ≥1 field.              | `realm`, `username`, `email?`, `firstName?`, `lastName?`, `emailVerified?` |
| `set-user-enabled`         | Enable or disable an account. Disabling blocks login immediately.                                    | `realm`, `username`, `enabled` |
| `delete-user`              | Permanently delete a user. **Irreversible** — prefer `set-user-enabled(false)` for temporary blocks. | `realm`, `username` |
| `reset-user-password`      | Set a new password. `temporary=true` forces a change at next login.                                  | `realm`, `username`, `password`, `temporary?` (def. true) |
| `send-user-actions-email`  | Email the user required actions (e.g. `VERIFY_EMAIL`, `UPDATE_PASSWORD`). Needs SMTP on the realm.   | `realm`, `username`, `actions[]`, `lifespan?` (seconds) |
| `logout-user`              | Revoke **all** of a user's active sessions, forcing re-authentication everywhere.                    | `realm`, `username` |
| `impersonate-user`         | Start an impersonation session via the admin account. **Sensitive** — returns session/redirect data. | `realm`, `username` |
| `unlock-user`              | Clear a user's brute-force lockout so they can sign in again. Does not change their password.        | `realm`, `username` |

### Roles (`roles`, 15 tools)

Composite roles bundle other roles: whoever holds the parent also gets every child. For the
composite tools the parent is a realm role, or a client role when `clientId` is given, and each
entry in `children` is `{ roleName, clientId? }` (omit `clientId` for a realm role). All roles are
checked before anything is written, so a typo changes nothing.

| Tool | Description | Arguments |
| ---- | ----------- | --------- |
| `list-realm-roles`            | List realm-level roles (id, name, description, composite flag). Search + paginate.   | `realm`, `search?`, `first?`, `max?` |
| `list-client-roles`           | List roles defined by a specific client (by clientId).                               | `realm`, `clientId` |
| `list-users-with-realm-role`  | List users that have a given realm role assigned.                                    | `realm`, `roleName`, `first?`, `max?` |
| `create-realm-role`  | Create a realm-level role. Fails if the name already exists.                                | `realm`, `name`, `description?` |
| `update-realm-role`  | Rename a realm role and/or change its description. Only supplied fields change; needs ≥1.    | `realm`, `name`, `newName?`, `description?` |
| `delete-realm-role`  | Delete a realm role by name. **Irreversible** — unmaps it from every user and group.        | `realm`, `name` |
| `create-client-role` | Create a role owned by a client (by clientId). Fails if the name already exists on that client. | `realm`, `clientId`, `name`, `description?` |
| `delete-client-role` | Delete a client role by name. **Irreversible** — unmaps it from every user, group and composite. | `realm`, `clientId`, `name` |
| `assign-realm-role`   | Assign a realm role to a user. Idempotent.                            | `realm`, `username`, `roleName` |
| `remove-realm-role`   | Remove a realm role from a user. Idempotent.                          | `realm`, `username`, `roleName` |
| `assign-client-role`  | Assign a client-level role to a user. Idempotent.                    | `realm`, `username`, `clientId`, `roleName` |
| `remove-client-role`  | Remove a client-level role from a user. Idempotent.                  | `realm`, `username`, `clientId`, `roleName` |
| `list-composite-roles`   | List the child roles inside a composite role (name, description, owning `clientId` or null).  | `realm`, `roleName`, `clientId?` |
| `add-composite-roles`    | Add child roles to a role, making it composite. Idempotent for children already present.      | `realm`, `roleName`, `clientId?`, `children[]` |
| `remove-composite-roles` | Remove child roles from a composite role. The children themselves are kept.                   | `realm`, `roleName`, `clientId?`, `children[]` |

### Groups (`groups`, 7 tools)

| Tool | Description | Arguments |
| ---- | ----------- | --------- |
| `list-groups`         | List groups as a tree (id, name, path, nested subGroups). Search + paginate top-level groups.  | `realm`, `search?`, `first?`, `max?` |
| `list-group-members`  | List members of a group (by path or name): id, username, email, enabled.                      | `realm`, `group`, `first?`, `max?` |
| `create-group`             | Create a top-level group, or a nested child when a `parent` (path/name) is supplied.  | `realm`, `name`, `parent?` |
| `update-group`             | Rename a group (by path or name). Members, subgroups and attributes are kept; the path changes. | `realm`, `group`, `newName` |
| `delete-group`             | Delete a group (by path or name), including its subgroups. **Irreversible.**          | `realm`, `group` |
| `add-user-to-group`        | Add a user to a group (by path or name). Idempotent.                                  | `realm`, `username`, `group` |
| `remove-user-from-group`   | Remove a user from a group (by path or name). Idempotent.                             | `realm`, `username`, `group` |

### Clients (`clients`, 8 tools)

| Tool | Description | Arguments |
| ---- | ----------- | --------- |
| `list-clients`       | List clients (id, clientId, name, enabled, protocol, public flag). Filter by clientId; paginated.       | `realm`, `clientId?`, `first?`, `max?` |
| `get-client`         | Get one client by clientId (protocol, flow settings, redirect URIs, web origins). No secret.            | `realm`, `clientId` |
| `get-client-secret`  | Retrieve a confidential client's current secret. **Sensitive** — non-public clients only.               | `realm`, `clientId` |
| `create-client`             | Register a new client. Defaults to confidential standard-flow; toggle public / service-account.   | `realm`, `clientId`, `name?`, `description?`, `publicClient?` (def. false), `standardFlowEnabled?` (def. true), `serviceAccountsEnabled?` (def. false), `redirectUris?`, `webOrigins?` |
| `update-client`             | Update an existing client. Only supplied fields change; `redirectUris` / `webOrigins` **replace** the existing lists. Needs ≥1 field. | `realm`, `clientId`, `name?`, `description?`, `enabled?`, `publicClient?`, `standardFlowEnabled?`, `serviceAccountsEnabled?`, `redirectUris?`, `webOrigins?` |
| `delete-client`             | Delete a client, including its roles, secret and service account. **Irreversible.**               | `realm`, `clientId` |
| `regenerate-client-secret`  | Rotate a confidential client's secret and return the new value. **Sensitive**; old secret dies.   | `realm`, `clientId` |
| `get-client-service-account` | Get the service-account user behind a client (id, username, enabled). Needs `serviceAccountsEnabled`. | `realm`, `clientId` |

### Client scopes and protocol mappers (`client-scopes`, 13 tools)

A client scope is a reusable bundle of protocol mappers that can be assigned to many clients.
Protocol mappers add claims to tokens, either directly on a client (`add-protocol-mapper`...) or on
a scope (`add-client-scope-protocol-mapper`...). Realm-wide *default* scopes (auto-assigned to new
clients) are not covered yet.

| Tool | Description | Arguments |
| ---- | ----------- | --------- |
| `list-client-scopes` | List the realm's client scopes, or (with `clientId`) the default and optional scopes assigned to a client. | `realm`, `clientId?` |
| `get-client-scope`                     | Get one scope by name: protocol, description, attributes and its protocol mappers.                    | `realm`, `name` |
| `create-client-scope`                  | Create a scope. Fails if the name already exists.                                                     | `realm`, `name`, `description?`, `protocol?` (def. `openid-connect`), `attributes?` |
| `update-client-scope`                  | Update description and/or attributes (keys are **merged**). Rename/protocol change = delete + create. Needs ≥1 field. | `realm`, `name`, `description?`, `attributes?` |
| `delete-client-scope`                  | Delete a scope and its mappers; detaches it from every client. **Irreversible.**                      | `realm`, `name` |
| `assign-client-scope-to-client`        | Assign a scope to a client as `default` (always applied) or `optional` (only when requested). Idempotent. | `realm`, `clientId`, `scope`, `type?` (def. `default`) |
| `remove-client-scope-from-client`      | Detach a scope from a client; `type` must match how it was assigned. Idempotent.                      | `realm`, `clientId`, `scope`, `type` |
| `add-client-scope-protocol-mapper`     | Add a protocol mapper to a scope. Fails if the name already exists on it.                             | `realm`, `scope`, `name`, `protocolMapper`, `protocol?`, `config?` |
| `delete-client-scope-protocol-mapper`  | Remove a mapper (by name) from a scope. **Irreversible.**                                             | `realm`, `scope`, `name` |
| `list-protocol-mappers` | List the protocol mappers defined directly on a client (name, mapper type, config).                  | `realm`, `clientId` |
| `add-protocol-mapper`    | Add a mapper to a client, e.g. type `oidc-usermodel-attribute-mapper`. Fails if the name already exists. | `realm`, `clientId`, `name`, `protocolMapper`, `protocol?` (def. `openid-connect`), `config?` |
| `update-protocol-mapper` | Change a mapper's config (looked up by name). Keys are **merged**; name and type can't change.           | `realm`, `clientId`, `name`, `config` |
| `delete-protocol-mapper` | Remove a mapper (by name) from a client. **Irreversible.**                                               | `realm`, `clientId`, `name` |

### Realms (`realms`, 9 tools)

Turn on event storage with `update-realm-events-config` before `list-events` /
`list-admin-events` (group `events`) return anything.

| Tool | Description | Arguments |
| ---- | ----------- | --------- |
| `list-realms` | List realms visible to the admin service account (id, realm, enabled). Needs realm-view.     | _(none)_ |
| `get-realm`   | Get a realm's key settings: enabled, login flags, token/session lifespans, SMTP-configured.  | `realm` |
| `set-realm-enabled`  | Enable or disable a realm. Disabling blocks **all** logins to it immediately.        | `realm`, `enabled` |
| `create-realm`       | Create a new, empty realm with Keycloak defaults. Fails if the name exists.          | `realm`, `displayName?`, `enabled?` (def. true) |
| `update-realm-settings` | Update login options, security (`sslRequired`, brute force, `passwordPolicy`), token/session lifespans (seconds), locale and theme. Only supplied fields change; needs ≥1. | `realm`, `displayName?`, `registrationAllowed?`, `registrationEmailAsUsername?`, `loginWithEmailAllowed?`, `duplicateEmailsAllowed?`, `resetPasswordAllowed?`, `rememberMe?`, `verifyEmail?`, `editUsernameAllowed?`, `sslRequired?`, `bruteForceProtected?`, `failureFactor?`, `passwordPolicy?`, `accessTokenLifespan?`, `ssoSessionIdleTimeout?`, `ssoSessionMaxLifespan?`, `internationalizationEnabled?`, `defaultLocale?`, `supportedLocales?`, `loginTheme?` |
| `get-realm-smtp`     | Read a realm's SMTP settings. The password is never returned, only `passwordSet`.    | `realm` |
| `update-realm-smtp`  | Configure outgoing email. Only supplied fields change; existing SMTP config is kept. Password is write-only. | `realm`, `host?`, `port?`, `from?`, `fromDisplayName?`, `replyTo?`, `auth?`, `user?`, `password?`, `ssl?`, `starttls?` |
| `update-realm-events-config` | Turn user-event and admin-event storage on/off (required before `list-events` / `list-admin-events` return data). | `realm`, `eventsEnabled?`, `eventsExpiration?` (seconds), `adminEventsEnabled?`, `adminEventsDetailsEnabled?` |
| `delete-realm`       | Delete a realm and everything in it. **Irreversible.** `confirm` must repeat the realm name; the master realm and the server's auth realm are refused. | `realm`, `confirm` |

### Identity providers (`identity-providers`, 10 tools)

Identity-provider mappers turn claims from the external provider into user attributes, roles or
group memberships: call `list-identity-provider-mapper-types` first to get a valid mapper type and
its config keys. `config` on create/update may contain secrets and is never echoed back.

| Tool | Description | Arguments |
| ---- | ----------- | --------- |
| `list-identity-providers`  | List configured identity providers (alias, provider type, display name, enabled). No secrets.            | `realm` |
| `get-identity-provider`    | Get one provider by alias, with its settings and config. Keycloak masks secret values.                   | `realm`, `alias` |
| `create-identity-provider` | Add a social/broker provider (`google`, `github`, `oidc`, `saml`, ...). `config` may contain secrets and is not echoed back. | `realm`, `alias`, `providerId`, `displayName?`, `enabled?` (def. true), `trustEmail?` (def. false), `config?` |
| `update-identity-provider` | Update a provider. Only supplied fields change; `config` keys are **merged** into the existing config. Needs ≥1 field. | `realm`, `alias`, `displayName?`, `enabled?`, `trustEmail?`, `config?` |
| `delete-identity-provider` | Delete a provider with its mappers and user links. **Irreversible** — prefer `enabled=false` to switch it off. | `realm`, `alias` |
| `list-identity-provider-mappers`       | List a provider's mappers (id, name, mapper type, config).                                            | `realm`, `alias` |
| `list-identity-provider-mapper-types`  | List the mapper types a provider supports, with their config properties.                              | `realm`, `alias` |
| `create-identity-provider-mapper`      | Add a mapper, e.g. `oidc-user-attribute-idp-mapper`. Include `syncMode` in `config`. Fails if the name exists. | `realm`, `alias`, `name`, `identityProviderMapper`, `config?` |
| `update-identity-provider-mapper`      | Change a mapper's config (looked up by name). Keys are **merged**; name and type can't change.        | `realm`, `alias`, `name`, `config` |
| `delete-identity-provider-mapper`      | Remove a mapper (by name). Already-imported users keep what it set. **Irreversible.**                 | `realm`, `alias`, `name` |

### Authentication flows and required actions (`authentication`, 13 tools)

Flows decide how users log in (password, OTP, social login...). Flows are addressed by **alias**,
and steps ("executions") by id, or by provider id / display name when that is unambiguous.
Built-in flows can't be edited: `copy-authentication-flow` first, edit the copy, then bind it with
`set-realm-flow-binding`. Authenticator *configs* (e.g. OTP policy options on a step) and an identity
provider's first-broker-login flow (set on the identity provider) are not covered yet.

| Tool | Description | Arguments |
| ---- | ----------- | --------- |
| `list-authentication-flows`     | List top-level flows (alias, description, built-in) and which realm bindings use each (`boundTo`).            | `realm` |
| `get-authentication-flow`       | Show a flow's steps in order with nesting level, requirement, provider and allowed requirement values.        | `realm`, `flow` |
| `list-authenticator-providers`  | List step types you can add (`auth-otp-form`, ...). `kind`: `authenticator`, `form-action` or `client`.       | `realm`, `kind?` (def. `authenticator`) |
| `create-authentication-flow`    | Create an empty top-level flow. Does nothing until it has steps and is bound.                                 | `realm`, `alias`, `description?`, `providerId?` (def. `basic-flow`) |
| `copy-authentication-flow`      | Copy a flow (usually a built-in) under a new alias, with its subflows and steps.                              | `realm`, `flow`, `newName` |
| `delete-authentication-flow`    | Delete a custom flow. Built-in and realm-bound flows are refused. **Irreversible.**                           | `realm`, `flow` |
| `add-flow-execution`            | Add a step to a flow/subflow. New steps start `DISABLED` unless `requirement` is given.                       | `realm`, `flow`, `provider`, `requirement?` |
| `add-authentication-subflow`    | Add a nested subflow (`basic-flow` or `form-flow`) to group steps. Add steps into it using its alias as `flow`. | `realm`, `flow`, `alias`, `type?`, `description?`, `requirement?` |
| `update-flow-execution`         | Set a step's requirement: `REQUIRED`, `ALTERNATIVE`, `CONDITIONAL` or `DISABLED`.                             | `realm`, `flow`, `execution`, `requirement` |
| `delete-flow-execution`         | Remove a step. Deleting a subflow step deletes everything inside it. **Irreversible.**                        | `realm`, `flow`, `execution` |
| `set-realm-flow-binding`        | Choose the flow used for `browser`, `registration`, `directGrant`, `resetCredentials`, `clientAuthentication` or `dockerAuthentication`. Immediate for all users — a flow that can't complete a login **locks everyone out**. | `realm`, `binding`, `flow` |
| `list-required-actions`  | List required actions (`VERIFY_EMAIL`, `CONFIGURE_TOTP`, ...): enabled, default flag and priority.             | `realm` |
| `update-required-action` | Enable/disable an action, rename it, or make it a *default* action assigned to every **new** user. Needs ≥1 field. | `realm`, `alias`, `enabled?`, `defaultAction?`, `name?` |

### User federation (LDAP / Active Directory) (`federation`, 12 tools)

Federation providers let Keycloak authenticate users against an external directory. Providers and
their mappers are addressed by **name**. Secrets (the bind credential) are write-only: they are
never returned, and `get-user-federation-provider` only lists which ones are set.

Kerberos and custom federation providers can be listed, inspected, updated, synced and deleted, but
only LDAP/AD providers can be created. Editing an existing mapper and triggering a mapper sync
(group/role import) are not covered; delete and re-create a mapper to change it.

| Tool | Description | Arguments |
| ---- | ----------- | --------- |
| `list-user-federation-providers`    | List providers: name, type, enabled, priority, edit mode and (LDAP) connection URL.                          | `realm` |
| `get-user-federation-provider`      | Get one provider with its full config. Secrets omitted (`secretsSet` names them).                            | `realm`, `name` |
| `create-ldap-user-federation`       | Connect an LDAP/AD server. `vendor` (`ad`, `rhds`, `tivoli`, `edirectory`, `other`) fills in the right attribute names; defaults to `READ_ONLY`, import on login, no periodic sync. | `realm`, `name`, `vendor`, `connectionUrl`, `usersDn`, `authType?` (def. `simple`), `bindDn?`, `bindCredential?`, `config?` |
| `update-user-federation-provider`   | Change settings; `config` keys are **merged**, a stored bind credential is kept. `enabled=false` pauses it.  | `realm`, `name`, `config` |
| `delete-user-federation-provider`   | Delete a provider and its mappers. Keycloak also removes the users imported from it. **Irreversible.**       | `realm`, `name` |
| `sync-user-federation-provider`     | Import users now: `changed` (default) or `full`. Returns added/updated/removed/failed counts.                | `realm`, `name`, `mode?` |
| `unlink-federated-users`            | Turn all of a provider's users into ordinary local users (they then need a local password). Run before deleting a provider to keep its users. | `realm`, `name` |
| `remove-imported-federated-users`   | Delete Keycloak's copies of all users imported from a provider. They are re-imported on next login/sync. **Irreversible** for Keycloak-only data. | `realm`, `name` |
| `list-ldap-mapper-types`            | List the mapper types a provider supports, with their config properties.                                     | `realm`, `provider` |
| `list-ldap-mappers`                 | List a provider's mappers (name, type, config).                                                              | `realm`, `provider` |
| `create-ldap-mapper`                | Add a mapper (`user-attribute-ldap-mapper`, `group-ldap-mapper`, `role-ldap-mapper`, ...).                    | `realm`, `provider`, `name`, `mapperType`, `config?` |
| `delete-ldap-mapper`                | Remove a mapper by name. **Irreversible.**                                                                   | `realm`, `provider`, `name` |

### Events (`events`, 2 tools)

Both tools need event storage enabled (`update-realm-events-config`, group `realms`); otherwise
they return an empty list.

| Tool | Description | Arguments |
| ---- | ----------- | --------- |
| `list-events`       | List login/user events (LOGIN, LOGIN_ERROR, LOGOUT, ...), newest first. Handy for failed-login debugging. | `realm`, `type?[]`, `username?`, `clientId?`, `ipAddress?`, `dateFrom?` (yyyy-MM-dd), `dateTo?` (yyyy-MM-dd), `first?`, `max?` |
| `list-admin-events` | List admin-API events (who created/updated/deleted what), newest first.                             | `realm`, `operationTypes?` (CREATE/UPDATE/DELETE/ACTION), `resourceTypes?`, `resourcePath?`, `first?`, `max?` |

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
- “Why did `jdoe`'s login fail yesterday in `financement-realm`?” (login events)
- “Add a `department` claim mapper to the `my-backend` client.”
- “Make `billing-admin` a composite role that includes `offline_access`.”
- “Copy the `browser` flow to `browser-with-otp`, make OTP required, then bind it to the realm.”
- “Connect `financement-realm` to our Active Directory at `ldaps://ad.example.com` and sync the users.”

Claude will pick the matching tool and fill in the arguments.

> ⚠️ **Destructive tools have no confirmation step.** Every `delete-*` tool,
> `remove-imported-federated-users`, `unlink-federated-users`, `logout-user`,
> `regenerate-client-secret`, `set-realm-enabled(false)` and `set-realm-flow-binding` take
> effect immediately, and most cannot be undone. `delete-realm` is the one exception: it needs
> a `confirm` argument repeating the realm name and refuses the `master` realm. A bad
> `set-realm-flow-binding` can lock everyone out of a realm; inspect the flow first with
> `get-authentication-flow`. To limit what the model can do, enable fewer groups with
> `KEYCLOAK_TOOLS` and grant the service account only the roles it needs.

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
| `403` on clients, scopes, mappers, identity providers or events | Needs `manage-clients`, `manage-identity-providers` or `view-events`; see [Keycloak setup](#keycloak-setup-service-account). |
| Missing users/clients in list | Service account lacks `view-users` / `view-clients` for that realm. |
| Server exits at startup with `Unknown KEYCLOAK_TOOLS group(s)` | A name in `KEYCLOAK_TOOLS` is misspelled. The message lists the valid groups; see [Tool groups](#tool-groups). |
| A tool is missing from the client | Its group is not enabled. Check the startup line on stderr (`N tools registered (groups: ...)`) and add the group to `KEYCLOAK_TOOLS`. |
| `list-events` / `list-admin-events` return `[]` | Event storage is off for that realm. Enable it with `update-realm-events-config`. |
| LDAP sync reports `failed` users or nothing is imported | Check `connectionUrl`, `usersDn` and the bind credentials with `get-user-federation-provider`; `list-ldap-mappers` shows how attributes are mapped. |
| Changes not visible in Claude Desktop | Fully restart the app after editing the config. |

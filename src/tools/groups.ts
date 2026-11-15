import { registerListUsers } from "@/tools/list-users.js";
import { registerGetUser } from "@/tools/get-user.js";
import { registerCountUsers } from "@/tools/count-users.js";
import { registerListUserGroups } from "@/tools/list-user-groups.js";
import { registerListUserRoles } from "@/tools/list-user-roles.js";
import { registerListUserCredentials } from "@/tools/list-user-credentials.js";
import { registerSearchUsersByAttribute } from "@/tools/search-users-by-attribute.js";
import { registerListClients } from "@/tools/list-clients.js";
import { registerGetClient } from "@/tools/get-client.js";
import { registerGetClientSecret } from "@/tools/get-client-secret.js";
import { registerListGroups } from "@/tools/list-groups.js";
import { registerListGroupMembers } from "@/tools/list-group-members.js";
import { registerListRealmRoles } from "@/tools/list-realm-roles.js";
import { registerListClientRoles } from "@/tools/list-client-roles.js";
import { registerListUsersWithRealmRole } from "@/tools/list-users-with-realm-role.js";
import { registerListRealms } from "@/tools/list-realms.js";
import { registerGetRealm } from "@/tools/get-realm.js";
import { registerSetRealmEnabled } from "@/tools/set-realm-enabled.js";
import { registerListUserSessions } from "@/tools/list-user-sessions.js";
import { registerCreateUser } from "@/tools/create-user.js";
import { registerUpdateUser } from "@/tools/update-user.js";
import { registerSetUserEnabled } from "@/tools/set-user-enabled.js";
import { registerDeleteUser } from "@/tools/delete-user.js";
import { registerResetUserPassword } from "@/tools/reset-user-password.js";
import { registerSendUserActionsEmail } from "@/tools/send-user-actions-email.js";
import { registerLogoutUser } from "@/tools/logout-user.js";
import { registerImpersonateUser } from "@/tools/impersonate-user.js";
import { registerAssignRealmRole } from "@/tools/assign-realm-role.js";
import { registerRemoveRealmRole } from "@/tools/remove-realm-role.js";
import { registerAssignClientRole } from "@/tools/assign-client-role.js";
import { registerRemoveClientRole } from "@/tools/remove-client-role.js";
import { registerCreateRealmRole } from "@/tools/create-realm-role.js";
import { registerDeleteRealmRole } from "@/tools/delete-realm-role.js";
import { registerAddUserToGroup } from "@/tools/add-user-to-group.js";
import { registerRemoveUserFromGroup } from "@/tools/remove-user-from-group.js";
import { registerCreateGroup } from "@/tools/create-group.js";
import { registerDeleteGroup } from "@/tools/delete-group.js";
import { registerCreateClient } from "@/tools/create-client.js";
import { registerRegenerateClientSecret } from "@/tools/regenerate-client-secret.js";
import { registerUpdateClient } from "@/tools/update-client.js";
import { registerDeleteClient } from "@/tools/delete-client.js";
import { registerCreateClientRole } from "@/tools/create-client-role.js";
import { registerDeleteClientRole } from "@/tools/delete-client-role.js";
import { registerUpdateRealmRole } from "@/tools/update-realm-role.js";
import { registerUpdateGroup } from "@/tools/update-group.js";
import { registerListIdentityProviders } from "@/tools/list-identity-providers.js";
import { registerListEvents } from "@/tools/list-events.js";
import { registerListAdminEvents } from "@/tools/list-admin-events.js";
import { registerListClientScopes } from "@/tools/list-client-scopes.js";
import { registerListProtocolMappers } from "@/tools/list-protocol-mappers.js";
import { registerGetClientServiceAccount } from "@/tools/get-client-service-account.js";
import { registerUnlockUser } from "@/tools/unlock-user.js";
import { registerGetIdentityProvider } from "@/tools/get-identity-provider.js";
import { registerCreateIdentityProvider } from "@/tools/create-identity-provider.js";
import { registerUpdateIdentityProvider } from "@/tools/update-identity-provider.js";
import { registerDeleteIdentityProvider } from "@/tools/delete-identity-provider.js";
import { registerAddProtocolMapper } from "@/tools/add-protocol-mapper.js";
import { registerUpdateProtocolMapper } from "@/tools/update-protocol-mapper.js";
import { registerDeleteProtocolMapper } from "@/tools/delete-protocol-mapper.js";
import { registerListIdentityProviderMappers } from "@/tools/list-identity-provider-mappers.js";
import { registerListIdentityProviderMapperTypes } from "@/tools/list-identity-provider-mapper-types.js";
import { registerCreateIdentityProviderMapper } from "@/tools/create-identity-provider-mapper.js";
import { registerUpdateIdentityProviderMapper } from "@/tools/update-identity-provider-mapper.js";
import { registerDeleteIdentityProviderMapper } from "@/tools/delete-identity-provider-mapper.js";
import { registerGetClientScope } from "@/tools/get-client-scope.js";
import { registerCreateClientScope } from "@/tools/create-client-scope.js";
import { registerUpdateClientScope } from "@/tools/update-client-scope.js";
import { registerDeleteClientScope } from "@/tools/delete-client-scope.js";
import { registerAssignClientScopeToClient } from "@/tools/assign-client-scope-to-client.js";
import { registerRemoveClientScopeFromClient } from "@/tools/remove-client-scope-from-client.js";
import { registerAddClientScopeProtocolMapper } from "@/tools/add-client-scope-protocol-mapper.js";
import { registerDeleteClientScopeProtocolMapper } from "@/tools/delete-client-scope-protocol-mapper.js";
import { registerCreateRealm } from "@/tools/create-realm.js";
import { registerUpdateRealmSettings } from "@/tools/update-realm-settings.js";
import { registerGetRealmSmtp } from "@/tools/get-realm-smtp.js";
import { registerUpdateRealmSmtp } from "@/tools/update-realm-smtp.js";
import { registerUpdateRealmEventsConfig } from "@/tools/update-realm-events-config.js";
import { registerDeleteRealm } from "@/tools/delete-realm.js";
import { registerListCompositeRoles } from "@/tools/list-composite-roles.js";
import { registerAddCompositeRoles } from "@/tools/add-composite-roles.js";
import { registerRemoveCompositeRoles } from "@/tools/remove-composite-roles.js";
import { registerListAuthenticationFlows } from "@/tools/list-authentication-flows.js";
import { registerGetAuthenticationFlow } from "@/tools/get-authentication-flow.js";
import { registerCreateAuthenticationFlow } from "@/tools/create-authentication-flow.js";
import { registerCopyAuthenticationFlow } from "@/tools/copy-authentication-flow.js";
import { registerDeleteAuthenticationFlow } from "@/tools/delete-authentication-flow.js";
import { registerListAuthenticatorProviders } from "@/tools/list-authenticator-providers.js";
import { registerAddFlowExecution } from "@/tools/add-flow-execution.js";
import { registerAddAuthenticationSubflow } from "@/tools/add-authentication-subflow.js";
import { registerUpdateFlowExecution } from "@/tools/update-flow-execution.js";
import { registerDeleteFlowExecution } from "@/tools/delete-flow-execution.js";
import { registerSetRealmFlowBinding } from "@/tools/set-realm-flow-binding.js";
import { registerListRequiredActions } from "@/tools/list-required-actions.js";
import { registerUpdateRequiredAction } from "@/tools/update-required-action.js";
import { registerListUserFederationProviders } from "@/tools/list-user-federation-providers.js";
import { registerGetUserFederationProvider } from "@/tools/get-user-federation-provider.js";
import { registerCreateLdapUserFederation } from "@/tools/create-ldap-user-federation.js";
import { registerUpdateUserFederationProvider } from "@/tools/update-user-federation-provider.js";
import { registerDeleteUserFederationProvider } from "@/tools/delete-user-federation-provider.js";
import { registerSyncUserFederationProvider } from "@/tools/sync-user-federation-provider.js";
import { registerUnlinkFederatedUsers } from "@/tools/unlink-federated-users.js";
import { registerRemoveImportedFederatedUsers } from "@/tools/remove-imported-federated-users.js";
import { registerListLdapMapperTypes } from "@/tools/list-ldap-mapper-types.js";
import { registerListLdapMappers } from "@/tools/list-ldap-mappers.js";
import { registerCreateLdapMapper } from "@/tools/create-ldap-mapper.js";
import { registerDeleteLdapMapper } from "@/tools/delete-ldap-mapper.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";

type Register = (server: McpServer) => void;

/**
 * Every tool, grouped by domain. Each tool belongs to exactly one group. KEYCLOAK_TOOLS
 * selects which groups are exposed (default: all), so a client only loads the tools it
 * needs. groups.test.ts fails if a tool file is missing from here or listed twice.
 */
export const TOOL_GROUPS = {
  users: [
    registerListUsers,
    registerGetUser,
    registerCountUsers,
    registerListUserGroups,
    registerListUserRoles,
    registerListUserCredentials,
    registerListUserSessions,
    registerSearchUsersByAttribute,
    registerCreateUser,
    registerUpdateUser,
    registerSetUserEnabled,
    registerDeleteUser,
    registerResetUserPassword,
    registerSendUserActionsEmail,
    registerLogoutUser,
    registerImpersonateUser,
    registerUnlockUser
  ],
  roles: [
    registerListRealmRoles,
    registerListClientRoles,
    registerListUsersWithRealmRole,
    registerCreateRealmRole,
    registerUpdateRealmRole,
    registerDeleteRealmRole,
    registerCreateClientRole,
    registerDeleteClientRole,
    registerAssignRealmRole,
    registerRemoveRealmRole,
    registerAssignClientRole,
    registerRemoveClientRole,
    registerListCompositeRoles,
    registerAddCompositeRoles,
    registerRemoveCompositeRoles
  ],
  groups: [
    registerListGroups,
    registerListGroupMembers,
    registerCreateGroup,
    registerUpdateGroup,
    registerDeleteGroup,
    registerAddUserToGroup,
    registerRemoveUserFromGroup
  ],
  clients: [
    registerListClients,
    registerGetClient,
    registerGetClientSecret,
    registerCreateClient,
    registerUpdateClient,
    registerDeleteClient,
    registerRegenerateClientSecret,
    registerGetClientServiceAccount
  ],
  "client-scopes": [
    registerListClientScopes,
    registerGetClientScope,
    registerCreateClientScope,
    registerUpdateClientScope,
    registerDeleteClientScope,
    registerAssignClientScopeToClient,
    registerRemoveClientScopeFromClient,
    registerAddClientScopeProtocolMapper,
    registerDeleteClientScopeProtocolMapper,
    registerListProtocolMappers,
    registerAddProtocolMapper,
    registerUpdateProtocolMapper,
    registerDeleteProtocolMapper
  ],
  realms: [
    registerListRealms,
    registerGetRealm,
    registerSetRealmEnabled,
    registerCreateRealm,
    registerUpdateRealmSettings,
    registerGetRealmSmtp,
    registerUpdateRealmSmtp,
    registerUpdateRealmEventsConfig,
    registerDeleteRealm
  ],
  "identity-providers": [
    registerListIdentityProviders,
    registerGetIdentityProvider,
    registerCreateIdentityProvider,
    registerUpdateIdentityProvider,
    registerDeleteIdentityProvider,
    registerListIdentityProviderMappers,
    registerListIdentityProviderMapperTypes,
    registerCreateIdentityProviderMapper,
    registerUpdateIdentityProviderMapper,
    registerDeleteIdentityProviderMapper
  ],
  authentication: [
    registerListAuthenticationFlows,
    registerGetAuthenticationFlow,
    registerListAuthenticatorProviders,
    registerCreateAuthenticationFlow,
    registerCopyAuthenticationFlow,
    registerDeleteAuthenticationFlow,
    registerAddFlowExecution,
    registerAddAuthenticationSubflow,
    registerUpdateFlowExecution,
    registerDeleteFlowExecution,
    registerSetRealmFlowBinding,
    registerListRequiredActions,
    registerUpdateRequiredAction
  ],
  federation: [
    registerListUserFederationProviders,
    registerGetUserFederationProvider,
    registerCreateLdapUserFederation,
    registerUpdateUserFederationProvider,
    registerDeleteUserFederationProvider,
    registerSyncUserFederationProvider,
    registerUnlinkFederatedUsers,
    registerRemoveImportedFederatedUsers,
    registerListLdapMapperTypes,
    registerListLdapMappers,
    registerCreateLdapMapper,
    registerDeleteLdapMapper
  ],
  events: [registerListEvents, registerListAdminEvents]
} as const satisfies Record<string, readonly Register[]>;

export type ToolGroupName = keyof typeof TOOL_GROUPS;

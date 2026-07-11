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
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp";


export function registerTools(server: McpServer) {
  // Read: users
  registerListUsers(server);
  registerGetUser(server);
  registerCountUsers(server);
  registerListUserGroups(server);
  registerListUserRoles(server);
  registerListUserCredentials(server);
  registerListUserSessions(server);
  registerSearchUsersByAttribute(server);

  // Read: clients
  registerListClients(server);
  registerGetClient(server);
  registerGetClientSecret(server);

  // Read: groups
  registerListGroups(server);
  registerListGroupMembers(server);

  // Read: roles
  registerListRealmRoles(server);
  registerListClientRoles(server);
  registerListUsersWithRealmRole(server);

  // Read: realms
  registerListRealms(server);
  registerGetRealm(server);

  // Write: realms
  registerSetRealmEnabled(server);

  // Write: users
  registerCreateUser(server);
  registerUpdateUser(server);
  registerSetUserEnabled(server);
  registerDeleteUser(server);
  registerResetUserPassword(server);
  registerSendUserActionsEmail(server);
  registerLogoutUser(server);
  registerImpersonateUser(server);

  // Write: role mappings
  registerAssignRealmRole(server);
  registerRemoveRealmRole(server);
  registerAssignClientRole(server);
  registerRemoveClientRole(server);

  // Write: roles
  registerCreateRealmRole(server);
  registerDeleteRealmRole(server);

  // Write: group membership
  registerAddUserToGroup(server);
  registerRemoveUserFromGroup(server);

  // Write: groups
  registerCreateGroup(server);
  registerDeleteGroup(server);

  // Write: clients
  registerCreateClient(server);
  registerRegenerateClientSecret(server);
}

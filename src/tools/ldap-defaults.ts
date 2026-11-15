import { z } from "zod";

export const ldapVendorSchema = z.enum(["ad", "rhds", "tivoli", "edirectory", "other"]);

export type LdapVendor = z.infer<typeof ldapVendorSchema>;

/**
 * Per-vendor attribute names, matching the defaults Keycloak's admin console fills in.
 * Without them the provider cannot find or identify users in the directory.
 */
const VENDOR_ATTRIBUTES: Record<
  LdapVendor,
  { usernameLDAPAttribute: string; rdnLDAPAttribute: string; uuidLDAPAttribute: string; userObjectClasses: string }
> = {
  ad: {
    usernameLDAPAttribute: "sAMAccountName",
    rdnLDAPAttribute: "cn",
    uuidLDAPAttribute: "objectGUID",
    userObjectClasses: "person, organizationalPerson, user"
  },
  rhds: {
    usernameLDAPAttribute: "uid",
    rdnLDAPAttribute: "uid",
    uuidLDAPAttribute: "nsuniqueid",
    userObjectClasses: "inetOrgPerson, organizationalPerson"
  },
  tivoli: {
    usernameLDAPAttribute: "uid",
    rdnLDAPAttribute: "uid",
    uuidLDAPAttribute: "uniqueidentifier",
    userObjectClasses: "inetOrgPerson, organizationalPerson"
  },
  edirectory: {
    usernameLDAPAttribute: "uid",
    rdnLDAPAttribute: "uid",
    uuidLDAPAttribute: "guid",
    userObjectClasses: "inetOrgPerson, organizationalPerson"
  },
  other: {
    usernameLDAPAttribute: "uid",
    rdnLDAPAttribute: "uid",
    uuidLDAPAttribute: "entryUUID",
    userObjectClasses: "inetOrgPerson, organizationalPerson"
  }
};

/** Settings that are the same whatever the vendor. */
const BASE_DEFAULTS: Record<string, string> = {
  enabled: "true",
  priority: "0",
  authType: "simple",
  editMode: "READ_ONLY",
  importEnabled: "true",
  syncRegistrations: "false",
  searchScope: "1",
  pagination: "true",
  connectionPooling: "true",
  validatePasswordPolicy: "false",
  trustEmail: "false",
  useTruststoreSpi: "ldapsOnly",
  batchSizeForSync: "1000",
  fullSyncPeriod: "-1",
  changedSyncPeriod: "-1",
  cachePolicy: "DEFAULT"
};

/** Build the starting config for an LDAP provider: base defaults + vendor attributes. */
export function ldapDefaults(vendor: LdapVendor): Record<string, string> {
  return { ...BASE_DEFAULTS, vendor, ...VENDOR_ATTRIBUTES[vendor] };
}

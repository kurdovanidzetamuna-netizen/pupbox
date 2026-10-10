import { SetMetadata } from '@nestjs/common';

export const ADMIN_PERMS_KEY = 'adminPerms';

/**
 * What an admin needs to use a controller or route. `read` covers GET
 * requests, `write` everything else; `any` lists alternatives, any one of
 * which is enough. Put it on the controller class, and on a route to
 * override (e.g. deleting needs more than editing).
 *
 *   @AdminPerms({ read: 'orders.view', write: 'orders.manage' })
 */
export interface AdminPermsSpec {
  read?: string | string[];
  write?: string | string[];
}

export const AdminPerms = (spec: AdminPermsSpec) => SetMetadata(ADMIN_PERMS_KEY, spec);

/** Does this admin hold the permission (or one of the alternatives) the spec asks of this method? */
export function allowed(spec: AdminPermsSpec | undefined, method: string, held: string[]): boolean {
  if (!spec) return true;
  const need = method === 'GET' || method === 'HEAD' ? spec.read : spec.write;
  if (!need) return true;
  const options = Array.isArray(need) ? need : [need];
  return options.some((p) => held.includes(p));
}

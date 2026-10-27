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

/**
 * Every permission the API checks, in the order the Roles page shows them.
 * This list is the only source: the database is brought in line with it at
 * startup, and roles can only hold these keys.
 */
export const PERMISSION_CATALOGUE: { key: string; group: string; name: string; description: string }[] = [
  { key: 'dashboard.view', group: 'Overview', name: 'See the dashboard', description: 'Sales, orders and subscriber numbers on the home screen.' },
  { key: 'reports.view', group: 'Overview', name: 'See reports', description: 'Reports and exports.' },
  { key: 'orders.view', group: 'Orders & money', name: 'See orders', description: 'Order list and details, including addresses.' },
  { key: 'orders.manage', group: 'Orders & money', name: 'Work on orders', description: 'Change an order’s status, tracking and notes.' },
  { key: 'payments.refund', group: 'Orders & money', name: 'Record refunds', description: 'Mark money as returned to a customer.' },
  { key: 'coupons.manage', group: 'Orders & money', name: 'Promo codes', description: 'See, create, change and switch off promo codes.' },
  { key: 'products.view', group: 'Products', name: 'See products', description: 'Products, categories and box items.' },
  { key: 'products.create', group: 'Products', name: 'Add products', description: 'Add products and upload pictures.' },
  { key: 'products.edit', group: 'Products', name: 'Edit products', description: 'Prices, stock, descriptions, categories, tags.' },
  { key: 'products.delete', group: 'Products', name: 'Delete products', description: 'Remove products and categories.' },
  { key: 'sellers.view', group: 'Products', name: 'See sellers', description: 'Sellers, their contacts, and what each seller charges us and our margin.' },
  { key: 'sellers.manage', group: 'Products', name: 'Manage sellers', description: 'Add, edit and switch off sellers.' },
  { key: 'sellers.payouts', group: 'Products', name: 'Seller payouts', description: 'See what we owe each seller and record payouts.' },
  { key: 'subscriptions.view', group: 'Subscriptions & boxes', name: 'See subscriptions', description: 'Plans, subscribers, monthly boxes, box campaigns.' },
  { key: 'subscriptions.manage', group: 'Subscriptions & boxes', name: 'Manage subscriptions', description: 'Cancel or resume plans, edit plans, pack and send monthly boxes.' },
  { key: 'users.view', group: 'Customers', name: 'See customers', description: 'Customer list, details and referrals.' },
  { key: 'users.block', group: 'Customers', name: 'Block customers', description: 'Block or unblock a customer’s account.' },
  { key: 'crm.view', group: 'CRM', name: 'See CRM', description: 'Customers’ dogs with photos, plans, birthdays and marketing consent.' },
  { key: 'crm.export', group: 'CRM', name: 'Export CRM lists', description: 'Download dog and owner lists (with contact details) for campaigns.' },
  { key: 'crm.message', group: 'CRM', name: 'Send messages', description: 'Send messages to customers’ notification bell and, where allowed, their phone or browser.' },
  { key: 'crm.manage', group: 'CRM', name: 'Manage notification consent', description: 'Switch a customer’s email/SMS offers off when they ask.' },
  { key: 'cms.view', group: 'Site content', name: 'See site content', description: 'Pages, blog, FAQ, popups and translations.' },
  { key: 'cms.edit', group: 'Site content', name: 'Edit site content', description: 'Change and publish pages, blog, FAQ, popups, translations and shop settings.' },
  { key: 'admin.manage', group: 'Team', name: 'Manage the team', description: 'Add or remove admins, edit roles, see the audit log.' },
];

export const PERMISSION_KEYS = PERMISSION_CATALOGUE.map((p) => p.key);

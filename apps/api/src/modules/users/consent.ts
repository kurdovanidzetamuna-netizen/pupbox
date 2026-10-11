/**
 * Marketing consent per channel. Returns the fields to save when a customer
 * (or the team, on their request) switches email and/or SMS offers, with a
 * timestamp per change and the overall flag kept in step.
 */
export function consentUpdate(
  current: { marketingEmail: boolean; marketingSms: boolean },
  change: { email?: boolean; sms?: boolean },
  now = new Date(),
) {
  const email = change.email ?? current.marketingEmail;
  const sms = change.sms ?? current.marketingSms;
  const any = email || sms;
  return {
    ...(change.email !== undefined && change.email !== current.marketingEmail ? { marketingEmail: email, marketingEmailAt: now } : {}),
    ...(change.sms !== undefined && change.sms !== current.marketingSms ? { marketingSms: sms, marketingSmsAt: now } : {}),
    marketingConsent: any,
    ...(any !== (current.marketingEmail || current.marketingSms) ? { marketingConsentAt: any ? now : null } : {}),
  };
}

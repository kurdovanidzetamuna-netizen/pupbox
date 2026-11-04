import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import type { AuthProvider } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { maskKey } from '../sms/sms-settings';

/**
 * Sign in with Google or Facebook. The site opens the provider's own window,
 * which hands it a short-lived access token; the server never trusts what the
 * browser says about the person, it asks Google / Facebook directly:
 * - Google: the token must have been issued to our client id (tokeninfo),
 *   then the profile comes from userinfo.
 * - Facebook: the token must belong to our app (debug_token, checked with the
 *   app secret), then the profile comes from /me.
 *
 * The keys live in their own private CMS row (`config-social`), edited in
 * admin → Settings; values in the server's .env are the fallback. The app
 * secret only ever goes back masked.
 */
export const SOCIAL_SLUG = 'config-social';

export interface SocialConfig {
  google: { enabled: boolean; clientId: string };
  facebook: { enabled: boolean; appId: string; appSecret: string };
}

/** What we learn about the person from Google / Facebook. */
export interface SocialProfile {
  provider: AuthProvider;
  /** Their id at the provider: never changes, unlike their email. */
  id: string;
  email: string | null;
  /** The provider confirmed they own this email. */
  emailVerified: boolean;
  firstName: string;
  lastName: string;
}

const str = (v: unknown, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function socialConfig(prisma: PrismaService): Promise<SocialConfig> {
  const row = await prisma.cMSPage.findUnique({ where: { slug: SOCIAL_SLUG }, select: { content: true } });
  const c = (row?.content ?? {}) as any;
  return {
    google: { enabled: c.google?.enabled !== false, clientId: str(c.google?.clientId) || str(process.env.GOOGLE_CLIENT_ID) },
    facebook: {
      enabled: c.facebook?.enabled !== false,
      appId: str(c.facebook?.appId) || str(process.env.FACEBOOK_APP_ID),
      appSecret: str(c.facebook?.appSecret) || str(process.env.FACEBOOK_APP_SECRET),
    },
  };
}

/** For the site: which buttons to show, with the public ids their scripts need. */
export async function publicProviders(prisma: PrismaService) {
  const c = await socialConfig(prisma);
  return {
    google: c.google.enabled && c.google.clientId ? { clientId: c.google.clientId } : null,
    facebook: c.facebook.enabled && c.facebook.appId && c.facebook.appSecret ? { appId: c.facebook.appId } : null,
  };
}

/** For admin → Settings: the same, with the secret masked and whether each one is ready. */
export async function adminSocialConfig(prisma: PrismaService) {
  const c = await socialConfig(prisma);
  return {
    google: { ...c.google, ready: !!c.google.clientId },
    facebook: { enabled: c.facebook.enabled, appId: c.facebook.appId, appSecret: maskKey(c.facebook.appSecret), ready: !!(c.facebook.appId && c.facebook.appSecret) },
  };
}

export async function saveSocialConfig(prisma: PrismaService, input: any) {
  const current = await socialConfig(prisma);
  const secretIn = input?.facebook?.appSecret;
  // The secret comes back masked; only a new one (or "" to remove it) replaces it.
  const appSecret = secretIn === undefined || secretIn === maskKey(current.facebook.appSecret) ? current.facebook.appSecret : str(secretIn);
  const clientId = str(input?.google?.clientId ?? current.google.clientId);
  const appId = str(input?.facebook?.appId ?? current.facebook.appId);
  if (clientId && !/^[\w.-]+\.apps\.googleusercontent\.com$/.test(clientId)) throw new BadRequestException('The Google client ID ends in ".apps.googleusercontent.com".');
  if (appId && !/^\d{5,20}$/.test(appId)) throw new BadRequestException('The Facebook app ID is digits only.');
  const content = {
    google: { enabled: input?.google?.enabled ?? current.google.enabled, clientId },
    facebook: { enabled: input?.facebook?.enabled ?? current.facebook.enabled, appId, appSecret },
  };
  await prisma.cMSPage.upsert({
    where: { slug: SOCIAL_SLUG },
    create: { key: SOCIAL_SLUG, slug: SOCIAL_SLUG, title: 'Social sign-in', status: 'DRAFT', content },
    update: { content },
  });
  return adminSocialConfig(prisma);
}

async function getJson(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, body: body as any };
}

const refused = () => new UnauthorizedException('That sign-in didn’t work. Please try again.');

/**
 * Tests only (NODE_ENV=test): a token "test:{…profile…}" stands for what
 * Google / Facebook would answer, so sign-in can be tested without them.
 * `aud` says which app the token was made for, as the real check does.
 */
function testProfile(provider: AuthProvider, token: string, expectAud: string): SocialProfile | null {
  if (process.env.NODE_ENV !== 'test' || !token.startsWith('test:')) return null;
  const p = JSON.parse(token.slice(5));
  if (p.aud !== expectAud) throw refused();
  return { provider, id: String(p.id), email: p.email ?? null, emailVerified: p.emailVerified !== false && !!p.email, firstName: p.firstName ?? '', lastName: p.lastName ?? '' };
}

export async function verifyGoogle(accessToken: string, clientId: string): Promise<SocialProfile> {
  const t = testProfile('GOOGLE', accessToken, clientId);
  if (t) return t;
  const info = await getJson(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`);
  // A token made for someone else's app must not sign anyone in here.
  if (!info.ok || (info.body.aud !== clientId && info.body.azp !== clientId) || Number(info.body.expires_in) <= 0) throw refused();
  const me = await getJson('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!me.ok || !me.body.sub) throw refused();
  return {
    provider: 'GOOGLE', id: String(me.body.sub), email: me.body.email ? String(me.body.email).toLowerCase() : null,
    emailVerified: me.body.email_verified === true || me.body.email_verified === 'true',
    firstName: str(me.body.given_name, 60) || str(me.body.name, 60), lastName: str(me.body.family_name, 60),
  };
}

export async function verifyFacebook(accessToken: string, appId: string, appSecret: string): Promise<SocialProfile> {
  const t = testProfile('FACEBOOK', accessToken, appId);
  if (t) return t;
  const check = await getJson(`https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(`${appId}|${appSecret}`)}`);
  if (!check.ok || !check.body.data?.is_valid || String(check.body.data.app_id) !== appId) throw refused();
  const me = await getJson(`https://graph.facebook.com/v19.0/me?fields=id,first_name,last_name,email&access_token=${encodeURIComponent(accessToken)}`);
  if (!me.ok || !me.body.id) throw refused();
  return {
    // Facebook only shares an email the person has confirmed with them.
    provider: 'FACEBOOK', id: String(me.body.id), email: me.body.email ? String(me.body.email).toLowerCase() : null, emailVerified: !!me.body.email,
    firstName: str(me.body.first_name, 60), lastName: str(me.body.last_name, 60),
  };
}

/**
 * Facebook's "data deletion callback": when someone removes PupBox from their
 * Facebook settings (or asks Facebook to delete what apps got), Facebook
 * posts a request signed with our app secret. We check the signature, then
 * forget what Facebook gave us: the link to their Facebook account and the
 * email it shared. Their PupBox account and orders stay (they can still sign
 * in with a password, or set one with "Forgot password"). Facebook wants a
 * page where they can see it was done, and a code to quote.
 */
export async function facebookDataDeletion(prisma: PrismaService, signedRequest: unknown) {
  const cfg = await socialConfig(prisma);
  const [sig, payload] = String(signedRequest ?? '').split('.');
  if (!sig || !payload || !cfg.facebook.appSecret) throw new BadRequestException('Bad request');
  const expected = crypto.createHmac('sha256', cfg.facebook.appSecret).update(payload).digest();
  const given = Buffer.from(sig.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) throw new BadRequestException('Bad request');
  const data = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  if (data.algorithm && String(data.algorithm).toUpperCase() !== 'HMAC-SHA256') throw new BadRequestException('Bad request');
  const userId = String(data.user_id ?? '');
  if (userId) await prisma.userIdentity.deleteMany({ where: { provider: 'FACEBOOK', providerUserId: userId } });
  const code = `FBDEL-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://pupbox.ge';
  return { url: `${site}/pages/privacy?deletion=${code}`, confirmation_code: code };
}

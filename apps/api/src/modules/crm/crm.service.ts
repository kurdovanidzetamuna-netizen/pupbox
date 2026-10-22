import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface DogFilters {
  search?: string;
  size?: string;
  breed?: string;
  allergy?: string;
  /** "active": on a running plan · "none": never had one · "ended": had one, not now. */
  plan?: 'active' | 'none' | 'ended';
  /** Owner agreed to marketing. */
  consent?: boolean;
  /** Birthday within this many days from today. */
  birthdayWithin?: number;
  hasPhoto?: boolean;
}

const RUNNING = ['ACTIVE', 'PAUSED'] as const;
const DAY = 86400_000;

/** Days from today until the dog's next birthday (0 = today). */
function daysToBirthday(birthday: Date | null, now = new Date()): number | null {
  if (!birthday) return null;
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  let next = new Date(Date.UTC(today.getUTCFullYear(), birthday.getUTCMonth(), birthday.getUTCDate()));
  if (next < today) next = new Date(Date.UTC(today.getUTCFullYear() + 1, birthday.getUTCMonth(), birthday.getUTCDate()));
  return Math.round((next.getTime() - today.getTime()) / DAY);
}

function ageYears(birthday: Date | null, now = new Date()): number | null {
  if (!birthday) return null;
  return Math.max(0, Math.floor((now.getTime() - birthday.getTime()) / (365.25 * DAY) * 10) / 10);
}

/**
 * Customers' dogs for retention and CRM: who they are, whether they're on a
 * plan, when their birthday is, and whether the owner agreed to marketing.
 * Gift dogs are included (their owner is the buyer) and marked as such.
 */
@Injectable()
export class CrmService {
  constructor(private prisma: PrismaService) {}

  private async rows(f: DogFilters) {
    const where: Prisma.DogWhereInput = {
      deletedAt: null,
      user: { deletedAt: null, ...(f.consent !== undefined ? { marketingConsent: f.consent } : {}) },
      ...(f.size ? { size: f.size as any } : {}),
      ...(f.breed ? { breed: { contains: f.breed, mode: 'insensitive' } } : {}),
      ...(f.allergy ? { allergies: { has: f.allergy } } : {}),
      ...(f.hasPhoto !== undefined ? { photoUrl: f.hasPhoto ? { not: null } : null } : {}),
      ...(f.plan === 'active' ? { subscriptions: { some: { status: { in: [...RUNNING] } } } } : {}),
      ...(f.plan === 'none' ? { subscriptions: { none: {} } } : {}),
      ...(f.plan === 'ended' ? { subscriptions: { some: {}, none: { status: { in: [...RUNNING, 'PENDING'] } } } } : {}),
      ...(f.search ? {
        OR: [
          { name: { contains: f.search, mode: 'insensitive' } },
          { user: { email: { contains: f.search, mode: 'insensitive' } } },
          { user: { firstName: { contains: f.search, mode: 'insensitive' } } },
          { user: { lastName: { contains: f.search, mode: 'insensitive' } } },
          { user: { phone: { contains: f.search } } },
        ],
      } : {}),
    };
    const dogs = await this.prisma.dog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, breed: true, size: true, gender: true, birthday: true, weightKg: true, allergies: true,
        foodPreferences: true, toyPreferences: true, chewingStrength: true, likedCategoryIds: true, specialNotes: true, photoUrl: true, forGift: true, createdAt: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, language: true, marketingConsent: true, createdAt: true } },
        subscriptions: { orderBy: { createdAt: 'desc' }, select: { status: true, endDate: true, cancelledAt: true, plan: { select: { name: true } } } },
      },
    });
    const now = new Date();
    return dogs
      .map((d) => {
        const running = d.subscriptions.find((s) => (RUNNING as readonly string[]).includes(s.status));
        const last = d.subscriptions[0];
        return {
          ...d,
          ageYears: ageYears(d.birthday, now),
          daysToBirthday: daysToBirthday(d.birthday, now),
          planStatus: running ? 'active' : last ? 'ended' : 'none',
          planName: (running ?? last)?.plan.name ?? null,
          planEnds: running?.endDate ?? null,
          leaving: !!running?.cancelledAt,
        };
      })
      .filter((d) => f.birthdayWithin === undefined || (d.daysToBirthday !== null && d.daysToBirthday <= f.birthdayWithin));
  }

  async list(f: DogFilters, page = 1, limit = 50) {
    const all = await this.rows(f);
    page = Math.max(1, page); limit = Math.min(200, Math.max(1, limit));
    return { items: all.slice((page - 1) * limit, page * limit), total: all.length, page, limit };
  }

  /** The numbers at the top of the CRM page. */
  async summary() {
    const all = await this.rows({});
    const count = (fn: (d: (typeof all)[number]) => boolean) => all.filter(fn).length;
    return {
      dogs: all.length,
      onPlan: count((d) => d.planStatus === 'active'),
      neverSubscribed: count((d) => d.planStatus === 'none'),
      lapsed: count((d) => d.planStatus === 'ended'),
      leavingThisMonth: count((d) => d.leaving),
      birthdaysNext30: count((d) => d.daysToBirthday !== null && d.daysToBirthday <= 30),
      withPhoto: count((d) => !!d.photoUrl),
      ownersWithConsent: new Set(all.filter((d) => d.user.marketingConsent).map((d) => d.user.id)).size,
      owners: new Set(all.map((d) => d.user.id)).size,
      bySize: Object.fromEntries(['EXTRA_SMALL', 'SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE', 'UNKNOWN'].map((s) => [s, count((d) => (d.size ?? 'UNKNOWN') === s)])),
      topBreeds: Object.entries(all.reduce<Record<string, number>>((m, d) => {
        const b = d.breed?.trim();
        if (b) m[b] = (m[b] ?? 0) + 1;
        return m;
      }, {})).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([breed, n]) => ({ breed, n })),
    };
  }

  /** CSV for a campaign tool. Opens correctly in Excel (UTF-8 marker, formula-safe). */
  async exportCsv(f: DogFilters) {
    const all = await this.rows(f);
    const head = ['dog', 'breed', 'size', 'gender', 'birthday', 'age_years', 'days_to_birthday', 'allergies', 'photo', 'gift_dog', 'plan_status', 'plan', 'plan_ends',
      'owner_first_name', 'owner_last_name', 'owner_email', 'owner_phone', 'owner_language', 'marketing_consent'];
    const cell = (v: unknown) => {
      let s = v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? '');
      // A phone number like +995… is safe as it is; campaign tools need the +.
      if (/^[=+\-@\t\r]/.test(s) && !/^\+\d{6,15}$/.test(s)) s = `'${s}`;
      s = s.replace(/"/g, '""');
      return /[",\n\r]/.test(s) ? `"${s}"` : s;
    };
    const lines = all.map((d) => [
      d.name, d.breed, d.size, d.gender, d.birthday, d.ageYears, d.daysToBirthday, d.allergies.join('; '), d.photoUrl ? 'yes' : 'no', d.forGift ? 'yes' : 'no',
      d.planStatus, d.planName, d.planEnds, d.user.firstName, d.user.lastName, d.user.email, d.user.phone, d.user.language, d.user.marketingConsent ? 'yes' : 'no',
    ].map(cell).join(','));
    return '﻿' + [head.join(','), ...lines].join('\r\n');
  }
}

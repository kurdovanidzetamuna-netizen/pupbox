/**
 * What the API sends back, for the site and admin: one description of the
 * shop's data instead of `any`. Money comes as text ("12.50": the database
 * keeps exact amounts) or a number, so read it with Number(). Dates come as
 * ISO text.
 *
 * The API's own tests (apps/api/test/contracts.test.ts) check these against
 * what the server really returns, so a field renamed on the server fails
 * there before it can break a page.
 */

export type Money = string | number;
export type When = string;

export type OrderStatus = 'PENDING' | 'PAID' | 'PROCESSING' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED' | 'FAILED';
export type OrderType = 'SUBSCRIPTION' | 'PRODUCT' | 'MIXED' | 'RENEWAL' | 'FREE_REWARD';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
export type DogSize = 'EXTRA_SMALL' | 'SMALL' | 'MEDIUM' | 'LARGE' | 'EXTRA_LARGE';
export type DurationUnit = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

/** Georgian (and other) wording an admin entered next to the English. */
export type Translations = Record<string, Record<string, unknown>> | null;

/** Engraving and size a customer chose. */
export type Personalisation = { engraving?: string; size?: string } | null;

export interface ImageRef { url: string; alt?: string | null }
export interface CategoryRef { slug: string; name: string }

/** A product as an order or basket line shows it. */
export interface LineProduct {
  id: string;
  name: string;
  slug: string;
  sku?: string | null;
  price: Money;
  salePrice: Money | null;
  translations?: unknown;
  images?: ImageRef[];
  category?: CategoryRef | null;
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  price: Money;
  durationValue: number;
  durationUnit: DurationUnit;
  boxCount: number;
  deliveryIncluded: boolean;
  autoRenewal: boolean;
  giftable: boolean;
  translations?: unknown;
}

export interface Address {
  id: string;
  label: string | null;
  isGift: boolean;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  addressLine1: string;
  addressLine2: string | null;
  postalCode?: string | null;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
}

export interface Dog {
  id: string;
  name: string;
  size: DogSize | null;
  breed: string | null;
  gender: 'MALE' | 'FEMALE' | null;
  birthday: When | null;
  weightKg: Money | null;
  allergies: string[];
  specialNotes: string | null;
  photoUrl: string | null;
}

export interface DeliveryMethod {
  id: string;
  name: string;
  description: string | null;
  price: Money;
  freeThreshold: Money | null;
  estimatedDays: string | null;
  translations: unknown;
  isActive: boolean;
  sortOrder: number;
}

/** A delivery option as checkout offers it: priced for this basket. */
export interface DeliveryOption extends DeliveryMethod {
  effectivePrice: number;
  couponOff: number;
  discount: number;
  total: number;
  isFree: boolean;
  includedWithPlan: boolean;
  upgradeFromPlan: boolean;
}

export interface Refund {
  id: string;
  amount: Money;
  reason: string | null;
  method: string;
  items: unknown;
  createdAt: When;
}

export interface Payment {
  id: string;
  status: PaymentStatus;
  provider: string;
  providerPaymentId: string | null;
  amount: Money;
  paidAt: When | null;
  failReason: string | null;
  cardBrand: string | null;
  cardMask: string | null;
  method: string | null;
  attempt: number | null;
  createdAt: When;
  refunds?: Refund[];
}

export interface OrderItem {
  id: string;
  productId: string | null;
  subscriptionPlanId: string | null;
  customBoxId: string | null;
  name: string;
  sku: string | null;
  price: Money;
  quantity: number;
  total: Money;
  personalisation: unknown;
  payoutId: string | null;
  product?: LineProduct | null;
  subscriptionPlan?: (Partial<Plan> & { name: string; tierId?: string | null; tier?: { name: string; emoji: string | null; itemCount: number | null; tagline?: string | null } | null }) | null;
}

/** An order, as the customer and admin both see it. */
export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  dogId: string | null;
  subscriptionId: string | null;
  addressId: string | null;
  deliveryMethodId: string | null;
  couponId: string | null;
  type: OrderType;
  status: OrderStatus;
  subtotal: Money;
  deliveryCost: Money;
  discountAmount: Money;
  referralCode: string | null;
  referralDiscount: Money | null;
  total: Money;
  trackingNumber: string | null;
  refundDueAmount: Money | null;
  parentOrderId: string | null;
  isGift: boolean;
  giftRecipientName: string | null;
  giftRecipientEmail: string | null;
  giftMessage: string | null;
  giftDeliverOn: When | null;
  /** Where the buyer came from (ad click, campaign tags), saved at checkout. */
  tracking?: unknown;
  shippedAt: When | null;
  deliveredAt: When | null;
  createdAt: When;
  items: OrderItem[];
  payments: Payment[];
  address?: Address | null;
  deliveryMethod?: DeliveryMethod | null;
}

/** An order in admin: what may happen next, and whether money is owed back. */
export interface AdminOrder extends Order {
  internalNotes: string | null;
  chargeAttempts: number;
  nextChargeAt: When | null;
  lastChargeError: string | null;
  allowedNext: OrderStatus[];
  refundDue: boolean;
  refundDueValue: number;
}

/** A basket line: a product, a plan, or a box the customer built. */
export interface CartItem {
  id: string;
  productId: string | null;
  subscriptionPlanId: string | null;
  customBoxId: string | null;
  price: Money;
  quantity: number;
  personalisation: unknown;
  product?: (LineProduct & { status?: string; personalisation?: unknown; inventory?: { quantity: number; reservedQty: number } | null }) | null;
  subscriptionPlan?: Plan | null;
  /** A box the customer built: what's in it. */
  customBox?: { monthly: boolean; mysteryCount: number; items: { productId: string; quantity: number; product: LineProduct }[] } | null;
}

export interface Cart {
  id: string;
  userId: string | null;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  total: number;
  itemCount: number;
  hasSubscription: boolean;
  deliveryIncluded: boolean;
  couponId: string | null;
  referralCode: string | null;
  /** A friend's code on the basket: who invited, what it takes off, and the offer's terms. */
  referral: { code: string; inviterName: string; discount: number; offer: { type: 'PERCENTAGE' | 'FIXED'; value: number; minOrder: number } } | null;
  /** Why the promo code takes nothing off (under its minimum, gift-only, nothing it covers). */
  couponIssue: { reason: 'MIN'; short: number } | { reason: 'GIFT' | 'NONE' } | null;
  coupon: Coupon | null;
  pricesUpdated?: boolean;
}

/** A box the customer built, as an order line shows it. */
export interface BuiltBox {
  monthly: boolean;
  mysteryCount: number;
  items: { quantity: number; product: { name: string; images: { url: string }[] } }[];
}

export interface Shipment {
  id: string;
  year: number;
  month: number;
  status: string;
  boxNumber: number;
  campaign: { name: string; products: { quantity: number; product: { name: string } }[] } | null;
}

/** A promo code as an order carries it. */
export interface Coupon {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: Money;
  scopes: string[];
  minOrderAmount: Money | null;
  maxDiscount: Money | null;
  minPlanMonths: number | null;
  boxTierIds: string[];
  firstOrderOnly: boolean;
}

/** A row of the admin order list. */
export interface AdminOrderRow extends AdminOrder {
  user: { id: string; email: string; firstName: string; lastName: string; phone: string | null };
  dog: Dog | null;
  coupon: Coupon | null;
  subscription: { id: string; status: string; plan: { name: string } } | null;
}

/** One order in full, as the admin order panel shows it. */
export interface AdminOrderDetail extends AdminOrder {
  user: {
    id: string; email: string; firstName: string; lastName: string; phone: string | null; createdAt: When;
    language: string; emailVerified: boolean; phoneVerified: boolean; marketingEmail: boolean; marketingSms: boolean;
    dogs: Dog[]; addresses: Address[];
  };
  dog: Dog | null;
  coupon: Coupon | null;
  subscription: { id: string; status: string; addressId: string | null; plan: { name: string }; shipments: Shipment[] } | null;
  items: (OrderItem & { customBox?: BuiltBox | null; subscriptionPlan?: (Plan & { tierId: string | null; tier: { name: string; emoji: string | null; itemCount: number | null; tagline?: string | null } | null }) | null })[];
  extraCharges: { id: string; orderNumber: string; status: OrderStatus; total: Money; createdAt: When; items: { name: string; quantity: number }[] }[];
  parentOrder: { id: string; orderNumber: string; status: OrderStatus } | null;
  customerStats: { orders: number; totalPaid: number; since: When };
}

/** What the site saved at checkout about where the buyer came from (Order.tracking). */
export interface OrderTracking {
  consent?: 'all' | 'needed';
  fbp?: string; fbc?: string; gclid?: string; ttclid?: string;
  utm?: { source?: string; medium?: string; campaign?: string; content?: string; term?: string };
  landing?: string; referrer?: string;
}

/** An order in the customer's own list: what they're owed back, and its plan. */
export interface CustomerOrder extends Order {
  refund: { owed: number; refunded: number; refundedAt: When | null } | null;
  subscription: { id: string; status: string; cancelledAt: When | null } | null;
}

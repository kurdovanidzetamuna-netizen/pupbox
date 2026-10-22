# Box tiers, product quality and finance — task list

21 Oct 2026. Based on *Georgia Pet Retail & Product Quality Landscape* and *Market research* (20 Oct 2026) and the current code on `fix/launch-critical`.

Sizes: **S** ≈ under a day, **M** ≈ 1–3 days, **L** ≈ 3–5 days.

---

## 1. Decisions (recommended)

| # | Decision | Why |
|---|----------|-----|
| 1 | **Three box tiers: Mini, Standard, Premium.** Use "Mini" for the cheap tier, not "Cheap" or "Basic". Mini means fewer items (5), not a box only for small dogs, so any dog can have it. | Customers choose by budget. One tier would leave out both price-sensitive and premium buyers. |
| 2 | **One plan = one tier + one length**, giving 9 plan rows (3 tiers × 1/3/6 months), each linked to its tier. | Checkout, renewals, gifts, coupons and reports already work with plans, so none of that needs rewriting. |
| 3 | **One monthly box per tier per month** (3 a month). Size-specific items, such as small or large dental chews, are lines inside that box. Today there is one box per dog size; that would become 3 tiers × 5 sizes = 15 boxes a month, which is too much work to manage. | Easier to run: 3 boxes to plan each month instead of 15. |
| 4 | **Quality details live on the Brand** (tier, country, why we chose it). **The product stores only its own facts** (first ingredient, meat %, toy durability…). Every fact gets a source link and a "checked on" date. | Most quality facts are about the brand. Dates and sources make the information trustworthy and easy to keep up to date. |
| 5 | **Show "worth X ₾ in shops" only when calculated from real shop prices we recorded**, each with its source and date. | A made-up value claim can mislead customers and break consumer law. It is not the same as the temporary test reviews on the homepage. |
| 6 | **Suppliers (importers we buy from) get their own list, separate from Sellers** (businesses we sell for and pay out to). | They involve different money: for suppliers we track buying prices, for sellers we track payouts. |

Proposed prices (₾ per month, incl. VAT), to adjust once supplier prices are known:

| Tier | Items | Product budget | 1 mo | 3 mo | 6 mo |
|------|-------|----------------|------|------|------|
| Mini | 5 | 28–30 | 79 | 72 | 69 |
| Standard | 6–7 | 38–42 | 99 | 89 | 82 |
| Premium | 7 | 55–60 | 149 | 139 | 129 |

---

## 2. Business tasks (before or alongside the build)

- **B-1** Accountant: VAT-registered or small-business status? This sets the VAT settings (F-6) and every margin number.
- **B-2** Flitt: confirm recurring card charges on a fixed day each month, and how retries work.
- **B-3** Suppliers: get wholesale price lists, minimum orders and exclusivity, and ask about any link to Zoomart. The answers go into A-6.
- **B-4** Trademark check for the name "PupBox".
- **B-5** Record shop prices for every box item (source and date). These feed the value claim (decision 5).

---

## 3. Foundation: database and API (needed by admin and the site)

**F-1 Box tiers (M).** New `BoxTier` model: name, slug, translations, item count, product budget, sort order, active flag, short description. Add `SubscriptionPlan.tierId`, left empty for the custom-box plan and old test plans. A migration seeds Mini, Standard and Premium.
*Done when:* every new plan can be linked to a tier, and the public plans API returns plans grouped by tier.

**F-2 A box per tier (M).** Add `BoxCampaign.tierId`. On `BoxCampaignProduct`, add `dogSizes[]` (empty = every size) and `role` (MANDATORY_DAILY, DAILY, ROTATING, SURPRISE, EXTRA). A shipment finds its contents through subscription → plan → tier → that month's box, then keeps only the lines that match the dog's size. Existing boxes set by size keep working.
*Done when:* one Standard box sends small chews to a small dog and large chews to a large dog.

**F-3 Brands (M).** New `Brand` model: name, slug, logo, brand country, made in, quality tier, "why we chose it" (ka/en), official importer (a supplier), website, source link, checked date, active flag. Add `Product.brandId`. A backfill links products by matching the current `brand` text, and that text field is kept until the backfill is checked.

**F-4 Product quality fields (M).**
- `kind`: DRY_FOOD, WET_FOOD, TREAT, DENTAL_CHEW, NATURAL_CHEW, TOY, ACCESSORY, HYGIENE, HEALTH. Box rules depend on it, so it can't be a free-text category.
- `qualityTier`: HOLISTIC, SUPER_PREMIUM, PREMIUM, MID, ECONOMY or VET_DIET. If empty, the brand's tier applies.
- Food and treats: first ingredient, meat %, standard (FEDIAF / AAFCO / none), grain type (with grain / grain-free / ancestral grains), no artificial colours or preservatives (yes/no).
- Toys: material, durability 1–5, chewing strengths it suits, guarantee, safety notes (e.g. BPA-free).
- All products: made in, source link, checked date.

**F-5 Suppliers and product cost (M).** New `Supplier` model: contacts, brands, address, website, minimum order, payment terms, exclusivity, Zoomart link (yes / no / unknown), notes. New `ProductCost`: buying price without VAT, supplier, shop reference price, where that price was seen, and the date. Seller products keep using `ProductSupply`.

**F-6 Finance settings (S).** VAT rate (18), VAT-registered (yes/no), packaging cost per box, card fee %, and what delivery costs us per zone (`DeliveryZone.ourCost`, separate from the price the customer pays).

**F-7 Cost snapshots (M).** When a box is packed, `BoxShipment` saves its product cost, packaging, delivery, card fee and revenue without VAT. `OrderItem` saves the cost price for shop orders. Later price changes then don't rewrite past margins.

**F-8 Chewing strength as fixed values (S).** `Dog.chewingStrength` is free text today. Change it to GENTLE, AVERAGE or POWER and move existing values across. Admin then warns when a toy doesn't suit the dog's chewing strength, the same way it already warns about allergies.

**F-9 Add-ons (L, phase 4).** Add `Product.isAddon` and a new `SubscriptionAddon` model (subscription, product, quantity, every month or once). Add-ons are added to the renewal total and to the packing list.

---

## 4. Admin panel tasks

**A-1 Box tiers page (S, needs F-1).** Create, edit and turn off tiers: item count, product budget, ka/en texts, order.

**A-2 Plans by tier (M, needs F-1).**
- A "Box type" dropdown in the plan's Settings tab: each plan belongs to exactly one tier.
- A third view next to Cards and List: a table with tiers as rows and 1/3/6 months as columns, each cell showing the price, monthly price and discount. An empty cell offers "+ Add" with the tier and length already filled in.
- The Box Builder tab shows the tier's contents and cost instead of separate contents for each plan, so the same box isn't filled in 9 times. It must compare against buying prices (F-5), not shop prices.

**A-2b Customer subscriptions by tier (S, needs F-1).** A tier badge on each row, a tier filter, the tier in the detail panel, and subscriber counts per tier in the stats.

**A-3 Monthly box builder by tier (L, needs F-2, F-5).**
- Choose a tier for each box. Each line gets a role and optional sizes.
- **Budget bar:** product cost against the tier budget, red when over.
- **Value ratio:** shop value ÷ box price, with a target of 1.3–1.4×.
- A check that the required daily items (dental chews, poop bags) are in the box for every size.
- Allergy and chewing-strength warnings for each subscriber.
- "Copy last month".

**A-4 Brands page (M, needs F-3).** A list and edit form with quality tier, why we chose it, importer, made in, source link and checked date. A filter shows brands not checked in the last 6 months.

**A-5 Product editor: Quality and Cost tabs (M, needs F-4, F-5).**
- The Quality tab shows only the fields that fit the product's kind.
- The Cost tab has buying price, supplier and shop reference price (with source and date).
- A live margin preview (price without VAT − cost), with a warning below 35%, or below 15% for add-ons.

**A-6 Suppliers page (M, needs F-5).** Contacts, brands, terms, a checklist for the 4 supplier questions (exclusivity, Zoomart, price list, samples), and price-list files attached.

**A-7 Finance settings (S, needs F-6).** A new section in Settings.

**A-8 Finance report (L, needs F-6, F-7).** A new tab in Reports.
- By month, tier and plan: revenue incl. VAT, VAT, revenue without VAT, product cost, packaging and delivery, fees, gross profit and margin %.
- Refunds, and seller payouts still owed.
- **VAT threshold tracker:** sales over the last 12 months against 100,000 ₾, with a warning at 80%.
- CSV export for the accountant.

**A-9 Price-check list (S, needs F-5).** Products whose shop reference price is more than 60 days old, sorted by how often they go in boxes.

**A-10 Packing list (S, needs F-2).** Each box shows the lines for its dog's size, plus add-ons once F-9 exists.

**A-11 Finance permission (S).** Buying prices, margins and finance reports are visible only with `finance.view`.

**A-12 Batch and expiry on stock (L, phase 4).** Record batch and expiry date when stock comes in, and warn before packing anything that expires within 60 days.

---

## 4b. Referrals in admin

**What exists today:** customers get a referral code. When a friend's first paid order is past the free-cancellation window, the inviter automatically gets a single-use **₾10 coupon** (`REF-…`). It is sent by notification and email. Admin has a Referrals page with a list and 3 stat cards.

**What's wrong or missing:**

**R-1 Fix the admin Referrals page (S, bug, no dependencies).** The page reads fields the API doesn't send (`referrer`, `referred`, `rewardGiven`, `subscriptionCreated`, `code`). The API actually sends `inviter`, `invited`, `status`, `rewardValue` and `rewardedAt`. As a result, names are blank, "Converted" is always 0 and the Reward column never shows a reward. The stat cards also count only the 20 rows on the current page. Fix: use the real fields and show the status (Invited / Registered / First order / Reward given / Cancelled).

**R-2 Referral numbers across all data (M).** A stats endpoint and cards that count every referral, not just one page:
- invited, registered, first order completed, rewards given
- conversion % at each step
- ₾ of rewards given, ₾ used, ₾ still unused
- revenue from referred customers (their paid orders)
- top 10 inviters

**R-3 Link each reward coupon to its referral (M).** Add `Referral.couponId`; today the coupon can only be found through its description text. Show the coupon code, whether it was used, on which order and on what date.

**R-4 Reward settings (S).**
- Reward amount, coupon validity in days and minimum order go into Settings. The ₾10 is currently written into the code, and the site text should read the same setting.
- The plan builder's "referral discount %" is saved but nothing ever uses it. Either make it work or remove it.

**R-5 Referral detail panel (M, needs R-3).**
- A timeline: invited → registered → first order (link to the order) → reward → coupon used.
- All referrals made by the same inviter.
- Admin actions with a reason, recorded in the audit log: **give the reward by hand**, or **cancel the referral** (e.g. fraud).

**R-6 Filters, search and export (S).** Filter by status and date, search by inviter or friend, and export to CSV.

**R-7 Fraud flags (M).** Flag a referral for review instead of rewarding it automatically when:
- the friend has the same phone, address or card as the inviter, or
- one code brings many sign-ups in a short time.

**R-8 Referral costs in the finance report (S, needs A-8).** Count rewards actually used (₾) as a marketing cost for each month.

---

## 5. Website tasks (ka first, then en; ru later)

**W-1 Prices page by tier (L, needs F-1).** Mini, Standard and Premium cards side by side, with a 1/3/6-month switch. Each card shows the monthly price, the total, the saving and "incl. 18% VAT". It also shows "worth ~X ₾ in shops", only when that comes from real data (decision 5). Add a "what's in each tier" comparison.

**W-2 Subscribe flow with a tier step (L, needs F-1, F-8).** Dog profile → tier → length → (add-ons, phase 4) → delivery → payment. Suggest a tier from the dog's profile, e.g. Premium for a power chewer. The gift flow keeps working.
*Note:* checkout and `PlansList` are being edited in another session right now. Start this after that branch is merged.

**W-3 Homepage value message (S, needs W-1).** A short teaser of the three tiers and the shop-value line.

**W-4 What's inside page (M, needs F-2, F-3).** This month's items for each tier, with brand and quality badge, and an archive of past boxes.

**W-5 Brands and quality page (M, needs F-3).** What each quality tier means, brand cards, how we choose (the label checklist: named meat first, FEDIAF/AAFCO, no BHA/BHT…), and a short grain-free / heart-disease (DCM) note.

**W-6 Quality block on product pages and cards (M, needs F-4).** A quality badge and "why we chose it". Key facts: first ingredient, meat %, standard and made in for food; durability, material and chewing strength for toys. Plus "checked on <date>".

**W-7 Dog profile: chewing strength (S, needs F-8).** Three clear choices, each with a one-line explanation.

**W-8 Account: change tier (M, needs F-1).** Change from the next box onward. Show the new price and the date it starts, and ask the customer to confirm. Managing add-ons comes in phase 4.

**W-9 VAT on checkout, orders and emails (M, needs F-6).** Prices include VAT, with a VAT line on totals, the order page and email receipts.

**W-10 Account → Referrals: reward status (S, needs R-3).** For each reward, show its coupon code, whether it was used and when it expires, so customers don't lose rewards they've earned.

---

## 6. Order of work

0. **Now (no dependencies):** R-1. Then R-2, R-3, R-5, R-6.
1. **Tiers:** F-1, F-2, A-1, A-2, A-3 (without cost), W-1, W-2, W-8.
2. **Quality and trust:** F-3, F-4, F-8, A-4, A-5 (Quality tab), W-4, W-5, W-6, W-7.
3. **Finance:** F-5, F-6, F-7, A-5 (Cost tab), A-6, A-7, A-8, A-9, A-11, W-9, R-4, R-8, and the budget bar in A-3.
4. **Later:** F-9 / add-ons, A-12 batches and expiry, R-7 fraud flags, W-10.

Each phase includes a database migration. Run it only when other sessions using the local database are idle, and build each phase in its own worktree branch.

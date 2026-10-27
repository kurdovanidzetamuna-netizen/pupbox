import { sitePage } from './pages/site';
import { homePage } from './pages/home';
import { pricingPage } from './pages/pricing';
import { howItWorksPage } from './pages/how-it-works';
import { shopPage, blogPage } from './pages/shop-blog';
import { D } from './defaults';

export * from './types';
export * from './resolve';
export * from './faq';
export * from './allergens';
export * from './strings';
export { sitePage, homePage, pricingPage, howItWorksPage, shopPage, blogPage };

/** Every page editable in admin, in menu order. */
export const PAGES = [sitePage, homePage, pricingPage, howItWorksPage, shopPage, blogPage];

export const pageByKey = (key: string) => PAGES.find((p) => p.key === key);

/** Moved keys the site still uses outside the edited pages (the sign-in link, the shop breadcrumb). */
const ALSO_USED_ELSEWHERE = ['nav.signIn', 'shop.title'];

/**
 * Old string keys whose text now lives in the page editor. The Translations
 * page hides them so the same words aren't editable in two places.
 */
export const PAGE_BUILDER_KEYS = new Set(Object.keys(D).filter((k) => !ALSO_USED_ELSEWHERE.includes(k)));


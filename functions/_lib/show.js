// Craft-show mode helpers. The config (which modelers are on the tiles, their
// prices, whether show mode is on) is show.json at the repo root; the functions
// import it and pass it in, so these helpers also run in `npm test` under Node.
import { readCookie, verifySession } from './session.js';

/** Cookie a phone gets when it opens /show/. Lets it into the show modelers without Patreon. */
export const SHOW_COOKIE = 'mh_show';

export const showEnabled = (show) => show.enabled === true;
export const tileFor = (show, id) => (show.tiles || []).find((t) => t.id === id) || null;
export const isShowModeler = (show, id) => showEnabled(show) && tileFor(show, id) !== null;
export const showCookieTtl = (show) => Math.max(1, Number(show.cookieDays) || 3) * 24 * 3600;

/** True when the request carries a valid craft-show cookie. */
export async function verifyShowCookie(request, secret) {
  if (!secret) return false;
  const body = await verifySession(readCookie(request, SHOW_COOKIE), secret);
  return !!(body && body.show === 1);
}

/** The production wording without the config comment. */
export function cleanProduction(show) {
  const { _comment, ...rest } = show.production || {};
  return rest;
}

/** What the show page and the in-modeler order button are allowed to read. */
export function publicShow(show) {
  return {
    enabled: showEnabled(show),
    title: show.title,
    tagline: show.tagline,
    madeToOrder: show.madeToOrder,
    production: cleanProduction(show),
    payNote: show.payNote,
    maxQty: show.maxQty || 20,
    currency: show.currency || 'CAD',
    tiles: (show.tiles || []).map((t) => ({ id: t.id, name: t.name, emoji: t.emoji, blurb: t.blurb, hint: t.hint, prices: t.prices })),
  };
}

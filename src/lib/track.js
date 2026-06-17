/**
 * Unified tracking facade.
 * Resolves the current user once and fans out to both Google Analytics
 * and the internal behavior recommendation engine.
 */
import { base44 } from '@/api/base44Client';
import * as ga from '@/lib/analytics';
import * as bt from '@/lib/behaviorTracker';

let _user = null;
let _userPromise = null;

function resolveUser() {
  if (_user) return Promise.resolve(_user);
  if (_userPromise) return _userPromise;
  _userPromise = base44.auth.me().then(u => { _user = u; return u; }).catch(() => null);
  return _userPromise;
}

export const track = {
  view(product) {
    ga.trackProductView(product);
    resolveUser().then(u => bt.trackView(product, u));
  },
  wishlist(productId, product) {
    ga.trackAddToFavorites(product);
    resolveUser().then(u => bt.trackWishlist(productId, u));
  },
  beginCheckout(product) {
    ga.trackBeginCheckout(product);
    resolveUser().then(u => bt.trackAddToCart(product, u));
  },
  purchase(order, product) {
    ga.trackPurchase(order);
    resolveUser().then(u => {
      if (u && product) bt.trackPurchase(product, u);
    });
  },
  search(query) {
    ga.trackSearch(query);
    resolveUser().then(u => bt.trackSearch(query, u));
  },
};
const GA_ID = 'G-SZRFZCDWL8';

const isReady = () =>
  typeof window !== 'undefined' &&
  typeof window.gtag === 'function';

export const trackPageView = (path, title) => {
  if (!isReady()) return;
  window.gtag('config', GA_ID, {
    page_path: path,
    page_title: title,
  });
};

export const trackEvent = (eventName, params = {}) => {
  if (!isReady()) return;
  window.gtag('event', eventName, params);
};

export const trackProductView = (product) => {
  trackEvent('view_item', {
    currency: 'ETB',
    value: product.price,
    items: [{
      item_id: product.id,
      item_name: product.name,
      item_category: product.category,
      price: product.price,
    }]
  });
};

export const trackAddToFavorites = (product) => {
  trackEvent('add_to_wishlist', {
    currency: 'ETB',
    value: product.price,
    items: [{
      item_id: product.id,
      item_name: product.name,
      price: product.price,
    }]
  });
};

export const trackBeginCheckout = (product) => {
  trackEvent('begin_checkout', {
    currency: 'ETB',
    value: product.price,
    items: [{
      item_id: product.id,
      item_name: product.name,
      item_category: product.category,
      price: product.price,
    }]
  });
};

export const trackPurchase = (order) => {
  trackEvent('purchase', {
    transaction_id: order.id,
    currency: 'ETB',
    value: order.total_amount,
    items: [{
      item_id: order.product_id,
      item_name: order.product_name,
      price: order.total_amount,
    }]
  });
};

export const trackSignUp = () => {
  trackEvent('sign_up', { method: 'email' });
};

export const trackLogin = () => {
  trackEvent('login', { method: 'email' });
};

export const trackSearch = (searchTerm) => {
  trackEvent('search', { search_term: searchTerm });
};

export const trackCategoryFilter = (category) => {
  trackEvent('select_content', {
    content_type: 'category',
    content_id: category,
  });
};
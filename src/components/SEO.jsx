import { useEffect } from 'react';

export default function SEO({ title, description, keywords, url, image }) {
  useEffect(() => {
    document.title = title || "Ethiodo — Ethiopia's #1 Online Store";
    setMeta('description', description || 'Shop online in Ethiopia. Fast delivery, pay on delivery.');
    if (keywords) setMeta('keywords', keywords);
    setOG('og:title', title);
    setOG('og:description', description);
    setOG('og:url', url || window.location.href);
    if (image) setOG('og:image', image);

    let canonical = document.querySelector("link[rel='canonical']");
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url || window.location.href;
  }, [title, description, keywords, url, image]);

  return null;
}

function setMeta(name, content) {
  let el = document.querySelector(`meta[name='${name}']`);
  if (!el) {
    el = document.createElement('meta');
    el.name = name;
    document.head.appendChild(el);
  }
  el.content = content;
}

function setOG(property, content) {
  if (!content) return;
  let el = document.querySelector(`meta[property='${property}']`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('property', property);
    document.head.appendChild(el);
  }
  el.content = content;
}
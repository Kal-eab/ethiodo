import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 


export const isIframe = window.self !== window.top;

/** Parse comma-separated tag string into normalized lowercase array */
export function parseTags(tagsStr) {
  return (tagsStr || '').toLowerCase().split(',').map(t => t.trim()).filter(Boolean);
}

/** Count of tags shared between two tag arrays */
export function tagOverlapScore(tagsA, tagsB) {
  return tagsA.filter(t => tagsB.includes(t)).length;
}
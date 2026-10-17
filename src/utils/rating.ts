/** Ratings are stored on a 1–10 scale (one point per half star) and shown as 0.5–5 stars. */
export function formatStars(value: number): string {
  const stars = value / 2;
  return `${stars} star${stars === 1 ? '' : 's'}`;
}

/** Compact label such as "★ 4.5" for lists. */
export function ratingLabel(value: number): string {
  return `★ ${value / 2}`;
}

import type { Transition } from 'motion/react';

/**
 * Apple-style spring defined by damping ratio and response (seconds),
 * converted to the mass/stiffness/damping triplet (mass = 1).
 * damping 1.0 = critically damped (no overshoot); < 1 = bounce.
 */
export function appleSpring(response: number, dampingRatio = 1): Transition {
  return {
    type: 'spring',
    mass: 1,
    stiffness: (2 * Math.PI / response) ** 2,
    damping: (4 * Math.PI * dampingRatio) / response,
  };
}

export const spring = {
  /** Default UI motion: thumbs, underlines, toggles. */
  default: appleSpring(0.3),
  /** Larger repositioning: layout changes, chart lines. */
  move: appleSpring(0.4),
  /** Sheets and drawers, only after a flick that carried momentum. */
  sheet: appleSpring(0.3, 0.8),
  /** Small, quick feedback such as popovers and press pops. */
  snappy: appleSpring(0.2),
} as const;

/** Short cross-fade, also the reduced-motion replacement for slides. */
export const fade: Transition = { duration: 0.15, ease: 'easeOut' };

/**
 * Where a flick would come to rest (Apple's scroll-view deceleration).
 * velocity in px/s; decelerationRate ≈ 0.998 normal, 0.99 fast.
 */
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** Progressive resistance past a boundary. */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

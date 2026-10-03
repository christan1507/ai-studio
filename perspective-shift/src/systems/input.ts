/**
 * Shared pointer state.
 *
 * A single mutable module object rather than React context: the drag tracker
 * is read inside `useFrame` and inside three.js click handlers on the same
 * frame, and the game has exactly one canvas. Threading a context through for
 * this would add re-renders to the one code path that must never cause any.
 */

/** Pointer travel, in pixels, beyond which a gesture is a drag and not a tap. */
export const TAP_SLOP = 7;

export interface PointerInput {
  /** Whether a pointer is currently down on the canvas. */
  down: boolean;
  /** Total pixels travelled since the pointer went down. */
  travel: number;
  lastX: number;
  lastY: number;
  /** `performance.now()` of the previous move, for flick velocity. */
  lastTime: number;
}

export const pointerInput: PointerInput = {
  down: false,
  travel: 0,
  lastX: 0,
  lastY: 0,
  lastTime: 0,
};

/**
 * Whether the gesture that just ended should count as a tap on an object.
 * Three.js click handlers fire on pointer-up regardless of how far the pointer
 * moved, so without this a rotation drag that happens to finish over a tile
 * would also order the character to walk there.
 */
export function wasTap(): boolean {
  return pointerInput.travel < TAP_SLOP;
}

export function resetPointer(x: number, y: number): void {
  pointerInput.down = true;
  pointerInput.travel = 0;
  pointerInput.lastX = x;
  pointerInput.lastY = y;
  pointerInput.lastTime = performance.now();
}

/**
 * Record pointer movement, returning the per-event delta and the elapsed time
 * since the previous move. `dt` is floored at a sane minimum because two moves
 * can arrive in the same millisecond, and dividing a delta by ~0 produces an
 * absurd flick velocity.
 */
export function trackPointer(x: number, y: number): { dx: number; dy: number; dt: number } {
  const now = performance.now();
  const dx = x - pointerInput.lastX;
  const dy = y - pointerInput.lastY;
  // Floored near a realistic pointer-event cadence. A smaller floor turns the
  // division into a velocity spike whenever two moves land in the same tick.
  const dt = Math.max(0.008, (now - pointerInput.lastTime) / 1000);
  pointerInput.lastX = x;
  pointerInput.lastY = y;
  pointerInput.lastTime = now;
  pointerInput.travel += Math.hypot(dx, dy);
  return { dx, dy, dt };
}

export function releasePointer(): void {
  pointerInput.down = false;
}

/**
 * Shared animation ticker.
 *
 * A single, app-wide `requestAnimationFrame` loop. Every animation hook that
 * needs per-frame work subscribes here instead of starting its own rAF — so a
 * page with N scroll-driven components runs **one** loop, not N.
 *
 * The loop is reference-counted: it starts on the first subscriber and stops
 * (`cancelAnimationFrame`) when the last one leaves, so an idle page costs
 * nothing. Each subscriber is throttled independently by its own framerate.
 *
 * 📖 Docs: obsidian/frontend/animation-system.md
 */

export type TickerCallback = (time: number) => void;

interface Subscriber {
  callback: TickerCallback;
  /** Read live each frame so framerate prop changes take effect. */
  getFramerate: () => number;
  /** Timestamp of this subscriber's last invocation. */
  last: number;
}

const subscribers = new Set<Subscriber>();
/**
 * Driver callbacks run FIRST every frame, unthrottled, before any subscriber.
 * This is where the scroll engine (Lenis) advances, so that scroll-reading
 * subscribers (e.g. `ProgressTrigger`) compute against the *current* frame's
 * scroll position — keeping scroll and the transforms it drives on the **same**
 * rAF tick (no inter-loop desync / jitter).
 */
const drivers = new Set<TickerCallback>();
let rafId: number | null = null;

const frame = (time: number): void => {
  // Drivers first (scroll engine), so subscribers read the fresh scroll position.
  for (const drive of [...drivers]) {
    if (!drivers.has(drive)) continue;
    try {
      drive(time);
    } catch (error) {
      console.error("[ticker] driver threw:", error);
    }
  }
  // Snapshot first: a callback may subscribe/unsubscribe during iteration.
  for (const sub of [...subscribers]) {
    if (!subscribers.has(sub)) continue;
    if (time - sub.last <= sub.getFramerate()) continue;
    sub.last = time;
    try {
      sub.callback(time);
    } catch (error) {
      // Isolate failures — one bad subscriber must not kill the shared loop.
      console.error("[ticker] subscriber threw:", error);
    }
  }
  rafId = requestAnimationFrame(frame);
};

const start = (): void => {
  if (rafId === null) rafId = requestAnimationFrame(frame);
};

const stop = (): void => {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
};

const stopIfIdle = (): void => {
  if (subscribers.size === 0 && drivers.size === 0) stop();
};

/**
 * Subscribe a callback to the shared rAF loop.
 *
 * @param callback - invoked with the rAF timestamp, no more often than `getFramerate()` ms apart.
 * @param getFramerate - returns the current minimum gap (ms) between invocations; read live every frame.
 * @returns an unsubscribe function.
 */
export const subscribeToTicker = (
  callback: TickerCallback,
  getFramerate: () => number,
): (() => void) => {
  const subscriber: Subscriber = {
    callback,
    getFramerate,
    last: performance.now(),
  };
  subscribers.add(subscriber);
  start();

  return () => {
    subscribers.delete(subscriber);
    stopIfIdle();
  };
};

/**
 * Register a per-frame "driver" that runs **before** all subscribers, every
 * frame, unthrottled. Use this for the scroll engine so scroll advances ahead of
 * the scroll-reading animations in the same tick. Returns an unsubscribe fn.
 */
export const subscribeToTickerDriver = (
  callback: TickerCallback,
): (() => void) => {
  drivers.add(callback);
  start();

  return () => {
    drivers.delete(callback);
    stopIfIdle();
  };
};

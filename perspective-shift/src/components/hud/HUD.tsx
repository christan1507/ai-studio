/**
 * In-level overlay.
 *
 * Deliberately sparse: a title, a rotation count and three controls. There is
 * no fail state and no timer, so there is nothing urgent to communicate — the
 * HUD's job is to stay out of the way of the illusion.
 *
 * The hint offers itself only after a stretch of being stuck, and only if the
 * player has not switched hints off. It is also suppressed while walking, so
 * it never appears mid-move.
 */

import { useEffect, useState } from 'react';

import { IconButton, MicroLabel } from '@/components/hud/primitives';
import { useGameStore } from '@/store/useGameStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUiStore } from '@/store/useUiStore';
import { audio } from '@/systems/audio';
import { capturePhoto } from '@/systems/photo';

export function HUD(): React.ReactElement | null {
  const level = useGameStore((state) => state.level);
  const status = useGameStore((state) => state.status);
  const rotationCount = useGameStore((state) => state.rotationCount);
  const optimalRotations = useGameStore((state) => state.optimalRotations);
  const hintVisible = useGameStore((state) => state.hintVisible);
  const setHintVisible = useGameStore((state) => state.setHintVisible);
  const startedAt = useGameStore((state) => state.startedAt);
  const restart = useGameStore((state) => state.restart);

  const hintsEnabled = useSettingsStore((state) => state.hintsEnabled);
  const hintDelayMs = useSettingsStore((state) => state.hintDelayMs);

  const photoMode = useUiStore((state) => state.photoMode);
  const setPhotoMode = useUiStore((state) => state.setPhotoMode);
  const go = useUiStore((state) => state.go);
  const notice = useUiStore((state) => state.notice);
  const setNotice = useUiStore((state) => state.setNotice);

  // Offer a hint after the player has been stuck a while. The timer restarts
  // with the level. `hintVisible` lives in the store because the 3D ghost path
  // reads it too, and the text and the ghost must never disagree.
  useEffect(() => {
    if (!hintsEnabled || status === 'complete' || startedAt === 0) return;
    const timer = window.setTimeout(() => setHintVisible(true), hintDelayMs);
    return () => window.clearTimeout(timer);
  }, [hintsEnabled, hintDelayMs, startedAt, status, setHintVisible]);

  // Notices are transient; clear them without the caller having to.
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2200);
    return () => window.clearTimeout(timer);
  }, [notice, setNotice]);

  if (!level) return null;
  if (photoMode) return <PhotoModeBar levelName={level.name} />;

  const showHint = hintVisible && status !== 'complete';

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-5 sm:p-7">
      {/* Scrims. Chapter palettes run from near-white (Floating Gardens) to
          near-black (The Inversion), and white HUD text is invisible against
          the pale ones. A soft dark gradient top and bottom guarantees
          contrast without tinting the scene itself. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/45 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/40 to-transparent"
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="animate-fade">
          <MicroLabel>
            {level.id.startsWith('daily') ? 'Daily Shift' : `Chapter ${level.chapter}`}
          </MicroLabel>
          <h1 className="mt-1 text-xl font-light tracking-wide text-white/95 sm:text-2xl">
            {level.name}
          </h1>
          <div className="mt-1 text-xs text-white/45">
            {rotationCount} {rotationCount === 1 ? 'rotation' : 'rotations'}
            {optimalRotations !== null ? ` · best possible ${optimalRotations}` : ''}
          </div>
        </div>

        <div className="pointer-events-auto flex gap-2">
          <IconButton
            label="Show a hint"
            active={showHint}
            onClick={() => setHintVisible(!hintVisible)}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 3a6 6 0 00-3.3 11v2.2h6.6V14A6 6 0 0012 3z" />
              <path d="M10 20h4" />
            </svg>
          </IconButton>
          <IconButton label="Restart level" onClick={restart}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 12a8 8 0 1113.6 5.7" />
              <path d="M20 20v-5h-5" />
            </svg>
          </IconButton>
          <IconButton label="Photo mode" onClick={() => setPhotoMode(true)}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M3 8.5A2.5 2.5 0 015.5 6h1.2l1-1.6h6.6L16.3 6h2.2A2.5 2.5 0 0121 8.5v8A2.5 2.5 0 0118.5 19h-13A2.5 2.5 0 013 16.5z" />
              <circle cx="12" cy="12.5" r="3" />
            </svg>
          </IconButton>
          <IconButton label="Back to level select" onClick={() => go('levels')}>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </IconButton>
        </div>
      </div>

      <div className="relative flex flex-col items-center gap-3">
        {notice ? (
          <div className="animate-rise rounded-full border border-white/15 bg-black/30 px-4 py-1.5 text-xs text-white/75 backdrop-blur-md">
            {notice}
          </div>
        ) : null}

        {showHint && level.hint ? (
          <div className="animate-rise max-w-md rounded-2xl border border-white/10 bg-black/35 px-5 py-3 text-center text-sm text-white/80 backdrop-blur-xl">
            {level.hint}
          </div>
        ) : null}

        {status === 'playing' && rotationCount === 0 ? (
          <div className="animate-breathe text-center text-xs tracking-widest text-white/40 uppercase">
            Drag to turn · tap a tile to walk
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Photo mode: the HUD collapses to a single capture control. */
function PhotoModeBar({ levelName }: { readonly levelName: string }): React.ReactElement {
  const setPhotoMode = useUiStore((state) => state.setPhotoMode);
  const setNotice = useUiStore((state) => state.setNotice);
  const [busy, setBusy] = useState(false);

  const capture = async (): Promise<void> => {
    setBusy(true);
    const outcome = await capturePhoto(levelName);
    setBusy(false);
    audio.switchClick();
    setPhotoMode(false);
    setNotice(
      outcome === 'shared'
        ? 'Shared.'
        : outcome === 'downloaded'
          ? 'Saved to your downloads.'
          : 'Could not capture the canvas.',
    );
  };

  return (
    <div className="pointer-events-none absolute inset-0 flex items-end justify-center p-7">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-white/12 bg-black/35 px-3 py-2 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => void capture()}
          disabled={busy}
          className="rounded-full bg-white/90 px-5 py-2 text-sm font-medium text-neutral-900 transition hover:bg-white disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
        >
          {busy ? 'Capturing…' : 'Capture'}
        </button>
        <button
          type="button"
          onClick={() => setPhotoMode(false)}
          className="rounded-full px-4 py-2 text-sm text-white/65 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
        >
          Done
        </button>
      </div>
    </div>
  );
}

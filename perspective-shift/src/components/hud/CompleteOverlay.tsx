/**
 * Level-complete overlay.
 *
 * Also the single place progress is committed: stars, the daily streak and any
 * cosmetic unlocks. Keeping that in one effect, keyed on the level actually
 * being complete, means a replay or a remount cannot double-count a streak or
 * silently lose a star.
 */

import { useEffect, useRef, useState } from 'react';

import { Button, MicroLabel, Stars } from '@/components/hud/primitives';
import { isChapterComplete, nextLevel } from '@/data/levels';
import { unlocksForChapter } from '@/data/skins';
import { useGameStore } from '@/store/useGameStore';
import { localIsoDate, useProgressStore } from '@/store/useProgressStore';
import { useUiStore } from '@/store/useUiStore';
import { audio } from '@/systems/audio';

export function CompleteOverlay(): React.ReactElement | null {
  const status = useGameStore((state) => state.status);
  const level = useGameStore((state) => state.level);
  const stars = useGameStore((state) => state.starsEarned);
  const rotationCount = useGameStore((state) => state.rotationCount);
  const optimalRotations = useGameStore((state) => state.optimalRotations);
  const loadLevel = useGameStore((state) => state.loadLevel);
  const restart = useGameStore((state) => state.restart);

  const recordCompletion = useProgressStore((state) => state.recordCompletion);
  const recordDailyCompletion = useProgressStore((state) => state.recordDailyCompletion);
  const unlockSkin = useProgressStore((state) => state.unlockSkin);
  const records = useProgressStore((state) => state.levels);
  const streak = useProgressStore((state) => state.daily.streak);

  const go = useUiStore((state) => state.go);
  const setPhotoMode = useUiStore((state) => state.setPhotoMode);
  const playingDaily = useUiStore((state) => state.playingDaily);

  const [unlocked, setUnlocked] = useState<string[]>([]);
  // Guards against committing the same completion twice if this component
  // remounts while the level is still in its 'complete' state.
  const committedFor = useRef<string | null>(null);

  useEffect(() => {
    if (status !== 'complete' || !level) return;
    const key = `${level.id}:${rotationCount}`;
    if (committedFor.current === key) return;
    committedFor.current = key;

    audio.levelComplete();

    if (playingDaily) {
      recordDailyCompletion(localIsoDate());
      return;
    }

    recordCompletion(level.id, stars, rotationCount);

    // Finishing the last level of a chapter unlocks its cosmetics. The record
    // for *this* level is not in the store yet, so include it explicitly.
    const completedIds = new Set([...Object.keys(records), level.id]);
    if (isChapterComplete(level.chapter, completedIds)) {
      const rewards = unlocksForChapter(level.chapter);
      for (const id of rewards) unlockSkin(id);
      setUnlocked(rewards);
    }
  }, [
    status,
    level,
    stars,
    rotationCount,
    playingDaily,
    records,
    recordCompletion,
    recordDailyCompletion,
    unlockSkin,
  ]);

  // Reset the guard when a new level begins so a revisit can be recorded.
  useEffect(() => {
    if (status === 'playing') {
      committedFor.current = null;
      setUnlocked([]);
    }
  }, [status]);

  if (status !== 'complete' || !level) return null;

  const following = playingDaily ? null : nextLevel(level.id);
  const perfect = optimalRotations !== null && rotationCount <= optimalRotations;

  return (
    <div className="pointer-events-none absolute inset-0 flex items-end justify-center p-6 sm:items-center">
      <div className="pointer-events-auto animate-rise w-full max-w-sm rounded-3xl border border-white/12 bg-black/45 p-7 text-center backdrop-blur-2xl">
        <MicroLabel className="justify-center">
          {playingDaily ? 'Daily shift' : `Chapter ${level.chapter} · ${level.index} of 6`}
        </MicroLabel>
        <h2 className="mt-2 text-2xl font-light text-white">{level.name}</h2>

        <div className="mt-5 flex justify-center">
          <Stars count={stars} size="lg" />
        </div>

        <p className="mt-4 text-sm text-white/60">
          Solved in {rotationCount} {rotationCount === 1 ? 'rotation' : 'rotations'}.
          {perfect ? ' That is the fewest possible.' : ''}
        </p>
        {!perfect && optimalRotations !== null ? (
          <p className="mt-1 text-xs text-white/35">
            It can be done in {optimalRotations}.
          </p>
        ) : null}

        {playingDaily ? (
          <p className="mt-3 text-xs text-white/50">
            {streak} day {streak === 1 ? 'streak' : 'streak'}. Come back tomorrow.
          </p>
        ) : null}

        {unlocked.length > 0 ? (
          <div className="mt-5 rounded-2xl border border-white/12 bg-white/5 p-3">
            <MicroLabel className="justify-center">Chapter complete</MicroLabel>
            <div className="mt-1 text-sm text-white/80">
              Unlocked {unlocked.length} new {unlocked.length === 1 ? 'item' : 'items'}
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-2">
          {following ? (
            <Button
              variant="solid"
              className="w-full py-3"
              onClick={() => loadLevel(following)}
            >
              Next level
            </Button>
          ) : (
            <Button variant="solid" className="w-full py-3" onClick={() => go('chapters')}>
              {playingDaily ? 'Done' : 'All chapters'}
            </Button>
          )}
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => setPhotoMode(true)}>
              Photo
            </Button>
            <Button className="flex-1" onClick={restart}>
              Replay
            </Button>
          </div>
          <Button variant="quiet" className="w-full" onClick={() => go('levels')}>
            Level select
          </Button>
        </div>
      </div>
    </div>
  );
}

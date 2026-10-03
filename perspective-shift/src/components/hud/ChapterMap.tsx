/**
 * Chapter progression.
 *
 * Each chapter is a card tinted with its own palette, so the map doubles as a
 * preview of where the game is going. Locked chapters stay visible but dimmed
 * and state their requirement plainly — a hidden lock is just confusing.
 */

import { MicroLabel, Stars } from '@/components/hud/primitives';
import {
  isChapterUnlocked,
  levelIdsInChapter,
  levelsInChapter,
  LEVELS_REQUIRED_TO_ADVANCE,
} from '@/data/levels';
import { CHAPTERS } from '@/data/palettes';
import { useGameStore } from '@/store/useGameStore';
import { useProgressStore } from '@/store/useProgressStore';
import { useUiStore } from '@/store/useUiStore';

export function ChapterMap(): React.ReactElement {
  const go = useUiStore((state) => state.go);
  const openChapter = useUiStore((state) => state.openChapter);
  const records = useProgressStore((state) => state.levels);

  const completed = new Set(Object.keys(records));

  return (
    <div className="absolute inset-0 overflow-y-auto bg-gradient-to-b from-[#232a52] via-[#191e3d] to-[#0d1024]">
      <div className="mx-auto max-w-2xl px-6 py-14">
        <button
          type="button"
          onClick={() => go('menu')}
          className="label-micro text-white/45 transition hover:text-white/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
        >
          ← Title
        </button>

        <h1 className="mt-5 text-3xl font-extralight tracking-tight text-white">Chapters</h1>

        <div className="mt-8 flex flex-col gap-3">
          {CHAPTERS.map((chapter, index) => {
            const ids = levelIdsInChapter(chapter.id);
            const unlocked = isChapterUnlocked(chapter.id, completed);
            const done = ids.filter((id) => completed.has(id)).length;
            const stars = ids.reduce((sum, id) => sum + (records[id]?.stars ?? 0), 0);
            const previousName = CHAPTERS[index - 1]?.name ?? '';

            return (
              <button
                key={chapter.id}
                type="button"
                disabled={!unlocked}
                onClick={() => openChapter(chapter.id)}
                className={
                  'animate-rise group relative overflow-hidden rounded-2xl border p-5 text-left transition ' +
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 ' +
                  (unlocked
                    ? 'border-white/12 hover:border-white/25'
                    : 'cursor-not-allowed border-white/6 opacity-45')
                }
                style={{
                  animationDelay: `${index * 50}ms`,
                  background: `linear-gradient(110deg, ${chapter.palette.gradient[0]}22, ${chapter.palette.gradient[1]}55)`,
                }}
              >
                <div
                  aria-hidden="true"
                  className="absolute top-0 right-0 h-full w-28 opacity-25 transition group-hover:opacity-40"
                  style={{
                    background: `radial-gradient(circle at 70% 50%, ${chapter.palette.glow}, transparent 70%)`,
                  }}
                />
                <div className="relative flex items-center justify-between gap-4">
                  <div>
                    <MicroLabel>Chapter {chapter.id}</MicroLabel>
                    <div className="mt-1 text-lg font-light text-white">{chapter.name}</div>
                    <div className="mt-0.5 text-xs text-white/50 italic">{chapter.subtitle}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    {unlocked ? (
                      <>
                        <div className="text-xs text-white/60">
                          {done}/{ids.length}
                        </div>
                        <div className="mt-1.5 flex justify-end">
                          <Stars count={Math.round(stars / Math.max(1, ids.length))} size="sm" />
                        </div>
                        <div className="mt-1 text-[0.625rem] text-white/35">{stars} stars</div>
                      </>
                    ) : (
                      <div className="max-w-[9rem] text-xs leading-snug text-white/45">
                        Solve {LEVELS_REQUIRED_TO_ADVANCE} of {previousName}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Level list for a single chapter. */
export function LevelSelect(): React.ReactElement {
  const chapter = useUiStore((state) => state.chapter);
  const go = useUiStore((state) => state.go);
  const setPlayingDaily = useUiStore((state) => state.setPlayingDaily);
  const records = useProgressStore((state) => state.levels);
  // Selecting just the action keeps this screen from re-rendering on every
  // rotation of a level that may still be loaded underneath.
  const loadLevel = useGameStore((state) => state.loadLevel);

  const levels = levelsInChapter(chapter);
  const meta = CHAPTERS.find((entry) => entry.id === chapter) ?? CHAPTERS[0];

  return (
    <div
      className="absolute inset-0 overflow-y-auto"
      style={{
        background: `linear-gradient(170deg, ${meta.palette.gradient[0]}, ${meta.palette.gradient[1]})`,
      }}
    >
      {/* Chapter gradients span near-white (Floating Gardens) to near-black
          (The Inversion). A fixed dark veil keeps the white type legible on
          all of them while leaving the chapter's hue showing through — the
          alternative, per-chapter text colours, is a lot of palette bookkeeping
          for a worse result. */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 bg-black/55" />

      <div className="relative mx-auto max-w-2xl px-6 py-14">
        <button
          type="button"
          onClick={() => go('chapters')}
          className="label-micro text-white/55 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
        >
          ← Chapters
        </button>

        <MicroLabel className="mt-5">Chapter {meta.id}</MicroLabel>
        <h1 className="mt-1 text-3xl font-extralight tracking-tight text-white">{meta.name}</h1>
        <p className="mt-1 text-sm text-white/55 italic">{meta.subtitle}</p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {levels.map((level, index) => {
            const record = records[level.id];
            return (
              <button
                key={level.id}
                type="button"
                onClick={() => {
                  setPlayingDaily(false);
                  loadLevel(level);
                  go('play');
                }}
                className="animate-rise flex items-center justify-between gap-4 rounded-2xl border border-white/12 bg-black/20 p-4 text-left backdrop-blur-md transition hover:border-white/30 hover:bg-black/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <div>
                  <div className="label-micro text-white/40">
                    {meta.id}–{level.index}
                  </div>
                  <div className="mt-1 text-base font-light text-white">{level.name}</div>
                  {record ? (
                    <div className="mt-1 text-[0.625rem] text-white/40">
                      best {record.bestRotations}{' '}
                      {record.bestRotations === 1 ? 'rotation' : 'rotations'}
                    </div>
                  ) : (
                    <div className="mt-1 text-[0.625rem] text-white/30">Unsolved</div>
                  )}
                </div>
                <Stars count={record?.stars ?? 0} size="sm" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

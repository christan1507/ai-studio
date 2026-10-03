/**
 * Title screen.
 *
 * The daily puzzle is generated lazily on tap rather than on mount, so opening
 * the game never pays for a search the player may not want.
 */

import { Button, MicroLabel, Panel } from '@/components/hud/primitives';
import { ALL_LEVELS, levelById } from '@/data/levels';
import { useGameStore } from '@/store/useGameStore';
import { localIsoDate, useProgressStore } from '@/store/useProgressStore';
import { useUiStore } from '@/store/useUiStore';
import { audio } from '@/systems/audio';
import { dailyPuzzle } from '@/systems/generator';

export function MainMenu(): React.ReactElement {
  const go = useUiStore((state) => state.go);
  const setPlayingDaily = useUiStore((state) => state.setPlayingDaily);
  const setNotice = useUiStore((state) => state.setNotice);
  const loadLevel = useGameStore((state) => state.loadLevel);

  const records = useProgressStore((state) => state.levels);
  const daily = useProgressStore((state) => state.daily);

  const today = localIsoDate();
  const dailyDone = daily.lastCompleted === today;
  const completedCount = ALL_LEVELS.filter((level) => records[level.id]).length;
  const totalStars = ALL_LEVELS.reduce(
    (sum, level) => sum + (records[level.id]?.stars ?? 0),
    0,
  );

  const continueLevel =
    ALL_LEVELS.find((level) => !records[level.id]) ?? levelById(ALL_LEVELS[0].id);

  const startDaily = (): void => {
    void audio.unlock();
    try {
      const puzzle = dailyPuzzle(today);
      setPlayingDaily(true);
      loadLevel(puzzle.level);
      go('play');
    } catch {
      setNotice('Today’s puzzle could not be generated.');
    }
  };

  return (
    <div className="absolute inset-0 overflow-y-auto bg-gradient-to-b from-[#232a52] via-[#191e3d] to-[#0d1024]">
      <div className="mx-auto flex min-h-full max-w-xl flex-col justify-center gap-8 px-6 py-16">
        <header className="animate-rise">
          <MicroLabel>A puzzle of impossible geometry</MicroLabel>
          <h1 className="mt-3 text-5xl font-extralight tracking-tight text-white sm:text-6xl">
            Perspective
            <span className="block font-light text-white/70">Shift</span>
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/50">
            Turn the world until the path becomes real. There is no timer and no
            way to lose — only angles you have not found yet.
          </p>
        </header>

        <div className="animate-rise flex flex-col gap-3" style={{ animationDelay: '60ms' }}>
          <Button
            variant="solid"
            className="w-full py-3.5"
            onClick={() => {
              void audio.unlock();
              setPlayingDaily(false);
              if (continueLevel) {
                loadLevel(continueLevel);
                go('play');
              } else {
                go('chapters');
              }
            }}
          >
            {completedCount === 0 ? 'Begin' : 'Continue'}
          </Button>
          <Button
            className="w-full py-3"
            onClick={() => {
              void audio.unlock();
              go('chapters');
            }}
          >
            Chapters
          </Button>
        </div>

        <Panel className="animate-rise p-5" >
          <div className="flex items-center justify-between gap-4">
            <div>
              <MicroLabel>Daily shift</MicroLabel>
              <div className="mt-1 text-sm text-white/80">
                {dailyDone ? 'Solved today' : 'A new puzzle, every day'}
              </div>
              <div className="mt-1 text-xs text-white/40">
                {daily.streak > 0
                  ? `${daily.streak} day streak · best ${daily.bestStreak}`
                  : 'Start a streak'}
              </div>
            </div>
            <Button onClick={startDaily}>{dailyDone ? 'Replay' : 'Play'}</Button>
          </div>
        </Panel>

        <div className="animate-rise flex items-center justify-between text-xs text-white/40">
          <span>
            {completedCount} of {ALL_LEVELS.length} solved · {totalStars} stars
          </span>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => go('collection')}
              className="transition hover:text-white/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            >
              Collection
            </button>
            <button
              type="button"
              onClick={() => go('settings')}
              className="transition hover:text-white/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
            >
              Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

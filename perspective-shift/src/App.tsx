/**
 * Application shell.
 *
 * Keeps the 3D canvas mounted only while playing — a WebGL context plus a
 * postprocessing composer is expensive to hold open behind a menu, and
 * remounting gives each level its cinematic camera entry for free.
 *
 * Audio settings are pushed into the engine here rather than inside the engine
 * reading the store, so the store stays the single source of truth and the
 * engine stays a plain class that tests can ignore.
 */

import { Suspense, useEffect } from 'react';

import { ChapterMap, LevelSelect } from '@/components/hud/ChapterMap';
import { Collection } from '@/components/hud/Collection';
import { CompleteOverlay } from '@/components/hud/CompleteOverlay';
import { HUD } from '@/components/hud/HUD';
import { MainMenu } from '@/components/hud/MainMenu';
import { Settings } from '@/components/hud/Settings';
import { World } from '@/components/World';
import { levelById } from '@/data/levels';
import { useGameStore } from '@/store/useGameStore';
import { localIsoDate } from '@/store/useProgressStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUiStore } from '@/store/useUiStore';
import { audio } from '@/systems/audio';
import { dailyPuzzle } from '@/systems/generator';

// Dev-only handle for inspecting live state from the console or an automated
// check. Gated on DEV so it never ships.
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__perspectiveShift = {
    game: useGameStore,
    ui: useUiStore,
    settings: useSettingsStore,
  };
}

export function App(): React.ReactElement {
  const screen = useUiStore((state) => state.screen);
  const level = useGameStore((state) => state.level);

  const musicEnabled = useSettingsStore((state) => state.musicEnabled);
  const sfxEnabled = useSettingsStore((state) => state.sfxEnabled);
  const masterVolume = useSettingsStore((state) => state.masterVolume);

  useEffect(() => {
    audio.setMusicEnabled(musicEnabled);
  }, [musicEnabled]);
  useEffect(() => {
    audio.setSfxEnabled(sfxEnabled);
  }, [sfxEnabled]);
  useEffect(() => {
    audio.setVolume(masterVolume);
  }, [masterVolume]);

  // The pad follows the chapter being played, and returns to a neutral key in
  // the menus so navigation does not sound like a level.
  useEffect(() => {
    audio.setChapter(level?.chapter ?? 3);
  }, [level?.chapter]);

  useDeepLink();

  return (
    <div className="relative h-full w-full overflow-hidden">
      {screen === 'play' && level ? (
        <>
          <Suspense fallback={<LoadingVeil />}>
            <World />
          </Suspense>
          <HUD />
          <CompleteOverlay />
        </>
      ) : null}

      {screen === 'menu' ? <MainMenu /> : null}
      {screen === 'chapters' ? <ChapterMap /> : null}
      {screen === 'levels' ? <LevelSelect /> : null}
      {screen === 'collection' ? <Collection /> : null}
      {screen === 'settings' ? <Settings /> : null}
    </div>
  );
}

/**
 * Jump straight into a level from the URL: `?level=ch3-4`, or `?daily=1`.
 *
 * Runs once on mount. Useful for sharing a specific puzzle, and it is how the
 * game gets driven during automated checks without clicking through menus.
 * An unknown id is ignored rather than throwing — a stale link should land on
 * the title screen, not a blank page.
 */
function useDeepLink(): void {
  const loadLevel = useGameStore((state) => state.loadLevel);
  const go = useUiStore((state) => state.go);
  const setPlayingDaily = useUiStore((state) => state.setPlayingDaily);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get('daily') !== null) {
      try {
        setPlayingDaily(true);
        loadLevel(dailyPuzzle(localIsoDate()).level);
        go('play');
      } catch {
        // Fall through to the title screen.
      }
      return;
    }

    const id = params.get('level');
    if (!id) return;
    const target = levelById(id);
    if (!target) return;
    setPlayingDaily(false);
    loadLevel(target);
    go('play');
    // Mount-only: later navigation is driven by the UI, not the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

function LoadingVeil(): React.ReactElement {
  return (
    <div className="absolute inset-0 grid place-items-center bg-[#11142b]">
      <div className="animate-breathe label-micro text-white/40">Assembling</div>
    </div>
  );
}

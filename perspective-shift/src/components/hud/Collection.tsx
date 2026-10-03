/**
 * Cosmetics.
 *
 * Locked items are shown, not hidden, with the chapter that grants them —
 * knowing what is coming is part of the reward. Nothing here affects play.
 */

import { MicroLabel } from '@/components/hud/primitives';
import { SKINS, TRAILS } from '@/data/skins';
import { useProgressStore } from '@/store/useProgressStore';
import { useUiStore } from '@/store/useUiStore';
import { audio } from '@/systems/audio';

export function Collection(): React.ReactElement {
  const go = useUiStore((state) => state.go);
  const unlockedSkins = useProgressStore((state) => state.unlockedSkins);
  const selectedSkin = useProgressStore((state) => state.selectedSkin);
  const selectedTrail = useProgressStore((state) => state.selectedTrail);
  const selectSkin = useProgressStore((state) => state.selectSkin);
  const selectTrail = useProgressStore((state) => state.selectTrail);

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

        <h1 className="mt-5 text-3xl font-extralight tracking-tight text-white">Collection</h1>

        <MicroLabel className="mt-9">Orbs</MicroLabel>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SKINS.map((skin) => {
            const unlocked = unlockedSkins.includes(skin.id);
            const active = selectedSkin === skin.id;
            return (
              <button
                key={skin.id}
                type="button"
                disabled={!unlocked}
                onClick={() => {
                  selectSkin(skin.id);
                  audio.switchClick();
                }}
                className={
                  'rounded-2xl border p-4 text-left transition ' +
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 ' +
                  (active
                    ? 'border-white/45 bg-white/12'
                    : unlocked
                      ? 'border-white/12 bg-white/5 hover:border-white/25'
                      : 'cursor-not-allowed border-white/6 bg-white/2 opacity-45')
                }
              >
                <div
                  aria-hidden="true"
                  className="h-9 w-9 rounded-full"
                  style={{
                    background: `radial-gradient(circle at 35% 30%, ${skin.color}, ${skin.emissive})`,
                    boxShadow: unlocked ? `0 0 18px -2px ${skin.emissive}` : 'none',
                  }}
                />
                <div className="mt-3 text-sm text-white/90">{skin.name}</div>
                <div className="mt-0.5 text-[0.625rem] leading-snug text-white/40">
                  {unlocked ? skin.description : `Complete chapter ${skin.unlockChapter}`}
                </div>
                {active ? (
                  <div className="label-micro mt-2 text-white/70">Equipped</div>
                ) : null}
              </button>
            );
          })}
        </div>

        <MicroLabel className="mt-10">Trails</MicroLabel>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {TRAILS.map((trail) => {
            // Trails ride the same unlock list as skins.
            const unlocked = trail.unlockChapter === null || unlockedSkins.includes(trail.id);
            const active = selectedTrail === trail.id;
            return (
              <button
                key={trail.id}
                type="button"
                disabled={!unlocked}
                onClick={() => {
                  selectTrail(trail.id);
                  audio.switchClick();
                }}
                className={
                  'rounded-2xl border p-4 text-left transition ' +
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 ' +
                  (active
                    ? 'border-white/45 bg-white/12'
                    : unlocked
                      ? 'border-white/12 bg-white/5 hover:border-white/25'
                      : 'cursor-not-allowed border-white/6 bg-white/2 opacity-45')
                }
              >
                <div
                  aria-hidden="true"
                  className="h-2 w-full rounded-full"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${trail.color})`,
                  }}
                />
                <div className="mt-3 text-sm text-white/90">{trail.name}</div>
                <div className="mt-0.5 text-[0.625rem] text-white/40">
                  {unlocked ? `${trail.length} samples` : `Complete chapter ${trail.unlockChapter}`}
                </div>
                {active ? (
                  <div className="label-micro mt-2 text-white/70">Equipped</div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

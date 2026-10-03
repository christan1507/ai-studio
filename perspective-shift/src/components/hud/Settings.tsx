/**
 * Settings.
 *
 * Hints can be switched off entirely, as the brief asks — some players want
 * the puzzle undiluted, and an unwanted nudge after two minutes is worse than
 * no help at all.
 */

import { useState } from 'react';

import { Button, MicroLabel, Panel } from '@/components/hud/primitives';
import { useProgressStore } from '@/store/useProgressStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useUiStore } from '@/store/useUiStore';

export function Settings(): React.ReactElement {
  const go = useUiStore((state) => state.go);
  const settings = useSettingsStore();
  const resetProgress = useProgressStore((state) => state.resetProgress);
  const [confirmingReset, setConfirmingReset] = useState(false);

  return (
    <div className="absolute inset-0 overflow-y-auto bg-gradient-to-b from-[#232a52] via-[#191e3d] to-[#0d1024]">
      <div className="mx-auto max-w-lg px-6 py-14">
        <button
          type="button"
          onClick={() => go('menu')}
          className="label-micro text-white/45 transition hover:text-white/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70"
        >
          ← Title
        </button>

        <h1 className="mt-5 text-3xl font-extralight tracking-tight text-white">Settings</h1>

        <div className="mt-8 flex flex-col gap-3">
          <Toggle
            label="Ambient music"
            description="Evolving pads, one key per chapter"
            checked={settings.musicEnabled}
            onChange={settings.setMusicEnabled}
          />
          <Toggle
            label="Sound effects"
            description="Rotation, connection and completion"
            checked={settings.sfxEnabled}
            onChange={settings.setSfxEnabled}
          />

          <Panel className="p-5">
            <label htmlFor="volume" className="label-micro text-white/45">
              Volume
            </label>
            <input
              id="volume"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.masterVolume}
              onChange={(event) => settings.setMasterVolume(Number(event.target.value))}
              className="mt-3 w-full accent-white"
            />
          </Panel>

          <Toggle
            label="Hints"
            description="A ghost path appears after two minutes stuck"
            checked={settings.hintsEnabled}
            onChange={settings.setHintsEnabled}
          />
          <Toggle
            label="Reduced motion"
            description="Stills the floating drift, dust and bloom"
            checked={settings.reducedMotion}
            onChange={settings.setReducedMotion}
          />
        </div>

        <div className="mt-10">
          <MicroLabel>Danger</MicroLabel>
          <Panel className="mt-3 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm text-white/85">Reset all progress</div>
                <div className="mt-0.5 text-xs text-white/40">
                  Clears stars, unlocks and your streak. Cannot be undone.
                </div>
              </div>
              {confirmingReset ? (
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="solid"
                    onClick={() => {
                      resetProgress();
                      setConfirmingReset(false);
                    }}
                  >
                    Confirm
                  </Button>
                  <Button variant="quiet" onClick={() => setConfirmingReset(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setConfirmingReset(true)}>Reset</Button>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  readonly label: string;
  readonly description: string;
  readonly checked: boolean;
  readonly onChange: (value: boolean) => void;
}): React.ReactElement {
  return (
    <Panel className="p-5">
      <label className="flex cursor-pointer items-center justify-between gap-4">
        <span>
          <span className="block text-sm text-white/85">{label}</span>
          <span className="mt-0.5 block text-xs text-white/40">{description}</span>
        </span>
        <span className="relative shrink-0">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => onChange(event.target.checked)}
            className="peer sr-only"
          />
          <span
            aria-hidden="true"
            className="block h-6 w-11 rounded-full bg-white/15 transition peer-checked:bg-white/80 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white/70"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-1 left-1 block h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5 peer-checked:bg-neutral-900"
          />
        </span>
      </label>
    </Panel>
  );
}

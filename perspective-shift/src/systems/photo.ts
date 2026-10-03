/**
 * Photo mode capture.
 *
 * Reads the rendered frame straight off the WebGL canvas. This only works
 * because the renderer is created with `preserveDrawingBuffer: true` (see
 * `World.tsx`); without it the buffer is cleared after presentation and the
 * capture comes back blank or black.
 *
 * Sharing is attempted first and download is the fallback, because the Web
 * Share API is unavailable on most desktops and silently rejects when the
 * gesture has expired.
 */

export type CaptureOutcome = 'shared' | 'downloaded' | 'failed';

function findCanvas(): HTMLCanvasElement | null {
  return document.querySelector('canvas');
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking immediately can cancel the download in some browsers; one frame
  // of delay is enough for the navigation to start.
  requestAnimationFrame(() => URL.revokeObjectURL(url));
}

export async function capturePhoto(levelName: string): Promise<CaptureOutcome> {
  const canvas = findCanvas();
  if (!canvas) return 'failed';

  const safeName = levelName.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const filename = `perspective-shift-${safeName || 'capture'}.png`;

  const blob = await canvasToBlob(canvas);
  if (!blob) return 'failed';

  const file = new File([blob], filename, { type: 'image/png' });
  const shareData: ShareData = {
    files: [file],
    title: 'Perspective Shift',
    text: `${levelName} — solved in Perspective Shift`,
  };

  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare(shareData) &&
    typeof navigator.share === 'function'
  ) {
    try {
      await navigator.share(shareData);
      return 'shared';
    } catch {
      // A cancelled share is not an error worth surfacing; fall through to
      // saving the file so the player still gets their screenshot.
    }
  }

  download(blob, filename);
  return 'downloaded';
}

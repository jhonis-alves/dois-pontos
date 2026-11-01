interface StandaloneNavigator extends Navigator {
  standalone?: boolean;
}

let zoomLocked = false;

export function isStandaloneApp(): boolean {
  if (typeof window === 'undefined') return false;

  if ((window.navigator as StandaloneNavigator).standalone === true) {
    return true;
  }

  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches
  );
}

export function lockZoomInStandalone(): void {
  if (zoomLocked || !isStandaloneApp()) return;

  zoomLocked = true;
  document.documentElement.dataset.standalone = 'true';

  const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (viewport) {
    viewport.content =
      'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
  }

  const preventGesture = (event: Event) => {
    event.preventDefault();
  };

  document.addEventListener('gesturestart', preventGesture, { passive: false });
  document.addEventListener('gesturechange', preventGesture, { passive: false });
  document.addEventListener('gestureend', preventGesture, { passive: false });

  document.addEventListener(
    'touchmove',
    (event) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    },
    { passive: false },
  );
}

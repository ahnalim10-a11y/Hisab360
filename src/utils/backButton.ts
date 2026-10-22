import { App as CapApp } from '@capacitor/app';

type BackHandler = () => boolean;

// Stack of modal / dialog back handlers (LIFO)
const handlerStack: BackHandler[] = [];

/**
 * Register a back-press handler (e.g., when a modal or sheet opens).
 * Returns an unregister function to call when the modal closes naturally.
 * The handler should return `true` if it handled/closed the view, or `false` to let the next handler handle it.
 */
export function registerBackHandler(handler: BackHandler): () => void {
  handlerStack.push(handler);
  
  // Push a state into browser history so browser back button triggers popstate
  if (typeof window !== 'undefined' && window.history) {
    try {
      window.history.pushState({ modalOpen: true, index: handlerStack.length }, '');
    } catch (e) {
      // Ignore if history API fails
    }
  }

  return () => {
    const idx = handlerStack.lastIndexOf(handler);
    if (idx !== -1) {
      handlerStack.splice(idx, 1);
    }
  };
}

let lastBackTime = 0;
let isInitialized = false;

interface BackButtonOptions {
  getCurrentPage: () => string;
  onNavigateHome: () => void;
  onShowToast: (message: string) => void;
}

/**
 * Initializes the unified back button handler for both mobile WebView (Capacitor)
 * and mobile browsers / PWAs (popstate).
 */
export function initBackButton({
  getCurrentPage,
  onNavigateHome,
  onShowToast,
}: BackButtonOptions): () => void {
  if (isInitialized) return () => {};
  isInitialized = true;

  const handleBackAction = async () => {
    // 1. If any modal or sheet has registered a back handler, call the topmost one
    while (handlerStack.length > 0) {
      const topHandler = handlerStack.pop();
      if (topHandler) {
        try {
          const handled = topHandler();
          if (handled) {
            return; // Modal closed successfully, stop here
          }
        } catch (e) {
          console.error('Error in back handler:', e);
        }
      }
    }

    // 2. If not on home page, navigate back to home page
    const currentPage = getCurrentPage();
    if (currentPage !== 'home') {
      onNavigateHome();
      return;
    }

    // 3. If already on home page with no open modals, handle double-press to exit
    const now = Date.now();
    if (now - lastBackTime < 2000) {
      try {
        await CapApp.exitApp();
      } catch (e) {
        // In browser, cannot exit window; no-op
      }
    } else {
      lastBackTime = now;
      onShowToast('অ্যাপ বন্ধ করতে আবার ব্যাক বাটন চাপুন');
    }
  };

  // Capacitor hardware back button event
  let capListenerRemove: (() => void) | null = null;
  try {
    CapApp.addListener('backButton', () => {
      handleBackAction();
    }).then((listener) => {
      capListenerRemove = () => listener.remove();
    }).catch(() => {
      // Not in Capacitor environment
    });
  } catch (e) {
    // Capacitor not supported in this runtime
  }

  // Browser / PWA popstate event
  const onPopState = () => {
    handleBackAction();
  };
  window.addEventListener('popstate', onPopState);

  return () => {
    isInitialized = false;
    window.removeEventListener('popstate', onPopState);
    if (capListenerRemove) {
      capListenerRemove();
    }
  };
}

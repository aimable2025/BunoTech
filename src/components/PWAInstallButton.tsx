import React, { useEffect, useState } from 'react';
import { CheckCircle2, Download, Smartphone, Monitor, WifiOff, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobileAndroid, setIsMobileAndroid] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));
    setIsMobileAndroid(/android/.test(ua));

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isMobileAndroid,
    install,
  };
}

interface PWAInstallButtonProps {
  variant?: 'compact' | 'full';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'compact' }) => {
  const { isInstallable, isInstalled, isIOS, isMobileAndroid, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) {
    if (variant === 'compact') return null;
    return (
      <div className="inline-flex items-center gap-2 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span className="whitespace-nowrap">Application installée</span>
      </div>
    );
  }

  if (isInstallable) {
    const buttonLabel =
      variant === 'full'
        ? isMobileAndroid
          ? 'Installer l’application (Android)'
          : 'Installer BUNO Tech sur le bureau'
        : 'Installer BUNO Tech';

    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-500 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        {isMobileAndroid ? <Smartphone className="w-4 h-4 shrink-0" /> : <Monitor className="w-4 h-4 shrink-0" />}
        <span>{buttonLabel}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowGuideModal(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-4 h-4 shrink-0 text-sky-600" />
          <span>Installer BUNO Tech</span>
        </button>

        {showGuideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-6 border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Installer BUNO Tech sur iPhone / iPad</h3>
                <button
                  type="button"
                  onClick={() => setShowGuideModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <p>1. Appuyez sur le bouton <strong>Partager</strong> dans la barre d’outils de Safari.</p>
                <p>2. Faites défiler et sélectionnez <strong>Sur l’écran d’accueil</strong>.</p>
                <p>3. Confirmez en appuyant sur <strong>Ajouter</strong> en haut à droite.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="mt-6 w-full rounded-lg bg-slate-900 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Compris
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Never show an impossible installation button when beforeinstallprompt is not supported
  return null;
};

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-lg bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg no-print">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Mode Hors-Ligne actif — Données en cache utilisées.</span>
    </div>
  );
};

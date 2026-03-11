import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { GlobalLoadingScreen } from './components/GlobalLoadingScreen';
import { HowToPlayOverlay } from './components/HowToPlayOverlay';
import { PerfDiagnostics } from './components/PerfDiagnostics';
import { SettingsModal } from './components/SettingsModal';
import { HomePage } from './pages/HomePage';
import { SettingsProvider, useSettings } from './systems/settingsContext';
import { installAdsStub } from './systems/ads';
import { installAudioUnlock } from './systems/audioUnlock';
import { installTelemetryBridge } from './systems/telemetry';

const GamePage = lazy(() => import('./pages/GamePage').then((module) => ({ default: module.GamePage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((module) => ({ default: module.ProfilePage })));
const PartyPage = lazy(() => import('./pages/PartyPage').then((module) => ({ default: module.PartyPage })));
const ShopPage = lazy(() => import('./pages/ShopPage').then((module) => ({ default: module.ShopPage })));
const RankedPage = lazy(() => import('./pages/RankedPage').then((module) => ({ default: module.RankedPage })));

function RoutedApp() {
  const { settings } = useSettings();
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [activeHowToPlayGameId, setActiveHowToPlayGameId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const location = useLocation();

  const loadingProgress = useMemo(() => {
    if (location.pathname.startsWith('/play/')) return 65;
    return 35;
  }, [location.pathname]);

  useEffect(() => {
    const handler = () => setShowSettings(true);
    window.addEventListener('gamegrid:open-settings', handler);
    return () => window.removeEventListener('gamegrid:open-settings', handler);
  }, []);

  return (
    <>
      <button
        className="global-help"
        aria-label="Open How to Play"
        onClick={() => {
          setActiveHowToPlayGameId(null);
          setShowHowToPlay(true);
        }}
      >
        ?
      </button>
      <Suspense fallback={<GlobalLoadingScreen progress={loadingProgress} />}>
        <div className="route-shell" key={location.pathname}>
          <Routes location={location}>
            <Route
              path="/"
              element={
                <HomePage
                  onOpenSettings={() => setShowSettings(true)}
                  onOpenHowToPlay={(gameId) => {
                    setActiveHowToPlayGameId(gameId ?? null);
                    setShowHowToPlay(true);
                  }}
                />
              }
            />
            <Route path="/play/:gameId" element={<GamePage />} />
            <Route path="/party" element={<PartyPage />} />
            <Route path="/ranked" element={<RankedPage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Suspense>
      <HowToPlayOverlay
        open={showHowToPlay}
        gameId={activeHowToPlayGameId}
        onClose={() => {
          setShowHowToPlay(false);
          setActiveHowToPlayGameId(null);
        }}
      />
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
      <PerfDiagnostics enabled={settings.perfDiagnostics} />
    </>
  );
}

export default function App() {
  useEffect(() => {
    installAdsStub();
    const stopTelemetry = installTelemetryBridge();
    const cleanup = installAudioUnlock();
    return () => {
      stopTelemetry();
      cleanup();
    };
  }, []);

  return (
    <SettingsProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="portal-root">
          <RoutedApp />
        </div>
      </BrowserRouter>
    </SettingsProvider>
  );
}

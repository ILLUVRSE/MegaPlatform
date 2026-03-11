import { useSettings } from '../systems/settingsContext';
import { THEME_SKINS } from '../systems/themes';
import { Icon } from './Icon';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useSettings();
  if (!open) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Settings">
      <section className="modal-panel">
        <h2>Settings</h2>
        <div className="settings-grid">
          <label>
            <input
              type="checkbox"
              checked={settings.mute}
              onChange={(event) => updateSettings({ mute: event.target.checked })}
            />
            <Icon name="sound" className="inline-icon" /> Sound muted
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.musicMuted}
              onChange={(event) => updateSettings({ musicMuted: event.target.checked })}
            />
            Music muted
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.sfxMuted}
              onChange={(event) => updateSettings({ sfxMuted: event.target.checked })}
            />
            SFX muted
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.haptics}
              onChange={(event) => updateSettings({ haptics: event.target.checked })}
            />
            Haptics feedback
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(event) => updateSettings({ reducedMotion: event.target.checked })}
            />
            Reduced motion
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.largeUi}
              onChange={(event) => updateSettings({ largeUi: event.target.checked })}
            />
            Large UI mode
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.highContrast}
              onChange={(event) => updateSettings({ highContrast: event.target.checked })}
            />
            High contrast
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.colorblindSafe}
              onChange={(event) => updateSettings({ colorblindSafe: event.target.checked })}
            />
            Colorblind-safe accents
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.perfDiagnostics}
              onChange={(event) => updateSettings({ perfDiagnostics: event.target.checked })}
            />
            Perf diagnostics HUD
          </label>
        </div>
        <label className="settings-row">
          Theme mode
          <select value={settings.themeMode} onChange={(event) => updateSettings({ themeMode: event.target.value as typeof settings.themeMode })}>
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <section className="theme-gallery" aria-label="Theme Gallery">
          <h3>Theme Gallery</h3>
          <div className="theme-gallery-grid">
            {THEME_SKINS.map((skin) => (
              <button
                key={skin.id}
                className={`theme-chip${settings.themeSkin === skin.id ? ' active' : ''}`}
                onClick={() => updateSettings({ themeSkin: skin.id })}
              >
                <strong>{skin.label}</strong>
                <span>{skin.blurb}</span>
              </button>
            ))}
          </div>
        </section>
        <button onClick={onClose}>Close</button>
      </section>
    </div>
  );
}

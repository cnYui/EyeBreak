// Safe storage access and the two remembered settings.

export function storageOrNull() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch (error) {
    return null;
  }
}

export const SETTINGS_KEY = 'eyebreak.settings.v1';

export const DEFAULT_SETTINGS = Object.freeze({
  pace: 'normal',
  voice: true
});

export function loadSettings(storage) {
  const settings = Object.assign({}, DEFAULT_SETTINGS);
  if (!storage) return settings;
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    if (typeof raw !== 'string' || raw === '') return settings;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return settings;
    if (parsed.pace === 'normal' || parsed.pace === 'gentle') settings.pace = parsed.pace;
    if (typeof parsed.voice === 'boolean') settings.voice = parsed.voice;
    return settings;
  } catch (error) {
    return settings;
  }
}

export function saveSettings(storage, settings) {
  if (!storage) return false;
  try {
    storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    return false;
  }
}

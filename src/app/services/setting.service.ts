import { Injectable } from '@angular/core';

export type TextScale = 'sm' | 'md' | 'lg';
export type ThemeMode = 'light' | 'dark';

const TEXT_KEY = 'app_text_scale';
const THEME_KEY = 'app_theme';

const SCALE_FACTOR: Record<TextScale, number> = {
  sm: 0.92,
  md: 1,
  lg: 1.12,
};

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private _textScale: TextScale = 'md';
  private _theme: ThemeMode = 'light';

  get textScale(): TextScale {
    return this._textScale;
  }

  get theme(): ThemeMode {
    return this._theme;
  }

  /** Call once on app boot (e.g. AppComponent ngOnInit) to apply saved prefs. */
  init(): void {
    const savedText = localStorage.getItem(TEXT_KEY) as TextScale | null;
    const savedTheme = localStorage.getItem(THEME_KEY) as ThemeMode | null;
    if (savedText && savedText in SCALE_FACTOR) this._textScale = savedText;
    if (savedTheme === 'light' || savedTheme === 'dark')
      this._theme = savedTheme;
    this.applyTextScale();
    this.applyTheme();
  }

  setTextScale(scale: TextScale): void {
    this._textScale = scale;
    localStorage.setItem(TEXT_KEY, scale);
    this.applyTextScale();
  }

  setTheme(theme: ThemeMode): void {
    this._theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    this.applyTheme();
  }

  private applyTextScale(): void {
    document.documentElement.style.setProperty(
      '--app-text-scale',
      String(SCALE_FACTOR[this._textScale]),
    );
  }

  private applyTheme(): void {
    // Plumbing only for now — full dark styling needs color tokens migrated.
    document.documentElement.setAttribute('data-theme', this._theme);
  }
}

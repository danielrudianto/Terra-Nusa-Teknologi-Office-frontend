import { Injectable } from '@angular/core';

export type TextScale = 'sm' | 'md' | 'lg';
export type ThemeMode = 'light' | 'dark';
export type BrandColor =
  | 'blue'
  | 'indigo'
  | 'teal'
  | 'green'
  | 'amber'
  | 'rose';

/** Palette: [base, soft tint] for each selectable brand colour. */
export const BRAND_COLORS: Record<
  BrandColor,
  {
    base: string;
    soft: string;
    strong: string;
    baseDark: string;
    softDark: string;
    strongDark: string;
    label: string;
  }
> = {
  // base/soft dipakai di tema terang, baseDark/softDark di tema gelap.
  // Tanpa varian gelap, tint terang akan menimpa token dark dan teks jadi
  // terang-di-atas-terang (tidak terbaca).
  blue: {
    base: '#154dec',
    soft: '#e7ecfb',
    strong: '#0f3fd0',
    baseDark: '#7ba0ff',
    softDark: '#22304f',
    strongDark: '#9db8ff',
    label: 'Blue',
  },
  indigo: {
    base: '#5b3df5',
    soft: '#ece8fe',
    strong: '#4830c4',
    baseDark: '#a394ff',
    softDark: '#2b2350',
    strongDark: '#bcb1ff',
    label: 'Indigo',
  },
  teal: {
    base: '#0d9488',
    soft: '#dcf5f2',
    strong: '#0a746b',
    baseDark: '#5eddd0',
    softDark: '#14403c',
    strongDark: '#8ae9df',
    label: 'Teal',
  },
  green: {
    base: '#15803d',
    soft: '#e2f5e9',
    strong: '#106430',
    baseDark: '#6ee7a0',
    softDark: '#163a26',
    strongDark: '#9df0c0',
    label: 'Green',
  },
  amber: {
    base: '#b45309',
    soft: '#fdefdc',
    strong: '#8d4107',
    baseDark: '#f0b464',
    softDark: '#43301a',
    strongDark: '#f7cd93',
    label: 'Amber',
  },
  rose: {
    base: '#be123c',
    soft: '#fde7ec',
    strong: '#960e30',
    baseDark: '#ff8ba5',
    softDark: '#431c28',
    strongDark: '#ffb3c4',
    label: 'Rose',
  },
};

const TEXT_KEY = 'app_text_scale';
const THEME_KEY = 'app_theme';
const BRAND_KEY = 'app_brand_color';

const SCALE_FACTOR: Record<TextScale, number> = {
  sm: 0.92,
  md: 1,
  lg: 1.12,
};

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private _textScale: TextScale = 'md';
  private _theme: ThemeMode = 'light';
  private _brandColor: BrandColor = 'blue';

  get textScale(): TextScale {
    return this._textScale;
  }

  get theme(): ThemeMode {
    return this._theme;
  }

  get brandColor(): BrandColor {
    return this._brandColor;
  }

  get brandColors() {
    return BRAND_COLORS;
  }

  /** Call once on app boot (e.g. AppComponent ngOnInit) to apply saved prefs. */
  init(): void {
    const savedText = localStorage.getItem(TEXT_KEY) as TextScale | null;
    const savedTheme = localStorage.getItem(THEME_KEY) as ThemeMode | null;
    if (savedText && savedText in SCALE_FACTOR) this._textScale = savedText;
    if (savedTheme === 'light' || savedTheme === 'dark')
      this._theme = savedTheme;
    const savedBrand = localStorage.getItem(BRAND_KEY) as BrandColor | null;
    if (savedBrand && savedBrand in BRAND_COLORS) this._brandColor = savedBrand;
    this.applyTextScale();
    this.applyTheme();
    this.applyBrandColor();
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
    // token brand punya varian per tema, jadi harus dihitung ulang
    this.applyBrandColor();
  }

  setBrandColor(color: BrandColor): void {
    if (!(color in BRAND_COLORS)) return;
    this._brandColor = color;
    localStorage.setItem(BRAND_KEY, color);
    this.applyBrandColor();
  }

  private applyBrandColor(): void {
    const c = BRAND_COLORS[this._brandColor];
    const dark = this._theme === 'dark';
    const root = document.documentElement;
    const base = dark ? c.baseDark : c.base;
    const soft = dark ? c.softDark : c.soft;
    const strong = dark ? c.strongDark : c.strong;

    root.style.setProperty('--brand', base);
    root.style.setProperty('--brand-soft', soft);
    root.style.setProperty('--brand-strong', strong);

    // Tombol/menu aktif (mis. item side navigation) memakai token sendiri,
    // tetapi maknanya turunan brand — ikut diganti agar seluruh aplikasi
    // benar-benar berubah warna, bukan hanya sebagian komponen.
    root.style.setProperty('--active-button-color', soft);
    root.style.setProperty('--on-active-button-color', base);

    // Banner selalu memakai warna pekat: teksnya putih di kedua tema.
    root.style.setProperty('--banner-background-color', c.base);
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

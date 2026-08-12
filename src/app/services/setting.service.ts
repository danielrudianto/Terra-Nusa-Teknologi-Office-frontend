import { Injectable, signal } from '@angular/core';

export type TextScale = 'sm' | 'md' | 'lg';
export type ThemeMode = 'light' | 'dark';
/** Jumlah baris per halaman pada seluruh daftar. */
export type PageSize = 10 | 25 | 50 | 100;

export const PAGE_SIZES: PageSize[] = [10, 25, 50, 100];

/** Kerapatan baris tabel. */
export type Density = 'normal' | 'compact';

export type BrandColor =
  | 'blue'
  | 'indigo'
  | 'teal'
  | 'green'
  | 'amber'
  | 'rose'
  | 'sky'
  | 'cyan'
  | 'emerald'
  | 'lime'
  | 'orange'
  | 'red'
  | 'fuchsia'
  | 'violet'
  | 'slate';

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
  sky: {
    base: '#0284c7',
    soft: '#e1f0f8',
    strong: '#026ca3',
    baseDark: '#5fc5f9',
    softDark: '#143145',
    strongDark: '#93d6f8',
    label: 'Sky',
  },
  cyan: {
    base: '#0891b2',
    soft: '#e1f2f6',
    strong: '#077792',
    baseDark: '#56d5f3',
    softDark: '#153340',
    strongDark: '#88dff3',
    label: 'Cyan',
  },
  emerald: {
    base: '#059669',
    soft: '#e1f2ed',
    strong: '#047b56',
    baseDark: '#37f3b9',
    softDark: '#143432',
    strongDark: '#6bf2c8',
    label: 'Emerald',
  },
  lime: {
    base: '#4d7c0f',
    soft: '#eaefe2',
    strong: '#3f660c',
    baseDark: '#99e238',
    softDark: '#232f20',
    strongDark: '#afe568',
    label: 'Lime',
  },
  orange: {
    base: '#c2410c',
    soft: '#f8e8e2',
    strong: '#9f350a',
    baseDark: '#f2926b',
    softDark: '#3a231f',
    strongDark: '#f4b69c',
    label: 'Orange',
  },
  red: {
    base: '#b91c1c',
    soft: '#f7e4e4',
    strong: '#981717',
    baseDark: '#e87c7c',
    softDark: '#381c22',
    strongDark: '#eea9a9',
    label: 'Red',
  },
  fuchsia: {
    base: '#a21caf',
    soft: '#f4e4f5',
    strong: '#851790',
    baseDark: '#db74e5',
    softDark: '#341c40',
    strongDark: '#e5a2eb',
    label: 'Fuchsia',
  },
  violet: {
    base: '#7c3aed',
    soft: '#efe7fd',
    strong: '#6630c2',
    baseDark: '#af88f1',
    softDark: '#2c224c',
    strongDark: '#c8aff3',
    label: 'Violet',
  },
  slate: {
    base: '#475569',
    soft: '#e9ebed',
    strong: '#3a4656',
    baseDark: '#8e9cb1',
    softDark: '#212732',
    strongDark: '#adb7c5',
    label: 'Slate',
  },
};

const TEXT_KEY = 'app_text_scale';
const THEME_KEY = 'app_theme';
const BRAND_KEY = 'app_brand_color';
const PAGE_SIZE_KEY = 'app_page_size';
const DENSITY_KEY = 'app_density';
const GUIDE_FAB_KEY = 'app_guide_fab';

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
  private _pageSize: PageSize = 10;
  private _density: Density = 'normal';
  /**
   * Tombol panduan melayang. Menyala secara bawaan.
   *
   * Sinyal, bukan field biasa: tombolnya memakai `computed`, dan `computed`
   * hanya menghitung ulang bila sinyal yang dibacanya berubah. Sebagai field
   * biasa, sakelarnya tidak akan berpengaruh sampai halaman dimuat ulang.
   */
  private readonly _guideFab = signal(true);

  get textScale(): TextScale {
    return this._textScale;
  }

  get theme(): ThemeMode {
    return this._theme;
  }

  get brandColor(): BrandColor {
    return this._brandColor;
  }

  /**
   * Jumlah baris per halaman. Sebelumnya tiap daftar menetapkan 10 sendiri,
   * sehingga pilihan pengguna hilang begitu berpindah halaman.
   */
  get pageSize(): PageSize {
    return this._pageSize;
  }

  setPageSize(value: PageSize): void {
    this._pageSize = value;
    localStorage.setItem(PAGE_SIZE_KEY, String(value));
  }

  readonly guideFab = this._guideFab.asReadonly();

  setGuideFab(value: boolean): void {
    this._guideFab.set(value);
    try {
      localStorage.setItem(GUIDE_FAB_KEY, value ? '1' : '0');
    } catch {
      // Mode penyamaran: cukup berlaku sesi ini.
    }
  }

  get density(): Density {
    return this._density;
  }

  setDensity(value: Density): void {
    this._density = value;
    localStorage.setItem(DENSITY_KEY, value);
    this.applyDensity();
  }

  /** Kerapatan dipasang sebagai atribut agar bisa dipakai seluruh stylesheet. */
  private applyDensity(): void {
    document.documentElement.setAttribute('data-density', this._density);
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
    const savedPageSize = Number(localStorage.getItem(PAGE_SIZE_KEY));
    if (PAGE_SIZES.includes(savedPageSize as PageSize)) {
      this._pageSize = savedPageSize as PageSize;
    }

    // Hanya '0' yang mematikan; nilai lain atau kosong tetap menyala.
    this._guideFab.set(localStorage.getItem(GUIDE_FAB_KEY) !== '0');

    const savedDensity = localStorage.getItem(DENSITY_KEY) as Density | null;
    if (savedDensity === 'normal' || savedDensity === 'compact') {
      this._density = savedDensity;
    }

    this.applyTextScale();
    this.applyTheme();
    this.applyBrandColor();
    this.applyDensity();
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

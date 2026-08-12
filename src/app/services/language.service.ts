import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type AppLang = 'en' | 'id' | 'zh';

export interface LangOption {
  code: AppLang;
  label: string;
  native: string;
  short: string;
  flag: string;
}

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly STORAGE_KEY = 'app_lang';
  private readonly DEFAULT_LANG: AppLang = 'id';

  private translate = inject(TranslateService);

  readonly languages: LangOption[] = [
    {
      code: 'id',
      label: 'Indonesia',
      native: 'Bahasa Indonesia',
      short: 'ID',
      flag: '🇮🇩',
    },
    {
      code: 'en',
      label: 'English',
      native: 'English',
      short: 'EN',
      flag: '🇬🇧',
    },
    { code: 'zh', label: '中文', native: '简体中文', short: '中', flag: '🇨🇳' },
  ];

  /** Panggil sekali saat app start (mis. di AppComponent). */
  init(): void {
    const codes = this.languages.map((l) => l.code);
    this.translate.addLangs(codes);
    // `setFallbackLang`, bukan `setDefaultLang`: yang lama deprecated sejak
    // v17. Perilakunya sama — bahasa yang dipakai bila kunci tidak ada di
    // bahasa aktif.
    this.translate.setFallbackLang(this.DEFAULT_LANG);
    this.translate.use(this.current);
  }

  get current(): AppLang {
    const saved = localStorage.getItem(this.STORAGE_KEY) as AppLang | null;
    if (saved && this.languages.some((l) => l.code === saved)) {
      return saved;
    }
    return this.DEFAULT_LANG;
  }

  get currentOption(): LangOption {
    return (
      this.languages.find((l) => l.code === this.current) ?? this.languages[0]
    );
  }

  use(lang: AppLang): void {
    localStorage.setItem(this.STORAGE_KEY, lang);
    this.translate.use(lang);
  }
}

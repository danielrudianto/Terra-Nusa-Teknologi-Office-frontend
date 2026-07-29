import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import {
  AppLang,
  LangOption,
  LanguageService,
} from '../../services/language.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [
    CommonModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './language-switcher.component.html',
  styleUrl: './language-switcher.component.scss',
})
export class LanguageSwitcherComponent {
  constructor(private lang: LanguageService) {}

  get languages(): LangOption[] {
    return this.lang.languages;
  }

  get current(): LangOption {
    return this.lang.currentOption;
  }

  isActive(code: AppLang): boolean {
    return this.lang.current === code;
  }

  select(code: AppLang): void {
    this.lang.use(code);
  }
}

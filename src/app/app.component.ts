import { Component } from '@angular/core';
import { SettingsService } from './services/setting.service';
import { LanguageService } from './services/language.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(
    public settings: SettingsService,
    private language: LanguageService,
  ) {}

  ngOnInit(): void {
    this.settings.init();
    this.language.init();
  }

  title = 'TerraBot | PT. Alpha Konstruksi Nusantara';
}

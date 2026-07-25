import { Component } from '@angular/core';
import { SettingsService } from './services/setting.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  standalone: false,
})
export class AppComponent {
  constructor(public settings: SettingsService) {}

  ngOnInit(): void {
    this.settings.init();
  }

  title = 'terra-nusa-teknologi-office-frontend';
}

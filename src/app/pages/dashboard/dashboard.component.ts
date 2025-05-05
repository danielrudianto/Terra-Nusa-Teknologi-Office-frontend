import { Component, HostListener } from '@angular/core';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent {
  ctrlFPressed: Subject<void> = new Subject<void>();

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (event.ctrlKey && (event.key === 'f' || event.key === 'F')) {
      event.preventDefault(); // prevent default browser find dialog
      console.log('Ctrl+F pressed!');

      this.ctrlFPressed.next();
    }
  }
}

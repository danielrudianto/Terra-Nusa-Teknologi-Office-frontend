import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { CreateNewPileComponent } from '../create-new-pile/create-new-pile.component';

@Component({
  selector: 'app-engineering-project-view',
  imports: [MatButtonModule],
  templateUrl: './engineering-project-view.component.html',
  styleUrl: './engineering-project-view.component.scss',
})
export class EngineeringProjectViewComponent {
  constructor(private dialog: MatDialog) {}

  createNewPile() {
    this.dialog
      .open(CreateNewPileComponent, {})
      .afterClosed()
      .subscribe((data) => {
        if (data) {
        }
      });
  }
}

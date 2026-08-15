import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { AuditTrailComponent } from '../../../../components/audit-trail/audit-trail.component';
import { DialogGeserDirective } from '../../../../directives/dialog-geser.directive';

@Component({
  selector: 'app-expense-opponent-view',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
    AuditTrailComponent,
    DialogGeserDirective,
  ],
  templateUrl: './expense-opponent-view.component.html',
  styleUrl: './expense-opponent-view.component.scss',
})
export class ExpenseOpponentViewComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { opponent: any },
    private dialog: MatDialogRef<ExpenseOpponentViewComponent>,
  ) {}

  get opponent(): any {
    return this.data?.opponent ?? {};
  }

  onEdit(): void {
    this.dialog.close({ action: 'edit', opponent: this.opponent });
  }

  onClose(): void {
    this.dialog.close();
  }
}

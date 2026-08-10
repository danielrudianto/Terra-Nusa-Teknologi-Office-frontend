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

@Component({
  selector: 'app-master-equipment-view',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
    AuditTrailComponent,
  ],
  templateUrl: './master-equipment-view.component.html',
  styleUrl: './master-equipment-view.component.scss',
})
export class MasterEquipmentViewComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { equipment: any },
    private dialog: MatDialogRef<MasterEquipmentViewComponent>,
  ) {}

  get equipment(): any {
    return this.data?.equipment ?? {};
  }

  onClose(): void {
    this.dialog.close();
  }
}

import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatDialogModule } from '@angular/material/dialog';
import { FLEET_OPTIONS, FleetOption } from '../../constants/fleet';
import { FleetIconComponent } from '../fleet-icon/fleet-icon.component';

@Component({
  selector: 'app-fleet-info-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, FleetIconComponent],
  templateUrl: './fleet-info-dialog.component.html',
  styleUrl: './fleet-info-dialog.component.scss',
})
export class FleetInfoDialogComponent {
  fleets: FleetOption[] = FLEET_OPTIONS;
}

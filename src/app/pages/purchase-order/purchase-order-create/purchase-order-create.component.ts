import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ApiService } from '../../../services/api.service';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-purchase-order-create',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatGridListModule,
    MatCardModule,
    MatButtonModule,
    RouterModule,
  ],
  templateUrl: './purchase-order-create.component.html',
  styleUrl: './purchase-order-create.component.scss',
})
export class PurchaseOrderCreateComponent {
  constructor(
    private apiService: ApiService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  projectTiles = [
    {
      type: 'A',
      title: 'Transportation',
      description:
        'Purchase orders used to create transportation expenses, such as Trucking, Delivery, Crane, etc.',
      link: 'A',
    },
    {
      type: 'B',
      title: 'Equipment rental',
      description:
        'Purchase orders used to create equipment rental expenses, such as Crane, Excavator, etc.',
      link: 'B',
    },
    {
      type: 'C',
      title: 'Fuel',
      description: 'Purchase orders used for fuel expenses',
      link: 'C',
    },
    {
      type: 'D',
      title: 'Manpower',
      description: 'Purchase orders used for manpower expenses',
      link: 'D',
    },
    {
      type: 'E',
      title: 'Consumption; Coordination; and Accomodation',
      description:
        'Purchase orders used for consumption, coordination, and accomodation expenses, such as renting a house, etc.',
      link: 'E',
    },
    {
      type: 'F',
      title: 'Material',
      description:
        'Purchase orders used for material purchases such as concrete , steel, etc.',
      link: 'F',
    },
    {
      type: 'G',
      title: 'Equipments',
      description:
        'Purchase orders used for equipment purchases such as hammer, hoe, boots, etc.',
      link: 'G',
    },
  ];

  officeTiles = [
    {
      type: '5.1.1',
      title: 'Asset acquisition',
      description: 'Purchase orders used to create Asset purchases expense',
      link: '5.1.1',
    },
    {
      type: '5.1.2',
      title: 'Asset maintenance',
      description: 'Purchase orders used to create Asset maintenance expense',
      link: '5.1.2',
    },
    {
      type: '5.1.6',
      title: 'Office supplies',
      description: 'Purchase orders used to create Office supplies expense',
      link: '5.1.6',
    },
    {
      type: '5.1.12',
      title: 'Software purchase',
      description: 'Purchase orders used to create Software purchase expense',
      link: '5.1.12',
    },
    {
      type: '6.3.1',
      title: 'Advertising purchase',
      description: 'Purchase orders used to create advertising expense',
      link: '6.3.1',
    },
    {
      type: '6.3.2',
      title: 'Promotional merchandise purchase',
      description: 'Purchase orders used to create merchendise expense',
      link: '6.3.2',
    },
    {
      type: '6.4.1',
      title: 'Legal document',
      description:
        'Purchase orders used to create legal document expense, i.e. Akta, SBU, etc.',
      link: '6.4.1',
    },
    {
      type: '6.4.2',
      title: 'Insurance',
      description: 'Purchase orders used to create insurance document expense',
      link: '6.4.2',
    },
    {
      type: '6.5.1',
      title: 'Recruitment',
      description: 'Purchase orders used to create recruitment expense',
      link: '6.5.1',
    },
    {
      type: '6.5.2',
      title: 'Training',
      description: 'Purchase orders used to create training expense',
      link: '6.5.2',
    },
  ];

  onCreatePurchaseOrder(type: string) {
    switch (type) {
      case 'G':
        this.router.navigate(['G'], {
          relativeTo: this.route,
        });
        break;
      case 'F':
        this.router.navigate(['F'], {
          relativeTo: this.route,
        });
        break;
      case '5.1.6':
        this.router.navigate(['516'], {
          relativeTo: this.route,
        });
        break;
      case 'A':
        this.router.navigate(['A'], {
          relativeTo: this.route,
        });
        break;
      case 'B':
        this.router.navigate(['B'], {
          relativeTo: this.route,
        });
        break;
      case 'C':
        this.router.navigate(['C'], {
          relativeTo: this.route,
        });
        break;
      case 'D':
        this.router.navigate(['D'], {
          relativeTo: this.route,
        });
        break;
    }
  }
}

// 5\.1\.6|5\.1\.7|6\.3\.1|6\.3\.2|5\.1\.12|6\.4\.1|6\.4\.2|6\.5\.1

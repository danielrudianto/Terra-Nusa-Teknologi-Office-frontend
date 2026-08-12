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
import { TranslatePipe } from '@ngx-translate/core';

/** Satu kartu pilihan jenis PO. */
interface PoTile {
  type: string;
  title: string;
  description: string;
  link?: string;
  /** Formulirnya belum dibuat; kartunya ditampilkan tanpa tautan. */
  comingSoon?: boolean;
}

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
    TranslatePipe,
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

  projectTiles: PoTile[] = [
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
    {
      type: 'H',
      title: 'Subcontracted work',
      description:
        'Pekerjaan yang dikerjakan pihak ketiga, dengan harga satuan atau borongan.',
    },
  ];

  officeTiles: PoTile[] = [
    {
      type: '5.1.1',
      title: 'Asset acquisition',
      description: 'Purchase orders used to create Asset purchases expense',
      link: '511',
    },
    {
      type: '5.1.2',
      title: 'Asset maintenance',
      description: 'Purchase orders used to create Asset maintenance expense',
      link: '512',
    },
    {
      type: '5.1.6',
      title: 'Office supplies',
      description: 'Purchase orders used to create Office supplies expense',
      link: '516',
    },
    {
      type: '5.1.12',
      title: 'Software purchase',
      description: 'Purchase orders used to create Software purchase expense',
      link: '5112',
    },
    {
      type: '6.3.1',
      title: 'Advertising purchase',
      description: 'Purchase orders used to create advertising expense',
      link: '631',
    },
    {
      type: '6.3.2',
      title: 'Promotional merchandise purchase',
      description: 'Purchase orders used to create merchendise expense',
      link: '632',
    },
    {
      type: '6.4.1',
      title: 'Legal document',
      description:
        'Purchase orders used to create legal document expense, i.e. Akta, SBU, etc.',
      link: '641',
    },
    {
      type: '6.4.2',
      title: 'Insurance',
      description: 'Purchase orders used to create insurance document expense',
      link: '642',
      // Formulirnya belum dibuat; ditandai agar tidak mengarah ke alamat
      // yang tidak ada.
      comingSoon: true,
    },
    {
      type: '6.5.1',
      title: 'Recruitment',
      description: 'Purchase orders used to create recruitment expense',
      link: '651',
    },
    {
      type: '6.5.2',
      title: 'Training',
      description: 'Purchase orders used to create training expense',
      link: '652',
      // Formulirnya belum dibuat; ditandai agar tidak mengarah ke alamat
      // yang tidak ada.
      comingSoon: true,
    },
  ];

  onCreatePurchaseOrder(type: string) {
    switch (type) {
      case '5.1.1':
        this.router.navigate(['511'], {
          relativeTo: this.route,
        });
        break;
      case '5.1.2':
        this.router.navigate(['512'], {
          relativeTo: this.route,
        });
        break;
      case '5.1.6':
        this.router.navigate(['516'], {
          relativeTo: this.route,
        });
        break;
      case '5.1.12':
        this.router.navigate(['5112'], {
          relativeTo: this.route,
        });
        break;
      case '6.3.1':
        this.router.navigate(['631'], {
          relativeTo: this.route,
        });
        break;
      case '6.3.2':
        this.router.navigate(['632'], {
          relativeTo: this.route,
        });
        break;
      case '6.4.1':
        this.router.navigate(['641'], {
          relativeTo: this.route,
        });
        break;
      case '6.5.1':
        this.router.navigate(['651'], {
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
      case 'F':
        this.router.navigate(['F'], {
          relativeTo: this.route,
        });
        break;
      case 'H':
        this.router.navigate(['H'], { relativeTo: this.route });
        break;
      case 'G':
        this.router.navigate(['G'], {
          relativeTo: this.route,
        });
        break;
    }
  }
}

// 5\.1\.6|5\.1\.7|6\.3\.1|6\.3\.2|5\.1\.12|6\.4\.1|6\.4\.2|6\.5\.1

import { PurchaseTypeTile } from '../model/purchase-order-tile.model';

/**
 * Daftar jenis PO yang bisa dibuat.
 *
 * Dipisahkan dari komponen agar halaman pemilih dan dialog pemilih memakai
 * sumber yang sama — menambah jenis baru cukup sekali di sini.
 */

export const PROJECT_TILES: PurchaseTypeTile[] = [
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
    link: 'H',
  },
];

export const OFFICE_TILES: PurchaseTypeTile[] = [
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

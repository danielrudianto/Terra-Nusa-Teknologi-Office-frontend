/**
 * Halaman-halaman di dalam Data Master — SATU daftar untuk menu Data Master
 * dan pencarian global (Ctrl+K). Halaman ini tidak ada di menu samping
 * (tersarang di bawah "Data Master"), jadi tanpa daftar bersama pencarian
 * global tidak pernah menemukan "Klien" atau "Pemasok".
 */
export interface MasterNavItem {
  /**
   * Modul izin yang menentukan boleh tidaknya menu ini dibuka.
   *
   * Dipakai untuk MENONAKTIFKAN, bukan menyembunyikan: yang tidak punya
   * akses tetap perlu tahu bahwa halamannya ada — supaya ia meminta akses
   * kepada yang berwenang alih-alih mengira sistemnya kurang lengkap.
   */
  modul: string;
  name: string;
  route: string;
  icon: string;
  description: string;
}

export const MASTER_NAV: MasterNavItem[] = [
  {
    name: 'masterNav.equipment',
    route: 'Equipment',
    modul: 'master_equipment',
    icon: 'construction',
    description: 'masterNav.equipmentDesc',
  },
  {
    name: 'masterNav.item',
    route: 'Item',
    modul: 'master_item',
    icon: 'inventory_2',
    description: 'masterNav.itemDesc',
  },
  {
    name: 'masterNav.expenseOpponent',
    route: 'Expense-opponent',
    modul: 'expense_opponent',
    icon: 'groups',
    description: 'masterNav.expenseOpponentDesc',
  },
  {
    name: 'masterNav.supplier',
    route: 'Supplier',
    modul: 'supplier',
    icon: 'local_shipping',
    description: 'masterNav.supplierDesc',
  },
  {
    name: 'masterNav.client',
    route: 'Client',
    modul: 'client',
    icon: 'handshake',
    description: 'masterNav.clientDesc',
  },
  {
    name: 'masterNav.employee',
    route: 'Employee',
    modul: 'employees',
    icon: 'badge',
    description: 'masterNav.employeeDesc',
  },
];

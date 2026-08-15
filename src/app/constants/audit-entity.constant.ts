/**
 * Entitas yang dicatat pada jejak audit.
 *
 * Nilainya harus sama persis dengan nama tabel di basis data — pencatat di
 * server memakai nama tabel, sehingga penyaring yang memakai bentuk jamak
 * buatan sendiri tidak akan menemukan apa pun.
 */
export const AuditTrailEntities: string[] = [
  'purchase_orders',
  'purchases',
  'expenses',
  'income',
  'reimbursements',
  'salary_slips',
  'sales_invoices',
  'payment_outgoing',
  'payment_incoming',
  'interpayments',
  'loans',
  'assets',
  'master_item',
  'master_equipment',
  'suppliers',
  'clients',
  'expense_opponents',
  'bank_accounts',
  'users',

  /*
   * Ditambahkan belakangan; ketujuhnya sudah dicatat server tetapi tidak
   * dapat disaring di halaman Aktivitas.
   *
   * Jejaknya tersimpan dan tetap muncul pada daftar tak tersaring — yang
   * hilang hanya cara mempersempitnya, dan itu justru diperlukan ketika
   * daftarnya sudah panjang.
   */
  'projects',
  'project_contracts',
  'purchase_draft',
  'employees',
  'employee_profiles',
  'employee_form_submissions',
  'employee_form_versions',
];

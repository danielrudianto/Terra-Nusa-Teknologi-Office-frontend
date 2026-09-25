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
  // Kemajuan pekerjaan proyek — satu titik kurva per baris.
  'project_progress',
  'purchase_draft',
  'employees',
  'employee_profiles',
  'employee_form_submissions',
  'employee_form_versions',
  /*
   * Rencana kas. Server sudah mencatat buat/ubah/hapus-nya sejak awal
   * (`PaymentPlanRepository`), tetapi entitasnya tidak pernah terdaftar di
   * sini — sehingga jejaknya tersimpan namun tidak dapat dicari.
   */
  'payment_plans',

  /*
   * Tender dan penawarannya.
   *
   * `TenderRepository` mencatat keduanya sejak awal — tender dibuat, diubah,
   * disebarkan, dibatalkan, pemenang ditetapkan; penawaran dicatat, diubah,
   * dihapus — tetapi tidak satu pun terdaftar di sini, sehingga jejaknya
   * tersimpan tanpa dapat dicari.
   *
   * Keduanya terpisah dengan sengaja: harga penawaran yang direvisi setelah
   * perbandingan dibaca adalah persoalan yang berbeda dari tendernya
   * dibatalkan, dan menyatukannya menenggelamkan yang satu di antara yang
   * lain.
   */
  'tenders',
  'tender_quotes',

  // Dicatat server tetapi belum terdaftar (ketahuan dari halaman Aktivitas
  // yang menampilkan "auditEntity.hr_candidates" mentah).
  'certificate_of_payments',
  'hr_candidates',
  'hr_questions',
  'user_permissions',

  /*
   * Agenda (pengingat).
   *
   * Server TIDAK mencatatnya sama sekali sampai sekarang — beda dengan yang
   * di atas, yang hanya tidak terdaftar di sini. Pencatatnya ditambahkan di
   * `ReminderRepository`; entitasnya didaftarkan di sini supaya jejaknya
   * dapat dicari, bukan hanya terbaca dari dalam dialog pengingatnya.
   *
   * Nama tabelnya `reminders`, bukan `agenda`: agenda adalah layarnya —
   * gabungan pengingat, ulang tahun, dan tanggal dari modul lain — dan yang
   * dicatat cuma pengingat, satu-satunya yang memang punya barisnya sendiri.
   */
  'reminders',
];

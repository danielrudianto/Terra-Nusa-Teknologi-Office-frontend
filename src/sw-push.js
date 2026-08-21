/*
 * Service worker — HANYA untuk Web Push.
 *
 * Bukan service worker PWA yang men-cache aplikasi: satu-satunya tugasnya
 * menerima pesan push saat aplikasi TERTUTUP dan menampilkannya sebagai
 * notifikasi, lalu membuka halaman yang tepat ketika notifikasinya diketuk.
 *
 * Tidak meng-cache apa pun dengan sengaja — meng-cache aplikasi keuangan yang
 * salah versi jauh lebih berbahaya daripada manfaatnya, dan itu di luar
 * lingkup fitur ini.
 */

// Aktif segera, tanpa menunggu tab lama tertutup.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) =>
  event.waitUntil(self.clients.claim()),
);

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: 'TerraBot', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'TerraBot';
  const options = {
    body: data.body || '',
    icon: '/assets/icons/icon-192.png',
    badge: '/assets/icons/badge-72.png',
    // `tag` menggabungkan notifikasi yang sama supaya tidak menumpuk; PO yang
    // sama tidak muncul dua kali sebagai dua notifikasi terpisah.
    tag: data.tag || undefined,
    renotify: !!data.tag,
    // Alamat tujuan disimpan pada notifikasinya, dibaca saat diketuk.
    data: { url: data.url || '/' },
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const tujuan = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    (async () => {
      const semua = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      // Kalau aplikasinya sudah terbuka, arahkan tab itu — jangan membuka
      // jendela kedua yang membingungkan.
      for (const klien of semua) {
        try {
          await klien.focus();
          if ('navigate' in klien) {
            await klien.navigate(tujuan);
          }
          return;
        } catch (_) {
          /* lanjut coba yang lain / buka baru */
        }
      }
      await self.clients.openWindow(tujuan);
    })(),
  );
});

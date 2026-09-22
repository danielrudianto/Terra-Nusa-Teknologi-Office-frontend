import { MatDialogConfig } from '@angular/material/dialog';

/**
 * Buka dialog RINCIAN sebagai panel samping — meluncur dari kanan, setinggi
 * layar, dengan daftarnya tetap terlihat di sebelah kiri.
 *
 *   this.dialog.open(LoansViewComponent, panelSamping({ data: { id } }));
 *
 * Untuk rincian ringkas yang dibuka dari klik baris. Pratinjau DOKUMEN (PO,
 * profil karyawan bertab) tetap dialog di tengah: keduanya butuh lebar, dan
 * panel 560px memaksanya menggulir ke samping.
 *
 * Kelas `akn-panel-samping` yang menggerakkan dan membentuknya ada di
 * styles.scss; `appDialogGeser` tidak menyeret panel ini (panel yang
 * menempel di tepi tidak dimaksudkan untuk dipindah).
 */
export function panelSamping<D = any>(config: MatDialogConfig<D> = {}): MatDialogConfig<D> {
  const kelas = config.panelClass
    ? Array.isArray(config.panelClass)
      ? config.panelClass
      : [config.panelClass]
    : [];
  return {
    ...config,
    width: config.width ?? '560px',
    maxWidth: '100vw',
    height: '100vh',
    maxHeight: '100vh',
    position: { top: '0', right: '0' },
    panelClass: [...kelas, 'akn-panel-samping'],
  };
}

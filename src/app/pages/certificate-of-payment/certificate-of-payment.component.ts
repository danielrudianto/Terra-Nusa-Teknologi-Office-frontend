import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

/**
 * Kerangka modul Certificate of Payment.
 *
 * Hanya menampung `router-outlet` — sama seperti kerangka purchase order.
 * Daftarnya, formulirnya, dan layar periksa/setujui masing-masing rute
 * anaknya sendiri sehingga dimuat hanya saat dibuka.
 */
@Component({
  selector: 'app-certificate-of-payment',
  standalone: true,
  imports: [RouterModule],
  template: '<router-outlet />',
})
export class CertificateOfPaymentComponent {}

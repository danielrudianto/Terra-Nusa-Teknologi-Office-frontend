// Ditambal PALING AWAL, sebelum apa pun yang memuat pdf.js.
import './polyfill-promise-try';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';


platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));

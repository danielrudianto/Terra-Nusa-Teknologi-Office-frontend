import { TestBed } from '@angular/core/testing';
import {
  HTTP_INTERCEPTORS,
  HttpClient,
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import {
  CacheDaftarInterceptor,
  kosongkanCacheDaftar,
} from './cache-daftar.interceptor';

describe('CacheDaftarInterceptor', () => {
  let http: HttpClient;
  let ctl: HttpTestingController;

  beforeEach(() => {
    kosongkanCacheDaftar();
    TestBed.configureTestingModule({
      providers: [
        { provide: HTTP_INTERCEPTORS, useClass: CacheDaftarInterceptor, multi: true },
        provideHttpClient(withInterceptorsFromDi()),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    ctl = TestBed.inject(HttpTestingController);
  });
  afterEach(() => ctl.verify());

  const daftar = (hasil: any[]) =>
    http.get('/clients', { params: { page: 1 } }).subscribe((r) => hasil.push(r));

  it('kunjungan kedua: isi lama SEKETIKA, tetap bertanya ke server', () => {
    const a: any[] = [];
    daftar(a);
    ctl.expectOne('/clients?page=1').flush({ data: [1] });
    const b: any[] = [];
    daftar(b);
    expect(b).toEqual([{ data: [1] }]); // sebelum server menjawab
    ctl.expectOne('/clients?page=1').flush({ data: [1, 2] });
    expect(b).toEqual([{ data: [1] }, { data: [1, 2] }]);
  });

  it('jawaban server sama persis: tidak dipancarkan dua kali', () => {
    daftar([]);
    ctl.expectOne('/clients?page=1').flush({ data: [1] });
    const b: any[] = [];
    daftar(b);
    ctl.expectOne('/clients?page=1').flush({ data: [1] });
    expect(b.length).toBe(1);
  });

  it('perubahan data (POST) mengosongkan simpanan', () => {
    daftar([]);
    ctl.expectOne('/clients?page=1').flush({ data: [1] });
    http.post('/clients', {}).subscribe();
    ctl.expectOne('/clients').flush({});
    const b: any[] = [];
    daftar(b);
    expect(b.length).toBe(0); // tidak ada isi basi
    ctl.expectOne('/clients?page=1').flush({ data: [9] });
    expect(b).toEqual([{ data: [9] }]);
  });

  it('bukan daftar (tanpa page): tidak disimpan', () => {
    http.get('/clients/1').subscribe();
    ctl.expectOne('/clients/1').flush({ id: 1 });
    const b: any[] = [];
    http.get('/clients/1').subscribe((r) => b.push(r));
    expect(b.length).toBe(0);
    ctl.expectOne('/clients/1').flush({ id: 1 });
  });

  it('komponen yang mengubah hasilnya tidak mengubah simpanan', () => {
    const a: any[] = [];
    daftar(a);
    ctl.expectOne('/clients?page=1').flush({ data: [1] });
    a[0].data.push(99);
    const b: any[] = [];
    daftar(b);
    expect(b[0]).toEqual({ data: [1] });
    ctl.expectOne('/clients?page=1').flush({ data: [1] });
  });
});

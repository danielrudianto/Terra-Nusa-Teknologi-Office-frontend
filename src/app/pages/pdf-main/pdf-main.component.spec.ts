import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PdfMainComponent } from './pdf-main.component';

describe('PdfMainComponent', () => {
  let component: PdfMainComponent;
  let fixture: ComponentFixture<PdfMainComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PdfMainComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PdfMainComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

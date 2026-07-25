import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoiceUpdateItemComponent } from './invoice-update-item.component';

describe('InvoiceUpdateItemComponent', () => {
  let component: InvoiceUpdateItemComponent;
  let fixture: ComponentFixture<InvoiceUpdateItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvoiceUpdateItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InvoiceUpdateItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

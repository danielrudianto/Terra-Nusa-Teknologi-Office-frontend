import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InvoiceCreateItemComponent } from './invoice-create-item.component';

describe('InvoiceCreateItemComponent', () => {
  let component: InvoiceCreateItemComponent;
  let fixture: ComponentFixture<InvoiceCreateItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InvoiceCreateItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InvoiceCreateItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

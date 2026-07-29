import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IncomeTaxCreateComponent } from './income-tax-create.component';

describe('IncomeTaxCreateComponent', () => {
  let component: IncomeTaxCreateComponent;
  let fixture: ComponentFixture<IncomeTaxCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncomeTaxCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(IncomeTaxCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

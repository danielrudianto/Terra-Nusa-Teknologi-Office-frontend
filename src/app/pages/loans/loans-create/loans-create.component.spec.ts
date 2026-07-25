import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoansCreateComponent } from './loans-create.component';

describe('LoansCreateComponent', () => {
  let component: LoansCreateComponent;
  let fixture: ComponentFixture<LoansCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoansCreateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoansCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

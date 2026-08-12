import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoansUpdateComponent } from './loans-update.component';

describe('LoansUpdateComponent', () => {
  let component: LoansUpdateComponent;
  let fixture: ComponentFixture<LoansUpdateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoansUpdateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoansUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

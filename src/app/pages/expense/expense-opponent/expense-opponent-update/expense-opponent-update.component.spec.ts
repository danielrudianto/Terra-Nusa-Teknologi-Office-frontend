import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpenseOpponentUpdateComponent } from './expense-opponent-update.component';

describe('ExpenseOpponentUpdateComponent', () => {
  let component: ExpenseOpponentUpdateComponent;
  let fixture: ComponentFixture<ExpenseOpponentUpdateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpenseOpponentUpdateComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpenseOpponentUpdateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

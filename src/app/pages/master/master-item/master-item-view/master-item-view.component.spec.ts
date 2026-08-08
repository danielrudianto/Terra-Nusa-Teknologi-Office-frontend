import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasterItemViewComponent } from './master-item-view.component';

describe('MasterItemViewComponent', () => {
  let component: MasterItemViewComponent;
  let fixture: ComponentFixture<MasterItemViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MasterItemViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MasterItemViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

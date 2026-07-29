import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MasterItemFilterComponent } from './master-item-filter.component';

describe('MasterItemFilterComponent', () => {
  let component: MasterItemFilterComponent;
  let fixture: ComponentFixture<MasterItemFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MasterItemFilterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MasterItemFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

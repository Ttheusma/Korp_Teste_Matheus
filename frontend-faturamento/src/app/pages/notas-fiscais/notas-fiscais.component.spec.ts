import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotasFiscaisComponent } from './notas-fiscais.component';

describe('NotasFiscais', () => {
  let component: NotasFiscaisComponent ;
  let fixture: ComponentFixture<NotasFiscaisComponent >;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotasFiscaisComponent ],
    }).compileComponents();

    fixture = TestBed.createComponent(NotasFiscaisComponent );
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

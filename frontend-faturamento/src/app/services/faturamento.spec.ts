import { TestBed } from '@angular/core/testing';

import { Faturamento } from './faturamento';

describe('Faturamento', () => {
  let service: Faturamento;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Faturamento);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

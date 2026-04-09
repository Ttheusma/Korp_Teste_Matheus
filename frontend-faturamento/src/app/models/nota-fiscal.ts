import { Produto } from './produto';

export interface ItemNota {
  produtoId: number;
  produto?: Produto;
  quantidade: number;
}

export interface NotaFiscal {
  id?: number;
  numeracao: number;
  status: 'Aberta' | 'Fechada';
  itens: ItemNota[];
}
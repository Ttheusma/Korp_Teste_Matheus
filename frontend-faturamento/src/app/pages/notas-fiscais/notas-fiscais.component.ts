import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotaFiscal, ItemNota } from '../../models/nota-fiscal';
import { Produto } from '../../models/produto';

@Component({
  selector: 'app-notas-fiscais',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notas-fiscais.component.html',
  styleUrl: './notas-fiscais.component.css'
})
export class NotasFiscaisComponent implements OnInit {
  notas: NotaFiscal[] = [];
  
  
  produtosDisponiveis: Produto[] = [
    { id: 1, codigo: 'PRD-01', descricao: 'Teclado Mecânico', saldo: 10 },
    { id: 2, codigo: 'PRD-02', descricao: 'Mouse Gamer', saldo: 15 }
  ];

  novaNota: NotaFiscal = {
    numeracao: 1,
    status: 'Aberta',
    itens: []
  };

  itemAtual: ItemNota = { produtoId: 0, quantidade: 1 };

  ngOnInit() {
   
  }

  adicionarItem() {
    if (this.itemAtual.produtoId > 0 && this.itemAtual.quantidade > 0) {
      const prod = this.produtosDisponiveis.find(p => p.id == this.itemAtual.produtoId);
      this.novaNota.itens.push({ ...this.itemAtual, produto: prod });
      this.itemAtual = { produtoId: 0, quantidade: 1 };
    }
  }

  salvarNota() {
    if (this.novaNota.itens.length > 0) {
      this.notas.push({ ...this.novaNota });
      
      this.novaNota = {
        numeracao: this.notas.length + 1,
        status: 'Aberta',
        itens: []
      };
    }
  }

  imprimirNota(nota: NotaFiscal) {
    if (nota.status !== 'Aberta') return; 

    
    if (confirm(`Deseja processar e imprimir a Nota Nº ${nota.numeracao}?`)) {
      
     
      nota.status = 'Fechada';

      
      nota.itens.forEach(item => {
        if (item.produto) {
          item.produto.saldo -= item.quantidade;
        }
      });

      alert(`Nota Nº ${nota.numeracao} impressa com sucesso! O estoque foi atualizado.`);
    }
  }
}
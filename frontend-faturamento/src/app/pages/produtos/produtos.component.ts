import { Component, afterNextRender, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Produto } from '../../models/produto';
import { EstoqueService } from '../../services/estoque.service';

@Component({
  selector: 'app-produtos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './produtos.component.html',
  styleUrl: './produtos.component.css'
})
export class ProdutosComponent {
  produtos: Produto[] = [];
  novoProduto: Produto = { id: 0, codigo: '', descricao: '', saldo: 0 };

  constructor(
    private estoqueService: EstoqueService,
    private cdr: ChangeDetectorRef  
  ) {
    afterNextRender(() => {
      this.carregarProdutos();
    });
  }

  carregarProdutos() {
    this.estoqueService.listarProdutos().subscribe({
      next: (dados) => {
        this.produtos = dados;
        this.cdr.detectChanges(); 
      },
      error: (erro) => console.error('Erro ao buscar produtos', erro)
    });
  }

  salvarProduto() {
    if (this.novoProduto.codigo && this.novoProduto.descricao) {
      this.estoqueService.cadastrarProduto(this.novoProduto).subscribe({
        next: () => {
          alert('✅ Produto salvo com sucesso no Banco de Dados!');
          this.carregarProdutos();
          this.novoProduto = { id: 0, codigo: '', descricao: '', saldo: 0 };
        },
        error: (erro) => {
          console.error('Erro detalhado:', erro);
          alert('❌ Erro no Back-end! O C# recusou o cadastro. Olhe o terminal do seu C#.');
        }
      });
    } else {
      alert('⚠️ Por favor, preencha o Código e a Descrição do produto antes de salvar!');
    }
  }
}
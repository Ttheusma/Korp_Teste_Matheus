import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormGroupDirective
} from '@angular/forms';
import { Subject, of } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';

import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { EstoqueService, Produto } from '../../services/estoque';

@Component({
  selector: 'app-produtos',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatSnackBarModule,
    MatIconModule,
    MatProgressBarModule
  ],
  templateUrl: './produtos.html',
  styleUrl: './produtos.scss'
})
export class ProdutosComponent implements OnInit, OnDestroy {

  
  private readonly destroy$ = new Subject<void>();

  produtos: Produto[] = [];
  displayedColumns = ['codigo', 'descricao', 'saldo', 'acoes'];
  editandoId: number | null = null;
  carregando = false;
  salvando = false;

  form: FormGroup;

  @ViewChild(FormGroupDirective) formDirective!: FormGroupDirective;

  constructor(
    private estoqueService: EstoqueService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      codigo: ['', Validators.required],
      descricao: ['', Validators.required],
      saldo: ['', [Validators.required, Validators.min(0)]]
    });
  }

  

  ngOnInit(): void {
    this.carregarProdutos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

 

  carregarProdutos(): void {
    this.carregando = true;

    this.estoqueService.getProdutos()
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => {
          this.notificar('Erro ao conectar com o serviço de estoque.');
          return of([] as Produto[]);      // fallback: lista vazia, a tela nao quebra
        }),
        finalize(() => {
          this.carregando = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe((dados) => {
        this.produtos = dados;
        this.cdr.detectChanges();
      });
  }

 

  salvar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.salvando) return;

    this.salvando = true;

    const editando = this.editandoId !== null;

    const requisicao = editando
      ? this.estoqueService.atualizarProduto(this.editandoId!, this.form.value)
      : this.estoqueService.criarProduto(this.form.value);

    requisicao
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.salvando = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.notificar(editando ? 'Produto atualizado!' : 'Produto cadastrado!');
          this.editandoId = null;
          this.formDirective.resetForm();
          this.carregarProdutos();
        },
        error: (err) => this.notificar(
          this.mensagemDeErro(err, 'Erro ao salvar produto.')
        )
      });
  }

  editar(produto: Produto): void {
    this.editandoId = produto.id!;
    this.form.setValue({
      codigo: produto.codigo,
      descricao: produto.descricao,
      saldo: produto.saldo
    });
  }

  cancelarEdicao(): void {
    this.editandoId = null;
    this.formDirective.resetForm();
  }

  deletar(id: number): void {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    this.estoqueService.deletarProduto(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificar('Produto excluído!');
          this.carregarProdutos();
        },
        error: (err) => this.notificar(
          this.mensagemDeErro(err, 'Erro ao excluir produto.')
        )
      });
  }

  

  private notificar(mensagem: string): void {
    this.snackBar.open(mensagem, 'Fechar', { duration: 4000 });
  }

  private mensagemDeErro(err: any, padrao: string): string {
    if (err?.status === 0) {
      return 'Não foi possível contatar o servidor. Verifique se os serviços estão no ar.';
    }

    if (typeof err?.error === 'string' && err.error.trim()) {
      return err.error;
    }

    if (err?.error?.errors) {
      const primeiro = Object.values(err.error.errors)[0];
      if (Array.isArray(primeiro) && primeiro.length) {
        return primeiro[0] as string;
      }
    }

    return err?.error?.detail || err?.error?.title || padrao;
  }
}
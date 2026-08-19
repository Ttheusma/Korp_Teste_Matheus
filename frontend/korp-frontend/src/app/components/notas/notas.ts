import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, of, forkJoin } from 'rxjs';
import { takeUntil, catchError, finalize } from 'rxjs/operators';

import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';

import { FaturamentoService, NotaFiscal, ItemNota } from '../../services/faturamento';
import { EstoqueService, Produto } from '../../services/estoque';

@Component({
  selector: 'app-notas',
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
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatSelectModule
  ],
  templateUrl: './notas.html',
  styleUrl: './notas.scss'
})
export class NotasComponent implements OnInit, OnDestroy {

  private readonly destroy$ = new Subject<void>();

  notas: NotaFiscal[] = [];
  produtos: Produto[] = [];
  itensNota: ItemNota[] = [];
  imprimindo: number | null = null;
  carregando = false;
  displayedColumns = ['numero', 'status', 'dataCriacao', 'acoes'];

  itemForm: FormGroup;

  constructor(
    private faturamentoService: FaturamentoService,
    private estoqueService: EstoqueService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    this.itemForm = this.fb.group({
      produtoId: ['', Validators.required],
      quantidade: ['', [Validators.required, Validators.min(1)]]
    });
  }

  
  ngOnInit(): void {
    this.carregarTudo();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  
  carregarTudo(): void {
    this.carregando = true;
    const falhas: string[] = [];

    forkJoin({
      notas: this.faturamentoService.getNotas().pipe(
        catchError(() => {
          falhas.push('faturamento');
          return of([] as NotaFiscal[]);
        })
      ),
      produtos: this.estoqueService.getProdutos().pipe(
        catchError(() => {
          falhas.push('estoque');
          return of([] as Produto[]);
        })
      )
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.carregando = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe(({ notas, produtos }) => {
        this.notas = notas;
        this.produtos = produtos;

        if (falhas.length > 0) {
          this.notificar(`Erro ao conectar com o serviço de ${falhas.join(' e ')}.`);
        }

        this.cdr.detectChanges();
      });
  }

  

  adicionarItem(): void {
    if (this.itemForm.invalid) return;

    const produto = this.produtos.find(p => p.id === +this.itemForm.value.produtoId);
    if (!produto) return;

   
    this.itensNota = [...this.itensNota, {
      produtoId: produto.id!,
      produtoDescricao: produto.descricao,
      quantidade: +this.itemForm.value.quantidade
    }];

    this.itemForm.reset();
    this.cdr.detectChanges();
  }

  cancelarNota(): void {
    this.itensNota = [];
    this.itemForm.reset();
    this.cdr.detectChanges();
  }

  criarNota(): void {
    if (this.itensNota.length === 0) {
      this.notificar('Adicione ao menos um produto à nota.');
      return;
    }

    const nota: NotaFiscal = { itens: this.itensNota };

    this.faturamentoService.criarNota(nota)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificar('Nota criada com sucesso!');
          this.itensNota = [];
          this.carregarTudo();
        },
        error: (err) => this.notificar(
          this.mensagemDeErro(err, 'Erro ao criar nota.')
        )
      });
  }

  

  imprimir(nota: NotaFiscal): void {
    if (this.imprimindo !== null) return;   // evita duplo clique

    this.imprimindo = nota.id!;

    this.faturamentoService.imprimirNota(nota.id!)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          
          this.imprimindo = null;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.notificar('Nota impressa e fechada com sucesso!');
          this.carregarTudo();
        },
        error: (err) => this.notificar(
          this.mensagemDeErro(err, 'Erro ao imprimir nota.')
        )
      });
  }

  deletarNota(nota: NotaFiscal): void {
    if (!confirm('Tem certeza que deseja excluir esta nota?')) return;

    this.faturamentoService.deletarNota(nota.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificar('Nota excluída!');
          this.carregarTudo();
        },
        error: (err) => this.notificar(
          this.mensagemDeErro(err, 'Erro ao excluir nota.')
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
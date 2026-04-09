import { Routes } from '@angular/router';
import { ProdutosComponent } from './pages/produtos/produtos.component';
import { NotasFiscaisComponent } from './pages/notas-fiscais/notas-fiscais.component';

export const routes: Routes = [
  { path: 'produtos', component: ProdutosComponent },
  { path: 'notas-fiscais', component: NotasFiscaisComponent },
  { path: '', redirectTo: '/produtos', pathMatch: 'full' } 
];
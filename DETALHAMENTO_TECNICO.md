# Detalhamento Técnico

Documento de resposta aos itens solicitados na especificação do teste.

---

## 1. Ciclos de vida do Angular utilizados

Foram utilizados dois ciclos de vida, ambos nos componentes `ProdutosComponent`
e `NotasComponent`.

### `ngOnInit`

Executado uma vez, logo após o Angular inicializar as propriedades do componente.
É onde as chamadas iniciais à API acontecem.

```typescript
ngOnInit(): void {
  this.carregarTudo();
}
```

A carga de dados não foi colocada no construtor de propósito: o construtor deve
apenas receber as dependências injetadas. Efeitos colaterais como requisições HTTP
pertencem ao `ngOnInit`, que é chamado quando o componente já está pronto.

### `ngOnDestroy`

Executado quando o componente é removido da tela — por exemplo, ao navegar de
Produtos para Notas Fiscais. É onde encerramos as inscrições ativas do RxJS.

```typescript
private readonly destroy$ = new Subject<void>();

ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}
```

Sem isso haveria vazamento de memória: se uma resposta HTTP chegasse depois que
o usuário saiu da tela, o callback ainda tentaria escrever em um componente
já destruído.

Os demais hooks (`ngOnChanges`, `ngAfterViewInit`, `ngDoCheck`) não foram
utilizados porque nenhum componente recebe `@Input()` de um pai nem manipula o
DOM diretamente — usá-los sem necessidade só adicionaria complexidade.

---

## 2. Uso da biblioteca RxJS

O RxJS é utilizado de forma central na aplicação. Todo `HttpClient` do Angular
retorna um `Observable`, e a partir daí cinco recursos foram aplicados.

### `Observable` como retorno dos services

```typescript
getProdutos(): Observable<Produto[]> {
  return this.http.get<Produto[]>(this.apiUrl);
}
```

O service não executa a requisição — ele descreve a operação. A execução só
ocorre quando o componente se inscreve.

### `takeUntil` — encerramento automático de inscrições

```typescript
this.estoqueService.getProdutos()
  .pipe(takeUntil(this.destroy$))
  .subscribe(...);
```

O `destroy$` é um `Subject` disparado no `ngOnDestroy`. Todo fluxo com
`takeUntil` escutando esse Subject é encerrado no mesmo instante. É aplicado em
todas as chamadas HTTP dos dois componentes.

### `finalize` — limpeza do estado de carregamento

```typescript
.pipe(
  takeUntil(this.destroy$),
  finalize(() => {
    this.imprimindo = null;
    this.cdr.detectChanges();
  })
)
```

O `finalize` executa tanto no sucesso quanto no erro. Antes de usá-lo, o
`imprimindo = null` estava duplicado nos dois callbacks — havia risco real de o
botão ficar travado em "Imprimindo..." caso um caminho fosse esquecido.

### `catchError` — valor de fallback em vez de quebra

```typescript
.pipe(
  catchError(() => {
    this.notificar('Erro ao conectar com o serviço de estoque.');
    return of([] as Produto[]);
  })
)
```

O `catchError` intercepta o erro dentro do pipe e devolve um valor alternativo,
permitindo que o fluxo termine normalmente. Diferente do callback `error` do
`subscribe`, que serve para efeito colateral e encerra o stream.

### `forkJoin` — chamadas paralelas com falha isolada

A tela de notas depende de dois serviços diferentes. O `forkJoin` dispara ambas
as requisições em paralelo e espera as duas concluírem:

```typescript
forkJoin({
  notas: this.faturamentoService.getNotas().pipe(
    catchError(() => { falhas.push('faturamento'); return of([]); })
  ),
  produtos: this.estoqueService.getProdutos().pipe(
    catchError(() => { falhas.push('estoque'); return of([]); })
  )
})
```

O `catchError` aplicado em cada stream individualmente isola a falha: se apenas
o serviço de estoque estiver fora do ar, as notas ainda são exibidas e o usuário
recebe uma mensagem específica sobre o que falhou.

---

## 3. Outras bibliotecas utilizadas

### Frontend

| Biblioteca | Finalidade |
|---|---|
| `@angular/material` | Componentes visuais |
| `@angular/forms` | Reactive Forms e validação |
| `@angular/router` | Navegação entre telas sem recarregar a página |
| `rxjs` | Programação reativa e chamadas assíncronas |
| `cypress` | Testes end-to-end e de contrato de API |

### Backend

| Pacote | Finalidade |
|---|---|
| `Microsoft.EntityFrameworkCore` | ORM — mapeia classes C# para tabelas |
| `Npgsql.EntityFrameworkCore.PostgreSQL` | Provider do PostgreSQL para o EF Core |
| `Microsoft.EntityFrameworkCore.Design` | Ferramentas de migration via CLI |
| `Swashbuckle.AspNetCore` | Geração automática da documentação Swagger |

---

## 4. Bibliotecas de componentes visuais

Foi utilizado o **Angular Material**, biblioteca oficial mantida pela equipe do
Angular, que implementa o Material Design.

Componentes aplicados:

| Componente | Onde |
|---|---|
| `mat-toolbar` | Barra de navegação superior |
| `mat-card` | Agrupamento de formulários e listagens |
| `mat-table` | Listagem de produtos, notas e itens |
| `mat-form-field` / `matInput` | Campos de texto e numéricos |
| `mat-select` / `mat-option` | Seleção de produto na nota |
| `mat-button` / `mat-icon-button` | Ações |
| `mat-icon` | Ícones de editar e excluir |
| `mat-snack-bar` | Mensagens de sucesso e erro |
| `mat-spinner` | Indicador de processamento no botão de impressão |
| `mat-progress-bar` | Indicador de carregamento das listagens |
| `mat-error` | Mensagens de validação nos formulários |

A escolha se deu por ser a biblioteca oficial, com integração nativa aos Reactive
Forms — o `mat-error` reage automaticamente ao estado de validação do
`FormControl`, sem código adicional.

---

## 5. Gerenciamento de dependências no Golang

Não aplicável. A implementação foi feita em **C#**, conforme permitido pela
especificação. No ecossistema .NET o gerenciamento de dependências é feito pelo
**NuGet**, com os pacotes declarados no arquivo `.csproj` de cada projeto e
restaurados via `dotnet restore`.

---

## 6. Frameworks utilizados em C#

### ASP.NET Core Web API (.NET 10)

Framework de construção das APIs REST. Recursos utilizados:

- **Injeção de dependência nativa** — `DbContext`, `IHttpClientFactory` e
  `ILogger` são registrados no `Program.cs` e entregues aos controllers pelo
  construtor
- **Atributo `[ApiController]`** — habilita validação automática do modelo,
  retornando `400 Bad Request` antes mesmo do método do controller executar
- **`IHttpClientFactory`** — gerencia o ciclo de vida das conexões HTTP entre os
  microsserviços, evitando esgotamento de sockets
- **Middleware pipeline** — CORS, tratamento de exceções e roteamento
- **Sistema de configuração hierárquico** — `appsettings.json` sobrescrito por
  variáveis de ambiente, o que permite o mesmo binário rodar local e em container

### Entity Framework Core 10

ORM responsável pelo acesso a dados. Recursos utilizados:

- **Code First com Migrations** — o schema do banco é gerado a partir das classes
- **`DbContext` e `DbSet<T>`** — representação das tabelas
- **Carregamento explícito de relacionamento** via `Include`
- **Optimistic concurrency** com a coluna de sistema `xmin` do PostgreSQL
- **Transações explícitas** via `BeginTransactionAsync`
- **Sequence do banco** para a numeração das notas
- **Data Annotations** para validação e definição do schema

### Swashbuckle (Swagger)

Gera documentação interativa das APIs a partir dos controllers, permitindo testar
os endpoints sem cliente externo.

---

## 7. Tratamento de erros e exceções no backend

O tratamento foi organizado em quatro camadas.

### Camada 1 — Validação de entrada

Data Annotations nos modelos, validados automaticamente pelo `[ApiController]`:

```csharp
[Required(ErrorMessage = "O código é obrigatório.")]
[StringLength(50)]
public string Codigo { get; set; } = string.Empty;

[Range(0, int.MaxValue, ErrorMessage = "O saldo não pode ser negativo.")]
public int Saldo { get; set; }
```

Dados inválidos são rejeitados com `400` antes de qualquer lógica executar.

### Camada 2 — Regras de negócio

Validações explícitas nos controllers, com status HTTP semanticamente corretos:

| Situação | Status | Retorno |
|---|---|---|
| Recurso inexistente | 404 | `NotFound` |
| Regra de negócio violada | 400 | `BadRequest` |
| Conflito de estado ou concorrência | 409 | `Conflict` |
| Serviço dependente indisponível | 503 | `StatusCode(503)` |
| Timeout do serviço dependente | 504 | `StatusCode(504)` |

### Camada 3 — Exceções previstas

Capturadas de forma específica, nunca com `catch (Exception)` genérico:

```csharp
catch (DbUpdateConcurrencyException)
{
    return Conflict("Esta nota já está sendo impressa por outra operação.");
}
catch (HttpRequestException)
{
    await ReverterParaAberta(nota);
    return StatusCode(503, "Serviço de estoque indisponível. A nota continua aberta.");
}
catch (TaskCanceledException)
{
    await ReverterParaAberta(nota);
    return StatusCode(504, "O serviço de estoque não respondeu a tempo.");
}
```

Cada exceção recebe um tratamento próprio, incluindo a reversão do estado da nota.

### Camada 4 — Middleware global

Implementado via `IExceptionHandler`, captura qualquer exceção não prevista:

```csharp
public async ValueTask<bool> TryHandleAsync(
    HttpContext context, Exception exception, CancellationToken cancellationToken)
{
    _logger.LogError(exception, "Exceção não tratada em {Metodo} {Caminho}",
        context.Request.Method, context.Request.Path);

    var (status, titulo) = exception switch
    {
        DbUpdateConcurrencyException => (409, "Registro alterado por outra operação"),
        DbUpdateException            => (409, "Conflito ao gravar no banco de dados"),
        TimeoutException             => (504, "Tempo de resposta excedido"),
        _                            => (500, "Erro interno no servidor")
    };

    var problema = new ProblemDetails { Status = status, Title = titulo, ... };

    context.Response.StatusCode = status;
    await context.Response.WriteAsJsonAsync(problema, cancellationToken);
    return true;
}
```

Registra a exceção completa no log do servidor, mas devolve ao cliente apenas uma
resposta padronizada em `ProblemDetails` (RFC 7807) — sem expor stack trace.

### Consistência de dados em caso de falha

O ponto mais crítico é a emissão da nota, que envolve os dois microsserviços.
A estratégia adotada:

1. O Faturamento envia **todos os itens em uma única requisição** ao Estoque
2. O Estoque abre uma transação, valida o saldo de **todos** os itens e só então
   desconta — se qualquer item falhar, faz `RollbackAsync` e nada é alterado
3. Se a chamada falhar por qualquer motivo, o Faturamento devolve a nota ao
   status `Aberta`, mantendo-a utilizável
4. Caso o próprio Faturamento caia no meio da operação, a nota é liberada
   automaticamente após 2 minutos pelo mecanismo de *lease*

Esse comportamento é verificado pelo teste automatizado
`atomicidade.cy.ts`, que cria uma nota com um item de saldo suficiente e outro
de saldo insuficiente e verifica que **nenhum** dos dois foi descontado.

---

## 8. Uso de LINQ

LINQ foi utilizado extensivamente, em duas modalidades distintas.

### LINQ to Entities — traduzido para SQL

As expressões abaixo não executam em memória: o EF Core as converte em SQL e o
banco faz o trabalho.

**Ordenação na listagem de notas:**

```csharp
var notas = await _context.NotasFiscais
    .Include(n => n.Itens)
    .OrderByDescending(n => n.Numero)
    .ToListAsync();
```

**Busca de múltiplos produtos em uma única consulta:**

```csharp
var produtos = await _context.Produtos
    .Where(p => ids.Contains(p.Id))
    .ToListAsync();
```

O `Contains` é traduzido para `WHERE "Id" = ANY(...)`, evitando uma consulta por
produto.

**Verificação de existência sem trazer dados:**

```csharp
var codigoEmUso = await _context.Produtos
    .AnyAsync(p => p.Codigo == produto.Codigo && p.Id != id);
```

Gera um `SELECT EXISTS`, mais eficiente do que carregar o registro.

**Agregação para a numeração sequencial (versão anterior):**

```csharp
await _context.NotasFiscais.MaxAsync(n => (int?)n.Numero)
```

Esta abordagem foi posteriormente **substituída por uma sequence do PostgreSQL**,
por ser suscetível a condição de corrida entre requisições simultâneas.

### LINQ to Objects — executado em memória

**Agrupamento de itens repetidos antes da validação de saldo:**

```csharp
var agrupados = itens
    .GroupBy(i => i.ProdutoId)
    .Select(g => new { ProdutoId = g.Key, Quantidade = g.Sum(x => x.Quantidade) })
    .ToList();
```

Uma nota pode conter o mesmo produto em linhas diferentes. Sem o agrupamento, cada
linha seria validada isoladamente contra o saldo — duas linhas de 6 unidades
passariam em um produto com saldo 10, gerando saldo negativo.

**Projeção do payload enviado entre os microsserviços:**

```csharp
var payload = nota.Itens
    .Select(i => new { produtoId = i.ProdutoId, quantidade = i.Quantidade })
    .ToList();
```

Envia apenas os campos necessários, sem acoplar o contrato entre os serviços ao
modelo interno de cada um.

**Busca em coleção já carregada:**

```csharp
var produto = produtos.FirstOrDefault(p => p.Id == item.ProdutoId);
```

Como os produtos já foram trazidos em uma única consulta, a busca ocorre em
memória — sem nova ida ao banco dentro do laço.

### Observação

A distinção entre as duas modalidades foi considerada ao escrever o código: dentro
do laço de desconto, todas as operações são LINQ to Objects sobre a lista já
carregada, justamente para evitar o problema de N+1 consultas.
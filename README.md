# Sistema de Emissão de Notas Fiscais

Teste técnico Korp ERP — aplicação de emissão de notas fiscais construída sobre
uma arquitetura de microsserviços, com backend em C# / ASP.NET Core, frontend em
Angular e persistência em PostgreSQL.

---

## Arquitetura

```
┌─────────────────┐
│    Angular      │  :4200
│  (nginx/SPA)    │
└────────┬────────┘
         │ HTTP
    ┌────┴─────────────────────┐
    ▼                          ▼
┌─────────────────┐   ┌─────────────────────┐
│ Serviço de      │   │ Serviço de          │
│ Estoque  :5001  │◄──│ Faturamento  :5002  │
└────────┬────────┘   └──────────┬──────────┘
         │                       │
    ┌────▼──────┐          ┌─────▼──────────┐
    │ db_estoque│          │ db_faturamento │
    └───────────┘          └────────────────┘
              PostgreSQL :5433
```

Cada microsserviço tem **banco de dados próprio**. O Faturamento nunca acessa as
tabelas do Estoque diretamente — toda baixa de saldo passa por uma chamada HTTP.

| Serviço | Responsabilidade | Porta |
|---|---|---|
| Estoque | Produtos e saldos | 5001 |
| Faturamento | Notas fiscais e emissão | 5002 |
| Frontend | Interface do usuário | 4200 |
| PostgreSQL | Persistência | 5433 |

---

## Stack

**Backend** — C# / .NET 10, ASP.NET Core Web API, Entity Framework Core 10, Npgsql, Swagger

**Frontend** — Angular 21 (standalone components), Angular Material, RxJS, TypeScript

**Banco** — PostgreSQL 16

**Testes** — Cypress (E2E e testes de contrato de API)

**Infra** — Docker e Docker Compose, nginx

---

## Como executar

### Opção 1 — Docker (recomendado)

Único pré-requisito: Docker Desktop instalado e em execução.

```bash
git clone https://github.com/Ttheusma/Korp_Teste_Matheus.git
cd Korp_Teste_Matheus
docker compose up --build
```

A primeira execução leva alguns minutos (download das imagens e compilação).
Não é necessário instalar .NET, Node ou PostgreSQL, nem configurar senha —
as migrations são aplicadas automaticamente no startup de cada serviço.

Quando os logs estabilizarem, acesse **http://localhost:4200**

Para parar:

```bash
docker compose down       # mantém os dados
docker compose down -v    # apaga também o banco
```

### Opção 2 — Execução local

Pré-requisitos: .NET 10 SDK, Node.js 20+, PostgreSQL rodando em `localhost:5432`.

Ajuste a senha do seu PostgreSQL nos arquivos
`backend/EstoqueService/appsettings.json` e
`backend/FaturamentoService/appsettings.json`.

Em três terminais separados:

```bash
# Terminal 1
cd backend/EstoqueService
dotnet run

# Terminal 2
cd backend/FaturamentoService
dotnet run

# Terminal 3
cd frontend/korp-frontend
npm install
ng serve
```

---

## Documentação da API

Com os serviços no ar, o Swagger fica disponível em:

- Estoque — http://localhost:5001/swagger
- Faturamento — http://localhost:5002/swagger

### Endpoints

**Estoque**

| Método | Rota | Descrição |
|---|---|---|
| GET | `/Produtos` | Lista os produtos |
| POST | `/Produtos` | Cadastra um produto |
| PUT | `/Produtos/{id}` | Atualiza um produto |
| DELETE | `/Produtos/{id}` | Remove um produto |
| POST | `/Produtos/descontar-lote` | Baixa o saldo de vários produtos em uma transação |

**Faturamento**

| Método | Rota | Descrição |
|---|---|---|
| GET | `/NotasFiscais` | Lista as notas |
| POST | `/NotasFiscais` | Cria uma nota com status Aberta |
| POST | `/NotasFiscais/{id}/imprimir` | Emite a nota e baixa o estoque |
| DELETE | `/NotasFiscais/{id}` | Cancela uma nota aberta |

---

## Testes

Com a aplicação em execução:

```bash
cd frontend/korp-frontend
npx cypress open
```

| Arquivo | O que cobre |
|---|---|
| `produtos.cy.ts` | CRUD de produtos e validação de formulário |
| `notas.cy.ts` | Criação, emissão, cancelamento e regras de status |
| `atomicidade.cy.ts` | Falha parcial, idempotência e concorrência |
| `validacoes.cy.ts` | Contrato da API sem passar pela interface |

---

## Decisões técnicas

### Numeração sequencial

Gerada por uma **sequence do PostgreSQL**, não por `MAX(numero) + 1`. Duas notas
criadas simultaneamente recebem números distintos, e um índice único na coluna
impede duplicidade mesmo em caso de falha.

### Atomicidade na emissão

O Faturamento envia **todos os itens em uma única requisição** ao Estoque, que
valida o saldo de todos antes de descontar qualquer um, dentro de uma transação
de banco. Se um item falhar, nenhum é descontado.

### Idempotência

Antes de chamar o Estoque, a nota é reservada com status `Processando`. O token
de concorrência do banco garante que apenas uma requisição consiga essa reserva —
cliques duplos ou requisições simultâneas recebem `409 Conflict`.

Caso o serviço caia no meio da operação, a nota é liberada automaticamente após
2 minutos (padrão *lease*), evitando que fique presa.

### Concorrência

Optimistic locking via coluna de sistema `xmin` do PostgreSQL, aplicado a
produtos e notas. Dispensa coluna extra de versão no modelo.

### Tratamento de falhas

- Timeout de 10 segundos nas chamadas entre serviços
- Estoque indisponível retorna `503`, sem timeout retorna `504`
- Em qualquer falha a nota volta para `Aberta` e o estoque permanece intacto
- Middleware global de exceções padroniza as respostas em `ProblemDetails`
- O frontend traduz cada caso em mensagem legível ao usuário

### Frontend

- Componentes standalone com `ngOnInit` e `ngOnDestroy`
- RxJS: `takeUntil` para encerrar inscrições, `finalize` para estado de
  carregamento, `catchError` para fallback e `forkJoin` para chamadas paralelas
- Angular Material para os componentes visuais
- Reactive Forms com validação síncrona

---

## Requisitos do desafio

| Requisito | Situação |
|---|---|
| Cadastro de produtos | Implementado |
| Cadastro de notas fiscais | Implementado |
| Impressão de notas | Implementado |
| Arquitetura de microsserviços | Implementado |
| Tratamento de falhas | Implementado |
| Conexão real com banco de dados | Implementado |
| *Opcional* — Tratamento de concorrência | Implementado |
| *Opcional* — Idempotência | Implementado |
| *Opcional* — Inteligência Artificial | Não implementado |

---

## Autor

Matheus Melquiades
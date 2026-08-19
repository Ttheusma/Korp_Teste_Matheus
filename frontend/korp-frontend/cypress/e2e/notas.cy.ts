describe('Notas Fiscais', () => {
  const timestamp = Date.now()
  const nomeProduto = `ProdutoTeste${timestamp}`
  const codigoProduto = `CY${timestamp}`
  const saldoInicial = 50

  // --- helpers -------------------------------------------------------------

  const selecionarProduto = (nome: string) => {
    cy.get('mat-select[formcontrolname="produtoId"]').click()
    cy.get('mat-option', { timeout: 10000 }).should('have.length.greaterThan', 0)
    cy.contains('mat-option', nome).click()
    cy.get('mat-select[formcontrolname="produtoId"]').should('contain', nome)
  }

  const adicionarItem = (nome: string, quantidade: string) => {
    selecionarProduto(nome)
    cy.get('input[formcontrolname="quantidade"]').type(quantidade, { force: true })
    cy.contains('Adicionar Item').click()
  }

  // cria a nota e devolve o numero que a API gerou
  const criarNotaEObterNumero = () => {
    cy.intercept('POST', '**/notasfiscais').as('postNota')
    cy.contains('Criar Nota Fiscal').click()
    cy.contains('Nota criada com sucesso!').should('exist')
    return cy.wait('@postNota').then(({ response }) => response!.body.numero as number)
  }

  // acha a linha cuja PRIMEIRA celula e exatamente o numero da nota
  const linhaDaNota = (numero: number) =>
    cy.get('tr')
      .filter((_i, el) => {
        const primeira = el.querySelector('td')
        return !!primeira && primeira.textContent!.trim() === String(numero)
      })
      .first()

  const lerSaldo = (nome: string) =>
    cy.contains('td', nome)
      .parent('tr')
      .find('td')
      .eq(2)
      .invoke('text')
      .then((t) => parseInt(t.trim()))

  // --- setup ---------------------------------------------------------------

  before(() => {
    cy.request('POST', 'http://localhost:5001/Produtos', {
      codigo: codigoProduto,
      descricao: nomeProduto,
      saldo: saldoInicial
    })
  })

  beforeEach(() => {
    cy.intercept('GET', '**/produtos').as('getProdutos')
    cy.visit('/notas')
    cy.wait('@getProdutos')
  })

  // --- testes --------------------------------------------------------------

  it('não deve criar nota sem nenhum item', () => {
    cy.contains('Criar Nota Fiscal').click()
    cy.contains('Adicione ao menos um produto à nota.').should('exist')
  })

  it('deve adicionar múltiplos itens na mesma nota', () => {
    adicionarItem(nomeProduto, '2')
    adicionarItem(nomeProduto, '3')

    cy.contains('th', 'Quantidade').parents('table').find('tr').should('have.length', 3)

    criarNotaEObterNumero().then((numero) => {
      linhaDaNota(numero).should('contain', 'Aberta')
    })
  })

  it('deve imprimir uma nota e descontar o saldo do produto', () => {
    adicionarItem(nomeProduto, '5')
    criarNotaEObterNumero().as('numeroNota')

    cy.visit('/produtos')
    lerSaldo(nomeProduto).as('saldoAntes')

    cy.visit('/notas')
    cy.get('@numeroNota').then((numero) => {
      linhaDaNota(numero as unknown as number).within(() => {
        cy.contains('Imprimir').click()
      })
    })
    cy.contains('Nota impressa e fechada com sucesso!').should('exist')

    cy.visit('/produtos')
    lerSaldo(nomeProduto).then((saldoDepois) => {
      cy.get('@saldoAntes').then((saldoAntes) => {
        expect(saldoDepois).to.eq((saldoAntes as unknown as number) - 5)
      })
    })
  })

  it('deve mostrar erro ao imprimir com saldo insuficiente', () => {
    adicionarItem(nomeProduto, '9999')
    criarNotaEObterNumero().then((numero) => {
      linhaDaNota(numero).within(() => {
        cy.contains('Imprimir').click()
      })
      cy.contains('Saldo insuficiente').should('exist')
      linhaDaNota(numero).should('contain', 'Aberta')
    })
  })

  it('deve imprimir uma nota e atualizar status para Fechada', () => {
    adicionarItem(nomeProduto, '1')
    criarNotaEObterNumero().then((numero) => {
      linhaDaNota(numero).within(() => {
        cy.contains('Imprimir').click()
      })
      cy.contains('Nota impressa e fechada com sucesso!').should('exist')
      linhaDaNota(numero).should('contain', 'Fechada')
    })
  })

  it('não deve permitir imprimir nota já fechada', () => {
    adicionarItem(nomeProduto, '1')
    criarNotaEObterNumero().then((numero) => {
      linhaDaNota(numero).within(() => {
        cy.contains('Imprimir').click()
      })
      cy.contains('Nota impressa e fechada com sucesso!').should('exist')

      linhaDaNota(numero).within(() => {
        cy.contains('Imprimir').should('be.disabled')
        cy.contains('Cancelar').should('be.disabled')
      })
    })
  })

  it('deve cancelar uma nota aberta', () => {
    cy.on('window:confirm', () => true)

    adicionarItem(nomeProduto, '1')
    criarNotaEObterNumero().then((numero) => {
      linhaDaNota(numero).within(() => {
        cy.contains('Cancelar').click()
      })
      cy.contains('Nota excluída!').should('exist')
      cy.get('tr').should('not.contain', `>${numero}<`)
    })
  })
})
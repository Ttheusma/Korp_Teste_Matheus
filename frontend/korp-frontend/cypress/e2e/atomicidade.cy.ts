describe('Atomicidade e idempotência da impressão', () => {
  const ts = Date.now()

  const produtoOk = `AtomOK${ts}`
  const produtoBaixo = `AtomBaixo${ts}`
  const codigoOk = `AOK${ts}`
  const codigoBaixo = `ABX${ts}`

  const SALDO_OK = 100
  const SALDO_BAIXO = 1

  let idOk: number
  let idBaixo: number
  let numeroNota: number

  const API_ESTOQUE = 'http://localhost:5001/Produtos'
  const API_NOTAS = 'http://localhost:5002/NotasFiscais'

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

  const linhaDaNota = (numero: number) =>
    cy.get('tr')
      .filter((_i, el) => {
        const primeira = el.querySelector('td')
        return !!primeira && primeira.textContent!.trim() === String(numero)
      })
      .first()

  const saldoDe = (id: number) =>
    cy.request('GET', API_ESTOQUE).then((res) => {
      const p = res.body.find((x: any) => x.id === id)
      return p.saldo as number
    })

  // --- setup ---------------------------------------------------------------

  before(() => {
    cy.request('POST', API_ESTOQUE, {
      codigo: codigoOk,
      descricao: produtoOk,
      saldo: SALDO_OK
    }).then((res) => { idOk = res.body.id })

    cy.request('POST', API_ESTOQUE, {
      codigo: codigoBaixo,
      descricao: produtoBaixo,
      saldo: SALDO_BAIXO
    }).then((res) => { idBaixo = res.body.id })
  })

  // --- testes --------------------------------------------------------------

  it('falha parcial não pode descontar nenhum produto', () => {
    cy.intercept('GET', '**/produtos').as('getProdutos')
    cy.visit('/notas')
    cy.wait('@getProdutos')

    // item 1 tem saldo de sobra, item 2 nao tem.
    // no codigo antigo o item 1 seria descontado antes do item 2 falhar.
    adicionarItem(produtoOk, '5')
    adicionarItem(produtoBaixo, '10')

    cy.intercept('POST', '**/notasfiscais').as('postNota')
    cy.contains('Criar Nota Fiscal').click()
    cy.contains('Nota criada com sucesso!').should('exist')

    cy.wait('@postNota').then(({ response }) => {
      numeroNota = response!.body.numero

      linhaDaNota(numeroNota).within(() => {
        cy.contains('Imprimir').click()
      })

      cy.contains('Saldo insuficiente').should('exist')
      linhaDaNota(numeroNota).should('contain', 'Aberta')

      // A PROVA: o produto que tinha saldo NAO pode ter sido tocado
      saldoDe(idOk).should('eq', SALDO_OK)
      saldoDe(idBaixo).should('eq', SALDO_BAIXO)
    })
  })

  it('a mesma nota imprime normalmente depois que o estoque é corrigido', () => {
    cy.request('PUT', `${API_ESTOQUE}/${idBaixo}`, {
      codigo: codigoBaixo,
      descricao: produtoBaixo,
      saldo: 50
    })

    cy.intercept('GET', '**/produtos').as('getProdutos')
    cy.visit('/notas')
    cy.wait('@getProdutos')

    linhaDaNota(numeroNota).within(() => {
      cy.contains('Imprimir').click()
    })

    cy.contains('Nota impressa e fechada com sucesso!').should('exist')
    linhaDaNota(numeroNota).should('contain', 'Fechada')

    
    saldoDe(idOk).should('eq', SALDO_OK - 5)
    saldoDe(idBaixo).should('eq', 50 - 10)
  })

  it('reimprimir uma nota fechada não desconta de novo', () => {
    saldoDe(idOk).then((antes) => {
      cy.request('GET', API_NOTAS).then((res) => {
        const nota = res.body.find((n: any) => n.numero === numeroNota)

        cy.request({
          method: 'POST',
          url: `${API_NOTAS}/${nota.id}/imprimir`,
          failOnStatusCode: false
        }).then((r) => {
          expect(r.status).to.eq(400)
          expect(r.body).to.contain('Fechada')
        })

        saldoDe(idOk).should('eq', antes)
      })
    })
  })

  it('duas impressões simultâneas descontam o estoque uma única vez', () => {
    cy.request('POST', API_NOTAS, {
      itens: [
        { produtoId: idOk, produtoDescricao: produtoOk, quantidade: 3 }
      ]
    }).then((res) => {
      const notaId = res.body.id

      saldoDe(idOk).then((antes) => {
        const url = `${API_NOTAS}/${notaId}/imprimir`

      
        cy.window()
          .then((win) =>
            Promise.all([
              win.fetch(url, { method: 'POST' }),
              win.fetch(url, { method: 'POST' })
            ])
          )
          .then((respostas) => {
            const status = respostas.map((r) => r.status)
           
            expect(status).to.include(200)
            expect(status.filter((s) => s === 200)).to.have.length(1)
          })

        saldoDe(idOk).should('eq', antes - 3)
      })
    })
  })
   it('criações simultâneas geram números únicos e crescentes', () => {
    const TOTAL = 10

    cy.window()
      .then((win) => {
        const requisicoes = Array.from({ length: TOTAL }, () =>
          win.fetch(API_NOTAS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              itens: [
                { produtoId: idOk, produtoDescricao: produtoOk, quantidade: 1 }
              ]
            })
          }).then((r) => r.json())
        )

        return Promise.all(requisicoes)
      })
      .then((notas: any[]) => {
        const numeros = notas.map((n) => n.numero)
        const unicos = new Set(numeros)

        expect(numeros).to.have.length(TOTAL)
        expect(unicos.size).to.eq(TOTAL)      // nenhum numero repetido
        expect(Math.min(...numeros)).to.be.greaterThan(0)
      })
  })
})
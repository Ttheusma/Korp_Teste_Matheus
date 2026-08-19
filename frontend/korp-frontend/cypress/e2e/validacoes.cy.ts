describe('Validações da API', () => {
  const ts = Date.now()

  const API_ESTOQUE = 'http://localhost:5001/Produtos'
  const API_NOTAS = 'http://localhost:5002/NotasFiscais'

  const post = (url: string, body: any) =>
    cy.request({ method: 'POST', url, body, failOnStatusCode: false })

  // --- produtos ------------------------------------------------------------

  it('não aceita produto com saldo negativo', () => {
    post(API_ESTOQUE, { codigo: `NEG${ts}`, descricao: 'Saldo negativo', saldo: -5 })
      .its('status').should('eq', 400)
  })

  it('não aceita produto sem código', () => {
    post(API_ESTOQUE, { codigo: '', descricao: 'Sem código', saldo: 10 })
      .its('status').should('eq', 400)
  })

  it('não aceita produto sem descrição', () => {
    post(API_ESTOQUE, { codigo: `SD${ts}`, descricao: '', saldo: 10 })
      .its('status').should('eq', 400)
  })

  it('não aceita dois produtos com o mesmo código', () => {
    const codigo = `DUP${ts}`

    post(API_ESTOQUE, { codigo, descricao: 'Primeiro', saldo: 10 })
      .its('status').should('eq', 201)

    post(API_ESTOQUE, { codigo, descricao: 'Segundo', saldo: 10 })
      .its('status').should('eq', 409)
  })

  it('retorna 404 ao atualizar produto inexistente', () => {
    cy.request({
      method: 'PUT',
      url: `${API_ESTOQUE}/999999`,
      body: { codigo: `X${ts}`, descricao: 'Inexistente', saldo: 1 },
      failOnStatusCode: false
    }).its('status').should('eq', 404)
  })

  // --- desconto em lote ----------------------------------------------------

  it('não aceita desconto com quantidade negativa', () => {
    post(`${API_ESTOQUE}/descontar-lote`, [{ produtoId: 1, quantidade: -3 }])
      .its('status').should('eq', 400)
  })

  it('não aceita desconto com lista vazia', () => {
    post(`${API_ESTOQUE}/descontar-lote`, [])
      .its('status').should('eq', 400)
  })

  // --- notas fiscais -------------------------------------------------------

  it('não aceita nota sem itens', () => {
    post(API_NOTAS, { itens: [] })
      .its('status').should('eq', 400)
  })

  it('não aceita item com quantidade zero', () => {
    post(API_NOTAS, {
      itens: [{ produtoId: 1, produtoDescricao: 'Qualquer', quantidade: 0 }]
    }).its('status').should('eq', 400)
  })

  it('retorna 404 ao imprimir nota inexistente', () => {
    post(`${API_NOTAS}/999999/imprimir`, {})
      .its('status').should('eq', 404)
  })

  it('retorna 404 ao excluir nota inexistente', () => {
    cy.request({
      method: 'DELETE',
      url: `${API_NOTAS}/999999`,
      failOnStatusCode: false
    }).its('status').should('eq', 404)
  })
})
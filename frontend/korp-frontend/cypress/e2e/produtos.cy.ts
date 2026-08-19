describe('Cadastro de Produtos', () => {
  beforeEach(() => {
    cy.visit('/produtos')
  })

  it('deve cadastrar um produto com sucesso', () => {
    cy.get('input[formcontrolname="codigo"]').type('TEST001')
    cy.get('input[formcontrolname="descricao"]').type('Produto de Teste')
    cy.get('input[formcontrolname="saldo"]').type('100')
    cy.contains('Cadastrar').click()
    cy.contains('Produto cadastrado!').should('exist')
    cy.contains('TEST001').should('exist')
  })

  it('não deve cadastrar produto sem preencher campos', () => {
    cy.contains('Cadastrar').click()
    cy.contains('Código obrigatório').should('exist')
  })

  it('não deve permitir saldo negativo', () => {
    cy.get('input[formcontrolname="codigo"]').type('TEST002')
    cy.get('input[formcontrolname="descricao"]').type('Produto Saldo Negativo')
    cy.get('input[formcontrolname="saldo"]').type('-5')
    cy.contains('Cadastrar').click()
    cy.contains('Saldo inválido').should('exist')
    cy.contains('TEST002').should('not.exist')
  })

  it('deve editar um produto', () => {
    cy.contains('TEST001').parent('tr').within(() => {
      cy.get('button[title="Editar"]').click()
    })
    cy.get('input[formcontrolname="descricao"]').clear().type('Produto Editado')
    cy.contains('Salvar Alterações').click()
    cy.contains('Produto atualizado!').should('exist')
    cy.contains('Produto Editado').should('exist')
  })

  it('deve excluir um produto', () => {
    cy.contains('Produto Editado').parent('tr').within(() => {
      cy.get('button[title="Excluir"]').click()
    })
    cy.on('window:confirm', () => true)
    cy.contains('Produto excluído!').should('exist')
  })
})
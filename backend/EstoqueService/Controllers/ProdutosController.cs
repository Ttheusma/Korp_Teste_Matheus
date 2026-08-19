using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using EstoqueService.Data;
using EstoqueService.Models;

namespace EstoqueService.Controllers;

[ApiController]
[Route("[controller]")]
public class ProdutosController : ControllerBase
{
    private readonly EstoqueDbContext _context;

    public ProdutosController(EstoqueDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var produtos = await _context.Produtos
            .OrderBy(p => p.Codigo)
            .ToListAsync();

        return Ok(produtos);
    }

     [HttpPost]
    public async Task<IActionResult> Create([FromBody] Produto produto)
    {
        var codigoEmUso = await _context.Produtos
            .AnyAsync(p => p.Codigo == produto.Codigo);

        if (codigoEmUso)
            return Conflict($"Já existe um produto com o código '{produto.Codigo}'.");

        _context.Produtos.Add(produto);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), produto);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] Produto produto)
    {
        var existente = await _context.Produtos.FindAsync(id);

        if (existente == null)
            return NotFound("Produto não encontrado.");

        var codigoEmUso = await _context.Produtos
            .AnyAsync(p => p.Codigo == produto.Codigo && p.Id != id);

        if (codigoEmUso)
            return Conflict($"Já existe outro produto com o código '{produto.Codigo}'.");

        existente.Codigo = produto.Codigo;
        existente.Descricao = produto.Descricao;
        existente.Saldo = produto.Saldo;

        try
        {
            await _context.SaveChangesAsync();
            return Ok(existente);
        }
        catch (DbUpdateConcurrencyException)
        {
            return Conflict("Este produto foi alterado por outra operação. Recarregue e tente novamente.");
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var produto = await _context.Produtos.FindAsync(id);

        if (produto == null)
            return NotFound("Produto não encontrado.");

        _context.Produtos.Remove(produto);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    
    [HttpPost("descontar-lote")]
    public async Task<IActionResult> DescontarLote([FromBody] List<ItemDescontoDto> itens)
    {
        if (itens == null || itens.Count == 0)
            return BadRequest("Nenhum item informado.");

        
        var agrupados = itens
            .GroupBy(i => i.ProdutoId)
            .Select(g => new { ProdutoId = g.Key, Quantidade = g.Sum(x => x.Quantidade) })
            .ToList();

        var ids = agrupados.Select(a => a.ProdutoId).ToList();

        await using var transacao = await _context.Database.BeginTransactionAsync();

        try
        {
            var produtos = await _context.Produtos
                .Where(p => ids.Contains(p.Id))
                .ToListAsync();

            
            var erros = new List<string>();

            foreach (var item in agrupados)
            {
                var produto = produtos.FirstOrDefault(p => p.Id == item.ProdutoId);

                if (produto == null)
                {
                    erros.Add($"Produto {item.ProdutoId} não encontrado.");
                    continue;
                }

                if (produto.Saldo < item.Quantidade)
                    erros.Add($"Saldo insuficiente para '{produto.Descricao}': disponível {produto.Saldo}, necessário {item.Quantidade}.");
            }

            if (erros.Count > 0)
            {
                await transacao.RollbackAsync();
                return BadRequest(string.Join(" ", erros));
            }

            
            foreach (var item in agrupados)
            {
                var produto = produtos.First(p => p.Id == item.ProdutoId);
                produto.Saldo -= item.Quantidade;
            }

            await _context.SaveChangesAsync();
            await transacao.CommitAsync();

            return Ok(produtos);
        }
        catch (DbUpdateConcurrencyException)
        {
            await transacao.RollbackAsync();
            return Conflict("Um dos produtos foi alterado por outra operação. Tente novamente.");
        }
    }
}
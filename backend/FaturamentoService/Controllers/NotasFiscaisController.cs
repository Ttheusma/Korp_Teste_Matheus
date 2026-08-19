using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FaturamentoService.Data;
using FaturamentoService.Models;

namespace FaturamentoService.Controllers;

[ApiController]
[Route("[controller]")]
public class NotasFiscaisController : ControllerBase
{
    private readonly FaturamentoDbContext _context;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<NotasFiscaisController> _logger;

    private const int SegundosParaDestravar = 120;

    public NotasFiscaisController(
        FaturamentoDbContext context,
        IHttpClientFactory httpClientFactory,
        ILogger<NotasFiscaisController> logger)
    {
        _context = context;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var notas = await _context.NotasFiscais
            .Include(n => n.Itens)
            .OrderByDescending(n => n.Numero)
            .ToListAsync();

        return Ok(notas);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] NotaFiscal nota)
    {
        if (nota.Itens == null || nota.Itens.Count == 0)
            return BadRequest("A nota precisa ter ao menos um item.");

        nota.Numero = 0;                 // gerado pela sequence do Postgres
        nota.Status = "Aberta";
        nota.DataCriacao = DateTime.UtcNow;
        nota.ProcessandoDesde = null;

        _context.NotasFiscais.Add(nota);
        await _context.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), nota);
    }

    [HttpPost("{id}/imprimir")]
    public async Task<IActionResult> Imprimir(int id)
    {
        var nota = await _context.NotasFiscais
            .Include(n => n.Itens)
            .FirstOrDefaultAsync(n => n.Id == id);

        if (nota == null)
            return NotFound("Nota fiscal não encontrada.");

        if (nota.Itens.Count == 0)
            return BadRequest("Nota sem itens não pode ser impressa.");

        var travadaEmProcessamento = ProcessamentoExpirado(nota);

        if (nota.Status != "Aberta" && !travadaEmProcessamento)
        {
            if (nota.Status == "Processando")
                return Conflict("Esta nota já está sendo impressa por outra operação.");

            return BadRequest($"Apenas notas com status Aberta podem ser impressas. Status atual: {nota.Status}.");
        }

        if (travadaEmProcessamento)
            _logger.LogWarning(
                "Nota {Numero} estava travada em Processando desde {Desde}. Assumindo o controle.",
                nota.Numero, nota.ProcessandoDesde);

        
        nota.Status = "Processando";
        nota.ProcessandoDesde = DateTime.UtcNow;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            return Conflict("Esta nota já está sendo impressa por outra operação.");
        }

        
        var payload = nota.Itens
            .Select(i => new { produtoId = i.ProdutoId, quantidade = i.Quantidade })
            .ToList();

        var client = _httpClientFactory.CreateClient("EstoqueService");
        HttpResponseMessage response;

        try
        {
            response = await client.PostAsJsonAsync("produtos/descontar-lote", payload);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Estoque indisponível ao imprimir a nota {Numero}.", nota.Numero);
            await ReverterParaAberta(nota);
            return StatusCode(503, "Serviço de estoque indisponível. A nota continua aberta, tente novamente.");
        }
        catch (TaskCanceledException ex)
        {
            _logger.LogError(ex, "Timeout do estoque ao imprimir a nota {Numero}.", nota.Numero);
            await ReverterParaAberta(nota);
            return StatusCode(504, "O serviço de estoque não respondeu a tempo. A nota continua aberta.");
        }

        
        if (!response.IsSuccessStatusCode)
        {
            var erro = await response.Content.ReadAsStringAsync();
            await ReverterParaAberta(nota);
            return BadRequest(erro);
        }

        
        nota.Status = "Fechada";
        nota.ProcessandoDesde = null;
        await _context.SaveChangesAsync();

        return Ok(nota);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var nota = await _context.NotasFiscais
            .Include(n => n.Itens)
            .FirstOrDefaultAsync(n => n.Id == id);

        if (nota == null)
            return NotFound("Nota não encontrada.");

        
        if (nota.Status != "Aberta" && !ProcessamentoExpirado(nota))
            return BadRequest($"Apenas notas Abertas podem ser excluídas. Status atual: {nota.Status}.");

        _context.NotasFiscais.Remove(nota);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    
    private static bool ProcessamentoExpirado(NotaFiscal nota)
    {
        if (nota.Status != "Processando")
            return false;

        if (!nota.ProcessandoDesde.HasValue)
            return true;   

        return (DateTime.UtcNow - nota.ProcessandoDesde.Value).TotalSeconds > SegundosParaDestravar;
    }

    
    private async Task ReverterParaAberta(NotaFiscal nota)
    {
        try
        {
            nota.Status = "Aberta";
            nota.ProcessandoDesde = null;
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Falha ao reverter a nota {Numero} para Aberta. O lease de {Segundos}s vai liberá-la.",
                nota.Numero, SegundosParaDestravar);
        }
    }
}
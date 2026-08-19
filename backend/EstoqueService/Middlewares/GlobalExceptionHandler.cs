using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EstoqueService.Middlewares;

public class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext context,
        Exception exception,
        CancellationToken cancellationToken)
    {
        _logger.LogError(
            exception,
            "Exceção não tratada em {Metodo} {Caminho}",
            context.Request.Method,
            context.Request.Path);

        var (status, titulo) = exception switch
        {
            DbUpdateConcurrencyException => (StatusCodes.Status409Conflict, "Registro alterado por outra operação"),
            DbUpdateException            => (StatusCodes.Status409Conflict, "Conflito ao gravar no banco de dados"),
            TimeoutException             => (StatusCodes.Status504GatewayTimeout, "Tempo de resposta excedido"),
            _                            => (StatusCodes.Status500InternalServerError, "Erro interno no servidor")
        };

        var problema = new ProblemDetails
        {
            Status = status,
            Title = titulo,
            Detail = "Não foi possível concluir a operação. Tente novamente em instantes.",
            Instance = context.Request.Path
        };

        context.Response.StatusCode = status;
        await context.Response.WriteAsJsonAsync(problema, cancellationToken);

        return true;
    }
}
using Microsoft.EntityFrameworkCore;
using FaturamentoService.Data;
using FaturamentoService.Middlewares;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<FaturamentoDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));


var enderecoEstoque = builder.Configuration["Services:Estoque"] ?? "http://localhost:5001/";

builder.Services.AddHttpClient("EstoqueService", client =>
{
    client.BaseAddress = new Uri(enderecoEstoque);
    client.Timeout = TimeSpan.FromSeconds(10);
});

builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();

AplicarMigrations(app);

app.UseExceptionHandler();
app.UseSwagger();
app.UseSwaggerUI();
app.UseCors();
app.UseAuthorization();
app.MapControllers();
app.Run();


static void AplicarMigrations(WebApplication app)
{
    using var scope = app.Services.CreateScope();

    var contexto = scope.ServiceProvider.GetRequiredService<FaturamentoDbContext>();
    var logger = scope.ServiceProvider
        .GetRequiredService<ILoggerFactory>()
        .CreateLogger("Startup");

    const int maxTentativas = 12;

    for (var tentativa = 1; tentativa <= maxTentativas; tentativa++)
    {
        try
        {
            contexto.Database.Migrate();
            logger.LogInformation("Migrations aplicadas com sucesso.");
            return;
        }
        catch (Exception ex)
        {
            if (tentativa == maxTentativas)
            {
                logger.LogError(ex, "Banco indisponível após {N} tentativas.", maxTentativas);
                throw;
            }

            logger.LogWarning("Banco indisponível (tentativa {I}/{N}). Nova tentativa em 5s...",
                tentativa, maxTentativas);
            Thread.Sleep(5000);
        }
    }
}
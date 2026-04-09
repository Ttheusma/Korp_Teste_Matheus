using Microsoft.EntityFrameworkCore;
using ServicoEstoque.Data;
using ServicoEstoque.Models;

var builder = WebApplication.CreateBuilder(args);


builder.Services.AddDbContext<EstoqueContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));


builder.Services.AddCors(options => {
    options.AddPolicy("PermitirAngular", policy => {
        policy.WithOrigins("http://localhost:4200", "http://127.0.0.1:4200")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}


app.UseCors("PermitirAngular");

app.MapGet("/api/produtos", async (EstoqueContext db) => {
    return await db.Produtos.ToListAsync();
});


app.MapPost("/api/produtos", async ([Microsoft.AspNetCore.Mvc.FromBody] Produto produto, EstoqueContext db) => {
    db.Produtos.Add(produto);
    await db.SaveChangesAsync();
    return Results.Created($"/api/produtos/{produto.Id}", produto);
});

app.MapPut("/api/produtos/{id}/baixar-saldo", async (int id, int quantidade, EstoqueContext db) => {
    var produto = await db.Produtos.FindAsync(id);
    if (produto is null) return Results.NotFound("Produto não encontrado.");
    if (produto.Saldo < quantidade) return Results.BadRequest("Saldo insuficiente.");

    produto.Saldo -= quantidade;
    await db.SaveChangesAsync();
    return Results.Ok(produto);
});

app.Run();
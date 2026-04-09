using Microsoft.EntityFrameworkCore;
using ServicoEstoque.Models;

namespace ServicoEstoque.Data
{
    public class EstoqueContext : DbContext
    {
        public EstoqueContext(DbContextOptions<EstoqueContext> options) : base(options) { }

     
        public DbSet<Produto> Produtos { get; set; }
    }
}
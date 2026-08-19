using Microsoft.EntityFrameworkCore;
using FaturamentoService.Models;

namespace FaturamentoService.Data;

public class FaturamentoDbContext : DbContext
{
    public FaturamentoDbContext(DbContextOptions<FaturamentoDbContext> options) : base(options) { }

    public DbSet<NotaFiscal> NotasFiscais { get; set; }
    public DbSet<ItemNota> ItensNota { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<NotaFiscal>()
            .HasMany(n => n.Itens)
            .WithOne(i => i.NotaFiscal)
            .HasForeignKey(i => i.NotaFiscalId);

       
        modelBuilder.HasSequence<int>("NotaFiscalNumeroSeq")
            .StartsAt(1)
            .IncrementsBy(1);

        modelBuilder.Entity<NotaFiscal>()
            .Property(n => n.Numero)
            .HasDefaultValueSql("nextval('\"NotaFiscalNumeroSeq\"')");

        
        modelBuilder.Entity<NotaFiscal>()
            .HasIndex(n => n.Numero)
            .IsUnique();

        modelBuilder.Entity<NotaFiscal>()
            .Property<uint>("xmin")
            .HasColumnType("xid")
            .ValueGeneratedOnAddOrUpdate()
            .IsConcurrencyToken();
    }
}
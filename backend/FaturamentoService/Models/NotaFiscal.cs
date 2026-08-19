using System.ComponentModel.DataAnnotations;

namespace FaturamentoService.Models;

public class NotaFiscal
{
    public int Id { get; set; }

    public int Numero { get; set; }

    [Required]
    [StringLength(20)]
    public string Status { get; set; } = "Aberta";

    public DateTime DataCriacao { get; set; } = DateTime.UtcNow;

    public DateTime? ProcessandoDesde { get; set; }

    [MinLength(1, ErrorMessage = "A nota precisa ter ao menos um item.")]
    public List<ItemNota> Itens { get; set; } = new();
}
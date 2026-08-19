using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace FaturamentoService.Models;

public class ItemNota
{
    public int Id { get; set; }

    public int NotaFiscalId { get; set; }

    [Range(1, int.MaxValue, ErrorMessage = "Produto inválido.")]
    public int ProdutoId { get; set; }

    [Required]
    [StringLength(200)]
    public string ProdutoDescricao { get; set; } = string.Empty;

    [Range(1, int.MaxValue, ErrorMessage = "A quantidade deve ser maior que zero.")]
    public int Quantidade { get; set; }

    [JsonIgnore]
    public NotaFiscal? NotaFiscal { get; set; }
}
using System.ComponentModel.DataAnnotations;

namespace EstoqueService.Models;

public class Produto
{
    public int Id { get; set; }

    [Required(ErrorMessage = "O código é obrigatório.")]
    [StringLength(50, ErrorMessage = "O código deve ter no máximo 50 caracteres.")]
    public string Codigo { get; set; } = string.Empty;

    [Required(ErrorMessage = "A descrição é obrigatória.")]
    [StringLength(200, ErrorMessage = "A descrição deve ter no máximo 200 caracteres.")]
    public string Descricao { get; set; } = string.Empty;

    [Range(0, int.MaxValue, ErrorMessage = "O saldo não pode ser negativo.")]
    public int Saldo { get; set; }
}
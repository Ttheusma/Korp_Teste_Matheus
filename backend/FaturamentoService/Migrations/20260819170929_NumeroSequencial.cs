using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace FaturamentoService.Migrations
{
    /// <inheritdoc />
    public partial class NumeroSequencial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateSequence<int>(
                name: "NotaFiscalNumeroSeq");

            migrationBuilder.AlterColumn<int>(
                name: "Numero",
                table: "NotasFiscais",
                type: "integer",
                nullable: false,
                defaultValueSql: "nextval('\"NotaFiscalNumeroSeq\"')",
                oldClrType: typeof(int),
                oldType: "integer")
                .OldAnnotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);

            migrationBuilder.CreateIndex(
                name: "IX_NotasFiscais_Numero",
                table: "NotasFiscais",
                column: "Numero",
                unique: true);
            
              migrationBuilder.Sql(@"
                SELECT setval(
                    '""NotaFiscalNumeroSeq""',
                    COALESCE((SELECT MAX(""Numero"") FROM ""NotasFiscais""), 0) + 1,
                    false
                );
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_NotasFiscais_Numero",
                table: "NotasFiscais");

            migrationBuilder.DropSequence(
                name: "NotaFiscalNumeroSeq");

            migrationBuilder.AlterColumn<int>(
                name: "Numero",
                table: "NotasFiscais",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldDefaultValueSql: "nextval('\"NotaFiscalNumeroSeq\"')")
                .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn);
        }
    }
}

using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using PpecbAssessment.Application.Products;
using PpecbAssessment.Infrastructure.Persistence;

namespace PpecbAssessment.Infrastructure.Products;

public sealed class SqlProductCodeSequenceStore(ApplicationDbContext dbContext)
    : IProductCodeSequenceStore
{
    private const string NextNumberSql = """
        MERGE [ProductCodeSequences] WITH (HOLDLOCK) AS target
        USING (VALUES (@period)) AS source ([Period])
        ON target.[Period] = source.[Period]
        WHEN MATCHED AND target.[LastIssuedNumber] < 999 THEN
            UPDATE SET [LastIssuedNumber] = target.[LastIssuedNumber] + 1
        WHEN NOT MATCHED THEN
            INSERT ([Period], [LastIssuedNumber]) VALUES (source.[Period], 1)
        OUTPUT inserted.[LastIssuedNumber];
        """;

    public async Task<short?> GetNextNumberAsync(
        string period,
        CancellationToken cancellationToken = default)
    {
        var connection = dbContext.Database.GetDbConnection();
        var shouldCloseConnection = connection.State != ConnectionState.Open;

        if (shouldCloseConnection)
        {
            await connection.OpenAsync(cancellationToken);
        }

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = NextNumberSql;
            command.Transaction = dbContext.Database.CurrentTransaction?.GetDbTransaction();
            command.Parameters.Add(new SqlParameter("@period", SqlDbType.Char, 6)
            {
                Value = period
            });

            var result = await command.ExecuteScalarAsync(cancellationToken);
            return result is null or DBNull ? null : Convert.ToInt16(result);
        }
        finally
        {
            if (shouldCloseConnection)
            {
                await connection.CloseAsync();
            }
        }
    }
}

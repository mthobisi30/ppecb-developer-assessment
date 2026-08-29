using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using PpecbAssessment.Domain.Entities;
using PpecbAssessment.Infrastructure.Identity;
using PpecbAssessment.Infrastructure.Persistence;

namespace PpecbAssessment.Tests.Infrastructure.Persistence;

public sealed class ApplicationDbContextModelTests
{
    [Fact]
    public void CategoryConfiguration_ModelBuilt_DefinesOwnerScopedCodeUniqueness()
    {
        using var context = CreateContext();
        var entity = GetEntityType<Category>(context);

        var index = Assert.Single(
            entity.GetIndexes(),
            candidate => candidate.Properties.Select(property => property.Name)
                .SequenceEqual([nameof(Category.OwnerUserId), nameof(Category.CategoryCode)]));

        Assert.True(index.IsUnique);
        Assert.True(entity.FindProperty(nameof(Category.RowVersion))!.IsConcurrencyToken);
    }

    [Fact]
    public void ProductConfiguration_ModelBuilt_DefinesRequiredDatabaseGuarantees()
    {
        using var context = CreateContext();
        var entity = GetEntityType<Product>(context);

        var productCodeIndex = Assert.Single(
            entity.GetIndexes(),
            candidate => candidate.Properties.Select(property => property.Name)
                .SequenceEqual([nameof(Product.ProductCode)]));
        var categoryForeignKey = Assert.Single(
            entity.GetForeignKeys(),
            foreignKey => foreignKey.PrincipalEntityType.ClrType == typeof(Category));

        Assert.True(productCodeIndex.IsUnique);
        Assert.Equal(DeleteBehavior.Restrict, categoryForeignKey.DeleteBehavior);
        Assert.Equal(18, entity.FindProperty(nameof(Product.Price))!.GetPrecision());
        Assert.Equal(2, entity.FindProperty(nameof(Product.Price))!.GetScale());
        Assert.True(entity.FindProperty(nameof(Product.RowVersion))!.IsConcurrencyToken);
    }

    [Fact]
    public void ProductCodeSequenceConfiguration_ModelBuilt_UsesRequiredSqlTypes()
    {
        using var context = CreateContext();
        var entity = GetEntityType<ProductCodeSequence>(context);

        Assert.Equal("char(6)", entity.FindProperty(nameof(ProductCodeSequence.Period))!.GetColumnType());
        Assert.Equal("smallint", entity.FindProperty(nameof(ProductCodeSequence.LastIssuedNumber))!.GetColumnType());
        Assert.True(entity.FindProperty(nameof(ProductCodeSequence.RowVersion))!.IsConcurrencyToken);
    }

    [Fact]
    public void IdentityConfiguration_ModelBuilt_IncludesApplicationUser()
    {
        using var context = CreateContext();

        Assert.NotNull(context.Model.FindEntityType(typeof(ApplicationUser)));
    }

    private static ApplicationDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseSqlServer("Server=localhost;Database=PpecbAssessmentModelTests;Trusted_Connection=True;TrustServerCertificate=True")
            .Options;

        return new ApplicationDbContext(options);
    }

    private static IEntityType GetEntityType<TEntity>(ApplicationDbContext context)
    {
        return context.Model.FindEntityType(typeof(TEntity))
            ?? throw new InvalidOperationException($"{typeof(TEntity).Name} is not part of the database model.");
    }
}

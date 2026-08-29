using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PpecbAssessment.Domain.Entities;

namespace PpecbAssessment.Infrastructure.Persistence.Configurations;

public sealed class ProductConfiguration : IEntityTypeConfiguration<Product>
{
    public void Configure(EntityTypeBuilder<Product> builder)
    {
        builder.ToTable("Products", tableBuilder =>
        {
            tableBuilder.HasCheckConstraint(
                "CK_Products_Price_NonNegative",
                "[Price] >= 0");
            tableBuilder.HasCheckConstraint(
                "CK_Products_ProductCode_Format",
                "[ProductCode] LIKE '[0-9][0-9][0-9][0-9][0-1][0-9]-[0-9][0-9][0-9]' AND SUBSTRING([ProductCode], 5, 2) BETWEEN '01' AND '12'");
        });

        builder.HasKey(product => product.ProductId);

        builder.Property(product => product.ProductId)
            .ValueGeneratedOnAdd();

        builder.Property(product => product.ProductCode)
            .HasMaxLength(10)
            .IsUnicode(false)
            .IsRequired();

        builder.Property(product => product.Name)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(product => product.Description)
            .HasMaxLength(2000);

        builder.Property(product => product.Price)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(product => product.ImagePath)
            .HasMaxLength(500);

        builder.Property(product => product.CreatedByUserId)
            .HasMaxLength(450)
            .IsRequired();

        builder.Property(product => product.CreatedDateUtc)
            .HasColumnType("datetime2")
            .IsRequired();

        builder.Property(product => product.UpdatedByUserId)
            .HasMaxLength(450);

        builder.Property(product => product.UpdatedDateUtc)
            .HasColumnType("datetime2");

        builder.Property(product => product.RowVersion)
            .IsRowVersion();

        builder.HasIndex(product => product.ProductCode)
            .IsUnique();

        builder.HasOne(product => product.Category)
            .WithMany(category => category.Products)
            .HasForeignKey(product => product.CategoryId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

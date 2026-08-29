using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PpecbAssessment.Domain.Entities;
using PpecbAssessment.Infrastructure.Identity;

namespace PpecbAssessment.Infrastructure.Persistence.Configurations;

public sealed class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.ToTable("Categories", tableBuilder =>
            tableBuilder.HasCheckConstraint(
                "CK_Categories_CategoryCode_Format",
                "[CategoryCode] = UPPER([CategoryCode]) AND [CategoryCode] LIKE '[A-Z][A-Z][A-Z][0-9][0-9][0-9]'"));

        builder.HasKey(category => category.CategoryId);

        builder.Property(category => category.CategoryId)
            .ValueGeneratedOnAdd();

        builder.Property(category => category.OwnerUserId)
            .HasMaxLength(450)
            .IsRequired();

        builder.Property(category => category.Name)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(category => category.CategoryCode)
            .HasMaxLength(6)
            .IsUnicode(false)
            .IsRequired();

        builder.Property(category => category.IsActive)
            .HasDefaultValue(true)
            .IsRequired();

        builder.Property(category => category.CreatedByUserId)
            .HasMaxLength(450)
            .IsRequired();

        builder.Property(category => category.CreatedDateUtc)
            .HasColumnType("datetime2")
            .IsRequired();

        builder.Property(category => category.UpdatedByUserId)
            .HasMaxLength(450);

        builder.Property(category => category.UpdatedDateUtc)
            .HasColumnType("datetime2");

        builder.Property(category => category.RowVersion)
            .IsRowVersion();

        builder.HasIndex(category => new { category.OwnerUserId, category.CategoryCode })
            .IsUnique();

        builder.HasOne<ApplicationUser>()
            .WithMany()
            .HasForeignKey(category => category.OwnerUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

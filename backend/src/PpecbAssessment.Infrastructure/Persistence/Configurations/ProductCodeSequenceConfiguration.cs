using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PpecbAssessment.Domain.Entities;

namespace PpecbAssessment.Infrastructure.Persistence.Configurations;

public sealed class ProductCodeSequenceConfiguration : IEntityTypeConfiguration<ProductCodeSequence>
{
    public void Configure(EntityTypeBuilder<ProductCodeSequence> builder)
    {
        builder.ToTable("ProductCodeSequences", tableBuilder =>
        {
            tableBuilder.HasCheckConstraint(
                "CK_ProductCodeSequences_Period_Format",
                "[Period] LIKE '[0-9][0-9][0-9][0-9][0-1][0-9]' AND RIGHT([Period], 2) BETWEEN '01' AND '12'");
            tableBuilder.HasCheckConstraint(
                "CK_ProductCodeSequences_LastIssuedNumber_Range",
                "[LastIssuedNumber] BETWEEN 0 AND 999");
        });

        builder.HasKey(sequence => sequence.Period);

        builder.Property(sequence => sequence.Period)
            .HasMaxLength(6)
            .IsFixedLength()
            .IsUnicode(false);

        builder.Property(sequence => sequence.LastIssuedNumber)
            .IsRequired();

        builder.Property(sequence => sequence.RowVersion)
            .IsRowVersion();
    }
}

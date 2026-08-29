namespace PpecbAssessment.Domain.Entities;

public sealed class ProductCodeSequence
{
    public required string Period { get; set; }

    public short LastIssuedNumber { get; set; }

    public byte[] RowVersion { get; set; } = [];
}

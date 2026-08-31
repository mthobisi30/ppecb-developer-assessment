namespace PpecbAssessment.Application.Products;

public sealed record ProductDeleteResult(
    ProductFailureKind Failure,
    string? DeletedImagePath)
{
    public bool Succeeded => Failure == ProductFailureKind.None;
}

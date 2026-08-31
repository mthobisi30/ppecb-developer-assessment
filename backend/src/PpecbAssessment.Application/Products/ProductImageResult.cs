namespace PpecbAssessment.Application.Products;

public sealed record ProductImageResult(
    ProductDetails? Product,
    ProductFailureKind Failure)
{
    public bool Succeeded => Failure == ProductFailureKind.None;
}

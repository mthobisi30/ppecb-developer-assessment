namespace PpecbAssessment.Application.Products;

public sealed record ProductWriteResult(
    ProductDetails? Product,
    ProductFailureKind Failure)
{
    public bool Succeeded => Failure == ProductFailureKind.None;
}

namespace PpecbAssessment.Application.Products;

public sealed record ProductCodeGenerationResult(string? ProductCode)
{
    public bool Succeeded => ProductCode is not null;
}

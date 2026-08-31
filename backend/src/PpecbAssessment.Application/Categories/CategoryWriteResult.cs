namespace PpecbAssessment.Application.Categories;

public sealed record CategoryWriteResult(
    CategoryDetails? Category,
    CategoryFailureKind Failure)
{
    public bool Succeeded => Failure == CategoryFailureKind.None;
}

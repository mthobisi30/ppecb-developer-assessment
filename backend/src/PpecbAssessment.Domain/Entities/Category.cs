namespace PpecbAssessment.Domain.Entities;

public sealed class Category
{
    public int CategoryId { get; set; }

    public required string OwnerUserId { get; set; }

    public required string Name { get; set; }

    public required string CategoryCode { get; set; }

    public bool IsActive { get; set; } = true;

    public required string CreatedByUserId { get; set; }

    public DateTime CreatedDateUtc { get; set; }

    public string? UpdatedByUserId { get; set; }

    public DateTime? UpdatedDateUtc { get; set; }

    public byte[] RowVersion { get; set; } = [];

    public ICollection<Product> Products { get; set; } = [];
}

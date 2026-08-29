namespace PpecbAssessment.Domain.Entities;

public sealed class Product
{
    public int ProductId { get; set; }

    public int CategoryId { get; set; }

    public required string ProductCode { get; set; }

    public required string Name { get; set; }

    public string? Description { get; set; }

    public decimal Price { get; set; }

    public string? ImagePath { get; set; }

    public required string CreatedByUserId { get; set; }

    public DateTime CreatedDateUtc { get; set; }

    public string? UpdatedByUserId { get; set; }

    public DateTime? UpdatedDateUtc { get; set; }

    public byte[] RowVersion { get; set; } = [];

    public required Category Category { get; set; }
}

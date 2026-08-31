using PpecbAssessment.Application.Products;

namespace PpecbAssessment.Tests.Application.Products;

public sealed class ProductCodeGeneratorTests
{
    [Theory]
    [InlineData(1, "202608-001")]
    [InlineData(42, "202608-042")]
    [InlineData(999, "202608-999")]
    public async Task GenerateAsync_AvailableNumber_ReturnsMonthlyProductCode(
        short nextNumber,
        string expectedCode)
    {
        var store = new StubSequenceStore(nextNumber);
        var generator = new ProductCodeGenerator(
            store,
            new FixedTimeProvider(new DateTimeOffset(2026, 8, 31, 10, 30, 0, TimeSpan.Zero)));

        var result = await generator.GenerateAsync();

        Assert.True(result.Succeeded);
        Assert.Equal(expectedCode, result.ProductCode);
        Assert.Equal("202608", store.RequestedPeriod);
    }

    [Fact]
    public async Task GenerateAsync_MonthlyLimitReached_ReturnsFailure()
    {
        var generator = new ProductCodeGenerator(
            new StubSequenceStore(null),
            new FixedTimeProvider(new DateTimeOffset(2026, 8, 31, 10, 30, 0, TimeSpan.Zero)));

        var result = await generator.GenerateAsync();

        Assert.False(result.Succeeded);
        Assert.Null(result.ProductCode);
    }

    private sealed class StubSequenceStore(short? nextNumber) : IProductCodeSequenceStore
    {
        public string? RequestedPeriod { get; private set; }

        public Task<short?> GetNextNumberAsync(
            string period,
            CancellationToken cancellationToken = default)
        {
            RequestedPeriod = period;
            return Task.FromResult(nextNumber);
        }
    }

    private sealed class FixedTimeProvider(DateTimeOffset utcNow) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow()
        {
            return utcNow;
        }
    }
}

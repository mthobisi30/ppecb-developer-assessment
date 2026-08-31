using Microsoft.AspNetCore.Http;
using PpecbAssessment.Api.Validation;

namespace PpecbAssessment.Tests.Api.Validation;

public sealed class ProductImageValidatorTests
{
    [Theory]
    [MemberData(nameof(ValidImages))]
    public async Task GetFileExtensionAsync_ValidImageSignature_ReturnsCanonicalExtension(
        byte[] content,
        string expectedExtension)
    {
        var file = CreateFile(content);

        var extension = await ProductImageValidator.GetFileExtensionAsync(file);

        Assert.Equal(expectedExtension, extension);
    }

    [Fact]
    public async Task GetFileExtensionAsync_SvgContent_ReturnsNull()
    {
        var file = CreateFile("<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>"u8.ToArray());

        var extension = await ProductImageValidator.GetFileExtensionAsync(file);

        Assert.Null(extension);
    }

    public static TheoryData<byte[], string> ValidImages => new()
    {
        { [0xFF, 0xD8, 0xFF, 0x00], ".jpg" },
        { [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], ".png" },
        { "GIF89a"u8.ToArray(), ".gif" },
        { "BM-image"u8.ToArray(), ".bmp" },
        { "RIFF0000WEBP"u8.ToArray(), ".webp" }
    };

    private static FormFile CreateFile(byte[] content)
    {
        return new FormFile(new MemoryStream(content), 0, content.Length, "file", "image.bin");
    }
}

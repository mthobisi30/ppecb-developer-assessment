namespace PpecbAssessment.Api.Validation;

public static class ProductImageValidator
{
    public const long MaximumFileSize = 5 * 1024 * 1024;

    public const long MaximumRequestSize = MaximumFileSize + (64 * 1024);

    public static async Task<string?> GetFileExtensionAsync(
        IFormFile file,
        CancellationToken cancellationToken = default)
    {
        if (file.Length is <= 0 or > MaximumFileSize)
        {
            return null;
        }

        await using var stream = file.OpenReadStream();
        var header = new byte[12];
        var bytesRead = await stream.ReadAsync(header, cancellationToken);

        if (StartsWith(header, bytesRead, [0xFF, 0xD8, 0xFF]))
        {
            return ".jpg";
        }

        if (StartsWith(header, bytesRead, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))
        {
            return ".png";
        }

        if (StartsWith(header, bytesRead, "GIF87a"u8.ToArray())
            || StartsWith(header, bytesRead, "GIF89a"u8.ToArray()))
        {
            return ".gif";
        }

        if (StartsWith(header, bytesRead, "BM"u8.ToArray()))
        {
            return ".bmp";
        }

        if (bytesRead >= 12
            && StartsWith(header, bytesRead, "RIFF"u8.ToArray())
            && header[8] == (byte)'W'
            && header[9] == (byte)'E'
            && header[10] == (byte)'B'
            && header[11] == (byte)'P')
        {
            return ".webp";
        }

        return null;
    }

    private static bool StartsWith(byte[] content, int contentLength, byte[] signature)
    {
        if (contentLength < signature.Length)
        {
            return false;
        }

        for (var index = 0; index < signature.Length; index++)
        {
            if (content[index] != signature[index])
            {
                return false;
            }
        }

        return true;
    }
}

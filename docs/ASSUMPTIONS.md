# Assumptions and Design Decisions

This record captures choices made where the assessment defines the required outcome but leaves the implementation detail open.

## Ownership boundary

Categories are owned by the authenticated user. The same category code may exist in another user's catalogue, but it must be unique within one user's categories. Products inherit that ownership boundary through their category, and cross-user resource lookups return `404`.

## Category lifecycle

Categories are deactivated rather than deleted. An inactive category cannot receive a newly created, imported or reassigned product, while existing products retain their historical category.

## Product codes

Product codes are global server-generated identifiers in `yyyyMM-###` format. The sequence resets for each UTC month and ends at `999`; the next request returns a conflict rather than producing a code outside the required format. SQL Server allocates the next number atomically.

## Currency and auditing

Prices are represented as `decimal(18,2)`, may be zero and cannot be negative. Audit dates are stored in UTC, and audit user identifiers come from the authenticated user.

## Concurrency

Category and product updates include a Base64 representation of the SQL Server `rowversion`. A stale version returns a conflict instead of silently overwriting another user's update.

## Pagination and sorting

Products are paged server-side at 10 records per page. The default order is name ascending with product ID as a deterministic tie-breaker; the user may sort by name, product code, category or price.

## Spreadsheet exchange

Imports use the first worksheet and require the ordered columns `Name`, `Description`, `CategoryCode` and `Price`. Category codes must identify active categories owned by the current user. Rows are validated before a database transaction is opened, so invalid workbooks leave no partial import. Export contains all products owned by the current user, not only the visible page.

## Product images

Each product can have one optional image. The API validates common raster image signatures, excludes SVG and limits uploads to 5 MB. Files use generated names under `wwwroot/uploads/products`; the database stores the relative path. Deleting a product also attempts to remove its local image file.

## Authentication scope

The application uses ASP.NET Core Identity cookie sessions and anti-forgery protection rather than browser-held JWTs. The assessment has a single authenticated-user role, so password reset, multi-factor authentication, email confirmation and role management are outside scope.

## Persistence abstractions

EF Core `DbContext` is used directly as the persistence and unit-of-work abstraction. A generic repository or mapping framework would duplicate functionality without simplifying this application.

## Local infrastructure

Docker Compose runs only the local SQL Server dependency and preserves its data in a named volume. CI verifies the codebase but does not deploy the application or run a database instance.

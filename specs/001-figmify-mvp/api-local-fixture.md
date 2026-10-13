# API v1 local fixture

## Public controlled fixture

- Fixture URL: `https://example.com/`
- Control and stability: the IANA-managed example domain is reserved for documentation and is publicly available.
- Request: `GET http://127.0.0.1:3000/v1/figma?url=https%3A%2F%2Fexample.com%2F&includeHidden=false`

## Verified expected results

### Success

The local API returned HTTP `200` with `schemaVersion: "1.0"`,
`source.url: "https://example.com/"`, and a root document whose type is
`"FRAME"`.

### Error

The local API returned HTTP `400` for:

`GET http://127.0.0.1:3000/v1/figma?url=not-a-url&includeHidden=false`

The response body was:

```json
{
  "code": "INVALID_REQUEST",
  "message": "The url query parameter must be an absolute HTTP or HTTPS URL."
}
```

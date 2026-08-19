# Footer SDT replacement

This demo loads a three-page DOCX with a plain `[user_initials]` footer placeholder. Each action:

1. Clones and assigns the existing footer part.
2. Reads the placeholder paragraph to preserve its formatting.
3. Replaces only the placeholder with an inline SDT containing text or an image.

## Run

```bash
pnpm install
pnpm dev
```

The SDT is created with structural `doc.replace()`, not `create.contentControl()`.

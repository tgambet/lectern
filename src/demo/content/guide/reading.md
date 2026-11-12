# What Markdown looks like

Lectern renders GitHub-flavoured Markdown, sanitized, in a calm reading column.

## Text

Paragraphs, _emphasis_, **strong**, ~~struck~~ and `inline code`. Keyboard keys: <kbd>Ctrl</kbd> + <kbd>K</kbd>. Footnotes work too.[^offline]

> A quotation sits in the column, set apart.

## Alerts

> [!NOTE]
> GitHub alerts become notices. The word says what kind it is.

> [!WARNING]
> Lectern never writes to your folder, so there is nothing to `undo`.

## Lists

- [x] Render task lists
- [x] Highlight code
- [ ] Read your own folder

## Tables

| Format   | Rendered as     |    Scripts     |
| -------- | --------------- | :------------: |
| Markdown | Sanitized HTML  |     never      |
| HTML     | Sandboxed frame | off by default |

## Code

```ts
const folder = await window.showDirectoryPicker({ mode: "read" });
// Lectern never asks for write access.
```

```bash
git clone https://example.com/repo.git && cd repo
```

```json
{ "name": "lectern", "offline": true }
```

<details>
<summary>More details</summary>

Collapsed content stays collapsed until opened.

</details>

[^offline]: Everything, fonts and syntax grammars included, is cached once installed.

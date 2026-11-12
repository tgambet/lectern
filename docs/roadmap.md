# Roadmap

After v1.0.0. None of this is being built yet; the architecture should not make it hard.

- Mermaid, KaTeX, pre-rendered diagrams (GitHub alerts are done).
- More document components as design-system classes (tabs, steps, cards). MDX was evaluated and set aside, see ADR 0012.
- Other formats: AsciiDoc, reStructuredText, `.ipynb`, OpenAPI, PDF, plain source files with line numbers.
- A tree option to show every file, not only documents (documents stay the default: the point is reading docs without the code around them).
- Command palette (`Ctrl+K`), reading history (the tree filter and file-name search cover most of a file finder).
- Multiple folders (a library), per-folder session restore.
- Backlinks, link graph, broken-link report.
- Notes on HTML documents, and bookmarks on a section (bookmarks and Markdown notes are done, ADR 0014).
- Print and PDF export, presentation mode.
- OS integration: manifest `file_handlers` and `launch_handler` (`FileSystemObserver` live reload is done, ADR 0013).
- Reduced mode for Firefox and Safari through `<input webkitdirectory>` (read-only, no persistence). Unlikely: the product is built around persistent folder handles.
- A renderer plugin API.

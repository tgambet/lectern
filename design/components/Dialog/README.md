Dialog is a modal for a short task: writing a note, reviewing a list. It is a native `<dialog>` opened with `showModal()`, so the browser traps focus, closes on Escape and gives focus back to what opened it.

The consumer provides a title and the content. Use `lc-dialog` with `aria-labelledby` on its `lc-dialog__title`, and a Close button in `lc-dialog__head`; put buttons in `lc-dialog__actions`, the primary one first.

- Keep it to one task. It is not a page.
- Where the reader may be typing, a click on the backdrop must not close it.
- The page behind is inert, so a status message about the dialog's own actions goes inside it, in a `role="status"` element.
- Fields use `lc-field`, always with a visible `<label>`.

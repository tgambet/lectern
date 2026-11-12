# 0007. Resuming a folder: one click is the norm, zero is a bonus

- Status: accepted (spike 3, milestone 2)
- Date: 2026-11-01
- Evidence: branch `spike/m2`, `spikes/m2/results-resume.txt` (manual run, Chrome on Linux, normal profile)

## Context

The brief promises that relaunching resumes the last folder in at most one click, and in zero when the permission persisted (installed app, or "Allow on every visit"). We stored the `FileSystemDirectoryHandle` in IndexedDB and observed `queryPermission({ mode: "read" })` across reloads, tab closes, restarts and installation, plus whether the service worker could read through the handle.

## What the spike showed

| Situation                                     | Permission on load | To read again                                                            |
| --------------------------------------------- | ------------------ | ------------------------------------------------------------------------ |
| Just picked                                   | `granted`          | nothing                                                                  |
| Page reloaded                                 | `granted`          | nothing                                                                  |
| Tab closed and reopened, Chrome still running | `prompt`           | one click                                                                |
| Chrome restarted                              | `prompt`           | one click (`requestPermission` from Resume, prompt answered in 1 to 4 s) |
| Chrome restarted after the "every visit" step | `prompt`           | one click                                                                |
| Installed app, after a Chrome restart         | `prompt`           | one click                                                                |

- The handle itself always survived: name intact, `requestPermission()` from a click restored access every time.
- The service worker shares the page's permission: `granted` in the SW whenever the page had it, and its direct read worked with a real picked folder (closes the open point of ADR 0006). When the page is at `prompt`, nothing can read, the SW included.
- In a tab, Chrome's prompt offered no "Allow on every visit" choice; the permission never persisted.
- In the installed app, `queryPermission()` still reports `prompt` at launch, but re-granting needs no answer from the person: the resume goes through without asking again (observed by hand; the log shows `requestPermission` resolving `granted`).

## Decision

- **Resume screen by default.** On launch, if a handle is stored, query its permission. `granted`: open the folder directly, no screen. `prompt`: show the resume card ("Resume _docs_") whose primary button calls `requestPermission()`; that is the one click. `denied`, or a failing handle (folder moved or deleted): show the permission notice, offer "Open another folder…", keep the stored entry until replaced.
- **Never ask without a gesture.** No `requestPermission()` on load; it needs user activation anyway.
- **The zero-click path stays, but is not relied on.** We keep checking `queryPermission()` first, so persisted grants open directly where the browser offers them.
- **Silent restore attempt in the installed app.** When `display-mode: standalone`, call `requestPermission()` once on launch, without a gesture, and catch the refusal. If Chrome can re-grant without a prompt, the folder opens with zero clicks; otherwise the resume card shows as usual. To verify by hand in milestone 3.
- **HTML documents wait for permission.** The SW answers `/~/…` with 404 while permission is `prompt`; the app never shows an HTML document before the folder is resumed.
- Last file and scroll position are restored after the resume, not before.

## Open question

Whether a silent `requestPermission()` (no user activation) succeeds in the installed app. Verified by hand once the resume flow ships (milestone 3).

## Consequences

The acceptance criterion "at most one click" holds. "Zero if permission persisted" depends on the browser; the README will say "one click" rather than promise zero.

export type FsErrorCode =
  | "not-found"
  | "not-a-file"
  | "not-a-directory"
  | "permission"
  | "invalid-path";

export class FsError extends Error {
  readonly code: FsErrorCode;
  readonly path: string;

  constructor(code: FsErrorCode, path: string) {
    super(`${code}: ${path === "" ? "(root)" : path}`);
    this.name = "FsError";
    this.code = code;
    this.path = path;
  }
}

export function isFsError(error: unknown, code?: FsErrorCode): error is FsError {
  return error instanceof FsError && (code === undefined || error.code === code);
}

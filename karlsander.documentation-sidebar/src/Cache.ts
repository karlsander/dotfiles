import * as vscode from "vscode";

export type CacheKey = typeof cacheKeyNone | DocumentCacheKey;

export const cacheKeyNone = { type: "none" } as const;

class DocumentCacheKey {
  readonly type = "document";

  constructor(
    public readonly url: vscode.Uri,
    public readonly version: number,
    public readonly wordRange: vscode.Range | undefined
  ) {}

  public equals(other: DocumentCacheKey): boolean {
    if (this.url.toString() !== other.url.toString()) {
      return false;
    }

    if (this.version !== other.version) {
      return false;
    }

    if (other.wordRange === this.wordRange) {
      return true;
    }

    if (!other.wordRange || !this.wordRange) {
      return false;
    }

    return this.wordRange.isEqual(other.wordRange);
  }
}

export function cacheKeyEquals(a: CacheKey, b: CacheKey): boolean {
  if (a === b) {
    return true;
  }

  if (a.type !== b.type) {
    return false;
  }

  if (a.type === "none" || b.type === "none") {
    return false;
  }

  return a.equals(b);
}

export function createCacheKey(
  editor: vscode.TextEditor | undefined
): CacheKey {
  if (!editor) {
    return cacheKeyNone;
  }

  return new DocumentCacheKey(
    editor.document.uri,
    editor.document.version,
    editor.document.getWordRangeAtPosition(editor.selection.active)
  );
}

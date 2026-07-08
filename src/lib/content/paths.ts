/**
 * Dotted-path get/set helpers for the in-place content editor.
 *
 * Paths look like "a.b.0.c" — a numeric segment indexes into an array, a
 * non-numeric segment keys into an object. These mirror the `data-edit`
 * attribute paths in the marketing markup so editor edits map back onto the
 * stored content document.
 */

type Indexable = Record<string, unknown> | unknown[];

function isIndexable(value: unknown): value is Indexable {
  return typeof value === "object" && value !== null;
}

function isArrayIndex(segment: string): boolean {
  return /^\d+$/.test(segment);
}

/** Read the value at a dotted path; returns undefined if any segment is missing. */
export function getByPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  let current: unknown = obj;
  for (const segment of path.split(".")) {
    if (!isIndexable(current)) return undefined;
    if (Array.isArray(current)) {
      current = isArrayIndex(segment) ? current[Number(segment)] : undefined;
    } else {
      current = (current as Record<string, unknown>)[segment];
    }
  }
  return current;
}

/**
 * Set the value at a dotted path, creating intermediate objects/arrays as
 * needed. A numeric segment makes (or extends) an array; anything else makes an
 * object. Mutates and returns `root` (callers typically start from {}).
 */
export function setByPath(
  root: Record<string, unknown> | unknown[],
  path: string,
  value: unknown,
): Record<string, unknown> | unknown[] {
  if (!path) return root;
  const segments = path.split(".");
  let current: Indexable = root;

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i];
    const nextIsArray = isArrayIndex(segments[i + 1]);

    if (Array.isArray(current)) {
      const idx = Number(segment);
      if (!isIndexable(current[idx])) {
        current[idx] = nextIsArray ? [] : {};
      }
      current = current[idx] as Indexable;
    } else {
      const obj = current as Record<string, unknown>;
      if (!isIndexable(obj[segment])) {
        obj[segment] = nextIsArray ? [] : {};
      }
      current = obj[segment] as Indexable;
    }
  }

  const last = segments[segments.length - 1];
  if (Array.isArray(current)) {
    current[Number(last)] = value;
  } else {
    (current as Record<string, unknown>)[last] = value;
  }
  return root;
}

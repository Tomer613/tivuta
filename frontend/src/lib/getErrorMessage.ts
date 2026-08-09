/**
 * Extracts a user-displayable message from a caught value, falling back to a caller-provided
 * default. `catch` blocks type their parameter as `unknown` (not `Error`), and this codebase's
 * `fetch` wrappers reject with a plain `Error`, so `instanceof Error` is the correct narrowing —
 * extracted after this exact one-line ternary was independently duplicated across ~20 catch
 * blocks during a broader `any`-type cleanup pass.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
    return err instanceof Error ? err.message : fallback;
}

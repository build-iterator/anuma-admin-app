import { cn } from "@/lib/utils";

// Anuma brand primitives — the Morse shape grammar, same as the merchant app:
// dot (·) a signal, dash (–) an action. The mark is ·– : the letter A.
// Shapes render in currentColor so they work on dark and light grounds.

export function MDot({ u = 5, className }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 rounded-full bg-current", className)}
      style={{ width: u, height: u }}
    />
  );
}

export function MDash({ u = 5, className }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block shrink-0 bg-current", className)}
      style={{ width: u * 3, height: u, borderRadius: u / 2 }}
    />
  );
}

// The mark: ·– (A in Morse).
export function MorseA({ u = 5, gap = 4, className }) {
  return (
    <span aria-hidden className={cn("inline-flex items-center", className)} style={{ gap }}>
      <MDot u={u} />
      <MDash u={u} />
    </span>
  );
}

// Loading indicator — the mark keyed like the letter: · then –.
export function MorseSpinner({ u = 5, gap = 4, className }) {
  return (
    <span aria-hidden className={cn("inline-flex items-center", className)} style={{ gap }}>
      <MDot u={u} className="morse-dot" />
      <MDash u={u} className="morse-dash" />
    </span>
  );
}

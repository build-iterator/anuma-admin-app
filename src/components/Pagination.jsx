import { ChevronLeft, ChevronRight } from "lucide-react";

// Simple prev / next pager. Renders "X–Y of Z · Page A of B".
// Buttons disable at the ends; caller wires onPageChange to setPage from
// usePagination() so the URL stays authoritative.
export function Pagination({ count, page, limit, onPageChange, className = "" }) {
  const safeLimit = Math.max(1, limit || 50);
  const totalPages = Math.max(1, Math.ceil((count || 0) / safeLimit));
  const clampedPage = Math.min(Math.max(1, page || 1), totalPages);
  const from = count === 0 ? 0 : (clampedPage - 1) * safeLimit + 1;
  const to = Math.min(clampedPage * safeLimit, count || 0);

  const btn =
    "inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-40";

  return (
    <div className={`flex items-center justify-between text-sm ${className}`}>
      <span className="text-muted-foreground">
        {from}–{to} of {count ?? 0}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={btn}
          onClick={() => onPageChange(clampedPage - 1)}
          disabled={clampedPage <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[80px] text-center text-muted-foreground">
          Page {clampedPage} of {totalPages}
        </span>
        <button
          type="button"
          className={btn}
          onClick={() => onPageChange(clampedPage + 1)}
          disabled={clampedPage >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// Per-type value renderers shared by the table cells and the record panel.

export function TempPill({ temp }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ color: temp.color, backgroundColor: temp.bg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: temp.color }} />
      {temp.label}
    </span>
  );
}

export function SelectBadge({ field, value }) {
  if (!value) return null;
  const opt = field.options?.find((o) => o.value === value);
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={opt ? { color: opt.color, backgroundColor: opt.bg } : { color: "#374151", backgroundColor: "#f3f4f6" }}
    >
      {value}
    </span>
  );
}

export function FieldValue({ field, value }) {
  if (value === undefined || value === null || value === "") {
    return <span className="text-muted-foreground/50">—</span>;
  }
  switch (field.type) {
    case "select":
      return <SelectBadge field={field} value={value} />;
    case "url": {
      const href = /^https?:\/\//.test(value) ? value : `https://${value}`;
      const label = value.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline-offset-2 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {label}
        </a>
      );
    }
    case "email":
      return (
        <a href={`mailto:${value}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
          {value}
        </a>
      );
    case "phone":
      return (
        <a href={`tel:${value.replace(/\s/g, "")}`} className="whitespace-nowrap hover:underline" onClick={(e) => e.stopPropagation()}>
          {value}
        </a>
      );
    case "number":
      return <span className="tabular-nums">{Number(value).toLocaleString("en-IN")}</span>;
    default:
      return <span>{String(value)}</span>;
  }
}

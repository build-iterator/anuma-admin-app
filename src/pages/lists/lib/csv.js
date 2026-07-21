// CSV loading — the point of the whole thing: generated CRMs get built
// elsewhere (scrapes, enrichment runs, LLM passes) and load here as lead
// lists. Hand-rolled RFC-ish parser (quotes, commas, newlines in quotes) so
// there's no dependency, plus header auto-mapping onto our field vocabulary.

export function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell);
      cell = "";
      if (row.some((v) => v !== "")) rows.push(row);
      row = [];
    } else {
      cell += c;
    }
  }
  row.push(cell);
  if (row.some((v) => v !== "")) rows.push(row);
  if (!rows.length) return { headers: [], records: [] };

  const headers = rows[0].map((h) => h.trim().replace(/^\uFEFF/, ""));
  const records = rows.slice(1).map((r) =>
    Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? "").trim()]).filter(([, v]) => v !== "")),
  );
  return { headers, records };
}

// Header → field-key vocabulary. Aliases are normalized (lowercase, alnum).
const ALIASES = {
  company_name: ["company", "companyname", "business", "businessname", "account", "brand", "name"],
  website: ["website", "site", "url", "domain", "domains", "web"],
  contact_name: ["contact", "contactname", "contactperson", "person", "founder", "decisionmaker"],
  contact_role: ["role", "title", "jobtitle", "designation", "contactrole", "position"],
  email: ["email", "emailaddress", "workemail", "mail"],
  phone: ["phone", "phonenumber", "mobile", "tel", "telephone", "contactnumber"],
  whatsapp: ["whatsapp", "wa", "whatsappnumber"],
  annual_revenue_usd: ["annualrevenue", "annualrevenueusd", "revenueusd"],
  product_type: ["producttype", "product"],
  industry: ["industry", "sector", "vertical"],
  employees: ["employees", "employeecount", "headcount", "noofemployees", "numberofemployees", "staff"],
  location: ["location", "region", "geo"],
  market_segment: ["marketsegment", "segment"],
  city: ["city", "town"],
  state: ["state", "province"],
  owner: ["owner", "assignee", "assignedto", "rep"],
  source: ["source", "leadsource", "origin"],
  next_action: ["nextaction", "next", "nextstep", "action"],
  next_action_date: ["nextactiondate", "nextdate", "duedate", "due", "followupdate"],
  notes: ["notes", "note", "comments", "remarks"],
  stage: ["stage", "status", "pipelinestage", "pipeline"],
  category: ["category", "categories", "segment", "industry", "vertical"],
  fit_score: ["fitscore", "fit", "score", "leadscore"],
  employees_band: ["employees", "employeesband", "employeerange", "headcount", "teamsize", "size"],
  turnover_band: ["turnover", "turnoverband", "revenue", "arr", "estimatedarr"],
  date_added: ["dateadded", "added", "createdat", "created"],
};

const NUMBER_KEYS = new Set(["fit_score", "annual_revenue_usd", "employees"]);

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function slugKey(header) {
  return (
    header
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "col"
  );
}

// Maps CSV headers to field keys: known aliases hit the core vocabulary,
// everything else becomes an ad-hoc text field (imported, shown in the
// cockpit — signals over noise still holds).
export function mapHeaders(headers) {
  const used = new Set();
  return headers.map((header) => {
    const n = norm(header);
    let key = null;
    for (const [fieldKey, aliases] of Object.entries(ALIASES)) {
      if (!used.has(fieldKey) && (aliases.includes(n) || norm(fieldKey) === n)) {
        key = fieldKey;
        break;
      }
    }
    const known = Boolean(key);
    if (!key) {
      key = slugKey(header);
      let candidate = key;
      for (let i = 2; used.has(candidate); i += 1) candidate = `${key}_${i}`;
      key = candidate;
    }
    used.add(key);
    return { header, key, known, label: header };
  });
}

// CSV rows (header-keyed) → record values (field-keyed), given a mapping.
export function applyMapping(records, mapping) {
  return records.map((row) => {
    const values = {};
    for (const m of mapping) {
      const raw = row[m.header];
      if (raw === undefined || raw === "") continue;
      values[m.key] = NUMBER_KEYS.has(m.key) && !Number.isNaN(Number(raw)) ? Number(raw) : raw;
    }
    return values;
  });
}

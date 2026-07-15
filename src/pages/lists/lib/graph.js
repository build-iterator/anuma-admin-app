// The records graph — Companies and Contacts as DERIVED projections over
// every lead list. Nothing is stored twice: load a generated list and its
// companies/contacts appear here, deduped and merged; leads stay the
// disposable outbound layer, records are the durable picture.
//
// Dedup keys: companies by domain when present, else normalized name;
// contacts by email, else phone, else name@company.

import { getAllLists, getRecords } from "@/pages/lists/lib/store";
import { temperature } from "@/pages/lists/lib/signals";

const normName = (s) =>
  s
    .toLowerCase()
    .replace(/\b(pvt|private|ltd|limited|llp|inc|co|company)\b\.?/g, "")
    .replace(/[^a-z0-9]/g, "");

export function domainOf(url) {
  if (!url) return null;
  const m = /^(?:https?:\/\/)?(?:www\.)?([^/\s:?#]+)/i.exec(url.trim());
  return m ? m[1].toLowerCase() : null;
}

const MERGE_FIELDS = [
  "website",
  "category",
  "city",
  "state",
  "cluster",
  "employees_band",
  "turnover_band",
  "indiamart_url",
  "shopify_domain",
  "gst_legal_status",
  "type",
];

export function getCompanies() {
  const map = new Map();
  for (const list of getAllLists()) {
    for (const record of getRecords(list.id)) {
      const name = record.values.company_name?.trim();
      if (!name) continue;
      const key = domainOf(record.values.website) ?? normName(name) ?? name;
      let company = map.get(key);
      if (!company) {
        company = { key, name, values: {}, leads: [] };
        map.set(key, company);
      }
      for (const f of MERGE_FIELDS) {
        if (!company.values[f] && record.values[f]) company.values[f] = record.values[f];
      }
      company.leads.push({
        listId: list.id,
        listName: list.name,
        recordId: record.id,
        stage: record.values[list.stageField],
        temp: temperature(list, record),
        owner: record.values.owner,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.leads.length - a.leads.length || a.name.localeCompare(b.name));
}

export function getContacts() {
  const map = new Map();
  for (const list of getAllLists()) {
    for (const record of getRecords(list.id)) {
      const v = record.values;
      const name = v.contact_name?.trim();
      if (!name) continue;
      const key = v.email?.toLowerCase() || v.phone?.replace(/\s/g, "") || `${normName(name)}@${normName(v.company_name ?? "")}`;
      let contact = map.get(key);
      if (!contact) {
        contact = {
          key,
          name,
          company: v.company_name,
          role: v.contact_role,
          email: v.email,
          phone: v.phone,
          whatsapp: v.whatsapp,
          city: v.city,
          leads: [],
        };
        map.set(key, contact);
      }
      contact.role = contact.role || v.contact_role;
      contact.email = contact.email || v.email;
      contact.phone = contact.phone || v.phone;
      contact.whatsapp = contact.whatsapp || v.whatsapp;
      contact.leads.push({
        listId: list.id,
        listName: list.name,
        recordId: record.id,
        stage: record.values[list.stageField],
        temp: temperature(list, record),
      });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

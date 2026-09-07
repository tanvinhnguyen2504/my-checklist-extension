// Writing the list out as a CSV file.
//
// Deliberately free of top-level DOM access so toCsv() stays importable and
// testable in plain Node; the only DOM touch is inside downloadCsv().

import { PRIORITY_LABELS, todayKey } from "./utils.js";

const COLUMNS = ["text", "done", "priority", "dueDate", "updatedAt"];

// RFC 4180: a field containing a quote, comma or newline must be quoted, and
// quotes inside it are doubled. The text column is always quoted because it is
// the only free-form field -- that keeps the output stable whatever a task says.
function quote(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function toCsv(items) {
  const rows = items.map((item) => [
    quote(item.text),
    item.done,
    PRIORITY_LABELS[item.priority],
    item.dueDate || "",
    // Items predating the field have no stamp and render blank rather than
    // claiming a date, matching how the rest of the app treats updatedAt.
    item.updatedAt ? new Date(item.updatedAt).toISOString() : "",
  ]);
  return [COLUMNS, ...rows].map((row) => row.join(",")).join("\r\n");
}

export function csvFilename(reference = todayKey()) {
  return `checklist-${reference}.csv`;
}

// A Blob and an <a download> rather than chrome.downloads: the latter would
// force a new manifest permission onto an extension that asks only for storage.
// The leading BOM is what makes Excel read the file as UTF-8 instead of the
// system codepage, which otherwise mangles any non-ASCII task text.
export function downloadCsv(items) {
  const blob = new Blob(["﻿", toCsv(items)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = csvFilename();
  link.click();
  URL.revokeObjectURL(url);
}

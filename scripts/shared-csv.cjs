const fs = require("fs");

function normalizeCsvText(value) {
  return (value ?? "").toString().replace(/\s+/g, " ").trim();
}

function parseCsvRows(content) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const input = (content || "").replace(/^\uFEFF/, "");

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const next = input[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((cell) => normalizeCsvText(cell))) rows.push(row);
      row = [];
      continue;
    }

    field += ch;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => normalizeCsvText(cell))) rows.push(row);
  }

  return rows;
}

function rowsToObjects(rows) {
  if (!rows || rows.length < 2) return [];
  const headers = rows[0].map((header) => normalizeCsvText(header));
  return rows.slice(1).map((values) => {
    const object = {};
    headers.forEach((header, index) => {
      object[header] = normalizeCsvText(values[index] || "");
    });
    return object;
  });
}

function parseCsvObjects(content) {
  return rowsToObjects(parseCsvRows(content));
}

function loadCsvObjects(filePath, options = {}) {
  if (!fs.existsSync(filePath)) return [];
  const rows = parseCsvObjects(fs.readFileSync(filePath, "utf8"));
  if (!options.requiredField) return rows;
  return rows.filter((row) => normalizeCsvText(row[options.requiredField]));
}

module.exports = {
  loadCsvObjects,
  normalizeCsvText,
  parseCsvObjects,
  parseCsvRows,
  rowsToObjects,
};

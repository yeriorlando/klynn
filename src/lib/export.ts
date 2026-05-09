export function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  // Escapar valores para evitar problemas con comas y comillas en CSV
  const escapeCell = (cell: string | number) => {
    const stringValue = String(cell ?? "");
    if (stringValue.includes(",") || stringValue.includes("\"") || stringValue.includes("\n")) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    return stringValue;
  };

  const csvContent = "data:text/csv;charset=utf-8,\uFEFF" // \uFEFF es el BOM de UTF-8 para Excel
    + [
        headers.map(escapeCell).join(","), 
        ...rows.map(row => row.map(escapeCell).join(","))
      ].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

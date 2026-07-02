
/**
 * Utility to export JSON data to CSV
 */
export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvRows = [];

  // Add headers
  csvRows.push(headers.join(';'));

  // Add data rows
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header] === undefined || row[header] === null ? '' : row[header];
      const escaped = ('' + val)
        .replace(/"/g, '""')
        .replace(/\n/g, ' ');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(';'));
  }

  const csvString = csvRows.join('\n');
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export type ExportRow = {
  createdAt: Date | string;
  userName: string;
  type: string;
  detail: string | null;
};

function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(rows: ExportRow[]): string {
  const lines = ['created_at,user_name,type,detail'];
  for (const r of rows) {
    lines.push(
      [
        new Date(r.createdAt).toISOString(),
        csvCell(r.userName),
        csvCell(r.type),
        csvCell(r.detail ?? '')
      ].join(',')
    );
  }
  return lines.join('\n');
}

export function toJson(rows: ExportRow[]): string {
  return JSON.stringify(
    rows.map((r) => ({
      createdAt: new Date(r.createdAt).toISOString(),
      userName: r.userName,
      type: r.type,
      detail: r.detail ?? null
    })),
    null,
    2
  );
}

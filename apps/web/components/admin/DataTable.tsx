import clsx from "clsx";

export type DataColumn<T> = {
  key: string;
  header: string;
  width?: string;
  render: (row: T) => React.ReactNode;
};

export default function DataTable<T>({
  columns,
  rows,
  emptyMessage
}: {
  columns: DataColumn<T>[];
  rows: T[];
  emptyMessage?: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-illuvrse-border bg-white shadow-card">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-illuvrse-muted">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={clsx("px-4 py-3", col.width)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-illuvrse-muted">
                {emptyMessage ?? "No records yet."}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index} className="border-t border-illuvrse-border">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

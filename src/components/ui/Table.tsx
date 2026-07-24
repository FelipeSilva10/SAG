import { cn } from "@/lib/utils";

interface Column<T> {
  key: string;
  header: string;
  width?: string;
  render?: (row: T) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  rowKey: (row: T) => string;
  emptyMessage?: string;
  rowClassName?: (row: T) => string;
}

export default function Table<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  rowKey,
  emptyMessage = "Nenhum registro encontrado.",
  rowClassName,
}: TableProps<T>) {
  return (
    <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[680px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "sticky top-0 z-10 px-4 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide",
                  col.width
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-10 text-center text-sm text-slate-400"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  "border-b border-slate-100 transition-colors last:border-0",
                  onRowClick && "cursor-pointer hover:bg-indigo-50/70",
                  rowClassName?.(row)
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-slate-700">
                    {col.render
                      ? col.render(row)
                      : String(row[col.key] ?? "—")}
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

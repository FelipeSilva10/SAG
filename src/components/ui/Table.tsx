"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Spinner } from "./Spinner";

export interface Column<T> {
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
  loading?: boolean;
  /** Ativa paginação client-side com esse tamanho de página. */
  pageSize?: number;
}

export default function Table<T extends object>({
  columns,
  data,
  onRowClick,
  rowKey,
  emptyMessage = "Nenhum registro encontrado.",
  rowClassName,
  loading,
  pageSize,
}: TableProps<T>) {
  const [page, setPage] = React.useState(1);

  const totalPages = pageSize ? Math.max(1, Math.ceil(data.length / pageSize)) : 1;
  const currentPage = Math.min(page, totalPages);

  React.useEffect(() => {
    setPage(1);
  }, [data.length, pageSize]);

  const pageData = pageSize
    ? data.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : data;

  return (
    <div className="overflow-hidden rounded-lg border border-[#e3ebf1] bg-white">
      <div className="overflow-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-[#e3ebf1] bg-[#f3f7fa]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "sticky top-0 z-10 bg-[#f3f7fa] px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-[#62798a]",
                    col.width
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10">
                  <Spinner size="sm" />
                </td>
              </tr>
            ) : pageData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-sm text-[#8ea0b0]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageData.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "border-b border-[#eef2f7] transition-colors last:border-0",
                    onRowClick && "cursor-pointer hover:bg-[#e8f1f6]/60",
                    rowClassName?.(row)
                  )}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-[#1f2d3a]">
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pageSize && data.length > pageSize && (
        <div className="flex items-center justify-between gap-3 border-t border-[#e3ebf1] px-4 py-2.5 text-xs text-[#62798a]">
          <span>
            {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, data.length)} de {data.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              aria-label="Página anterior"
              className="flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-[#f3f7fa] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="px-1 font-semibold text-[#1f2d3a]">
              {currentPage}/{totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              aria-label="Próxima página"
              className="flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-[#f3f7fa] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

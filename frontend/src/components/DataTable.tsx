import React from 'react';

interface Column<T> {
  key: keyof T;
  label: string;
  render?: (value: any, item: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  keyExtractor: (item: T, index: number) => string | number;
  loading?: boolean;
  emptyMessage?: string;
}

export const DataTable = React.forwardRef<HTMLTableElement, DataTableProps<any>>(
  (
    {
      columns,
      data,
      onRowClick,
      keyExtractor,
      loading = false,
      emptyMessage = 'No data available',
    },
    ref
  ) => {
    if (loading) {
      return (
        <div className="py-8 text-center">
          <div className="inline-block w-6 h-6 border-3 border-navy-200 border-t-clinical-600 rounded-full animate-spin"></div>
          <p className="mt-2 text-navy-600">Loading...</p>
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="py-8 text-center">
          <p className="text-navy-600">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto rounded-lg border border-navy-200">
        <table ref={ref} className="w-full">
          <thead>
            <tr className="bg-navy-50 border-b border-navy-200">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={`px-6 py-3 text-left text-sm font-semibold text-navy-900 text-${col.align || 'left'}`}
                  style={{ width: col.width }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr
                key={keyExtractor(item, index)}
                onClick={() => onRowClick?.(item)}
                className={`border-b border-navy-200 transition-colors ${
                  onRowClick ? 'hover:bg-navy-50 cursor-pointer' : ''
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={`px-6 py-4 text-sm text-navy-700 text-${col.align || 'left'}`}
                  >
                    {col.render ? col.render(item[col.key], item) : String(item[col.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
);

DataTable.displayName = 'DataTable';

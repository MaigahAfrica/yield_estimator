import { useMemo } from 'react';
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import type { YieldRecord } from '../types';

const columnHelper = createColumnHelper<YieldRecord>();

export interface RecordsTableProps {
  data: YieldRecord[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function RecordsTable({ data, total, page, pageSize, onPageChange, onPageSizeChange }: RecordsTableProps) {
  const columns = useMemo(
    () => [
      columnHelper.accessor('idNumber', {
        header: 'Farmer ID',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('officer', {
        header: 'Officer',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('location', {
        header: 'Location',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('timestamp', {
        header: 'Visit Date',
        cell: (info) => format(new Date(info.getValue()), 'PP'),
      }),
      columnHelper.accessor('yieldPerHa', {
        header: 'Yield (kg/ha)',
        cell: (info) => info.getValue().toFixed(1),
      }),
      columnHelper.accessor('volume', {
        header: 'Volume (kg)',
        cell: (info) => info.getValue().toFixed(1),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <Link to={`/records/${info.row.original.id}`} className="table-link">
            View details
          </Link>
        ),
      }),
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  return (
    <div className="records-table">
      <table>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
              ))}
            </tr>
          ))}
          {table.getRowModel().rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="empty-state">
                No records found
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="table-pagination">
        <div className="pagination-controls">
          <button type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button type="button" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
            Next
          </button>
        </div>
        <div className="pagination-page-size">
          <label>
            Rows per page
            <select value={pageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
              {[10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
          <span>{total} total records</span>
        </div>
      </div>
    </div>
  );
}

export default RecordsTable;

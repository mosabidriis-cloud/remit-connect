import type { ReactNode } from "react";
import { colors, radius, shadows, spacing, typography } from "../../theme";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  align?: "left" | "right";
  render: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
};

export function DataTable<T>({ columns, rows, getRowKey }: DataTableProps<T>) {
  return (
    <div
      style={{
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.lg,
        boxShadow: shadows.sm,
        overflowX: "auto",
      }}
    >
      <table className="min-w-full text-sm" style={{ borderCollapse: "collapse", color: colors.text }}>
        <thead
          style={{
            backgroundColor: colors.slate900,
            color: colors.slate300,
            fontSize: typography.caption,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textAlign: "left",
            textTransform: "uppercase",
          }}
        >
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                style={{ padding: `${spacing.sm}px ${spacing.lg}px`, textAlign: column.align === "right" ? "right" : "left" }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={getRowKey(row)}
              style={{
                backgroundColor: index % 2 === 1 ? colors.slate50 : colors.surface,
                borderTop: `1px solid ${colors.slate100}`,
              }}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  style={{
                    color: colors.slate700,
                    fontVariantNumeric: column.align === "right" ? "tabular-nums" : undefined,
                    padding: `${spacing.sm}px ${spacing.lg}px`,
                    textAlign: column.align === "right" ? "right" : "left",
                  }}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

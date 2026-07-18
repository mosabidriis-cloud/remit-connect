import type { ReactNode } from "react";

type Column<T> = {
  header: string;
  render: (row: T) => ReactNode;
  width?: string;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
};

export default function DataTable<T>({
  columns,
  data,
}: DataTableProps<T>) {
  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid #E5E7EB",
      }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
        }}
      >
        <thead>
          <tr
            style={{
              background: "#F8FAFC",
            }}
          >
            {columns.map((column) => (
              <th
                key={column.header}
                style={{
                  padding: "16px",
                  textAlign: "left",
                  color: "#334155",
                  fontSize: 14,
                  fontWeight: 700,
                  borderBottom: "1px solid #E5E7EB",
                  width: column.width,
                }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.map((row, index) => (
            <tr
              key={index}
              style={{
                borderBottom: "1px solid #F1F5F9",
              }}
            >
              {columns.map((column) => (
                <td
                  key={column.header}
                  style={{
                    padding: "16px",
                    color: "#1E293B",
                    fontSize: 14,
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
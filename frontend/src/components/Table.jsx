export default function Table({ columns, rows, onRowClick }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="min-w-full text-sm">
        <thead className="bg-secondary/80 text-left text-muted">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className="px-3 py-3 font-medium whitespace-nowrap">
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-muted">
                No records found
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr
                key={row.id ?? idx}
                onClick={() => onRowClick?.(row)}
                className={`border-t border-border/80 ${
                  onRowClick ? "cursor-pointer hover:bg-secondary/60" : ""
                }`}
              >
                {columns.map((c) => (
                  <td key={c.key} className="px-3 py-3 align-top whitespace-nowrap text-text">
                    {c.render ? c.render(row) : row[c.key]}
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

export default function Table({ columns, rows, onRowClick }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-card/90 shadow-[0_14px_35px_rgba(0,0,0,0.12)]">
      <table className="min-w-full text-sm">
        <thead className="bg-white/[0.035] text-left text-muted">
          <tr>
            {columns.map((c) => (
                <th key={c.key} className="px-3 py-3.5 text-[11px] font-medium uppercase tracking-[0.1em] whitespace-nowrap">
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
                className={`border-t border-white/[0.07] ${
                  onRowClick ? "cursor-pointer transition hover:bg-white/[0.035]" : ""
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

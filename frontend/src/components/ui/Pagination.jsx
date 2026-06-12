import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({ pagination, onPageChange, onLimitChange, showLimitSelect = true }) => {
  if (!pagination || (pagination.totalPages <= 1 && !pagination.total)) return null;

  const { page, totalPages, limit, total } = pagination;
  const showNav = totalPages > 1;
  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex flex-col gap-3 py-4">
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Total: {total} data</span>
        {showLimitSelect && onLimitChange ? (
          <select
            value={limit}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            className="border rounded-lg px-2 py-1 text-sm bg-white text-gray-900"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n} / hal</option>
            ))}
          </select>
        ) : (
          <span>{limit} / hal</span>
        )}
      </div>
      {showNav && <div className="flex items-center justify-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-2 rounded-lg border disabled:opacity-40 hover:bg-gray-50"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-9 h-9 rounded-lg text-sm font-medium ${
              p === page ? 'bg-primary-600 text-white' : 'border hover:bg-gray-50'
            }`}
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-2 rounded-lg border disabled:opacity-40 hover:bg-gray-50"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>}
    </div>
  );
};

export default Pagination;

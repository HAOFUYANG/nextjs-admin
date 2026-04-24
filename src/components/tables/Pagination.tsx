type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const pagesAroundCurrent = Array.from(
    { length: Math.min(3, totalPages) },
    (_, i) => i + Math.max(currentPage - 1, 1)
  );

  return (
    <div className="flex items-center ">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="mr-2.5 flex items-center h-10 justify-center rounded-lg border border-border bg-background px-3.5 py-2.5 text-foreground shadow-theme-xs hover:bg-muted disabled:opacity-50 text-sm"
      >
        Previous
      </button>
      <div className="flex items-center gap-2">
        {currentPage > 3 && <span className="px-2">...</span>}
        {pagesAroundCurrent.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-4 py-2 rounded ${currentPage === page
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground"
              } flex w-10 items-center justify-center h-10 rounded-lg text-sm font-medium hover:bg-primary/10 hover:text-primary`}
          >
            {page}
          </button>
        ))}
        {currentPage < totalPages - 2 && <span className="px-2">...</span>}
      </div>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="ml-2.5 flex items-center justify-center rounded-lg border border-border bg-background px-3.5 py-2.5 text-foreground shadow-theme-xs text-sm hover:bg-muted h-10 disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;

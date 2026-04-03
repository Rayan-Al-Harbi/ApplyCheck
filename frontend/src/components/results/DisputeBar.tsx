interface Props {
  count: number;
  isRescoring: boolean;
  onSubmit: () => void;
}

export default function DisputeBar({ count, isRescoring, onSubmit }: Props) {
  if (count === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-fade-up">
      <div className="max-w-3xl mx-auto px-4 pb-4">
        <div className="bg-gray-900 text-white rounded-2xl shadow-2xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-disputed flex items-center justify-center text-sm font-bold">
              {count}
            </div>
            <span className="text-sm">
              skill{count > 1 ? "s" : ""} disputed
            </span>
          </div>
          <button
            onClick={onSubmit}
            disabled={isRescoring}
            className="px-5 py-2 rounded-xl bg-disputed hover:bg-disputed/90 text-white text-sm font-medium
                       transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isRescoring ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Rescoring...
              </>
            ) : (
              "Recalculate Score"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

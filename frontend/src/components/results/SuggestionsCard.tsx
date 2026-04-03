interface Props {
  suggestions: string[];
}

export default function SuggestionsCard({ suggestions }: Props) {
  if (suggestions.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 animate-fade-up">
      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4">
        CV Suggestions
      </h3>
      <ul className="space-y-3">
        {suggestions.map((s, i) => (
          <li key={i} className="flex gap-3 text-sm text-gray-700">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-light text-primary text-xs font-semibold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            <span className="leading-relaxed">{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

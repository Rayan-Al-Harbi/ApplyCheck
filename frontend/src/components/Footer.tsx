export default function Footer() {
  return (
    <div className="text-center py-6 mt-8">
      <a
        href="https://www.linkedin.com/in/rayan-alharbi-b82s27/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-[10px] text-gray-400 dark:text-gray-500 hover:text-primary dark:hover:text-indigo-400 transition-colors tracking-wide"
        style={{ fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" }}
      >
        Made by Rayan Alharbi
      </a>
    </div>
  );
}

export function AIDisclaimer() {
  return (
    <div className="text-center py-4 mt-6">
      <p className="text-[10px] text-gray-400 dark:text-gray-500 tracking-wide">
        AI-powered analysis. Always verify results.
      </p>
    </div>
  );
}

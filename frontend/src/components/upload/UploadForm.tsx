import { useState, useRef, type DragEvent } from "react";
import { Link } from "react-router-dom";

interface Props {
  onSubmit: (jobDescription: string, cvFile: File) => void;
  signInLink?: boolean;
}

export default function UploadForm({ onSubmit, signInLink }: Props) {
  const [jobDescription, setJobDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const validExtensions = [".pdf", ".docx", ".txt"];

  function isValidFile(f: File) {
    return validExtensions.some((ext) => f.name.toLowerCase().endsWith(ext));
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && isValidFile(f)) setFile(f);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f && isValidFile(f)) setFile(f);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (jobDescription.trim() && file) {
      onSubmit(jobDescription.trim(), file);
    }
  }

  const isReady = jobDescription.trim().length > 20 && file;

  return (
    <form onSubmit={handleSubmit} className="animate-fade-up">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Hero */}
        <div className="text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card text-xs font-semibold text-primary dark:text-indigo-300 tracking-wide uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            AI-Powered Analysis
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-[1.1]">
            Apply<span className="bg-gradient-to-r from-primary via-purple-500 to-accent bg-clip-text text-transparent">Check</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg max-w-lg mx-auto leading-relaxed">
            Paste a job description, upload your CV, and get instant skill matching,
            fit scoring, and a tailored cover letter.
          </p>
        </div>

        {/* Sign in link */}
        {signInLink && (
          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-base font-semibold
                         bg-primary/10 dark:bg-primary/20 text-primary hover:bg-primary/20 dark:hover:bg-primary/30
                         hover:scale-105 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              Sign in for a better experience
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        )}

        {/* Job Description */}
        <div className="glass-card rounded-2xl p-6 space-y-3">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
            Job Description
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the job description here..."
            rows={8}
            className="w-full rounded-xl border border-gray-200/80 dark:border-gray-600/50 px-4 py-3
                       bg-white/40 dark:bg-white/5
                       text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500
                       focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50
                       resize-y text-sm leading-relaxed transition-all"
          />
          <p className="text-xs text-gray-400 dark:text-gray-500 text-right tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>
            {jobDescription.length} chars
          </p>
        </div>

        {/* File Upload */}
        <div className="glass-card rounded-2xl p-6 space-y-3">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
            Your CV
          </label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`
              relative rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all
              ${dragOver
                ? "border-primary bg-primary/5 dark:bg-primary/10 scale-[1.01]"
                : file
                  ? "border-success/40 bg-success/5 dark:bg-success/10"
                  : "border-gray-300/80 dark:border-gray-600/50 hover:border-primary/40 dark:hover:border-primary/40 hover:bg-primary/[0.02] dark:hover:bg-primary/5"
              }
            `}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleFileChange}
              className="hidden"
            />

            {file ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 dark:bg-success/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{file.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400" style={{ fontFamily: 'var(--font-mono)' }}>{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="ml-4 text-gray-400 hover:text-danger transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-gray-100/80 dark:bg-gray-700/50 flex items-center justify-center mx-auto">
                  <svg className="w-7 h-7 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <span className="text-primary font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">PDF, DOCX, or TXT</p>
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!isReady}
          className={`
            w-full py-4 rounded-2xl font-semibold text-sm tracking-wide transition-all duration-200
            ${isReady
              ? "bg-gradient-to-r from-primary via-purple-500 to-accent text-white shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0"
              : "bg-gray-200/80 dark:bg-gray-800/60 text-gray-400 dark:text-gray-500 cursor-not-allowed"
            }
          `}
        >
          Analyze Application
        </button>
      </div>
    </form>
  );
}

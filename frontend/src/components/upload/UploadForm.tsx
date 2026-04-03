import { useState, useRef, type DragEvent } from "react";

interface Props {
  onSubmit: (jobDescription: string, cvFile: File) => void;
}

export default function UploadForm({ onSubmit }: Props) {
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
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
            Analyze Your Application
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Paste a job description and upload your CV to get an AI-powered fit analysis,
            skill matching, and a tailored cover letter.
          </p>
        </div>

        {/* Job Description */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Job Description
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the full job description here..."
            rows={8}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 placeholder-gray-400
                       focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary
                       resize-y text-sm leading-relaxed transition-shadow"
          />
          <p className="text-xs text-gray-400 text-right">
            {jobDescription.length} characters
          </p>
        </div>

        {/* File Upload */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
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
                ? "border-primary bg-primary-light/50"
                : file
                  ? "border-success/50 bg-success-light/30"
                  : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
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
                <div className="w-10 h-10 rounded-lg bg-success-light flex items-center justify-center">
                  <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
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
              <div className="space-y-2">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600">
                  <span className="text-primary font-medium">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-400">PDF, DOCX, or TXT</p>
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!isReady}
          className={`
            w-full py-3.5 rounded-xl font-medium text-sm transition-all
            ${isReady
              ? "bg-primary text-white hover:bg-primary-dark shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }
          `}
        >
          Analyze Application
        </button>
      </div>
    </form>
  );
}

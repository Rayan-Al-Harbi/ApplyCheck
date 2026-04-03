import { useState, useEffect } from "react";

const STEPS = [
  { label: "Parsing your documents", duration: 8000 },
  { label: "Analyzing skill alignment", duration: 14000 },
  { label: "Generating cover letter", duration: 14000 },
  { label: "Scoring your application", duration: 12000 },
  { label: "Finalizing results", duration: 60000 },
];

export default function AnalysisProgress() {
  const [activeStep, setActiveStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1000), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let total = 0;
    for (let i = 0; i < STEPS.length; i++) {
      total += STEPS[i].duration;
      if (elapsed < total) {
        setActiveStep(i);
        return;
      }
    }
    setActiveStep(STEPS.length - 1);
  }, [elapsed]);

  return (
    <div className="animate-fade-up max-w-md mx-auto py-16">
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Analyzing your application</h2>
        <p className="text-sm text-gray-500 mt-1">This typically takes 30-60 seconds</p>
      </div>

      <div className="space-y-3">
        {STEPS.map((step, i) => (
          <div
            key={step.label}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-500 ${
              i < activeStep
                ? "bg-success-light/50"
                : i === activeStep
                  ? "bg-primary-light/50"
                  : "bg-gray-50"
            }`}
          >
            <div className="flex-shrink-0">
              {i < activeStep ? (
                <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : i === activeStep ? (
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse-dot" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-gray-200" />
              )}
            </div>
            <span
              className={`text-sm ${
                i < activeStep
                  ? "text-success font-medium"
                  : i === activeStep
                    ? "text-primary font-medium"
                    : "text-gray-400"
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

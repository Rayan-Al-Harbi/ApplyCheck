import { useState, useEffect, useRef } from "react";

interface AgentConfig {
  key: string;
  agent: string;
  icon: string;
  thoughts: string[];
  minDisplayMs: number; // minimum time to show this agent even if backend finishes fast
}

const AGENTS: AgentConfig[] = [
  {
    key: "analyzer",
    agent: "Analyzer",
    icon: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z",
    thoughts: [
      "Reading job description and identifying key requirements...",
      "Extracting required skills: technical, soft skills, languages...",
      "Classifying each skill by type for targeted evaluation...",
      "Chunking CV into semantic sections for retrieval...",
      "Embedding CV sections into vector space...",
      "Running hybrid search: keyword matching + semantic retrieval...",
      "Evaluating each skill against CV evidence...",
      "Cross-referencing experience timeline with role requirements...",
      "Scoring skill alignment and generating fit narrative...",
    ],
    minDisplayMs: 4000,
  },
  {
    key: "writer",
    agent: "Writer",
    icon: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10",
    thoughts: [
      "Analyzing matched skills and their evidence...",
      "Identifying strengths to highlight in cover letter...",
      "Mapping CV experience to job responsibilities...",
      "Drafting personalized cover letter with concrete examples...",
      "Generating CV improvement suggestions based on gaps...",
    ],
    minDisplayMs: 3000,
  },
  {
    key: "scorer",
    agent: "Scorer",
    icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
    thoughts: [
      "Evaluating Skill Match dimension...",
      "Scoring Experience Relevance dimension...",
      "Assessing Overall Presentation quality...",
      "Computing weighted average across dimensions...",
      "Calibrating final score and generating summary...",
    ],
    minDisplayMs: 2500,
  },
];

// Timer-based fallback durations for guest mode (no SSE)
const FALLBACK_DURATIONS: Record<string, number> = {
  analyzer: 20000,
  writer: 15000,
  scorer: 12000,
};

interface Props {
  completedAgents?: Set<string>; // undefined = guest mode (timer-based)
}

export default function AnalysisProgress({ completedAgents: realCompleted }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [displayedComplete, setDisplayedComplete] = useState<Set<string>>(new Set());
  const agentStartTime = useRef<Record<string, number>>({});

  // In guest mode, compute fake completedAgents from elapsed time
  const completedAgents = realCompleted ?? (() => {
    const fakeCompleted = new Set<string>();
    let cumulative = 0;
    for (const agent of AGENTS) {
      cumulative += FALLBACK_DURATIONS[agent.key] || 15000;
      if (elapsed >= cumulative) {
        fakeCompleted.add(agent.key);
      }
    }
    return fakeCompleted;
  })();

  // Clock
  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 80), 80);
    return () => clearInterval(id);
  }, []);

  // Track when each agent became active so we can enforce minDisplayMs
  const activeAgentIdx = AGENTS.findIndex(
    (a) => !displayedComplete.has(a.key)
  );

  // Record when the current agent started showing
  useEffect(() => {
    if (activeAgentIdx >= 0) {
      const key = AGENTS[activeAgentIdx].key;
      if (!agentStartTime.current[key]) {
        agentStartTime.current[key] = elapsed;
      }
    }
  }, [activeAgentIdx, elapsed]);

  // Promote an agent to "displayed complete" only when:
  // 1. The backend says it's done (completedAgents has it)
  // 2. It's been displayed for at least minDisplayMs
  useEffect(() => {
    if (activeAgentIdx < 0) return;
    const agent = AGENTS[activeAgentIdx];
    if (!completedAgents.has(agent.key)) return;

    const startedAt = agentStartTime.current[agent.key] || 0;
    const shown = elapsed - startedAt;
    const remaining = agent.minDisplayMs - shown;

    if (remaining <= 0) {
      setDisplayedComplete((prev) => new Set([...prev, agent.key]));
    } else {
      const timer = setTimeout(() => {
        setDisplayedComplete((prev) => new Set([...prev, agent.key]));
      }, remaining);
      return () => clearTimeout(timer);
    }
  }, [completedAgents, elapsed, activeAgentIdx]);

  // For the active agent, compute thought index and typed text from elapsed time
  // since that agent started displaying
  const activeAgent = activeAgentIdx >= 0 ? AGENTS[activeAgentIdx] : null;
  const agentElapsed = activeAgent
    ? elapsed - (agentStartTime.current[activeAgent.key] || 0)
    : 0;

  // If backend completed this agent, we know the total time — cycle thoughts within it
  // If not yet completed, cycle thoughts slowly (one every ~2.5s)
  const thoughtInterval = activeAgent
    ? (completedAgents.has(activeAgent.key)
        ? activeAgent.minDisplayMs / activeAgent.thoughts.length
        : 2500)
    : 2500;

  const thoughtIdx = activeAgent
    ? Math.min(
        Math.floor(agentElapsed / thoughtInterval),
        activeAgent.thoughts.length - 1
      )
    : 0;

  const withinThought = agentElapsed - thoughtIdx * thoughtInterval;
  const thoughtText = activeAgent ? activeAgent.thoughts[thoughtIdx] : "";
  const typedText = thoughtText
    ? thoughtText.slice(0, Math.min(Math.floor(withinThought / 22), thoughtText.length))
    : "";

  // Completed thoughts for active agent
  const completedThoughts: string[] = [];
  if (activeAgent) {
    for (let t = 0; t < thoughtIdx; t++) {
      completedThoughts.push(activeAgent.thoughts[t]);
    }
  }

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [completedThoughts.length, typedText]);

  return (
    <div className="animate-fade-up max-w-2xl mx-auto py-16">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card text-xs font-semibold text-primary dark:text-indigo-300 tracking-wide uppercase mb-5">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          Agents Working
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analyzing your application</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Three specialized agents are reasoning through your profile
        </p>
      </div>

      {/* Agent cards */}
      <div className="space-y-4">
        {AGENTS.map((agent, i) => {
          const isDone = displayedComplete.has(agent.key);
          const isActive = i === activeAgentIdx;
          const isPending = !isDone && !isActive;

          return (
            <div
              key={agent.key}
              className={`glass-card rounded-2xl overflow-hidden transition-all duration-500 ${
                isActive ? "ring-1 ring-primary/30" : ""
              } ${isPending ? "opacity-40" : ""}`}
            >
              {/* Agent header */}
              <div className="flex items-center gap-3 px-5 py-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                  isDone ? "bg-success/10" : isActive ? "bg-primary/10" : "bg-gray-100 dark:bg-gray-800"
                }`}>
                  {isDone ? (
                    <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className={`w-4 h-4 ${isActive ? "text-primary" : "text-gray-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={agent.icon} />
                    </svg>
                  )}
                </div>

                <div className="flex-1">
                  <span className={`text-sm font-bold ${
                    isDone ? "text-success" : isActive ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"
                  }`}>
                    {agent.agent} Agent
                  </span>
                  {isDone && (
                    <span className="ml-2 text-[10px] text-success font-semibold uppercase tracking-wider">Complete</span>
                  )}
                </div>

                {isActive && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Thinking</span>
                  </div>
                )}
              </div>

              {/* Thinking stream */}
              {isActive && (
                <div className="px-5 pb-4">
                  <div
                    ref={scrollRef}
                    className="rounded-xl bg-gray-50/80 dark:bg-gray-900/40 border border-gray-200/50 dark:border-gray-700/30 p-4 max-h-44 overflow-y-auto"
                  >
                    {completedThoughts.map((t, ti) => (
                      <div key={ti} className="flex items-start gap-2 mb-2">
                        <svg className="w-3 h-3 text-success flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-xs text-gray-500 dark:text-gray-400" style={{ fontFamily: "var(--font-mono)" }}>
                          {t}
                        </span>
                      </div>
                    ))}

                    <div className="flex items-start gap-2">
                      <svg className="w-3 h-3 text-primary flex-shrink-0 mt-0.5 animate-pulse" fill="currentColor" viewBox="0 0 8 8">
                        <circle cx="4" cy="4" r="4" />
                      </svg>
                      <span className="text-xs text-gray-700 dark:text-gray-300" style={{ fontFamily: "var(--font-mono)" }}>
                        {typedText}
                        <span className="inline-block w-[2px] h-3.5 bg-primary ml-0.5 align-middle animate-pulse" />
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Completed summary */}
              {isDone && (
                <div className="px-5 pb-4">
                  <div className="rounded-xl bg-success/5 dark:bg-success/10 border border-success/10 px-4 py-2.5">
                    <span className="text-xs text-success/80" style={{ fontFamily: "var(--font-mono)" }}>
                      {agent.thoughts.length} steps completed
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-8">
        Progress is live from the backend pipeline
      </p>
    </div>
  );
}

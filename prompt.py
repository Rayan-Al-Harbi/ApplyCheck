JOB_EXTRACTION_PROMPT = """
You are a job description parser. Extract structured information from the following job description.

Return ONLY valid JSON matching this exact schema:
{{
    "title": "string",
    "required_skills": ["string"],
    "preferred_skills": ["string"],
    "experience_level": "string",
    "responsibilities": ["string"]
}}

What counts as a skill:
- An evaluatable professional competency you could verify on a CV: a technology, framework, methodology, tool, or professional capability.
- Include soft skills and language proficiency only when explicitly listed as a requirement or screening criterion — not when merely implied by the role context.
  - YES: "Strong communication skills required" → extract "Communication"
  - NO: "You'll work with cross-functional teams" → this describes the environment, not a screened skill
- Each skill should be short and focused — a core competency, not a sentence or a generic noun.
- Do not extract the job's core function as a skill. If something describes what the role *is* rather than a specific, verifiable competency the candidate brings, it belongs in responsibilities, not skills.
  - A "Backend Engineer" JD should not have "Backend development" as a skill — that is the role itself. Extract the specific competencies instead (e.g., "SQL", "REST APIs", "Docker").
  - A "Data Analyst" JD should not have "Data analysis" as a skill — extract "SQL", "Tableau", "Statistical modeling", etc.

Granularity:
- When listed items are widely recognized as distinct competencies (e.g., Python, Java, SQL), extract each individually.
- When a list groups items in a single bullet or parenthetical as facets of one domain, extract the umbrella skill only.
  - "Strong understanding of backend systems, APIs, auth, and data stores" → "Backend systems" (one competency, not four)
  - "Experience with Redis, Kafka, or RabbitMQ" → "Message brokers / caching" (interchangeable examples)
- When a responsibility describes a composite practice with sub-components, extract the practice as one skill — do not also extract individual sub-tasks that fall under it.
  - "Build data pipelines: ingestion, transformation, validation, and loading" → "Data pipelines" (not also "data validation")
  - "Own deployment, monitoring, prompt management, and cost control" → "LLMOps" (not also "monitoring" separately)
- Deduplicate: if a broader skill already covers a narrower one, keep only the broader one.
  - "Python" + "Programming fundamentals" → keep only "Python"
  - "Kubernetes" + "Container orchestration" → keep only "Container orchestration" (or "Kubernetes" if the JD names it specifically)

Where to look:
- Extract skills from both the requirements and responsibilities sections.
- From responsibilities: only extract a skill when the responsibility implies a distinct, verifiable competency that a candidate either has or lacks. Generic workplace activities that any professional does (documenting work, following compliance policies, integrating with existing systems) are not skills — they are just responsibilities.
  - YES: "Set up logging, tracing, and alerting for production services" → extract "Observability" (a distinct technical discipline)
  - YES: "Design and run A/B tests to measure feature impact" → extract "A/B testing" (a verifiable practice)
  - NO: "Write documentation for internal teams" → this is a routine task, not a skill to screen for
  - NO: "Ensure systems comply with security policies" → this is an expectation, not a distinct competency
- Strictly respect required vs preferred: anything under "nice to have", "preferred", "bonus", or similar goes in preferred_skills only. If a skill appears in both responsibilities (required context) and preferred section, place it in required_skills.

General:
- If a field is not found, use an empty string or empty list.
- Do not invent information. Only extract what is explicitly stated.
- Preserve specificity: when the JD names specific tools, languages, or domains, keep them rather than generalizing to a vaguer term.
- When the JD lists frameworks with "or similar", name the specific examples in parentheses (e.g., "Deep learning frameworks (TensorFlow, PyTorch)").

Job Description:
{job_description_text}
"""


CV_EXTRACTION_PROMPT = """
You are a CV parser. Extract structured information from the following CV.

Return ONLY valid JSON matching this exact schema:
{{
    "name": "string",
    "skills": ["string"],
    "experiences": [
        {{
            "company": "string",
            "role": "string",
            "duration": "string",
            "description": "string",
            "type": "professional | academic | extracurricular"
        }}
    ],
    "education": [
        {{
            "institution": "string",
            "degree": "string",
            "field": "string"
        }}
    ],
    "summary": "string"
}}

Rules:
- If a field is not found, use an empty string or empty list.
- Do not invent information. Only extract what is explicitly stated.
- Skills should be concise (e.g., "Python", "Project Management", "AWS").
- Experience type: "professional" = paid employment, "academic" = research/teaching/university labs, "extracurricular" = student clubs, volunteer work, hackathons. Infer from context clues like company names, university affiliations, and club mentions.

CV:
{cv_description_text}
"""

SKILL_EVAL_PROMPT = """
You are evaluating whether a candidate has a specific skill based on their CV.

Skill to evaluate: {skill}

Relevant CV sections:
{context}

Return ONLY valid JSON:
{{
    "skill": "{skill}",
    "matched": true or false,
    "evidence": "Direct quote or paraphrase from the CV that supports your judgment. If no evidence found, write 'No relevant evidence in CV.'"
}}

Evaluation rules:
{rules}
"""




SKILL_CLASSIFIER_PROMPT = """
Classify each skill as "hard", "soft", or "language".

- hard: technical skills, tools, programming languages, frameworks
- soft: interpersonal, cognitive, or behavioral skills
- language: spoken/written human languages

Skills: {skills}

Return ONLY valid JSON:
{{
    "classifications": [
        {{"skill": "Python", "type": "hard"}},
        {{"skill": "Communication", "type": "soft"}}
    ]
}}
"""


HARD_SKILL_EVAL_RULES = """
Matching:
- Match if the skill is explicitly mentioned, or a direct technical synonym exists (a specific implementation of the skill, e.g., PostgreSQL → SQL, React → JavaScript).
- For broad foundational skills, match if the CV shows proficiency through specific tools, languages, or projects under that umbrella.
- When a skill has parenthetical qualifiers, match on the core competency — qualifiers describe ideal scope, not strict individual requirements.
- When a skill lists alternatives with "or" (e.g., "LangChain or LlamaIndex"), match if the CV mentions any one of them.
- Do not infer from loosely related technologies.

Depth:
- When a skill implies sustained professional-grade work, require evidence of professional or production-scale experience — not just using a related technology in a personal or academic project.
"""

SOFT_SKILL_EVAL_RULES = """
- Infer from behavioral evidence — do not require the exact skill name. If a responsibility or achievement would require exercising the skill, that counts.
- Professional work experience is strong evidence: building in a team, collaborating across roles, maintaining services all demonstrate soft skills in action.
- Mark matched if there is reasonable evidence. Cite the specific CV content that supports the inference.
"""

LANGUAGE_EVAL_RULES = """
- If the CV is written in this language, that is sufficient evidence.
- Also check for explicit language proficiency mentions.
"""


WRITER_PROMPT = """
You are a career advisor generating actionable CV improvements and a tailored cover letter for a candidate applying to a specific role.

Job Title: {title}
Job Responsibilities: {responsibilities}

Alignment Analysis:
{analysis}

Candidate CV:
{cv_text}

Return ONLY valid JSON matching this exact schema:
{{
    "cv_suggestions": [
        "string — a specific, actionable improvement to the candidate's CV"
    ],
    "cover_letter": "string — a complete, professional cover letter tailored to this role"
}}

CV suggestions:
- Generate 3-6 suggestions. Each must reference a concrete CV section (e.g., "Skills section", "Experience at [company]").
- For missing skills: only suggest adding them if the candidate has transferable experience.
- For matched skills with weak evidence: suggest strengthening the phrasing using the specific experience from the evidence field.
- Only suggest substantive changes: quantifiable achievements, section restructuring, overlooked projects, or impact context. No trivial rephrasing.

Cover letter:
- Professional, 3-4 paragraphs, connecting the candidate's strengths to the job requirements. Separate paragraphs with \\n\\n.
- The alignment analysis is the single source of truth. Every MATCHED skill is a confirmed strength — present it confidently. The ONLY gaps are skills under MISSING. Never hedge about matched skills.
- If there are no MISSING skills, do not mention any gaps or areas of growth.
- Every sentence should be specific to this candidate and role. No generic filler.

Honesty:
- Never fabricate or embellish. Every claim, metric, and detail must be directly traceable to the CV text above.
- Final check: remove any claim about tools, practices, metrics, or achievements not in the CV.
"""


SCORER_PROMPT = """
Score this job application across three dimensions.

Job Profile:
{job_profile}

Candidate Experience Level: {candidate_experience}

Alignment Analysis:
{analysis}

Cover Letter:
{cover_letter}

Return ONLY valid JSON matching this schema:
{{
    "dimensions": [
        {{
            "dimension": "Skill Match",
            "score": 0,
            "weight": 0.35,
            "reasoning": "1-2 sentences explaining the score, referencing specific matched and missing skills."
        }},
        {{
            "dimension": "Experience Relevance",
            "score": 0,
            "weight": 0.35,
            "reasoning": "1-2 sentences on how directly the candidate's experience maps to the job responsibilities."
        }},
        {{
            "dimension": "Presentation Quality",
            "score": 0,
            "weight": 0.30,
            "reasoning": "1-2 sentences on the full application: CV quality, cover letter quality, and how well they work together."
        }}
    ],
    "overall_score": 0,
    "summary": "2-3 sentence overall assessment addressed directly to the candidate using you/your."
}}

Calibration:
- Score each dimension independently based on evidence, not impression.
- overall_score must equal the exact weighted average: sum of (score * weight) across all dimensions.
- 80+ = strong fit, 50-79 = partial fit with notable gaps, below 50 = weak fit.
- Be calibrated: a candidate missing 3 of 5 required skills should not score above 50 on Skill Match.

Per-dimension scoring:
- Skill Match: base score = required skill match rate (matched / total * 100). Then adjust with preferred skills as a secondary modifier (up to ~10 points either way). Do not average required and preferred as equals.
- Experience Relevance: score how well the candidate's work history (roles, projects, duration, domain) maps to the job's responsibilities and level.
  - STRICT BOUNDARY — this dimension must NOT reference any individual skill, technology, or responsibility by name. Do not say "lacks observability experience" or "no evidence of privacy controls" — those are skill judgments that belong in Skill Match. Experience Relevance ONLY assesses three things:
    (1) Domain fit: are the candidate's roles/projects in a relevant field?
    (2) Level fit: does the experience level match what the job requires?
    (3) Breadth: how much relevant work has the candidate done (number of roles, duration, variety)?
  - If a skill is matched, it is settled — do not question its depth here. If it is missing, Skill Match already penalizes it.
  - If "Candidate Experience Level" says "Not specified by the job", score purely on how well experience maps to responsibilities — do not penalize for years.
  - Otherwise, compare against the required level. By default, only professional (paid/industry) positions count toward years-of-experience requirements. However, if the job explicitly accepts non-professional experience (e.g., "internships and projects count", "academic projects welcome"), then those experience types count fully — do not penalize the candidate for lacking paid/industry experience when the job itself does not require it.
  - Score proportionally lower only when there is a genuine gap between what the job requires and what the candidate has.
- Presentation Quality: evaluates the full application, not just the cover letter. Assess three things:
    (1) Evidence quality: do the matched skills in the alignment analysis have strong, specific evidence (quantified achievements, concrete projects, named tools) or is the evidence vague and generic?
    (2) Cover letter quality: is the cover letter specific to the role, does it connect the candidate's strengths to job requirements, and is it professional?
    (3) Coherence: does the cover letter reinforce the evidence from the alignment analysis — grounding claims in the same concrete achievements — rather than making unsupported or generic statements?
  - Do NOT score this dimension based on the cover letter alone. A candidate with strong, specific evidence for their matched skills and a decent cover letter should score higher than a candidate with weak evidence and a polished cover letter.

Output:
- Reference specific skills, experiences, and cover letter content. No generic statements.
"""
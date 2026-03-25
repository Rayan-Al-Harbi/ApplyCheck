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

Rules:
- If a field is not found, use an empty string or empty list as appropriate.
- Do not invent information. Only extract what is explicitly stated.
- Skills should be concise (e.g., "Python", "Project Management", "AWS").

Job Description:
{job_description_text}
"""


CV_EXTRACTION_PROMPT = """
You are a CV qualification parser. Extract structured information from the following CV.

Return ONLY valid JSON matching this exact schema:
{{
    "name": "string",
    "skills": ["string"],
    "experiences": [
        {{
            "company": "string",
            "role": "string",
            "duration": "string",
            "description": "string"
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
- If a field is not found, use an empty string or empty list as appropriate.
- Do not invent information. Only extract what is explicitly stated.
- Skills should be concise (e.g., "Python", "Project Management", "AWS").

CV Description:
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



OVERALL_FIT_PROMPT = """
You are summarizing a candidate's fit for a job.

Job title: {title}
Matched skills: {matched_list}
Missing skills: {missing_list}

Write a 2-3 sentence summary of the candidate's alignment with this role.
Be specific and honest. Do not use generic filler language.

Return ONLY the summary text, no JSON.
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
- Only mark matched if the skill is explicitly mentioned or a direct technical synonym exists.
- A direct technical synonym is a specific implementation of the skill (e.g., PostgreSQL, MySQL, SQLite → SQL; React, Vue → JavaScript).
- For broad foundational skills (e.g., "Programming concepts", "Software development"), match if the CV demonstrates proficiency through specific languages, frameworks, or projects.
- Do not infer from loosely related technologies.
"""

SOFT_SKILL_EVAL_RULES = """
- Soft skills are rarely stated explicitly.
- Infer from responsibilities and achievements described in the CV.
- "Built and maintained microservices" implies problem-solving.
- "Worked across teams" or any collaborative work implies communication.
- Mark matched if there is reasonable evidence, and explain your inference.
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
- Matched skills: {matched_skills}
- Missing skills: {missing_skills}
- Overall fit: {overall_fit}

Candidate CV:
{cv_text}

Return ONLY valid JSON matching this exact schema:
{{
    "cv_suggestions": [
        "string — a specific, actionable improvement to the candidate's CV"
    ],
    "cover_letter": "string — a complete, professional cover letter tailored to this role"
}}

Rules:
- Generate 3-6 CV suggestions. Each must be specific and reference concrete sections of the CV.
- Suggestions should address missing skills, weak areas, or formatting improvements that would strengthen the application.
- The cover letter must be professional, 3-4 paragraphs, and directly connect the candidate's strengths to the job requirements.
- Highlight matched skills as strengths. Acknowledge gaps honestly and frame them as areas of active growth.
- Do not invent experience the candidate does not have.
- Do not use generic filler language. Every sentence should be specific to this candidate and role.
"""


SCORER_PROMPT = """
You are a career coach giving a candidate direct, honest feedback on their application for a specific role. Address the candidate as "you" throughout.

Job Title: {title}
Required Skills: {required_skills}

Alignment Analysis:
- Matched skills: {matched_skills}
- Missing skills: {missing_skills}
- Overall fit: {overall_fit}

Cover Letter:
{cover_letter}

Return ONLY valid JSON matching this exact schema:
{{
    "score": 0,
    "reasoning": "string — structured feedback addressed directly to the candidate"
}}

Scoring rules:
- Score is an integer from 0 to 100.
- Breakdown weights: skill match (40%), experience relevance (25%), cover letter quality (20%), overall presentation (15%).
- skill match: ratio of matched to total required skills, penalize critical missing skills heavily.
- experience relevance: how directly your experience maps to the job responsibilities.
- cover letter quality: specificity, professionalism, and how well it connects your strengths to the role.
- overall presentation: coherence of the full application package.
- Be calibrated: 80+ means strong fit, 50-79 means partial fit with notable gaps, below 50 means weak fit.
- Write the reasoning as direct feedback to the candidate using "you/your". Reference specific skills, experiences, and cover letter content. No generic statements.
- Example tone: "You demonstrate strong alignment in X, but your application would benefit from Y."
"""
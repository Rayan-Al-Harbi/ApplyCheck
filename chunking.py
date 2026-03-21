from langchain_text_splitters import RecursiveCharacterTextSplitter



sample_cv = """
Name: Sarah Chen

Summary:
Experienced software engineer with 4 years of backend development, specializing in Python and cloud infrastructure.

Skills:
Python, Django, REST APIs, PostgreSQL, Docker, AWS, Git, Linux

Experience:
- Software Engineer at TechCorp (2021 - Present)
  Built and maintained microservices using Python and Django. Deployed services on AWS using Docker.

- Junior Developer at StartupXYZ (2020 - 2021)
  Developed internal REST APIs and managed PostgreSQL databases.

Education:
- B.Sc. Computer Science, University of Cityville, 2020
"""

def chunk_cv(cv_text: str) -> list[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n\n", "\n", ". ", " "],
    )
    return splitter.split_text(cv_text)

if __name__ == "__main__":
    results = chunk_cv(sample_cv)
    for chunk in results:
        print(chunk)
        print("\n HERE\n")

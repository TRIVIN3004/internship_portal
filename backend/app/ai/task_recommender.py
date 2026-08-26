import re
from typing import List, Dict, Any

# Curated bank of training tasks for recommendations if no custom task is provided
DEFAULT_TASK_BANK = [
    {
        "title": "Data Preprocessing & EDA",
        "description": "Load real-world CSV files, clean missing data, handle outliers, and perform Exploratory Data Analysis using pandas, numpy, and matplotlib.",
        "skills": "python, pandas, numpy, matplotlib, data cleaning, eda"
    },
    {
        "title": "Supervised Learning Classification Model",
        "description": "Build, evaluate, and tune a Random Forest or SVM classifier using scikit-learn. Output accuracy, precision, and classification reports.",
        "skills": "python, scikit-learn, classification, random forest, evaluation"
    },
    {
        "title": "Natural Language Processing Text Classifier",
        "description": "Implement TF-IDF Vectorizer and build a sentiment classification model on text datasets using NLTK or HuggingFace transformers.",
        "skills": "python, nlp, nltk, text classification, tfidf"
    },
    {
        "title": "SQL Database Optimization & Design",
        "description": "Write advanced relational schemas, perform indexes creation, write optimization queries, and design join statements on MySQL/PostgreSQL.",
        "skills": "sql, database, postgresql, database design, optimization"
    },
    {
        "title": "REST API Development with FastAPI",
        "description": "Build robust backend endpoints, set up Pydantic validation schemas, and integrate JWT-based security middleware in Python.",
        "skills": "python, fastapi, backend, jwt, pydantic, api"
    },
    {
        "title": "React Dashboard and UI Building",
        "description": "Create modern UI widgets, integrate interactive charts (Chart.js), manage state variables with React Context, and style with TailwindCSS.",
        "skills": "react, javascript, tailwindcss, charting, frontend, css"
    },
    {
        "title": "Deep Learning Image Classifier",
        "description": "Construct Convolutional Neural Networks (CNNs) using PyTorch or TensorFlow, train on CIFAR-10, and output performance metrics.",
        "skills": "python, pytorch, tensorflow, deep learning, cnn, computer vision"
    },
    {
        "title": "Docker Containerization & Deployment",
        "description": "Create Dockerfiles, orchestrate multiple services using Docker Compose, and deploy a web application to Cloud providers like Render.",
        "skills": "docker, devops, deployment, docker compose, git"
    }
]

def recommend_tasks(student_skills: str, completed_task_titles: List[str] = None) -> List[Dict[str, Any]]:
    """
    Computes Skill Overlap Similarity between student skills and task tags,
    recommending the top 3 best-fitting tasks not yet completed in <1ms without heavy ML library overhead.
    """
    if not student_skills:
        # Default fallback recommendations if student profile has no skills listed
        return [
            {
                "title": t["title"],
                "description": t["description"],
                "skills": t["skills"],
                "match_score": 85
            }
            for t in DEFAULT_TASK_BANK if t["title"] not in (completed_task_titles or [])
        ][:3]
        
    completed_titles_set = set(t.lower() for t in (completed_task_titles or []))
    
    # Filter out tasks the student has already completed
    candidate_tasks = [t for t in DEFAULT_TASK_BANK if t["title"].lower() not in completed_titles_set]
    if not candidate_tasks:
        return []
        
    student_tokens = set(re.findall(r'\w+', student_skills.lower()))
    
    scored_tasks = []
    for task in candidate_tasks:
        task_tokens = set(re.findall(r'\w+', f"{task['skills']} {task['title']}".lower()))
        
        # Calculate intersection overlap and Jaccard coefficient
        intersection = student_tokens.intersection(task_tokens)
        union = student_tokens.union(task_tokens)
        
        if union:
            jaccard = len(intersection) / len(union)
            overlap_ratio = len(intersection) / max(1, len(task_tokens))
            score = (jaccard * 0.4) + (overlap_ratio * 0.6)
        else:
            score = 0.0
            
        match_percentage = int(score * 100)
        # Ensure smooth baseline match presentation
        match_percentage = max(25, min(98, match_percentage + 20))
        
        scored_tasks.append({
            "title": task["title"],
            "description": task["description"],
            "skills": task["skills"],
            "match_score": match_percentage
        })
        
    # Sort descending by match score
    scored_tasks.sort(key=lambda x: x["match_score"], reverse=True)
    return scored_tasks[:3]


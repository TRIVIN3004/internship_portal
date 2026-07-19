from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
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
    Computes Cosine Similarity between student skills and task tags,
    recommending the top 3 best-fitting tasks not yet completed.
    """
    if not student_skills:
        # Default fallback recommendations if student profile has no skills listed
        return [t for t in DEFAULT_TASK_BANK if t["title"] not in (completed_task_titles or [])][:3]
        
    completed_titles_set = set(t.lower() for t in (completed_task_titles or []))
    
    # Filter out tasks the student has already completed
    candidate_tasks = [t for t in DEFAULT_TASK_BANK if t["title"].lower() not in completed_titles_set]
    if not candidate_tasks:
        return []
        
    # Text Corpus to Vectorize:
    # First item is the student's skills, followed by the skills string of each candidate task.
    corpus = [student_skills.lower()] + [task["skills"].lower() for task in candidate_tasks]
    
    try:
        vectorizer = TfidfVectorizer()
        tfidf_matrix = vectorizer.fit_transform(corpus)
        
        # Calculate Cosine Similarity of student's skills (index 0) against all candidate tasks
        similarity_scores = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()
        
        # Rank candidate tasks by similarity score descending
        ranked_indices = similarity_scores.argsort()[::-1]
        
        recommendations = []
        for index in ranked_indices[:3]:
            task = candidate_tasks[index]
            score = float(similarity_scores[index])
            
            # Map score to standard percentage matching
            match_percentage = int(score * 100)
            # Minimum match helper (ensure at least a baseline match is shown)
            match_percentage = max(10, min(98, match_percentage + 15))
            
            recommendations.append({
                "title": task["title"],
                "description": task["description"],
                "skills": task["skills"],
                "match_score": match_percentage
            })
        return recommendations
        
    except Exception:
        # Simple string-match fallback in case of Tfidf exceptions
        recommendations = []
        student_skills_set = set(s.strip().lower() for s in student_skills.split(","))
        
        for task in candidate_tasks:
            task_skills_set = set(s.strip().lower() for s in task["skills"].split(","))
            intersect = student_skills_set.intersection(task_skills_set)
            match_percentage = int((len(intersect) / max(1, len(task_skills_set))) * 100)
            
            recommendations.append({
                "title": task["title"],
                "description": task["description"],
                "skills": task["skills"],
                "match_score": max(20, min(95, match_percentage + 10))
            })
            
        recommendations = sorted(recommendations, key=lambda x: x["match_score"], reverse=True)
        return recommendations[:3]

import os
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from typing import Dict, Any, Tuple

# Resolve the model path dynamically relative to the file location to work across serverless environments
MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "data",
    "performance_model.pkl"
)

def generate_synthetic_data(n_samples: int = 300) -> pd.DataFrame:
    """Generates synthetic dataset of interns to train the Random Forest Classifier."""
    np.random.seed(42)
    
    # Feature columns
    attendance = np.random.uniform(0.5, 1.0, n_samples)
    task_completion = np.random.uniform(0.4, 1.0, n_samples)
    avg_task_score = np.random.uniform(40.0, 100.0, n_samples)
    avg_report_quality = np.random.uniform(30.0, 100.0, n_samples)
    avg_sentiment = np.random.uniform(-0.6, 0.8, n_samples)
    late_submission_ratio = np.random.uniform(0.0, 0.6, n_samples)
    
    # Heuristics to define classes:
    # 0: At Risk (Attendance < 75% OR completion < 60% OR low task scores)
    # 2: Outstanding (Attendance > 90% AND completion > 90% AND task scores > 85%)
    # 1: On Track (Everyone else)
    
    classes = []
    for i in range(n_samples):
        # Rule targets
        score = (attendance[i] * 25) + (task_completion[i] * 25) + (avg_task_score[i] * 0.3) + (avg_report_quality[i] * 0.2) - (late_submission_ratio[i] * 20)
        
        if attendance[i] < 0.75 or task_completion[i] < 0.60 or avg_task_score[i] < 60.0 or score < 55:
            classes.append(0)  # At Risk
        elif attendance[i] > 0.90 and task_completion[i] > 0.85 and avg_task_score[i] > 80.0 and score > 78:
            classes.append(2)  # Outstanding
        else:
            classes.append(1)  # On Track
            
    df = pd.DataFrame({
        "attendance_rate": attendance,
        "task_completion_rate": task_completion,
        "avg_task_score": avg_task_score,
        "avg_report_quality": avg_report_quality,
        "avg_sentiment": avg_sentiment,
        "late_submission_ratio": late_submission_ratio,
        "label": classes
    })
    return df

def train_and_save_model():
    """Trains the Random Forest model and saves it as a pickle file."""
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    
    df = generate_synthetic_data()
    X = df.drop(columns=["label"])
    y = df["label"]
    
    # Train
    clf = RandomForestClassifier(n_estimators=50, max_depth=6, random_state=42)
    clf.fit(X, y)
    
    # Save model along with features list
    model_data = {
        "model": clf,
        "features": list(X.columns)
    }
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(model_data, f)
    print("AI Model: Random Forest Classifier trained and saved successfully.")

# Initialize model training on first load if it does not exist
if not os.path.exists(MODEL_PATH):
    try:
        train_and_save_model()
    except Exception as e:
        print(f"Error training model during initialization: {e}")

def load_model() -> Any:
    """Loads the pickled model, returns None if not found or errors out."""
    if not os.path.exists(MODEL_PATH):
        return None
    try:
        with open(MODEL_PATH, "rb") as f:
            return pickle.load(f)
    except Exception:
        return None

def predict_student_performance(
    attendance_rate: float,
    task_completion_rate: float,
    avg_task_score: float,
    avg_report_quality: float,
    avg_sentiment: float,
    late_submission_ratio: float
) -> Tuple[str, float, str]:
    """
    Returns (predicted_grade, completion_probability, risk_level)
    """
    model_data = load_model()
    
    # Heuristics baseline scores (for fallback if ML is missing or fails)
    # Score out of 100
    aggregate_score = (
        (attendance_rate * 30) + 
        (task_completion_rate * 30) + 
        (avg_task_score * 0.25) + 
        (avg_report_quality * 0.15) - 
        (late_submission_ratio * 15)
    )
    
    # Initialize default fallbacks
    prob = float(min(1.0, max(0.1, aggregate_score / 90.0)))
    if attendance_rate < 0.75 or task_completion_rate < 0.60 or avg_task_score < 60.0 or aggregate_score < 55:
        grade = "At Risk"
        risk = "High"
    elif attendance_rate > 0.90 and task_completion_rate > 0.85 and avg_task_score > 80.0:
        grade = "Outstanding"
        risk = "Low"
    else:
        grade = "On Track"
        risk = "Medium"
        
    if model_data is not None:
        try:
            clf = model_data["model"]
            # Prepare feature vector
            feature_vector = np.array([[
                attendance_rate,
                task_completion_rate,
                avg_task_score,
                avg_report_quality,
                avg_sentiment,
                late_submission_ratio
            ]])
            
            # Predict
            pred_class = int(clf.predict(feature_vector)[0])
            prob_matrix = clf.predict_proba(feature_vector)[0]
            
            # Probability of success is sum of On Track (1) and Outstanding (2) probabilities
            success_prob = float(prob_matrix[1] + prob_matrix[2])
            
            # Convert class indices to text strings
            grade_mapping = {0: "At Risk", 1: "On Track", 2: "Outstanding"}
            risk_mapping = {0: "High", 1: "Medium", 2: "Low"}
            
            grade = grade_mapping.get(pred_class, "On Track")
            risk = risk_mapping.get(pred_class, "Medium")
            prob = success_prob
            
        except Exception as e:
            # Fall back silently to heuristic calculation if any runtime issues occur
            pass
            
    return grade, round(prob, 2), risk

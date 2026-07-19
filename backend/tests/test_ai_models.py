import os
import sys

# Add parent directories to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.ai.report_analyzer import analyze_report
from app.ai.performance_predictor import predict_student_performance
from app.ai.task_recommender import recommend_tasks

def test_nlp_report_analyzer():
    print("Testing NLP Report Analyzer...")
    
    # 1. High quality detailed structured report
    good_report = "- Configured FastAPI routing schema.\n- Evaluated the model using sklearn Random Forest.\n- Solved the outlier handling bugs."
    good_analysis = analyze_report(good_report, "")
    print(f"Good Report: Quality Score: {good_analysis['quality_score']}% | Key Phrases: {good_analysis['key_phrases']}")
    assert good_analysis['quality_score'] > 60, "High quality report should score well."
    
    # 2. Low quality unstructured report
    poor_report = "worked on code today"
    poor_analysis = analyze_report(poor_report, "stuck on error")
    print(f"Poor Report: Quality Score: {poor_analysis['quality_score']}% | Sentiment: {poor_analysis['sentiment_score']}")
    assert poor_analysis['quality_score'] < 50, "Low quality report should score poorly."
    
    print("NLP Report Analyzer tests passed!\n")

def test_performance_predictor():
    print("Testing Performance ML Classifier...")
    
    # 1. Outstanding student case
    grade, prob, risk = predict_student_performance(
        attendance_rate=0.98,
        task_completion_rate=1.0,
        avg_task_score=95.0,
        avg_report_quality=92.0,
        avg_sentiment=0.8,
        late_submission_ratio=0.0
    )
    print(f"Outstanding Case: Grade={grade}, Success Prob={prob*100}%, Risk={risk}")
    assert grade in ["Outstanding", "On Track"], "Outstanding intern should be classified on track/outstanding."
    
    # 2. At Risk student case
    grade, prob, risk = predict_student_performance(
        attendance_rate=0.55,
        task_completion_rate=0.4,
        avg_task_score=50.0,
        avg_report_quality=35.0,
        avg_sentiment=-0.4,
        late_submission_ratio=0.5
    )
    print(f"At Risk Case: Grade={grade}, Success Prob={prob*100}%, Risk={risk}")
    assert grade == "At Risk", "Underperforming intern should be flagged At Risk."
    
    print("Performance Predictor tests passed!\n")

def test_task_recommender():
    print("Testing TF-IDF Task Recommender...")
    
    skills = "Python, PyTorch, Convolutional Neural Networks, OpenCV"
    recommendations = recommend_tasks(skills, completed_task_titles=[])
    
    print(f"Recommendations for skills '{skills}':")
    for r in recommendations:
        print(f" - {r['title']} (Match Score: {r['match_score']}%)")
        
    assert len(recommendations) > 0, "Should return matching recommendations."
    
    # Top recommendation should have some relevance to Deep Learning / CNN / PyTorch
    top_rec_title = recommendations[0]['title'].lower()
    has_dl_match = any(term in top_rec_title for term in ["deep learning", "classifier", "eda", "processing"])
    assert has_dl_match, "Recommender should match skills context."
    
    print("Task Recommender tests passed!\n")

if __name__ == "__main__":
    try:
        test_nlp_report_analyzer()
        test_performance_predictor()
        test_task_recommender()
        print("All AI/ML model tests passed successfully!")
    except AssertionError as e:
        print(f"Test failure: {e}")
        sys.exit(1)

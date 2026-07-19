import re
import math
from typing import List, Dict, Any

# Attempt to load NLTK VADER sentiment analyzer, fallback to rule-based if download fails
VADER_AVAILABLE = False
try:
    import nltk
    from nltk.sentiment.vader import SentimentIntensityAnalyzer
    
    # Try downloading vader_lexicon quietly
    try:
        nltk.download("vader_lexicon", quiet=True)
        sia = SentimentIntensityAnalyzer()
        VADER_AVAILABLE = True
    except Exception:
        pass
except ImportError:
    pass

# Custom fallback sentiment rules for robustness (offline capability)
POSITIVE_WORDS = {
    "completed", "solved", "fixed", "implemented", "learned", "successful",
    "improved", "gained", "achieved", "great", "smooth", "progressed", 
    "working", "done", "created", "added", "optimized", "helped"
}
NEGATIVE_WORDS = {
    "blocked", "stuck", "error", "failed", "bug", "issue", "difficult", 
    "broken", "missing", "confused", "delayed", "slow", "unable", 
    "frustrated", "hard", "problem", "crash", "wrong"
}

def calculate_rule_based_sentiment(text: str) -> float:
    """Fallback simple sentiment score: values between -1.0 and 1.0"""
    words = re.findall(r'\b\w+\b', text.lower())
    if not words:
        return 0.0
    pos_count = sum(1 for w in words if w in POSITIVE_WORDS)
    neg_count = sum(1 for w in words if w in NEGATIVE_WORDS)
    
    total = pos_count + neg_count
    if total == 0:
        return 0.1  # Neutral-slight positive baseline
    return (pos_count - neg_count) / total

def analyze_report(content: str, blockers: str = "") -> Dict[str, Any]:
    """
    Analyzes student daily reports to extract:
    1. quality_score (0.0 to 100.0)
    2. sentiment_score (-1.0 to 1.0)
    3. key_phrases (comma-separated string)
    """
    full_text = f"{content} {blockers or ''}".strip()
    words = re.findall(r'\b\w{4,}\b', full_text.lower())
    
    # --- 1. Sentiment Score ---
    sentiment = 0.0
    if VADER_AVAILABLE:
        try:
            scores = sia.polarity_scores(full_text)
            sentiment = scores["compound"]
        except Exception:
            sentiment = calculate_rule_based_sentiment(full_text)
    else:
        sentiment = calculate_rule_based_sentiment(full_text)
        
    # --- 2. Quality Score calculation ---
    # A. Length Factor (Logarithmic, optimal is around 60 words for daily reports)
    word_count = len(content.split())
    length_score = min(100.0, (math.log(max(1, word_count) + 1) / math.log(60)) * 100.0)
    
    # B. Structure Factor (checking for bullet points or lists signifying structure)
    has_bullets = bool(re.search(r'[-*•\d\.]', content))
    structure_score = 100.0 if has_bullets else 40.0
    
    # C. Sentiment influence: positive reports indicate good progression, negative indicates blockers.
    # We normalize sentiment [-1, 1] to [0, 100]
    sentiment_factor = (sentiment + 1) * 50.0 
    
    # Weighted Quality Score
    # 40% length, 30% structure, 30% progress/sentiment
    quality_score = (0.4 * length_score) + (0.3 * structure_score) + (0.3 * sentiment_factor)
    quality_score = round(max(0.0, min(100.0, quality_score)), 1)
    
    # --- 3. Key Phrase Extraction (stopwords filtering + word frequencies)
    stopwords = {
        "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
        "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
        "can", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing",
        "don't", "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
        "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers", "herself",
        "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in", "into", "is",
        "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my", "myself",
        "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves",
        "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so",
        "some", "such", "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there",
        "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those", "through", "to",
        "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd", "we'll", "we're", "we've", "were",
        "weren't", "what", "what's", "when", "when's", "where", "where's", "which", "while", "who", "who's",
        "whom", "why", "why's", "with", "won't", "would", "wouldn't", "you", "you'd", "you'll", "you're",
        "you've", "your", "yours", "yourself", "yourselves", "today", "yesterday", "tomorrow", "work", "worked"
    }
    
    # Filter stopwords and group words
    filtered_words = [w for w in words if w not in stopwords and len(w) > 3]
    word_freq = {}
    for w in filtered_words:
        word_freq[w] = word_freq.get(w, 0) + 1
        
    # Sort and pick top 4 keywords
    sorted_keywords = sorted(word_freq.keys(), key=lambda x: word_freq[x], reverse=True)
    key_phrases = ", ".join(sorted_keywords[:4]) if sorted_keywords else "General Tasks"
    
    return {
        "quality_score": quality_score,
        "sentiment_score": round(sentiment, 2),
        "key_phrases": key_phrases
    }

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Star, Send, X, CheckCircle, Clock, MessageCircle, AlertCircle } from 'lucide-react';

export default function FeedbackModal({ isOpen, onClose }) {
  const { authenticatedFetch } = useAuth();
  
  const [activeTab, setActiveTab] = useState('submit'); // 'submit' | 'history'
  const [category, setCategory] = useState('Feature Request');
  const [rating, setRating] = useState(5);
  const [subject, setSubject] = useState('');
  const [messageText, setMessageText] = useState('');
  
  const [history, setHistory] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const categories = [
    'Feature Request',
    'Bug Report',
    'UI / UX Improvement',
    'Performance',
    'General Feedback'
  ];

  const fetchMyHistory = async () => {
    try {
      const res = await authenticatedFetch('/api/feedback/me');
      if (res.ok) {
        setHistory(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMyHistory();
      setSuccessMsg('');
      setErrorMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setSubmitting(true);

    try {
      const res = await authenticatedFetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          rating,
          subject,
          message: messageText
        })
      });

      if (res.ok) {
        setSuccessMsg('Thank you! Your feedback has been submitted to the administration team.');
        setSubject('');
        setMessageText('');
        setRating(5);
        fetchMyHistory();
      } else {
        const err = await res.json();
        setErrorMsg(err.detail || 'Failed to submit feedback.');
      }
    } catch (err) {
      setErrorMsg('Error submitting feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl glass-panel rounded-2xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2">
            <MessageSquare size={20} className="text-cyan-400" />
            <h3 className="font-heading font-bold text-white text-lg">Portal Feedback & Suggestions</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6">
          <button
            onClick={() => setActiveTab('submit')}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition ${
              activeTab === 'submit'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Submit Feedback
          </button>
          <button
            onClick={() => { setActiveTab('history'); fetchMyHistory(); }}
            className={`py-3 px-4 font-semibold text-xs border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Your History ({history.length})
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          
          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle size={16} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'submit' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Category & Star Rating */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Feedback Category *
                  </label>
                  <select
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none focus:border-cyan-500"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Experience Rating
                  </label>
                  <div className="flex items-center gap-1.5 py-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 text-yellow-400 hover:scale-110 transition"
                      >
                        <Star
                          size={20}
                          fill={star <= rating ? '#f59e0b' : 'transparent'}
                          className={star <= rating ? 'text-yellow-500' : 'text-slate-600'}
                        />
                      </button>
                    ))}
                    <span className="text-xs text-slate-400 font-bold ml-2">{rating} / 5</span>
                  </div>
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Subject / Summary *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Add dark mode toggle or improve task submission flow"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none focus:border-cyan-500"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              {/* Detailed Message */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Detailed Feedback / Improvement Suggestion *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Describe your feedback, feature idea, or problem in detail so the admin team can review and implement improvements..."
                  className="w-full p-3.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 outline-none focus:border-cyan-500 transition"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg transition disabled:opacity-50"
                >
                  <Send size={14} /> {submitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </div>

            </form>
          ) : (
            /* History Tab */
            <div className="space-y-3">
              {history.length === 0 ? (
                <p className="text-xs text-slate-500 py-8 text-center">
                  You haven't submitted any feedback yet.
                </p>
              ) : (
                history.map((item) => {
                  const statusColors = {
                    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                    reviewed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                    resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  };
                  return (
                    <div key={item.id} className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-200">{item.subject}</h4>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            <span>{item.category}</span>
                            <span>•</span>
                            <span>{new Date(item.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${statusColors[item.status] || statusColors.pending}`}>
                          {item.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-yellow-400 text-xs">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={12} fill={s <= item.rating ? '#f59e0b' : 'transparent'} className={s <= item.rating ? 'text-yellow-500' : 'text-slate-700'} />
                        ))}
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed pt-1">{item.message}</p>

                      {item.admin_notes && (
                        <div className="mt-2 p-2.5 bg-slate-950/80 border-l-2 border-l-cyan-500 rounded text-[11px] text-slate-300">
                          <strong className="block text-[9px] text-cyan-400 uppercase tracking-wider mb-0.5">Admin Response:</strong>
                          {item.admin_notes}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

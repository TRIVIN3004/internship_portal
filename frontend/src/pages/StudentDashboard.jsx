import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import studentCartoon from '../assets/student_cartoon.jpg';
import ChatBox from '../components/ChatBox';
import FeedbackModal from '../components/FeedbackModal';
import { 
  User, Calendar, CheckSquare, Award, BookOpen, Send, 
  Smile, Activity, AlertCircle, FileText, CheckCircle, Clock,
  UploadCloud, Eye, Download, Trash2, Paperclip, Lock, MessageSquare, Megaphone,
  Loader2, ShieldCheck
} from 'lucide-react';

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return dateStr;
  }
}

export default function StudentDashboard() {
  const { authenticatedFetch, logout, name } = useAuth();

  const handleCardTilt = (e) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    const angleX = (yc - y) / 10;
    const angleY = (x - xc) / 10;
    card.style.transform = `perspective(1000px) rotateX(${angleX}deg) rotateY(${angleY}deg) scale3d(1.03, 1.03, 1.03)`;
  };

  const handleCardReset = (e) => {
    const card = e.currentTarget;
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
  };
  
  // Dashboard states
  const [profile, setProfile] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [reports, setReports] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [announcements, setAnnouncements] = useState([]);

  
  // Form states
  const [reportContent, setReportContent] = useState('');
  const [reportBlockers, setReportBlockers] = useState('');
  const [reportHours, setReportHours] = useState(8);
  const [attendanceStatus, setAttendanceStatus] = useState('present');
  const [isLoggingAttendance, setIsLoggingAttendance] = useState(false);
  const [attendanceSuccessMsg, setAttendanceSuccessMsg] = useState('');
  const [activeTaskSubmitId, setActiveTaskSubmitId] = useState(null);
  const [taskSubmissionText, setTaskSubmissionText] = useState('');

  // Document upload states
  const [docTitle, setDocTitle] = useState('');
  const [docDesc, setDocDesc] = useState('');
  const [docFile, setDocFile] = useState(null);
  const [docTaskId, setDocTaskId] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [errMessage, setErrMessage] = useState('');


  // Auto-calculated stats
  const [stats, setStats] = useState({
    attendanceRate: 0.9,
    taskCompletionRate: 0,
    avgTaskScore: 0,
    avgReportQuality: 0,
    predictedGrade: 'On Track',
    riskLevel: 'Low',
    completionProbability: 0.8,
    internshipScore: 100,
    batch: 'Gold Batch',
    eligibleForCompletion: true
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      // Profile
      const profRes = await authenticatedFetch('/api/students/me');
      if (profRes.ok) {
        const profData = await profRes.json();
        setProfile(profData);
      }
      
      // Tasks
      const tasksRes = await authenticatedFetch('/api/students/me/tasks');
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData);
      }

      // Reports
      const reportsRes = await authenticatedFetch('/api/students/me/reports');
      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        setReports(reportsData);
      }

      // Attendance
      const attRes = await authenticatedFetch('/api/students/me/attendance');
      if (attRes.ok) {
        const attData = await attRes.json();
        setAttendance(attData);
      }

      // Recommendations
      const recsRes = await authenticatedFetch('/api/students/me/recommendations');
      if (recsRes.ok) {
        const recsData = await recsRes.json();
        setRecommendations(recsData);
      }

      // Documents
      const docsRes = await authenticatedFetch('/api/documents/student');
      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setDocuments(docsData);
      }

      // Announcements
      const annRes = await authenticatedFetch('/api/announcements');
      if (annRes.ok) {
        setAnnouncements(await annRes.json());
      }
    } catch (err) {
      setErrMessage('Error loading dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await authenticatedFetch('/api/documents/student');
      if (res.ok) setDocuments(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!docFile) {
      setErrMessage('Please select a file to upload.');
      return;
    }
    if (!docTitle) {
      setErrMessage('Please enter a document title.');
      return;
    }
    setMessage('');
    setErrMessage('');
    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('file', docFile);
      formData.append('title', docTitle);
      if (docDesc) formData.append('description', docDesc);
      if (docTaskId) formData.append('task_id', docTaskId);

      const token = localStorage.getItem('token');
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        setMessage('Document uploaded successfully!');
        setDocTitle('');
        setDocDesc('');
        setDocFile(null);
        setDocTaskId('');
        const input = document.getElementById('doc-file-input');
        if (input) input.value = '';
        fetchDocuments();
      } else {
        const err = await res.json();
        setErrMessage(err.detail || 'Failed to upload document.');
      }
    } catch (err) {
      setErrMessage('Error uploading document.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    setMessage('');
    setErrMessage('');
    try {
      const res = await authenticatedFetch(`/api/documents/${docId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setMessage('Document deleted successfully.');
        fetchDocuments();
      } else {
        const err = await res.json();
        setErrMessage(err.detail || 'Failed to delete document.');
      }
    } catch (err) {
      setErrMessage('Error deleting document.');
    }
  };

  const handleViewDocument = (docId) => {
    const token = localStorage.getItem('token');
    window.open(`/api/documents/${docId}/view?token=${token}`, '_blank');
  };

  const handleDownloadDocFile = (docId) => {
    const token = localStorage.getItem('token');
    window.open(`/api/documents/${docId}/download?token=${token}`, '_blank');
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update dynamic stats on variable updates
  useEffect(() => {
    if (!profile) return;
    
    // Attendance math
    const presentCount = attendance.filter(a => a.status === 'present').length;
    const attRate = attendance.length > 0 ? (presentCount / attendance.length) * 100 : 85;
    
    // Tasks math
    const completed = tasks.filter(t => t.status === 'completed').length;
    const taskRate = tasks.length > 0 ? (completed / tasks.length) * 100 : 0;
    const gradedTasks = tasks.filter(t => t.score !== null);
    const avgScore = gradedTasks.length > 0 ? (gradedTasks.reduce((acc, t) => acc + t.score, 0) / gradedTasks.length) : 70;
    
    // Reports math
    const avgQuality = reports.length > 0 ? (reports.reduce((acc, r) => acc + r.quality_score, 0) / reports.length) : 70;
    
    // Retrieve metrics computed by the backend
    const grade = profile.performance_metrics?.predicted_grade || 'On Track';
    const risk = profile.performance_metrics?.risk_level || 'Low';
    const prob = profile.performance_metrics?.completion_probability ?? 0.8;
    const internshipScore = profile.performance_metrics?.internship_score ?? 100;
    const batch = profile.performance_metrics?.batch || 'Gold Batch';
    const eligibleForCompletion = profile.performance_metrics?.eligible_for_completion !== false;

    setStats({
      attendanceRate: Math.round(attRate),
      taskCompletionRate: Math.round(taskRate),
      avgTaskScore: Math.round(avgScore),
      avgReportQuality: Math.round(avgQuality),
      predictedGrade: grade,
      riskLevel: risk,
      completionProbability: prob,
      internshipScore: internshipScore,
      batch: batch,
      eligibleForCompletion: eligibleForCompletion
    });
  }, [tasks, reports, attendance, profile]);

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    setMessage('');
    setErrMessage('');
    setAttendanceSuccessMsg('');

    const todayStr = new Date().toISOString().split('T')[0];
    if (attendance.some(a => a.date === todayStr)) {
      setErrMessage('Daily limit reached: Attendance has already been logged for today.');
      return;
    }

    setIsLoggingAttendance(true);
    try {
      const res = await authenticatedFetch('/api/students/me/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: attendanceStatus })
      });
      if (res.ok) {
        setAttendanceSuccessMsg(`Successfully logged today's attendance as ${attendanceStatus.toUpperCase()}!`);
        fetchData();
        setTimeout(() => setAttendanceSuccessMsg(''), 6000);
      } else {
        const err = await res.json();
        setErrMessage(err.detail || 'Failed to record attendance.');
      }
    } catch (err) {
      setErrMessage('Error executing operation.');
    } finally {
      setIsLoggingAttendance(false);
    }
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setMessage('');
    setErrMessage('');
    try {
      const res = await authenticatedFetch('/api/students/me/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: reportContent,
          blockers: reportBlockers,
          hours_spent: parseFloat(reportHours)
        })
      });
      if (res.ok) {
        const newRep = await res.json();
        setMessage(`Report submitted! AI scored your report quality as ${newRep.quality_score}% (${newRep.key_phrases})`);
        setReportContent('');
        setReportBlockers('');
        fetchData();
      } else {
        const err = await res.json();
        setErrMessage(err.detail || 'Failed to submit report.');
      }
    } catch (err) {
      setErrMessage('Error submitting report.');
    }
  };

  const handleSubmitTask = async (taskId) => {
    setMessage('');
    setErrMessage('');
    try {
      const res = await authenticatedFetch(`/api/students/me/tasks/${taskId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_text: taskSubmissionText })
      });
      if (res.ok) {
        setMessage('Task output submitted successfully!');
        setTaskSubmissionText('');
        setActiveTaskSubmitId(null);
        fetchData();
      } else {
        const err = await res.json();
        setErrMessage(err.detail || 'Failed to submit task.');
      }
    } catch (err) {
      setErrMessage('Error executing submission.');
    }
  };

  const handleDownloadCertificate = () => {
    if (!profile || !profile.id) return;
    window.open(`/api/admin/certificates/download/${profile.id}`, '_blank');
  };

  if (loading && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        <Activity className="animate-spin text-blue-500 mr-3" /> Fetching intern dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      {/* Top Banner Header */}
      <nav className="glass-panel sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold font-heading bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            NEXORA'S INTERN
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsFeedbackOpen(true)}
            className="px-3 py-1.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs font-bold text-cyan-400 flex items-center gap-1.5 transition"
          >
            <MessageSquare size={14} /> Feedback & Ideas
          </button>
          <span className="text-sm font-semibold text-slate-300">
            {profile?.name || name}
          </span>
          <button
            onClick={logout}
            className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-400 hover:text-white"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-6">
        
        {/* Messages */}
        {message && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex gap-3">
            <CheckCircle size={18} /> <span>{message}</span>
          </div>
        )}
        {errMessage && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex gap-3">
            <AlertCircle size={18} /> <span>{errMessage}</span>
          </div>
        )}

        {/* Announcements Notification Board */}
        {announcements.length > 0 && (
          <section className="glass-panel p-5 rounded-2xl border-l-4 border-l-yellow-500 bg-yellow-500/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="flex items-center gap-2 mb-3">
              <Megaphone size={18} className="text-yellow-400" />
              <h4 className="font-heading font-extrabold text-sm text-yellow-400 uppercase tracking-wider">Broadcast Notices ({announcements.length})</h4>
            </div>
            
            <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
              {announcements.map((ann) => (
                <div key={ann.id} className="pb-3 border-b border-slate-800/60 last:border-b-0 last:pb-0 space-y-1">
                  <h5 className="font-bold text-xs text-slate-100">{ann.title}</h5>
                  <p className="text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">{ann.content}</p>
                  <span className="block text-[8px] text-slate-500">
                    Broadcasted on {new Date(ann.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Welcome Student Banner */}
        <div onMouseMove={handleCardTilt} onMouseLeave={handleCardReset} style={{ transition: 'transform 0.15s ease-out' }} className="glass-panel p-6 rounded-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between bg-gradient-to-r from-blue-50/50 to-cyan-50/50 border border-slate-200 shadow-md">
          <div className="space-y-2 text-left">
            <h1 className="text-2xl font-bold font-heading bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
              Welcome Back, {profile?.name || 'Intern'}!
            </h1>
            <p className="text-slate-600 text-sm max-w-xl leading-relaxed">
              Your AI-powered internship portal is live. Check your assignments, report your daily logs, and track your performance index.
            </p>
          </div>
          <div className="relative mt-4 md:mt-0 w-32 h-32 md:w-40 md:h-40 flex items-center justify-center animate-float">
            <img src={studentCartoon} alt="Student Illustration" className="w-full h-full object-contain rounded-xl drop-shadow-lg hover:scale-105 transition-transform duration-300" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Profile & Action Toggles */}
        <div className="space-y-8">
          
          {/* Profile Card */}
          <div onMouseMove={handleCardTilt} onMouseLeave={handleCardReset} style={{ transition: 'transform 0.15s ease-out' }} className="glass-panel p-6 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center font-heading font-black text-xl text-white">
                {profile?.name?.split(' ').map(n => n[0]).join('') || 'IN'}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-heading">{profile?.name}</h3>
                <p className="text-slate-400 text-xs mt-0.5">{profile?.college}</p>
                <span className="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {profile?.internship_domain}
                </span>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-800/80 space-y-3.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Department</span>
                <span className="text-slate-300 font-semibold">{profile?.department || 'N/A'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Academic Mentor</span>
                <span className="text-slate-300 font-semibold">{profile?.mentor?.name || 'Unassigned'}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">Registered Skills</span>
                <div className="flex flex-wrap gap-1.5">
                  {profile?.skills?.split(',').map((s, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
                      {s.trim()}
                    </span>
                  )) || <span className="text-xs text-slate-500">None listed</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Mark Attendance Panel */}
          <div className="glass-panel p-6 rounded-2xl relative overflow-hidden transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-heading font-bold text-white flex items-center gap-2">
                <Calendar size={18} className="text-cyan-400" /> Mark Daily Attendance
              </h4>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>

            {/* Today's Logged Attendance Status Card & Form (Strict 1 Entry/Day Limit) */}
            {(() => {
              const todayStr = new Date().toISOString().split('T')[0];
              const todayAtt = attendance.find(a => a.date === todayStr);
              const isAlreadyLogged = Boolean(todayAtt);

              return (
                <>
                  {todayAtt && (
                    <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-1 animate-fade-in shadow-lg shadow-emerald-500/5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                          <ShieldCheck size={16} className="text-emerald-400 animate-pulse" /> Logged for Today (Limit 1/Day)
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                          todayAtt.status === 'present' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                          todayAtt.status === 'leave'   ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                                                          'bg-red-500/20 text-red-300 border-red-500/40'
                        }`}>
                          {todayAtt.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">Entry confirmed in database. Today's attendance limit has been reached.</p>
                    </div>
                  )}

                  {/* Card-local Success Animation Toast */}
                  {attendanceSuccessMsg && (
                    <div className="mb-4 p-3 bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/50 rounded-xl flex items-center gap-2.5 text-emerald-300 text-xs font-bold animate-bounce shadow-lg shadow-emerald-950/50">
                      <CheckCircle size={18} className="text-emerald-400 shrink-0" />
                      <span>{attendanceSuccessMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleMarkAttendance} className="space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      {['present', 'leave', 'absent'].map((s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={isLoggingAttendance || isAlreadyLogged}
                          onClick={() => setAttendanceStatus(s)}
                          className={`py-2 px-3 rounded font-bold text-xs uppercase border transition ${
                            (todayAtt ? todayAtt.status === s : attendanceStatus === s)
                              ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-md shadow-blue-500/10'
                              : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:border-slate-700'
                          } ${isAlreadyLogged ? 'cursor-not-allowed opacity-60' : ''}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>

                    {isAlreadyLogged ? (
                      <button
                        type="button"
                        disabled
                        className="w-full py-2.5 rounded bg-slate-900 border border-slate-800 text-slate-400 text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed opacity-75"
                      >
                        <Lock size={14} className="text-emerald-400" />
                        <span>Today's Entry Recorded (1 Entry/Day Limit)</span>
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={isLoggingAttendance}
                        className="w-full py-2.5 rounded bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isLoggingAttendance ? (
                          <>
                            <Loader2 size={16} className="animate-spin text-white" />
                            <span>Logging Attendance...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle size={14} />
                            <span>Log Today's Entry</span>
                          </>
                        )}
                      </button>
                    )}
                  </form>
                </>
              );
            })()}
          </div>

          {/* AI Task Recommendations */}
          <div className="glass-panel p-6 rounded-2xl">
            <h4 className="font-heading font-bold text-white mb-4 flex items-center gap-2">
              <Smile size={18} className="text-emerald-400" /> AI Task Recommendations
            </h4>
            <div className="space-y-4">
              {recommendations.length === 0 ? (
                <p className="text-xs text-slate-500">Update your skills profile to trigger NLP recommendation recommendations.</p>
              ) : (
                recommendations.map((rec, i) => (
                  <div key={i} className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-slate-200">{rec.title}</span>
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-500/10 text-emerald-400">
                        {rec.match_score}% Match
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal">{rec.description}</p>
                    <div className="flex gap-1 mt-2">
                      {rec.skills.split(',').slice(0, 3).map((sk, k) => (
                        <span key={k} className="text-[8px] bg-slate-800 px-1 py-0.5 rounded text-slate-500">
                          {sk.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
        </div>

        {/* MIDDLE/RIGHT COLUMN: KPI Widgets, Reports, and Tasks */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Messages Alert Banner */}
          {message && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex gap-3 animate-fade-in">
              <CheckCircle size={18} className="shrink-0" />
              <span>{message}</span>
            </div>
          )}
          {errMessage && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex gap-3 animate-fade-in">
              <AlertCircle size={18} className="shrink-0" />
              <span>{errMessage}</span>
            </div>
          )}

          {/* KPI Widget Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div onMouseMove={handleCardTilt} onMouseLeave={handleCardReset} style={{ transition: 'transform 0.15s ease-out' }} className="glass-panel p-4 rounded-xl border-l-2 border-l-yellow-500 bg-yellow-500/[0.02]">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Internship Score</span>
              <div className="flex flex-col mt-1">
                <span className="text-2xl font-extrabold font-heading text-white">{stats.internshipScore}%</span>
                <span className="text-[9px] font-bold text-yellow-400 mt-0.5">{stats.batch}</span>
              </div>
            </div>

            <div onMouseMove={handleCardTilt} onMouseLeave={handleCardReset} style={{ transition: 'transform 0.15s ease-out' }} className="glass-panel p-4 rounded-xl">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Attendance Rate</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-extrabold font-heading text-white">{stats.attendanceRate}%</span>
              </div>
            </div>

            <div onMouseMove={handleCardTilt} onMouseLeave={handleCardReset} style={{ transition: 'transform 0.15s ease-out' }} className="glass-panel p-4 rounded-xl">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Task Completion</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-extrabold font-heading text-white">{stats.taskCompletionRate}%</span>
              </div>
            </div>

            <div onMouseMove={handleCardTilt} onMouseLeave={handleCardReset} style={{ transition: 'transform 0.15s ease-out' }} className="glass-panel p-4 rounded-xl">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">NLP Report Avg</span>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-2xl font-extrabold font-heading text-white">{stats.avgReportQuality}%</span>
              </div>
            </div>

            <div onMouseMove={handleCardTilt} onMouseLeave={handleCardReset} style={{ transition: 'transform 0.15s ease-out' }} className="glass-panel p-4 rounded-xl border-l-2 border-l-emerald-500">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">AI Predicted Grade</span>
              <div className="flex flex-col mt-1">
                <span className={`text-base font-extrabold font-heading uppercase ${
                  stats.predictedGrade === 'Outstanding' ? 'text-emerald-400' :
                  stats.predictedGrade === 'At Risk' ? 'text-red-400 animate-pulse' :
                  'text-cyan-400'
                }`}>{stats.predictedGrade}</span>
                <span className="text-[8px] text-slate-500 mt-0.5">Success Prob: {stats.completionProbability * 100}%</span>
              </div>
            </div>
          </div>

          {/* Eligibility Gate Alert Banner */}
          {stats.eligibleForCompletion ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-3">
              <CheckCircle size={18} className="shrink-0 text-emerald-400" />
              <div>
                <span className="font-bold">Completion Eligibility: Approved!</span> Your current score is {stats.internshipScore}%, which meets the 75% requirement. You qualify for internship completion.
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-3 animate-pulse">
              <AlertCircle size={18} className="shrink-0 text-red-500" />
              <div>
                <span className="font-bold">Completion Eligibility: Suspended.</span> Your score has fallen to {stats.internshipScore}% (below the required 75%). You must resolve pending blockers or coordinate with your mentor to restore eligibility.
              </div>
            </div>
          )}

          {/* Submit Daily Report Form */}
          <div className="glass-panel p-6 rounded-2xl">
            <h4 className="font-heading font-bold text-white mb-4 flex items-center gap-2">
              <FileText size={18} className="text-blue-400" /> Submit Daily Report Logs (NLP Auto-Graded)
            </h4>
            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  What did you accomplish today? (Specify tasks, methods, and results)
                </label>
                <textarea
                  required
                  rows={3}
                  className="w-full p-4 bg-slate-900/80 border border-slate-800 focus:border-blue-500 rounded-lg text-sm text-slate-200 outline-none transition"
                  placeholder="- Formatted datasets using Pandas.&#13;- Created baseline CNN models in PyTorch.&#13;- Solved optimizer exploding gradient values."
                  value={reportContent}
                  onChange={(e) => setReportContent(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Blockers Faced (Optional)
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-800 focus:border-blue-500 rounded-lg text-sm text-slate-200 outline-none transition"
                    placeholder="Slow execution speeds when loading epochs"
                    value={reportBlockers}
                    onChange={(e) => setReportBlockers(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Hours Spent
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="24"
                    required
                    className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-800 focus:border-blue-500 rounded-lg text-sm text-slate-200 outline-none transition"
                    value={reportHours}
                    onChange={(e) => setReportHours(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 rounded bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-xs flex items-center gap-2 hover:shadow-lg transition ml-auto"
              >
                <Send size={14} /> Submit NLP Analytics Report
              </button>
            </form>
          </div>

          {/* Assigned Tasks Checklist */}
          <div className="glass-panel p-6 rounded-2xl">
            <h4 className="font-heading font-bold text-white mb-4 flex items-center gap-2">
              <CheckSquare size={18} className="text-indigo-400" /> Assigned Tasks Worklist
            </h4>
            <div className="space-y-4">
              {tasks.length === 0 ? (
                <p className="text-xs text-slate-500 py-4 text-center">No tasks currently assigned by your mentor.</p>
              ) : (
                tasks.map((task) => {
                  const isExpired = task.status === 'failed' || (task.status === 'assigned' && task.due_date && new Date(task.due_date).getTime() < Date.now());
                  return (
                    <div key={task.id} className={`p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3 ${isExpired ? 'opacity-70' : ''}`}>
                      <div className="flex flex-wrap justify-between items-start gap-2">
                        <div>
                          <h5 className={`text-sm font-bold ${isExpired ? 'line-through text-slate-500' : 'text-slate-200'}`}>{task.title}</h5>
                          <p className="text-xs text-slate-400 mt-1">{task.description}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                          task.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          task.status === 'submitted' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' :
                          isExpired                   ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                          'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}>
                          {isExpired ? 'Expired' : task.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap justify-between items-center text-[10px] text-slate-500 pt-2 border-t border-slate-800/40">
                        <span className={`flex items-center gap-1 ${isExpired ? 'text-red-400' : ''}`}>
                          <Clock size={12} /> Due: {formatDateTime(task.due_date)}
                        </span>
                        {task.score !== null && (
                          <span className="font-semibold text-emerald-400">Score: {task.score}/100</span>
                        )}
                      </div>

                      {task.feedback && (
                        <div className="mt-2 p-2 bg-slate-950/60 rounded text-[10px] text-slate-400 border-l border-slate-800">
                          <strong className="text-slate-300 block">Mentor Feedback:</strong> {task.feedback}
                        </div>
                      )}

                      {/* Enforced deadline rule — hide button for expired tasks */}
                      {isExpired ? (
                        <div className="text-[10px] text-red-400 font-bold flex items-center gap-1 pt-1">
                          <Lock size={12} /> Deadline passed. This task is locked and cannot be submitted.
                        </div>
                      ) : (
                        task.status === 'assigned' && activeTaskSubmitId !== task.id && (
                          <button
                            onClick={() => {
                              setActiveTaskSubmitId(task.id);
                              setTaskSubmissionText('');
                            }}
                            className="py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-bold transition"
                          >
                            Submit Output
                          </button>
                        )
                      )}

                      {activeTaskSubmitId === task.id && !isExpired && (
                        <div className="space-y-3 mt-3 pt-3 border-t border-slate-800/80">
                          <textarea
                            rows={2}
                            required
                            className="w-full p-3 bg-slate-950 border border-slate-800 rounded text-xs text-slate-300 outline-none"
                            placeholder="Provide the URL or explain output solution details here..."
                            value={taskSubmissionText}
                            onChange={(e) => setTaskSubmissionText(e.target.value)}
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setActiveTaskSubmitId(null)}
                              className="py-1 px-3 text-[10px] text-slate-500 font-bold hover:text-slate-400"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSubmitTask(task.id)}
                              className="py-1 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold"
                            >
                              Submit Output
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Document Upload & Files Management Panel */}
          <div className="glass-panel p-6 rounded-2xl space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="font-heading font-bold text-white flex items-center gap-2">
                <UploadCloud size={20} className="text-cyan-400" /> Document Repository & Uploads
              </h4>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-800 text-slate-400">
                Uploaded: {documents.length}
              </span>
            </div>

            {/* Upload Form */}
            <form onSubmit={handleUploadDocument} className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Document Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Project Proposal / Weekly Code Output"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded text-xs text-slate-200 outline-none"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Select File *
                  </label>
                  <input
                    id="doc-file-input"
                    type="file"
                    required
                    className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-cyan-500/10 file:text-cyan-400 hover:file:bg-cyan-500/20 cursor-pointer"
                    onChange={(e) => setDocFile(e.target.files[0] || null)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Description / Remarks (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Brief description of the document contents..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded text-xs text-slate-200 outline-none"
                    value={docDesc}
                    onChange={(e) => setDocDesc(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Link to Task (Optional)
                  </label>
                  <select
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded text-xs text-slate-300 outline-none"
                    value={docTaskId}
                    onChange={(e) => setDocTaskId(e.target.value)}
                  >
                    <option value="">General Document (Not linked to a task)</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={uploadingDoc}
                  className="px-5 py-2 rounded bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-md transition disabled:opacity-50"
                >
                  <UploadCloud size={14} /> {uploadingDoc ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </form>

            {/* Documents List */}
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Your Uploaded Files</h5>
              {documents.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 text-center bg-slate-900/40 rounded-lg">
                  No documents uploaded yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between gap-4 hover:border-slate-700 transition">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                          <Paperclip size={18} />
                        </div>
                        <div className="min-w-0">
                          <h6 className="text-xs font-bold text-slate-200 truncate">{doc.title}</h6>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span>{doc.file_name}</span>
                            <span>•</span>
                            <span>{formatBytes(doc.file_size)}</span>
                            <span>•</span>
                            <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                            {doc.task_title && (
                              <>
                                <span>•</span>
                                <span className="text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                                  Task: {doc.task_title}
                                </span>
                              </>
                            )}
                          </div>
                          {doc.description && (
                            <p className="text-[10px] text-slate-400 italic mt-1">{doc.description}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleViewDocument(doc.id)}
                          title="View / Open Inline"
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 transition"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => handleDownloadDocFile(doc.id)}
                          title="Download File"
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 transition"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          title="Delete Document"
                          className="p-1.5 rounded bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Certificate Download Panel */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1.5 text-center md:text-left">
              <h4 className="font-heading font-bold text-white flex items-center gap-2 justify-center md:justify-start">
                <Award size={20} className="text-yellow-500" /> Internship Completion Certificate
              </h4>
              <p className="text-xs text-slate-400">
                Generate and download your validated, signed program completion certificate.
              </p>
            </div>
            {stats.eligibleForCompletion ? (
              <button
                onClick={handleDownloadCertificate}
                className="px-6 py-3 rounded-lg font-bold text-xs bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white shadow-lg transition-all"
              >
                Verify & Download PDF
              </button>
            ) : (
              <button
                disabled
                className="px-6 py-3 rounded-lg font-bold text-xs bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed flex items-center gap-1.5"
                title="Your score is below 75%"
              >
                <Lock size={14} /> Locked (Below 75%)
              </button>
            )}
          </div>

        </div>
        </div>

      </div>
      <ChatBox />
      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </div>
  );
}


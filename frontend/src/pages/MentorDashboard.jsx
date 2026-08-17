import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import mentorCartoon from '../assets/mentor_cartoon.jpg';
import ChatBox from '../components/ChatBox';
import FeedbackModal from '../components/FeedbackModal';
import {
  Users, PlusSquare, FileText, CheckCircle, XCircle, Award,
  ShieldAlert, TrendingUp, Clock, RefreshCw, Lock, Layers,
  AlertTriangle, Trash2, Paperclip, Download, Eye, MessageSquare, Megaphone, ArrowRight, UserCheck,
  Loader2, ShieldCheck
} from 'lucide-react';

const BATCH_CONFIG = {
  'Platinum Batch': { color: 'text-yellow-400',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30',  icon: '🏆' },
  'Gold Batch':     { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: '🥇' },
  'Silver Batch':   { color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',    icon: '🥈' },
  'Remedial Batch': { color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/30',     icon: '⚠️' },
};

const STATUS_CONFIG = {
  assigned:  { label: 'Assigned',  cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  submitted: { label: 'Submitted', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' },
  completed: { label: 'Completed', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  failed:    { label: 'Failed',    cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
  expired:   { label: 'Expired',   cls: 'bg-red-500/20 text-red-300 border-red-500/40' },
};

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

function getTaskDisplayStatus(task) {
  if (task.status === 'assigned' && task.due_date) {
    const dueTime = new Date(task.due_date).getTime();
    if (!isNaN(dueTime) && dueTime < Date.now()) return 'expired';
  }
  return task.status;
}

export default function MentorDashboard() {
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

  const [students, setStudents]   = useState([]);
  const [tasks, setTasks]         = useState([]);
  const [reports, setReports]     = useState([]);
  const [documents, setDocuments] = useState([]);
  const [docStudentFilter, setDocStudentFilter] = useState('all');
  const [isFeedbackOpen, setIsFeedbackOpen]   = useState(false);
  const [announcements, setAnnouncements]     = useState([]);

  // Attendance states
  const [mentorAttendance, setMentorAttendance] = useState([]);
  const [mentorAttendanceStatus, setMentorAttendanceStatus] = useState('present');
  const [isLoggingMentorAttendance, setIsLoggingMentorAttendance] = useState(false);
  const [mentorAttSuccessMsg, setMentorAttSuccessMsg] = useState('');
  const [studentDailyAttendance, setStudentDailyAttendance] = useState([]);

  const [taskTitle, setTaskTitle]         = useState('');
  const [taskDesc, setTaskDesc]           = useState('');
  const [taskStudentId, setTaskStudentId] = useState('');
  const [taskDueDate, setTaskDueDate]     = useState('');
  const [isDispatchingTask, setIsDispatchingTask] = useState(false);

  const [activeGradeTaskId, setActiveGradeTaskId] = useState(null);
  const [gradeScore, setGradeScore]               = useState(80);
  const [gradeFeedback, setGradeFeedback]         = useState('');

  const [taskStatusFilter, setTaskStatusFilter] = useState('all');
  const [lastRefresh, setLastRefresh]           = useState(null);
  const [isRefreshing, setIsRefreshing]         = useState(false);

  const [loading, setLoading]       = useState(true);
  const [message, setMessage]       = useState('');
  const [errMessage, setErrMessage] = useState('');
  const intervalRef = useRef(null);

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setIsRefreshing(true);
      const [studRes, tasksRes, reportsRes, docsRes, annRes, mentAttRes, studAttRes] = await Promise.all([
        authenticatedFetch('/api/mentors/students'),
        authenticatedFetch('/api/mentors/tasks'),
        authenticatedFetch('/api/mentors/reports'),
        authenticatedFetch('/api/documents/mentor'),
        authenticatedFetch('/api/announcements'),
        authenticatedFetch('/api/mentors/me/attendance'),
        authenticatedFetch('/api/mentors/students/attendance'),
      ]);
      if (studRes.ok) {
        const d = await studRes.json();
        setStudents(d);
        setTaskStudentId(prevId => {
          if (prevId) return prevId;
          return d.length > 0 ? String(d[0].id) : '';
        });
      }
      if (tasksRes.ok)   setTasks(await tasksRes.json());
      if (reportsRes.ok) setReports(await reportsRes.json());
      if (docsRes.ok)    setDocuments(await docsRes.json());
      if (annRes.ok)     setAnnouncements(await annRes.json());
      if (mentAttRes.ok) setMentorAttendance(await mentAttRes.json());
      if (studAttRes.ok) setStudentDailyAttendance(await studAttRes.json());
      setLastRefresh(new Date());
    } catch {
      if (!silent) setErrMessage('Error loading dashboard data.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleMarkMentorAttendance = async (e) => {
    e.preventDefault(); setMessage(''); setErrMessage(''); setMentorAttSuccessMsg('');
    if (mentorAttendance.some(a => a.date === today)) {
      setErrMessage('Daily limit reached: Mentor attendance has already been logged for today.');
      return;
    }
    setIsLoggingMentorAttendance(true);
    try {
      const res = await authenticatedFetch('/api/mentors/me/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: mentorAttendanceStatus })
      });
      if (res.ok) {
        setMentorAttSuccessMsg(`Mentor attendance recorded as ${mentorAttendanceStatus.toUpperCase()}!`);
        fetchData(true);
        setTimeout(() => setMentorAttSuccessMsg(''), 6000);
      } else {
        const err = await res.json();
        setErrMessage(err.detail || 'Failed to log attendance.');
      }
    } catch {
      setErrMessage('Error logging mentor attendance.');
    } finally {
      setIsLoggingMentorAttendance(false);
    }
  };

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const handleAssignTask = async (e) => {
    e.preventDefault(); setMessage(''); setErrMessage('');
    if (!taskStudentId) { setErrMessage('Please select a student intern first.'); return; }
    setIsDispatchingTask(true);
    try {
      const res = await authenticatedFetch('/api/mentors/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: taskTitle, description: taskDesc, assigned_to_student_id: parseInt(taskStudentId), due_date: taskDueDate })
      });
      if (res.ok) {
        setMessage('Task assigned successfully!');
        setTaskTitle(''); setTaskDesc(''); setTaskDueDate('');
        fetchData();
      } else { const e = await res.json(); setErrMessage(e.detail || 'Failed to assign task.'); }
    } catch { setErrMessage('Error assigning task.'); }
    finally { setIsDispatchingTask(false); }
  };

  const handleReviewReport = async (reportId, status) => {
    setMessage(''); setErrMessage('');
    try {
      const res = await authenticatedFetch(`/api/mentors/reports/${reportId}/review`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, review_feedback: status === 'approved' ? 'Good progress. Approved.' : 'Incomplete. Please expand.' })
      });
      if (res.ok) { setMessage(`Report ${status}!`); fetchData(); }
      else { const e = await res.json(); setErrMessage(e.detail || 'Failed to update report.'); }
    } catch { setErrMessage('Error executing review.'); }
  };

  const handleGradeSubmit = async (e) => {
    e.preventDefault(); setMessage(''); setErrMessage('');
    try {
      const res = await authenticatedFetch(`/api/mentors/tasks/${activeGradeTaskId}/grade`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: parseFloat(gradeScore), feedback: gradeFeedback })
      });
      if (res.ok) { setMessage('Grade submitted!'); setActiveGradeTaskId(null); setGradeFeedback(''); fetchData(); }
      else { const e = await res.json(); setErrMessage(e.detail || 'Failed to grade task.'); }
    } catch { setErrMessage('Error submitting grade.'); }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) return;
    setMessage(''); setErrMessage('');
    try {
      const res = await authenticatedFetch(`/api/mentors/tasks/${taskId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setMessage('Task deleted successfully!');
        fetchData();
      } else {
        const e = await res.json();
        setErrMessage(e.detail || 'Failed to delete task.');
      }
    } catch {
      setErrMessage('Error deleting task.');
    }
  };

  const handleViewDocument = (docId) => {
    const token = localStorage.getItem('token');
    window.open(`/api/documents/${docId}/view?token=${token}`, '_blank');
  };

  const handleDownloadDocument = (docId) => {
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

  if (loading && students.length === 0) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400 bg-slate-950"><TrendingUp className="animate-spin text-blue-500 mr-3" /> Loading mentor dashboard...</div>;
  }

  const today          = new Date().toISOString().split('T')[0];
  const pendingReports = reports.filter(r => r.status === 'pending');
  const filteredDocs   = documents.filter(d => docStudentFilter === 'all' || String(d.student_id) === String(docStudentFilter));
  const submittedTasks = tasks.filter(t => t.status === 'submitted');

  const taskCountsByStatus = tasks.reduce((acc, t) => {
    const s = getTaskDisplayStatus(t);
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  const filteredTasks = tasks.filter(t => {
    const d = getTaskDisplayStatus(t);
    return taskStatusFilter === 'all' || d === taskStatusFilter;
  });

  // Calculate students needing attention
  const atRiskStudents = students.filter(s => s.predicted_grade === 'At Risk' || (s.internship_score ?? 100) < 75 || s.attendance_rate < 0.75);

  return (
    <div className="min-h-screen pb-16 bg-slate-950 text-slate-100 font-sans">

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="glass-panel sticky top-0 z-30 px-6 py-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <span className="text-xl font-bold font-heading bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          NEXORA'S MENTOR DASHBOARD
        </span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <span className={`w-1.5 h-1.5 rounded-full ${isRefreshing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
            {isRefreshing ? 'Syncing...' : lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : 'Live'}
          </div>
          <button onClick={() => fetchData()} title="Refresh now"
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition">
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setIsFeedbackOpen(true)}
            className="px-3 py-1.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs font-bold text-cyan-400 flex items-center gap-1.5 transition"
          >
            <MessageSquare size={14} /> Feedback & Ideas
          </button>
          <span className="text-sm font-semibold text-slate-300">{name}</span>
          <button onClick={logout} className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-400 hover:text-white">Logout</button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-8">

        {/* Alerts */}
        {message    && <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex gap-3"><CheckCircle size={18} className="shrink-0" /><span>{message}</span></div>}
        {errMessage && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex gap-3"><ShieldAlert size={18} className="shrink-0" /><span>{errMessage}</span></div>}

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
                  <p className="text-xs text-slate-350 leading-relaxed font-mono whitespace-pre-wrap">{ann.content}</p>
                  <span className="block text-[8px] text-slate-500">
                    Broadcasted on {new Date(ann.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Welcome Mentor Banner */}
        <div onMouseMove={handleCardTilt} onMouseLeave={handleCardReset} style={{ transition: 'transform 0.15s ease-out' }} className="glass-panel p-6 rounded-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between bg-gradient-to-r from-indigo-50/50 to-purple-50/50 border border-slate-200 shadow-md">
          <div className="space-y-2 text-left">
            <h1 className="text-2xl font-bold font-heading bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Welcome Back, Mentor {name || 'Academic Advisor'}!
            </h1>
            <p className="text-slate-600 text-sm max-w-xl leading-relaxed">
              Track student progress, evaluate task submissions, and provide direct feedback on daily logs using our similarity and risk models.
            </p>
          </div>
          <div className="relative mt-4 md:mt-0 w-32 h-32 md:w-40 md:h-40 flex items-center justify-center animate-float-delayed">
            <img src={mentorCartoon} alt="Mentor Illustration" className="w-full h-full object-contain rounded-xl drop-shadow-lg hover:scale-105 transition-transform duration-300" />
          </div>
        </div>

        {/* Attention Summary Bar */}
        <section onMouseMove={handleCardTilt} onMouseLeave={handleCardReset} style={{ transition: 'transform 0.15s ease-out' }} className={`glass-panel p-5 rounded-2xl border-l-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
          atRiskStudents.length > 0 ? 'border-l-amber-500 bg-amber-500/5' : 'border-l-emerald-500 bg-emerald-500/5'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${atRiskStudents.length > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
              {atRiskStudents.length > 0 ? <AlertTriangle size={20} /> : <UserCheck size={20} />}
            </div>
            <div>
              <h4 className="font-heading font-bold text-sm text-white">Which student needs my attention?</h4>
              <p className="text-xs text-slate-400">
                {atRiskStudents.length > 0
                  ? `⚠️ ${atRiskStudents.length} student(s) currently require proactive review (Score < 75%, Low attendance, or At Risk).`
                  : '✅ All mapped student interns are currently meeting baseline targets cleanly.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              Pending Reports: <strong className="text-amber-400">{pendingReports.length}</strong>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
              Submissions: <strong className="text-indigo-400">{submittedTasks.length}</strong>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 1 — MENTOR DASHBOARD / OVERVIEW: Compact Student Cards Grid
            ══════════════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-heading font-extrabold text-xl text-white flex items-center gap-2">
                <Users size={22} className="text-blue-400" /> Assigned Student Interns
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Compact summary overview of mapped students. Click "View Profile" to access student specific data.</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-900 border border-slate-800 text-slate-400">
              Total Interns: {students.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {students.length === 0 ? (
              <div className="glass-panel p-8 text-center md:col-span-3 text-slate-500 text-xs">
                No students currently mapped by the Administrator.
              </div>
            ) : students.map((s) => {
              const batch    = s.batch || 'Gold Batch';
              const batchCfg = BATCH_CONFIG[batch] || BATCH_CONFIG['Gold Batch'];
              const score    = s.internship_score ?? 100;
              const eligible = s.eligible_for_completion !== false;
              const barColor   = score >= 90 ? 'from-yellow-500 to-amber-400' : score >= 75 ? 'from-emerald-500 to-green-400' : score >= 60 ? 'from-cyan-500 to-blue-400' : 'from-red-600 to-red-400';
              const scoreColor = score >= 90 ? 'text-yellow-400' : score >= 75 ? 'text-emerald-400' : score >= 60 ? 'text-cyan-400' : 'text-red-400';
              const statusBadge = s.predicted_grade || 'On Track';

              return (
                <div key={s.id} onMouseMove={handleCardTilt} onMouseLeave={handleCardReset} style={{ transition: 'transform 0.15s ease-out' }} className={`glass-panel p-6 rounded-2xl border-l-4 flex flex-col justify-between transition duration-300 hover:border-slate-700 ${
                  statusBadge === 'Outstanding' ? 'border-l-emerald-500' :
                  statusBadge === 'At Risk'    ? 'border-l-red-500' : 'border-l-cyan-500'}`}>

                  <div className="space-y-4">
                    {/* Header row */}
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <h4 className="font-bold text-slate-100 text-base">{s.name}</h4>
                        <p className="text-xs text-slate-400">{s.college}</p>
                        <span className="inline-block text-[10px] text-cyan-400 font-semibold mt-0.5">
                          {s.department || s.internship_domain || 'Engineering'}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                          statusBadge === 'Outstanding' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          statusBadge === 'At Risk'    ? 'bg-red-500/15 text-red-400 border-red-500/20 animate-pulse' :
                          'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'}`}>
                          {statusBadge}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${batchCfg.bg} ${batchCfg.color} ${batchCfg.border}`}>
                          {batchCfg.icon} {batch}
                        </span>
                      </div>
                    </div>

                    {/* Internship Score bar */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Internship Score</span>
                        <span className={`text-sm font-black font-heading ${scoreColor}`}>{score}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`} style={{ width: `${score}%` }} />
                      </div>
                    </div>

                    {/* KPI grid */}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/60 text-xs">
                      <div><span className="block text-[8px] font-semibold text-slate-500 uppercase tracking-widest">Attendance</span><span className="text-slate-300 font-bold">{Math.round(s.attendance_rate * 100)}%</span></div>
                      <div><span className="block text-[8px] font-semibold text-slate-500 uppercase tracking-widest">Tasks Met</span><span className="text-slate-300 font-bold">{Math.round(s.task_completion_rate * 100)}%</span></div>
                      <div><span className="block text-[8px] font-semibold text-slate-500 uppercase tracking-widest">Report Quality</span><span className="text-slate-300 font-bold">{s.avg_report_quality}%</span></div>
                      <div><span className="block text-[8px] font-semibold text-slate-500 uppercase tracking-widest">Success Prob</span><span className="text-emerald-400 font-bold">{Math.round(s.completion_probability * 100)}%</span></div>
                    </div>

                    {/* Certificate Eligibility banner */}
                    <div className={`p-2 rounded text-[9px] font-semibold flex items-center gap-1.5 ${
                      eligible ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                      {eligible ? <CheckCircle size={12} /> : <ShieldAlert size={12} />}
                      {eligible ? 'Eligible for Certificate' : 'Not Eligible (Score < 75%)'}
                    </div>
                  </div>

                  {/* Prominent View Profile Button */}
                  <div className="mt-5 pt-3 border-t border-slate-800/80">
                    <Link
                      to={`/mentor-dashboard/student/${s.id}`}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600/20 to-cyan-600/20 hover:from-blue-600 hover:to-cyan-600 border border-blue-500/30 text-cyan-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition group"
                    >
                      <span>View Profile</span>
                      <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 2 — Mentor Self Attendance & Watch Student Attendance
            ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Mark Mentor Attendance Card */}
          <div className="glass-panel p-5 rounded-2xl space-y-4 relative overflow-hidden transition-all duration-300">
            <div className="flex items-center justify-between">
              <h4 className="font-heading font-extrabold text-sm text-white flex items-center gap-2">
                <Clock size={16} className="text-cyan-400" /> My Attendance
              </h4>
              <span className="text-[10px] font-bold text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                Today: {today}
              </span>
            </div>

            {/* Today's Logged Mentor Attendance Status Badge & Form (Strict 1 Entry/Day Limit) */}
            {(() => {
              const todayAtt = mentorAttendance.find(a => a.date === today);
              const isAlreadyLogged = Boolean(todayAtt);
              return (
                <>
                  {todayAtt && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-1 animate-fade-in shadow-lg shadow-emerald-500/5">
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
                      <p className="text-[10px] text-slate-400">Entry confirmed in database. Today's attendance limit reached.</p>
                    </div>
                  )}

                  {/* Inline Success Animation Toast */}
                  {mentorAttSuccessMsg && (
                    <div className="p-2.5 bg-gradient-to-r from-emerald-950/80 to-slate-900 border border-emerald-500/50 rounded-xl flex items-center gap-2 text-emerald-300 text-xs font-bold animate-bounce shadow-md">
                      <CheckCircle size={16} className="text-emerald-400 shrink-0" />
                      <span>{mentorAttSuccessMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleMarkMentorAttendance} className="space-y-3">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Select Today's Status</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['present', 'absent', 'leave'].map((st) => (
                        <button
                          key={st}
                          type="button"
                          disabled={isLoggingMentorAttendance || isAlreadyLogged}
                          onClick={() => setMentorAttendanceStatus(st)}
                          className={`py-2 rounded-lg text-xs font-bold capitalize transition border ${
                            (todayAtt ? todayAtt.status === st : mentorAttendanceStatus === st)
                              ? st === 'present' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                : st === 'absent' ? 'bg-red-500/20 text-red-400 border-red-500/40'
                                : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                          } ${isAlreadyLogged ? 'cursor-not-allowed opacity-60' : ''}`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>

                    {isAlreadyLogged ? (
                      <button
                        type="button"
                        disabled
                        className="w-full py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed opacity-75"
                      >
                        <Lock size={14} className="text-emerald-400" />
                        <span>Today's Entry Logged (1 Entry/Day Limit)</span>
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={isLoggingMentorAttendance}
                        className="w-full py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {isLoggingMentorAttendance ? (
                          <>
                            <Loader2 size={16} className="animate-spin text-white" />
                            <span>Logging Attendance...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle size={14} />
                            <span>Log Mentor Attendance</span>
                          </>
                        )}
                      </button>
                    )}
                  </form>
                </>
              );
            })()}

            <div className="pt-3 border-t border-slate-800/60">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-2">Recent Attendance Logs ({mentorAttendance.length})</span>
              <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                {mentorAttendance.length === 0 ? (
                  <p className="text-[10px] text-slate-500">No attendance records logged yet.</p>
                ) : (
                  mentorAttendance.slice(0, 5).map((att) => (
                    <div key={att.id} className="flex justify-between items-center text-[10px] p-1.5 rounded bg-slate-900/50 border border-slate-800/40">
                      <span className="text-slate-300 font-medium">{att.date}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        att.status === 'present' ? 'bg-emerald-500/10 text-emerald-400' :
                        att.status === 'absent' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {att.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Student Daily Attendance Watch Board */}
          <div className="glass-panel p-5 rounded-2xl lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-heading font-extrabold text-sm text-white flex items-center gap-2">
                <Users size={16} className="text-emerald-400" /> Watch Student Daily Attendance ({studentDailyAttendance.length})
              </h4>
              <span className="text-[10px] text-slate-500">Live student log records</span>
            </div>

            {studentDailyAttendance.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">No daily attendance records logged by assigned students yet.</p>
            ) : (
              <div className="max-h-[260px] overflow-y-auto border border-slate-800/80 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[9px] sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Student Name</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Marked Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {studentDailyAttendance.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-2 px-3 text-slate-300 font-mono text-[10px]">{rec.date}</td>
                        <td className="py-2 px-3 font-semibold text-slate-200">{rec.student_name}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                            rec.status === 'present' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            rec.status === 'absent' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                            'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-500 text-[10px] font-mono">
                          {new Date(rec.marked_at).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 3 — Assign Task + Pending Reports Quick Queue
            ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Assign Task Form */}
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="font-heading font-bold text-lg text-white mb-4 flex items-center gap-2">
              <PlusSquare size={18} className="text-blue-400" /> Assign Technical Task
            </h3>
            <form onSubmit={handleAssignTask} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Select Intern Recipient</label>
                <select required className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg text-sm text-slate-300 outline-none"
                  value={taskStudentId} onChange={(e) => setTaskStudentId(e.target.value)}>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.department || s.internship_domain})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Task Title</label>
                <input type="text" required className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg text-sm text-slate-200 outline-none"
                  placeholder="Supervised Classification using Random Forests" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Instructions & Specifications</label>
                <textarea required rows={3} className="w-full p-4 bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg text-sm text-slate-200 outline-none"
                  placeholder="Outline step-by-step goals, datasets to source, and validation metric targets."
                  value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Deadline Date & Time</label>
                <input type="datetime-local" required min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg text-sm text-slate-200 outline-none"
                  value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} />
              </div>
              <button
                type="submit"
                disabled={isDispatchingTask}
                className="w-full py-2.5 rounded bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-xs hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDispatchingTask ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white" />
                    <span>Dispatching Task...</span>
                  </>
                ) : (
                  <span>Dispatch Task Assignment</span>
                )}
              </button>
            </form>
          </div>

          {/* Pending Reports Quick Queue */}
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="font-heading font-bold text-lg text-white mb-4 flex items-center gap-2">
              <FileText size={18} className="text-cyan-400" /> Pending Daily Reports ({pendingReports.length})
            </h3>
            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
              {pendingReports.length === 0 ? (
                <p className="text-xs text-slate-500 py-12 text-center">No reports awaiting approval.</p>
              ) : pendingReports.map((rep) => {
                const studentName = students.find(s => s.id === rep.student_id)?.name || 'Intern';
                return (
                  <div key={rep.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-200">{studentName}</span>
                      <span className="text-slate-500 text-[10px]">{rep.date}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-mono">"{rep.content}"</p>
                    {rep.blockers && <p className="text-[10px] text-red-400 font-mono">Blockers: {rep.blockers}</p>}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-800/40 text-[10px]">
                      <span className="text-cyan-400 font-semibold">NLP Quality: {rep.quality_score}%</span>
                      <div className="flex gap-2">
                        <button onClick={() => handleReviewReport(rep.id, 'rejected')} className="p-1 hover:bg-red-500/10 text-red-500 rounded"><XCircle size={16} /></button>
                        <button onClick={() => handleReviewReport(rep.id, 'approved')} className="p-1 hover:bg-emerald-500/10 text-emerald-400 rounded"><CheckCircle size={16} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 4 — ALL Assigned Tasks: Live Status Board
            ══════════════════════════════════════════════════════════════════ */}
        <section className="glass-panel p-6 rounded-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="font-heading font-bold text-lg text-white flex items-center gap-2">
                <Layers size={18} className="text-indigo-400" /> All Assigned Tasks Status Board
              </h3>
              <p className="text-xs text-slate-400">Complete task registry across all mapped student interns.</p>
            </div>
            {/* Status filter pills */}
            <div className="flex flex-wrap gap-2">
              {['all', 'assigned', 'submitted', 'completed', 'failed', 'expired'].map(s => (
                <button key={s} onClick={() => setTaskStatusFilter(s)}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition ${
                    taskStatusFilter === s ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'}`}>
                  {s} {s === 'all' ? `(${tasks.length})` : taskCountsByStatus[s] ? `(${taskCountsByStatus[s]})` : ''}
                </button>
              ))}
            </div>
          </div>

          {filteredTasks.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No tasks match the selected filter.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-widest text-[9px]">
                    <th className="pb-3 pr-4">Task</th>
                    <th className="pb-3 pr-4">Intern</th>
                    <th className="pb-3 pr-4">Due Date</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4">Score</th>
                    <th className="pb-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredTasks.map((task) => {
                    const ds = getTaskDisplayStatus(task);
                    const sc = STATUS_CONFIG[ds] || STATUS_CONFIG.assigned;
                    const studentObj = students.find(s => s.id === task.assigned_to_student_id);
                    const studentName = studentObj?.name || '—';
                    const isExpired = ds === 'expired';
                    return (
                      <tr key={task.id} className={`hover:bg-slate-900/40 transition ${isExpired ? 'opacity-70' : ''}`}>
                        <td className="py-3 pr-4">
                          <span className={`font-semibold ${isExpired ? 'line-through text-slate-500' : 'text-slate-200'}`}>{task.title}</span>
                          <p className="text-[10px] text-slate-500 mt-0.5 max-w-xs truncate">{task.description}</p>
                        </td>
                        <td className="py-3 pr-4 font-medium text-slate-300">
                          {studentObj ? (
                            <Link to={`/mentor-dashboard/student/${studentObj.id}`} className="hover:text-cyan-400 underline decoration-slate-700">
                              {studentName}
                            </Link>
                          ) : studentName}
                        </td>
                        <td className="py-3 pr-4">
                          <div className={`flex items-center gap-1 text-[11px] ${isExpired ? 'text-red-400' : 'text-slate-400'}`}>
                            <Clock size={11} />{formatDateTime(task.due_date)}
                          </div>
                          {isExpired && <span className="flex items-center gap-0.5 text-[9px] text-red-400 mt-0.5"><Lock size={9} /> Locked</span>}
                        </td>
                        <td className="py-3 pr-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${sc.cls}`}>{sc.label}</span>
                        </td>
                        <td className="py-3 pr-4">
                          {task.score !== null
                            ? <span className={`font-bold ${task.score >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>{task.score}/100</span>
                            : <span className="text-slate-600">—</span>}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            {task.status === 'submitted' && (
                              <button onClick={() => { setActiveGradeTaskId(task.id); setGradeScore(85); setGradeFeedback(''); }}
                                className="py-1 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[9px] font-bold transition">Evaluate</button>
                            )}
                            <button onClick={() => handleDeleteTask(task.id)} title="Delete task"
                              className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:border-red-500/30 text-slate-500 hover:text-red-400 transition">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Inline Grader for Submitted Tasks */}
        {submittedTasks.length > 0 && (
          <section className="glass-panel p-6 rounded-2xl">
            <h3 className="font-heading font-bold text-lg text-white mb-4 flex items-center gap-2">
              <Award size={18} className="text-indigo-400" /> Task Submissions Awaiting Evaluation ({submittedTasks.length})
            </h3>
            <div className="space-y-4">
              {submittedTasks.map((task) => {
                const studentName = students.find(s => s.id === task.assigned_to_student_id)?.name || 'Intern';
                return (
                  <div key={task.id} className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-bold text-slate-200">{task.title}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">Assigned to: <strong className="text-slate-300">{studentName}</strong> | Submitted: {task.submitted_at?.split('T')[0]}</p>
                      </div>
                      {activeGradeTaskId !== task.id && (
                        <button onClick={() => { setActiveGradeTaskId(task.id); setGradeScore(85); setGradeFeedback(''); }}
                          className="py-1 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold transition">
                          Evaluate Output
                        </button>
                      )}
                    </div>
                    <div className="p-3 bg-slate-950/80 rounded border border-slate-900 text-xs font-mono text-slate-400 leading-normal">
                      <strong className="text-[10px] text-slate-500 block uppercase tracking-wider mb-1">Intern Solution Output:</strong>
                      {task.submission_text || 'No solution text provided.'}
                    </div>
                    {activeGradeTaskId === task.id && (
                      <form onSubmit={handleGradeSubmit} className="space-y-4 p-4 bg-slate-950/60 rounded border border-slate-800">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Score (0 – 100)</label>
                            <input type="number" min="0" max="100" required
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200"
                              value={gradeScore} onChange={(e) => setGradeScore(e.target.value)} />
                          </div>
                          <div className="md:col-span-3">
                            <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Review Feedback</label>
                            <input type="text" required
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200"
                              placeholder="Outline strengths or specify details requiring improvement."
                              value={gradeFeedback} onChange={(e) => setGradeFeedback(e.target.value)} />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button type="button" onClick={() => setActiveGradeTaskId(null)} className="text-xs text-slate-500 font-bold py-1.5 px-3 hover:text-slate-400">Cancel</button>
                          <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold py-1.5 px-4">Submit Evaluation</button>
                        </div>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SECTION 5 — Student Submitted Documents Registry
            ══════════════════════════════════════════════════════════════════ */}
        <section className="glass-panel p-6 rounded-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="font-heading font-bold text-lg text-white flex items-center gap-2">
              <Paperclip size={18} className="text-cyan-400" /> Student Submitted Documents ({documents.length})
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Filter by Intern:</span>
              <select
                className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200 outline-none"
                value={docStudentFilter}
                onChange={(e) => setDocStudentFilter(e.target.value)}
              >
                <option value="all">All Assigned Students</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredDocs.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No documents uploaded by assigned students yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDocs.map((doc) => (
                <div key={doc.id} className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3 hover:border-slate-700 transition">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                        <Paperclip size={18} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-200 truncate">{doc.title}</h4>
                        <p className="text-[10px] text-cyan-400 font-semibold mt-0.5">Student: {doc.student_name}</p>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 mt-1">
                          <span>{doc.file_name}</span>
                          <span>•</span>
                          <span>{formatBytes(doc.file_size)}</span>
                          <span>•</span>
                          <span>{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                        </div>
                        {doc.task_title && (
                          <div className="mt-1.5">
                            <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded">
                              Task: {doc.task_title}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
                    <button
                      onClick={() => handleViewDocument(doc.id)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded text-[10px] font-bold flex items-center gap-1.5 transition"
                    >
                      <Eye size={12} /> View
                    </button>
                    <button
                      onClick={() => handleDownloadDocument(doc.id)}
                      className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold flex items-center gap-1.5 transition"
                    >
                      <Download size={12} /> Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
      <ChatBox />
      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </div>
  );
}

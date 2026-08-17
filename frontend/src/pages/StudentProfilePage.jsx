import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ChatBox from '../components/ChatBox';
import FeedbackModal from '../components/FeedbackModal';
import {
  ArrowLeft, Users, CheckCircle, XCircle, ShieldAlert, TrendingUp,
  Clock, RefreshCw, PlusSquare, FileText, Award, Paperclip, Download,
  Eye, Layers, Lock, Trash2, MessageSquare, AlertTriangle, Calendar,
  Star, BookOpen, Filter, Check, AlertCircle, FileCheck, Loader2
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

export default function StudentProfilePage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { authenticatedFetch, logout, name } = useAuth();

  const [student, setStudent]         = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [tasks, setTasks]             = useState([]);
  const [reports, setReports]         = useState([]);
  const [documents, setDocuments]     = useState([]);
  const [attendance, setAttendance]   = useState([]);

  const [activeTab, setActiveTab]     = useState('overview');
  const [loading, setLoading]         = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage]         = useState('');
  const [errMessage, setErrMessage]   = useState('');
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  // New task assignment modal state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [taskTitle, setTaskTitle]                 = useState('');
  const [taskDesc, setTaskDesc]                   = useState('');
  const [taskDueDate, setTaskDueDate]             = useState('');
  const [isDispatchingTask, setIsDispatchingTask] = useState(false);

  // Evaluation state
  const [activeGradeTaskId, setActiveGradeTaskId] = useState(null);
  const [gradeScore, setGradeScore]               = useState(80);
  const [gradeFeedback, setGradeFeedback]         = useState('');

  // Filters
  const [taskStatusFilter, setTaskStatusFilter]     = useState('all');
  const [reportStatusFilter, setReportStatusFilter] = useState('all');

  const fetchData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setIsRefreshing(true);
      const [studRes, tasksRes, reportsRes, docsRes, studAttRes] = await Promise.all([
        authenticatedFetch('/api/mentors/students'),
        authenticatedFetch('/api/mentors/tasks'),
        authenticatedFetch('/api/mentors/reports'),
        authenticatedFetch('/api/documents/mentor'),
        authenticatedFetch('/api/mentors/students/attendance'),
      ]);

      let currentStudent = null;
      if (studRes.ok) {
        const d = await studRes.json();
        setAllStudents(d);
        currentStudent = d.find(s => String(s.id) === String(studentId));
        setStudent(currentStudent || null);
      }

      if (tasksRes.ok) {
        const allT = await tasksRes.json();
        setTasks(allT.filter(t => String(t.assigned_to_student_id) === String(studentId)));
      }
      if (reportsRes.ok) {
        const allR = await reportsRes.json();
        setReports(allR.filter(r => String(r.student_id) === String(studentId)));
      }
      if (docsRes.ok) {
        const allD = await docsRes.json();
        setDocuments(allD.filter(d => String(d.student_id) === String(studentId)));
      }
      if (studAttRes.ok) {
        const allA = await studAttRes.json();
        setAttendance(allA.filter(a => String(a.student_id) === String(studentId)));
      }
    } catch (err) {
      if (!silent) setErrMessage('Error loading student profile data.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [studentId]);

  const handleAssignTask = async (e) => {
    e.preventDefault(); setMessage(''); setErrMessage('');
    setIsDispatchingTask(true);
    try {
      const res = await authenticatedFetch('/api/mentors/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskTitle,
          description: taskDesc,
          assigned_to_student_id: parseInt(studentId),
          due_date: taskDueDate
        })
      });
      if (res.ok) {
        setMessage('Task assigned successfully!');
        setTaskTitle(''); setTaskDesc(''); setTaskDueDate('');
        setIsAssignModalOpen(false);
        fetchData(true);
      } else {
        const err = await res.json();
        setErrMessage(err.detail || 'Failed to assign task.');
      }
    } catch {
      setErrMessage('Error assigning task.');
    } finally {
      setIsDispatchingTask(false);
    }
  };

  const handleGradeSubmit = async (e) => {
    e.preventDefault(); setMessage(''); setErrMessage('');
    try {
      const res = await authenticatedFetch(`/api/mentors/tasks/${activeGradeTaskId}/grade`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: parseFloat(gradeScore), feedback: gradeFeedback })
      });
      if (res.ok) {
        setMessage('Grade submitted successfully!');
        setActiveGradeTaskId(null);
        setGradeFeedback('');
        fetchData(true);
      } else {
        const err = await res.json();
        setErrMessage(err.detail || 'Failed to grade task.');
      }
    } catch {
      setErrMessage('Error submitting grade.');
    }
  };

  const handleReviewReport = async (reportId, status) => {
    setMessage(''); setErrMessage('');
    try {
      const res = await authenticatedFetch(`/api/mentors/reports/${reportId}/review`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          review_feedback: status === 'approved' ? 'Good progress. Approved.' : 'Incomplete report. Please add more details.'
        })
      });
      if (res.ok) {
        setMessage(`Report marked as ${status}!`);
        fetchData(true);
      } else {
        const err = await res.json();
        setErrMessage(err.detail || 'Failed to update report.');
      }
    } catch {
      setErrMessage('Error reviewing report.');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task? This action cannot be undone.')) return;
    setMessage(''); setErrMessage('');
    try {
      const res = await authenticatedFetch(`/api/mentors/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        setMessage('Task deleted successfully!');
        fetchData(true);
      } else {
        const err = await res.json();
        setErrMessage(err.detail || 'Failed to delete task.');
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

  if (loading && !student) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-slate-400 bg-slate-950">
        <TrendingUp className="animate-spin text-blue-500 mb-3" size={32} />
        <span>Loading student profile...</span>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen p-8 text-center bg-slate-950 text-slate-300">
        <h2 className="text-xl font-bold text-red-400 mb-4">Student Not Found</h2>
        <p className="text-sm text-slate-400 mb-6">The requested student ID does not exist or is not assigned to you.</p>
        <Link to="/mentor-dashboard" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold text-white transition">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  // Calculated task breakdown for student
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const submittedTasks = tasks.filter(t => t.status === 'submitted');
  const assignedTasks  = tasks.filter(t => t.status === 'assigned');
  const failedTasks    = tasks.filter(t => t.status === 'failed');
  const expiredTasks   = tasks.filter(t => getTaskDisplayStatus(t) === 'expired');

  // Metrics
  const batch    = student.batch || 'Gold Batch';
  const batchCfg = BATCH_CONFIG[batch] || BATCH_CONFIG['Gold Batch'];
  const score    = student.internship_score ?? 100;
  const eligible = student.eligible_for_completion !== false;
  const scoreColor = score >= 90 ? 'text-yellow-400' : score >= 75 ? 'text-emerald-400' : score >= 60 ? 'text-cyan-400' : 'text-red-400';
  const barColor   = score >= 90 ? 'from-yellow-500 to-amber-400' : score >= 75 ? 'from-emerald-500 to-green-400' : score >= 60 ? 'from-cyan-500 to-blue-400' : 'from-red-600 to-red-400';

  // Derived Attention Items
  const attentionItems = [];
  if (failedTasks.length > 0) {
    attentionItems.push({ type: 'danger', text: `${failedTasks.length} Failed Task(s) requiring review or re-assignment.` });
  }
  if (expiredTasks.length > 0) {
    attentionItems.push({ type: 'warning', text: `${expiredTasks.length} Overdue / Expired Task(s).` });
  }
  if (student.attendance_rate < 0.75) {
    attentionItems.push({ type: 'warning', text: `Low Attendance Rate: ${Math.round(student.attendance_rate * 100)}% (threshold is 75%).` });
  }
  if (student.task_completion_rate < 0.6) {
    attentionItems.push({ type: 'warning', text: `Low Task Completion Rate: ${Math.round(student.task_completion_rate * 100)}%.` });
  }
  if (student.avg_report_quality < 60) {
    attentionItems.push({ type: 'warning', text: `Low Daily Report Quality Score: ${student.avg_report_quality}%.` });
  }
  if (student.predicted_grade === 'At Risk') {
    attentionItems.push({ type: 'danger', text: `Student flagged as "At Risk". Proactive mentoring session recommended.` });
  }

  // Attendance breakdown
  const totalAttDays = attendance.length;
  const presentDays  = attendance.filter(a => a.status === 'present').length;
  const absentDays   = attendance.filter(a => a.status === 'absent').length;
  const leaveDays    = attendance.filter(a => a.status === 'leave').length;

  // Filtered tasks view
  const filteredTasks = tasks.filter(t => {
    const ds = getTaskDisplayStatus(t);
    return taskStatusFilter === 'all' || ds === taskStatusFilter;
  });

  // Filtered daily reports view
  const filteredReports = reports.filter(r => {
    return reportStatusFilter === 'all' || r.status === reportStatusFilter;
  });

  // Feedback Items combines graded tasks + reviewed daily reports
  const feedbackItems = [
    ...tasks.filter(t => t.feedback).map(t => ({
      id: `task-${t.id}`,
      type: 'Task Grade Feedback',
      title: t.title,
      date: t.completed_at?.split('T')[0] || t.due_date,
      feedback: t.feedback,
      score: t.score,
      badgeCls: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
    })),
    ...reports.filter(r => r.review_feedback).map(r => ({
      id: `rep-${r.id}`,
      type: 'Daily Report Review',
      title: `Daily Report (${r.date})`,
      date: r.date,
      feedback: r.review_feedback,
      score: r.quality_score,
      badgeCls: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
    }))
  ];

  return (
    <div className="min-h-screen pb-16 bg-slate-950 text-slate-100 font-sans">

      {/* Top Navbar */}
      <nav className="glass-panel sticky top-0 z-30 px-6 py-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link
            to="/mentor-dashboard"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white hover:border-slate-700 transition"
          >
            <ArrowLeft size={16} /> Back to Dashboard
          </Link>
          <span className="text-xl font-bold font-heading bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent hidden sm:inline">
            Student Profile View
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <span className={`w-1.5 h-1.5 rounded-full ${isRefreshing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
            {isRefreshing ? 'Syncing...' : 'Live'}
          </div>
          <button onClick={() => fetchData()} title="Refresh now"
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition">
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setIsFeedbackOpen(true)}
            className="px-3 py-1.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-xs font-bold text-cyan-400 flex items-center gap-1.5 transition"
          >
            <MessageSquare size={14} /> Feedback
          </button>
          <span className="text-sm font-semibold text-slate-300 hidden md:inline">{name}</span>
          <button onClick={logout} className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-400 hover:text-white">Logout</button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 mt-6 space-y-6">

        {/* Global Notifications */}
        {message    && <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex gap-3"><CheckCircle size={18} className="shrink-0" /><span>{message}</span></div>}
        {errMessage && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex gap-3"><ShieldAlert size={18} className="shrink-0" /><span>{errMessage}</span></div>}

        {/* ══════════════════════════════════════════════════════════════════
            HEADER: Student Main Profile Banner
            ══════════════════════════════════════════════════════════════════ */}
        <section className={`glass-panel p-6 rounded-2xl border-l-4 transition ${
          student.predicted_grade === 'Outstanding' ? 'border-l-emerald-500' :
          student.predicted_grade === 'At Risk'    ? 'border-l-red-500' : 'border-l-cyan-500'}`}>
          
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            {/* Student details */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-black text-white font-heading">{student.name}</h1>
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                  student.predicted_grade === 'Outstanding' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                  student.predicted_grade === 'At Risk'    ? 'bg-red-500/15 text-red-400 border-red-500/20 animate-pulse' :
                  'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'}`}>
                  Status: {student.predicted_grade}
                </span>
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold border ${batchCfg.bg} ${batchCfg.color} ${batchCfg.border}`}>
                  {batchCfg.icon} {batch}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                <span className="text-slate-300 font-semibold">{student.college}</span>
                <span>•</span>
                <span>Department/Domain: <strong className="text-cyan-400">{student.department || student.internship_domain || 'General Engineering'}</strong></span>
                {student.start_date && (
                  <>
                    <span>•</span>
                    <span>Duration: {student.start_date} to {student.end_date || 'Present'}</span>
                  </>
                )}
              </div>
            </div>

            {/* Quick Actions & Internship Score */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 shrink-0">
              {/* Score Widget */}
              <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl min-w-[200px]">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Internship Score</span>
                  <span className={`text-base font-black font-heading ${scoreColor}`}>{score}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
                  <div className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`} style={{ width: `${score}%` }} />
                </div>
                <div className={`text-[9px] font-bold flex items-center gap-1 ${
                  eligible ? 'text-emerald-400' : 'text-red-400'}`}>
                  {eligible ? <CheckCircle size={10} /> : <ShieldAlert size={10} />}
                  {eligible ? 'Eligible for Certificate' : 'Score Below 75% Threshold'}
                </div>
              </div>

              {/* Assign Task Button */}
              <button
                onClick={() => setIsAssignModalOpen(true)}
                className="px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg shadow-blue-500/10 flex items-center justify-center gap-2 transition"
              >
                <PlusSquare size={16} /> Assign Task to {student.name.split(' ')[0]}
              </button>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            SUMMARY CARDS: 5 KPI CARDS
            ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          
          <div className="glass-panel p-4 rounded-xl border border-slate-800/80 space-y-1">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">Attendance</span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-extrabold text-white font-heading">{Math.round(student.attendance_rate * 100)}%</span>
              <span className="text-[10px] text-slate-400 font-mono">{presentDays}/{totalAttDays || '—'} days</span>
            </div>
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${Math.round(student.attendance_rate * 100)}%` }} />
            </div>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-slate-800/80 space-y-1">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">Tasks Completed</span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-extrabold text-indigo-400 font-heading">{completedTasks.length}/{tasks.length}</span>
              <span className="text-[10px] text-slate-400 font-mono">{Math.round(student.task_completion_rate * 100)}% rate</span>
            </div>
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-indigo-400 rounded-full" style={{ width: `${Math.round(student.task_completion_rate * 100)}%` }} />
            </div>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-slate-800/80 space-y-1">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">Report Quality</span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-extrabold text-cyan-400 font-heading">{student.avg_report_quality}%</span>
              <span className="text-[10px] text-slate-400 font-mono">{reports.length} reports</span>
            </div>
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${student.avg_report_quality}%` }} />
            </div>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-slate-800/80 space-y-1">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">Overall Score</span>
            <div className="flex items-baseline justify-between">
              <span className={`text-xl font-extrabold font-heading ${scoreColor}`}>{score}</span>
              <span className="text-[10px] text-slate-400 font-mono">/ 100</span>
            </div>
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
              <div className={`h-full rounded-full bg-gradient-to-r ${barColor}`} style={{ width: `${score}%` }} />
            </div>
          </div>

          <div className="glass-panel p-4 rounded-xl border border-slate-800/80 space-y-1">
            <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-500">Success Prob.</span>
            <div className="flex items-baseline justify-between">
              <span className="text-xl font-extrabold text-emerald-400 font-heading">{Math.round(student.completion_probability * 100)}%</span>
              <span className="text-[10px] text-emerald-400 font-bold">Estimated</span>
            </div>
            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${Math.round(student.completion_probability * 100)}%` }} />
            </div>
          </div>

        </div>

        {/* ══════════════════════════════════════════════════════════════════
            TAB NAVIGATION BAR
            ══════════════════════════════════════════════════════════════════ */}
        <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-1">
          {[
            { id: 'overview',     label: 'Overview',      icon: TrendingUp, count: null },
            { id: 'tasks',        label: 'Tasks',         icon: Layers,     count: tasks.length },
            { id: 'submissions',  label: 'Submissions',   icon: Paperclip,  count: documents.length },
            { id: 'reports',      label: 'Daily Reports', icon: FileText,   count: reports.length },
            { id: 'attendance',   label: 'Attendance',    icon: Clock,      count: attendance.length },
            { id: 'feedback',     label: 'Feedback',      icon: Star,       count: feedbackItems.length },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-bold flex items-center gap-2 transition border-b-2 whitespace-nowrap ${
                  isActive
                    ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[9px] ${
                    isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 1: OVERVIEW TAB
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">

            {/* Mentor Attention Required Alert Section */}
            <div className={`glass-panel p-5 rounded-2xl border-l-4 ${
              attentionItems.some(i => i.type === 'danger') ? 'border-l-red-500 bg-red-500/5' :
              attentionItems.length > 0 ? 'border-l-amber-500 bg-amber-500/5' : 'border-l-emerald-500 bg-emerald-500/5'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                {attentionItems.some(i => i.type === 'danger') ? <ShieldAlert className="text-red-400" size={20} /> :
                 attentionItems.length > 0 ? <AlertTriangle className="text-amber-400" size={20} /> : <CheckCircle className="text-emerald-400" size={20} />}
                <h3 className="font-heading font-extrabold text-base text-white">
                  {attentionItems.length > 0 ? '⚠️ Mentor Attention Required' : '✅ Student Performance Status'}
                </h3>
              </div>

              {attentionItems.length === 0 ? (
                <p className="text-xs text-slate-300">
                  No critical intervention triggers detected for {student.name}. The intern is executing on schedule with good metrics.
                </p>
              ) : (
                <div className="space-y-2">
                  {attentionItems.map((item, idx) => (
                    <div key={idx} className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                      item.type === 'danger' ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
                    }`}>
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Comprehensive Progress Overview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Task Breakdown Progress */}
              <div className="glass-panel p-6 rounded-2xl space-y-4">
                <h3 className="font-heading font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                  <Layers size={16} className="text-indigo-400" /> Task Assignment Summary
                </h3>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-center">
                    <span className="block text-[9px] font-bold uppercase text-slate-500">Assigned</span>
                    <span className="text-lg font-bold text-blue-400">{assignedTasks.length}</span>
                  </div>
                  <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-center">
                    <span className="block text-[9px] font-bold uppercase text-slate-500">Submitted</span>
                    <span className="text-lg font-bold text-amber-400">{submittedTasks.length}</span>
                  </div>
                  <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-center">
                    <span className="block text-[9px] font-bold uppercase text-slate-500">Completed</span>
                    <span className="text-lg font-bold text-emerald-400">{completedTasks.length}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-center">
                    <span className="block text-[9px] font-bold uppercase text-slate-500">Failed</span>
                    <span className="text-lg font-bold text-red-400">{failedTasks.length}</span>
                  </div>
                  <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl text-center">
                    <span className="block text-[9px] font-bold uppercase text-slate-500">Expired</span>
                    <span className="text-lg font-bold text-red-300">{expiredTasks.length}</span>
                  </div>
                </div>
              </div>

              {/* Engagement & Report Metrics */}
              <div className="glass-panel p-6 rounded-2xl space-y-4">
                <h3 className="font-heading font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp size={16} className="text-cyan-400" /> Key Internship Indicators
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Task Completion Rate</span>
                      <span className="font-bold text-indigo-400">{Math.round(student.task_completion_rate * 100)}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.round(student.task_completion_rate * 100)}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Attendance Reliability</span>
                      <span className="font-bold text-emerald-400">{Math.round(student.attendance_rate * 100)}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.round(student.attendance_rate * 100)}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Daily Report Quality</span>
                      <span className="font-bold text-cyan-400">{student.avg_report_quality}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${student.avg_report_quality}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Success Probability</span>
                      <span className="font-bold text-yellow-400">{Math.round(student.completion_probability * 100)}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500 rounded-full" style={{ width: `${Math.round(student.completion_probability * 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 2: TASKS TAB
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'tasks' && (
          <div className="glass-panel p-6 rounded-2xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-heading font-bold text-lg text-white flex items-center gap-2">
                  <Layers size={18} className="text-indigo-400" /> Tasks Assigned to {student.name} ({tasks.length})
                </h3>
                <p className="text-xs text-slate-400">View status, evaluate submitted outputs, or assign new tasks.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Status Filter */}
                <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                  {['all', 'assigned', 'submitted', 'completed', 'failed', 'expired'].map(st => (
                    <button
                      key={st}
                      onClick={() => setTaskStatusFilter(st)}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition ${
                        taskStatusFilter === st ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setIsAssignModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition"
                >
                  <PlusSquare size={14} /> Assign New Task
                </button>
              </div>
            </div>

            {filteredTasks.length === 0 ? (
              <p className="text-xs text-slate-500 py-12 text-center">No tasks match the selected status filter.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-widest text-[9px]">
                      <th className="pb-3 pr-4">Task Title & Details</th>
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
                      const isExpired = ds === 'expired';

                      return (
                        <tr key={task.id} className="hover:bg-slate-900/40 transition">
                          <td className="py-3 pr-4 max-w-sm">
                            <span className={`font-semibold ${isExpired ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                              {task.title}
                            </span>
                            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{task.description}</p>
                            {task.submission_text && (
                              <div className="mt-2 p-2 bg-slate-950/80 rounded border border-slate-900 text-[10px] font-mono text-slate-400">
                                <strong className="text-slate-500 block uppercase">Submitted Code / Output:</strong>
                                {task.submission_text}
                              </div>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            <div className={`flex items-center gap-1 text-[11px] ${isExpired ? 'text-red-400' : 'text-slate-400'}`}>
                              <Clock size={12} /> {formatDateTime(task.due_date)}
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${sc.cls}`}>
                              {sc.label}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            {task.score !== null
                              ? <span className={`font-bold ${task.score >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>{task.score}/100</span>
                              : <span className="text-slate-600">—</span>}
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              {task.status === 'submitted' && (
                                <button
                                  onClick={() => { setActiveGradeTaskId(task.id); setGradeScore(85); setGradeFeedback(''); }}
                                  className="py-1 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold transition"
                                >
                                  Evaluate
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                title="Delete task"
                                className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:border-red-500/30 text-slate-500 hover:text-red-400 transition"
                              >
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

            {/* Inline Grader Form */}
            {activeGradeTaskId && (
              <form onSubmit={handleGradeSubmit} className="p-5 bg-slate-950/80 rounded-xl border border-indigo-500/30 space-y-4 mt-4">
                <h4 className="font-bold text-sm text-indigo-400 flex items-center gap-2">
                  <Award size={16} /> Evaluate Submission for Selected Task
                </h4>
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
                      placeholder="Enter technical comments, guidance, or improvement points."
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
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 3: SUBMISSIONS TAB
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'submissions' && (
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="font-heading font-bold text-lg text-white flex items-center gap-2">
              <Paperclip size={18} className="text-cyan-400" /> Submitted Documents & Outputs ({documents.length})
            </h3>

            {documents.length === 0 ? (
              <p className="text-xs text-slate-500 py-12 text-center">No document attachments uploaded by {student.name} yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3 hover:border-slate-700 transition">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                        <Paperclip size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-slate-200 truncate">{doc.title}</h4>
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
                        {doc.description && (
                          <p className="text-[10px] text-slate-400 italic mt-1.5">{doc.description}</p>
                        )}
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
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 4: DAILY REPORTS TAB
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'reports' && (
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h3 className="font-heading font-bold text-lg text-white flex items-center gap-2">
                <FileText size={18} className="text-cyan-400" /> Daily Work Reports ({reports.length})
              </h3>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Filter:</span>
                <select
                  className="px-3 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200 outline-none"
                  value={reportStatusFilter}
                  onChange={(e) => setReportStatusFilter(e.target.value)}
                >
                  <option value="all">All Reports</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            {filteredReports.length === 0 ? (
              <p className="text-xs text-slate-500 py-12 text-center">No daily reports found matching filter.</p>
            ) : (
              <div className="space-y-4">
                {filteredReports.map((rep) => (
                  <div key={rep.id} className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-200 flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400" /> Report Date: {rep.date}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                        rep.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        rep.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                      }`}>
                        {rep.status}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-950/80 rounded border border-slate-900 text-xs font-mono text-slate-300 leading-relaxed">
                      {rep.content}
                    </div>

                    {rep.blockers && (
                      <p className="text-xs text-red-400 font-mono bg-red-500/5 p-2 rounded border border-red-500/10">
                        <strong>Blockers reported:</strong> {rep.blockers}
                      </p>
                    )}

                    {rep.review_feedback && (
                      <p className="text-xs text-cyan-300 italic bg-cyan-500/5 p-2 rounded border border-cyan-500/10">
                        <strong>Mentor Feedback:</strong> {rep.review_feedback}
                      </p>
                    )}

                    <div className="flex justify-between items-center pt-2 border-t border-slate-800/40 text-[10px]">
                      <span className="text-cyan-400 font-semibold">NLP Score: {rep.quality_score}%</span>
                      {rep.status === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => handleReviewReport(rep.id, 'rejected')} className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded font-bold transition flex items-center gap-1">
                            <XCircle size={13} /> Reject
                          </button>
                          <button onClick={() => handleReviewReport(rep.id, 'approved')} className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded font-bold transition flex items-center gap-1">
                            <CheckCircle size={13} /> Approve
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 5: ATTENDANCE TAB
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'attendance' && (
          <div className="glass-panel p-6 rounded-2xl space-y-6">
            <h3 className="font-heading font-bold text-lg text-white flex items-center gap-2">
              <Clock size={18} className="text-emerald-400" /> Attendance History & Stats
            </h3>

            {/* Attendance Breakdown Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl text-center">
                <span className="block text-[9px] font-bold uppercase text-slate-500">Attendance Rate</span>
                <span className="text-2xl font-bold text-emerald-400 font-heading">{Math.round(student.attendance_rate * 100)}%</span>
              </div>
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl text-center">
                <span className="block text-[9px] font-bold uppercase text-slate-500">Present Days</span>
                <span className="text-2xl font-bold text-emerald-400 font-heading">{presentDays}</span>
              </div>
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl text-center">
                <span className="block text-[9px] font-bold uppercase text-slate-500">Absent Days</span>
                <span className="text-2xl font-bold text-red-400 font-heading">{absentDays}</span>
              </div>
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl text-center">
                <span className="block text-[9px] font-bold uppercase text-slate-500">Leave Days</span>
                <span className="text-2xl font-bold text-amber-400 font-heading">{leaveDays}</span>
              </div>
            </div>

            {/* Log Records Table */}
            {attendance.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">No attendance log records recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 uppercase tracking-widest text-[9px]">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Marked Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {attendance.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-900/30 transition">
                        <td className="py-2.5 px-3 font-mono text-slate-300">{rec.date}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            rec.status === 'present' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            rec.status === 'absent' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                            'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono text-[10px]">
                          {rec.marked_at ? new Date(rec.marked_at).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            TAB 6: FEEDBACK TAB
            ══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'feedback' && (
          <div className="glass-panel p-6 rounded-2xl space-y-4">
            <h3 className="font-heading font-bold text-lg text-white flex items-center gap-2">
              <Star size={18} className="text-yellow-400" /> Evaluation & Review Feedback History ({feedbackItems.length})
            </h3>

            {feedbackItems.length === 0 ? (
              <p className="text-xs text-slate-500 py-12 text-center">No feedback notes recorded yet for {student.name}.</p>
            ) : (
              <div className="space-y-3">
                {feedbackItems.map((fb) => (
                  <div key={fb.id} className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${fb.badgeCls}`}>
                          {fb.type}
                        </span>
                        <span className="font-bold text-slate-200">{fb.title}</span>
                      </div>
                      <span className="text-slate-500 text-[10px]">{fb.date}</span>
                    </div>

                    <p className="text-xs text-slate-300 font-mono leading-relaxed bg-slate-950/60 p-3 rounded border border-slate-900">
                      "{fb.feedback}"
                    </p>

                    {fb.score !== undefined && fb.score !== null && (
                      <div className="text-[10px] text-slate-400">
                        Score given: <span className="font-bold text-emerald-400">{fb.score}%</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* ══════════════════════════════════════════════════════════════════
          MODAL: Assign Technical Task Modal
          ══════════════════════════════════════════════════════════════════ */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="glass-panel p-6 rounded-2xl max-w-lg w-full space-y-4 border border-slate-800">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
                <PlusSquare size={18} className="text-blue-400" /> Assign Task to {student.name}
              </h3>
              <button onClick={() => setIsAssignModalOpen(false)} className="text-slate-500 hover:text-slate-300">✕</button>
            </div>

            <form onSubmit={handleAssignTask} className="space-y-4">
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

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" disabled={isDispatchingTask} onClick={() => setIsAssignModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-200 disabled:opacity-50">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDispatchingTask}
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-xs hover:shadow-lg transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isDispatchingTask ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-white" />
                      <span>Dispatching...</span>
                    </>
                  ) : (
                    <span>Dispatch Task Assignment</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ChatBox />
      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />
    </div>
  );
}

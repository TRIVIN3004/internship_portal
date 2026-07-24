import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import ChatBox from '../components/ChatBox';
import FeedbackModal from '../components/FeedbackModal';
import {
  Users, PlusSquare, FileText, CheckCircle, XCircle, Award,
  ShieldAlert, TrendingUp, Clock, RefreshCw, Lock, Layers,
  AlertTriangle, Trash2, Paperclip, Download, Eye, UploadCloud, MessageSquare
} from 'lucide-react';

// ─── Batch configuration ────────────────────────────────────────────────────
const BATCH_CONFIG = {
  'Platinum Batch': { color: 'text-yellow-400',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30',  icon: '🏆' },
  'Gold Batch':     { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: '🥇' },
  'Silver Batch':   { color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',    icon: '🥈' },
  'Remedial Batch': { color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/30',     icon: '⚠️' },
};

// ─── Task status display config ──────────────────────────────────────────────
const STATUS_CONFIG = {
  assigned:  { label: 'Assigned',  cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  submitted: { label: 'Submitted', cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' },
  completed: { label: 'Completed', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  failed:    { label: 'Failed',    cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
  expired:   { label: 'Expired',   cls: 'bg-red-500/20 text-red-300 border-red-500/40' },
};

function getTaskDisplayStatus(task) {
  const today = new Date().toISOString().split('T')[0];
  if (task.status === 'assigned' && task.due_date < today) return 'expired';
  return task.status;
}

export default function MentorDashboard() {
  const { authenticatedFetch, logout, name } = useAuth();

  const [students, setStudents]   = useState([]);
  const [tasks, setTasks]         = useState([]);
  const [reports, setReports]     = useState([]);
  const [documents, setDocuments] = useState([]);
  const [docStudentFilter, setDocStudentFilter] = useState('all');
  const [isFeedbackOpen, setIsFeedbackOpen]   = useState(false);


  const [taskTitle, setTaskTitle]         = useState('');
  const [taskDesc, setTaskDesc]           = useState('');
  const [taskStudentId, setTaskStudentId] = useState('');
  const [taskDueDate, setTaskDueDate]     = useState('');

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
      const [studRes, tasksRes, reportsRes, docsRes] = await Promise.all([
        authenticatedFetch('/api/mentors/students'),
        authenticatedFetch('/api/mentors/tasks'),
        authenticatedFetch('/api/mentors/reports'),
        authenticatedFetch('/api/documents/mentor'),
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
      setLastRefresh(new Date());
    } catch {
      if (!silent) setErrMessage('Error loading dashboard data.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
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
    return <div className="min-h-screen flex items-center justify-center text-slate-400"><TrendingUp className="animate-spin text-blue-500 mr-3" /> Loading mentor dashboard...</div>;
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

  return (
    <div className="min-h-screen pb-16">

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="glass-panel sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold font-heading bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          NEXORA'S MENTOR
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

        {/* ══════════════════════════════════════════════════════════════════
            § 1 — Student Intern Cards (with Batch + Score + Eligibility)
            ══════════════════════════════════════════════════════════════════ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-extrabold text-xl text-white flex items-center gap-2">
              <Users size={20} className="text-blue-400" /> Assigned Student Interns
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 border border-slate-800 text-slate-400">Total: {students.length}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {students.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center md:col-span-3">No students currently mapped by the Administrator.</p>
            ) : students.map((s) => {
              const batch    = s.batch || 'Gold Batch';
              const batchCfg = BATCH_CONFIG[batch] || BATCH_CONFIG['Gold Batch'];
              const score    = s.internship_score ?? 100;
              const eligible = s.eligible_for_completion !== false;
              const barColor = score >= 90 ? 'from-yellow-500 to-amber-400' : score >= 75 ? 'from-emerald-500 to-green-400' : score >= 60 ? 'from-cyan-500 to-blue-400' : 'from-red-600 to-red-400';
              const scoreColor = score >= 90 ? 'text-yellow-400' : score >= 75 ? 'text-emerald-400' : score >= 60 ? 'text-cyan-400' : 'text-red-400';
              return (
                <div key={s.id} className={`glass-panel p-6 rounded-2xl border-l-4 transition duration-300 ${
                  s.predicted_grade === 'Outstanding' ? 'border-l-emerald-500' :
                  s.predicted_grade === 'At Risk'    ? 'border-l-red-500' : 'border-l-cyan-500'}`}>

                  {/* Header row */}
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <h4 className="font-bold text-slate-100 text-base">{s.name}</h4>
                      <p className="text-[10px] text-slate-400">{s.college}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                        s.predicted_grade === 'Outstanding' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        s.predicted_grade === 'At Risk'    ? 'bg-red-500/15 text-red-400 border-red-500/20 animate-pulse' :
                        'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'}`}>
                        {s.predicted_grade}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${batchCfg.bg} ${batchCfg.color} ${batchCfg.border}`}>
                        {batchCfg.icon} {batch}
                      </span>
                    </div>
                  </div>

                  {/* Internship Score bar */}
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Internship Score</span>
                      <span className={`text-sm font-black font-heading ${scoreColor}`}>{score}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-700`} style={{ width: `${score}%` }} />
                    </div>
                    {/* 75% marker line */}
                    <div className="relative h-0 -mt-2">
                      <div className="absolute left-[75%] top-0 w-px h-3 bg-slate-600 opacity-60" title="75% eligibility threshold" />
                    </div>
                  </div>

                  {/* KPI grid */}
                  <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-slate-800/60 text-xs">
                    <div><span className="block text-[8px] font-semibold text-slate-500 uppercase tracking-widest">Attendance</span><span className="text-slate-300 font-bold">{Math.round(s.attendance_rate * 100)}%</span></div>
                    <div><span className="block text-[8px] font-semibold text-slate-500 uppercase tracking-widest">Tasks Met</span><span className="text-slate-300 font-bold">{Math.round(s.task_completion_rate * 100)}%</span></div>
                    <div><span className="block text-[8px] font-semibold text-slate-500 uppercase tracking-widest">Report Quality</span><span className="text-slate-300 font-bold">{s.avg_report_quality}%</span></div>
                    <div><span className="block text-[8px] font-semibold text-slate-500 uppercase tracking-widest">Success Prob</span><span className="text-emerald-400 font-bold">{Math.round(s.completion_probability * 100)}%</span></div>
                  </div>

                  {/* Eligibility banner */}
                  <div className={`mt-3 p-2 rounded text-[9px] font-semibold flex items-center gap-1.5 ${
                    eligible ? 'bg-emerald-500/8 border border-emerald-500/15 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                    {eligible ? <CheckCircle size={11} /> : <ShieldAlert size={11} />}
                    {eligible ? '✅ Eligible for completion certificate' : `❌ Not eligible — score below 75%`}
                  </div>

                  {s.predicted_grade === 'At Risk' && (
                    <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20 text-[9px] text-red-400 flex items-center gap-1.5">
                      <ShieldAlert size={12} /> Proactive review recommended.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            § 2 — Assign Task + Pending Reports (2-column)
            ══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Assign Task Form */}
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="font-heading font-bold text-lg text-white mb-4 flex items-center gap-2">
              <PlusSquare size={18} className="text-blue-400" /> Assign New Technical Task
            </h3>
            <form onSubmit={handleAssignTask} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Select Intern Recipient</label>
                <select required className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-800 focus:border-blue-500 rounded-lg text-sm text-slate-300 outline-none"
                  value={taskStudentId} onChange={(e) => setTaskStudentId(e.target.value)}>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.internship_domain})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Task Title</label>
                <input type="text" required className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-800 focus:border-blue-500 rounded-lg text-sm text-slate-200 outline-none"
                  placeholder="Supervised Classification using Random Forests" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Instructions & Specifications</label>
                <textarea required rows={3} className="w-full p-4 bg-slate-900/80 border border-slate-800 focus:border-blue-500 rounded-lg text-sm text-slate-200 outline-none"
                  placeholder="Outline step-by-step goals, datasets to source, and validation metric targets."
                  value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Deadline Date</label>
                <input type="date" required min={today} className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-800 focus:border-blue-500 rounded-lg text-sm text-slate-200 outline-none"
                  value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} />
              </div>
              <button type="submit" className="w-full py-2.5 rounded bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-xs hover:shadow-lg transition">
                Dispatch Task Assignment
              </button>
            </form>
          </div>

          {/* Pending Reports */}
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
                  <div key={rep.id} className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-200">{studentName}</span>
                      <span className="text-slate-500 text-[10px]">{rep.date}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed font-mono">"{rep.content}"</p>
                    {rep.blockers && <p className="text-[10px] text-red-400 font-mono">Blockers: {rep.blockers}</p>}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-800/40 text-[10px]">
                      <span className="text-cyan-400 font-semibold">NLP Score: {rep.quality_score}% ({rep.key_phrases})</span>
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
            § 3 — ALL Assigned Tasks: Full Visibility Status Board
            ══════════════════════════════════════════════════════════════════ */}
        <section className="glass-panel p-6 rounded-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <h3 className="font-heading font-bold text-lg text-white flex items-center gap-2">
              <Layers size={18} className="text-indigo-400" /> All Assigned Tasks
              <span className="text-[10px] font-normal text-slate-500 ml-1">— live status board</span>
            </h3>
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
                    const studentName = students.find(s => s.id === task.assigned_to_student_id)?.name || '—';
                    const isExpired = ds === 'expired';
                    return (
                      <tr key={task.id} className={`hover:bg-slate-900/40 transition ${isExpired ? 'opacity-70' : ''}`}>
                        <td className="py-3 pr-4">
                          <span className={`font-semibold ${isExpired ? 'line-through text-slate-500' : 'text-slate-200'}`}>{task.title}</span>
                          <p className="text-[10px] text-slate-500 mt-0.5 max-w-xs truncate">{task.description}</p>
                        </td>
                        <td className="py-3 pr-4 text-slate-300 font-medium">{studentName}</td>
                        <td className="py-3 pr-4">
                          <div className={`flex items-center gap-1 text-[11px] ${isExpired ? 'text-red-400' : 'text-slate-400'}`}>
                            <Clock size={11} />{task.due_date}
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

        {/* ══════════════════════════════════════════════════════════════════
            § 4 — Inline Grader for Submitted Tasks
            ══════════════════════════════════════════════════════════════════ */}
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
            § 5 — Student Submitted Documents
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
                        {doc.description && (
                          <p className="text-[10px] text-slate-400 italic mt-1.5">{doc.description}</p>
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


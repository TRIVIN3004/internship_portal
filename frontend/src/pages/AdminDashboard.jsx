import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import adminCartoon from '../assets/admin_cartoon.jpg';
import { 
  Shield, Users, GraduationCap, Calendar, Award, 
  UserPlus, CheckCircle, AlertTriangle, Activity, Loader,
  MessageSquare, Star, Trash2, Edit3, Filter, Check, Megaphone
} from 'lucide-react';

export default function AdminDashboard() {
  const { authenticatedFetch, logout } = useAuth();
  
  // Dashboard states
  const [students, setStudents] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [mentorDailyAttendance, setMentorDailyAttendance] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbackStatusFilter, setFeedbackStatusFilter] = useState('all');
  const [feedbackCategoryFilter, setFeedbackCategoryFilter] = useState('all');
  const [activeNoteEditId, setActiveNoteEditId] = useState(null);
  const [adminNoteText, setAdminNoteText] = useState('');

  // Announcements states
  const [announcements, setAnnouncements] = useState([]);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');

  const [overview, setOverview] = useState({
    total_students: 0,
    total_mentors: 0,
    overall_attendance_rate: 0.9,
    overall_task_completion_rate: 0.8,
    at_risk_count: 0,
    on_track_count: 0,
    outstanding_count: 0
  });

  // Action states
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedMentorId, setSelectedMentorId] = useState('');
  const [mappingMessage, setMappingMessage] = useState('');
  const [mappingError, setMappingError] = useState('');
  
  const [certMessage, setCertMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchFeedbacks = async () => {
    try {
      const res = await authenticatedFetch('/api/feedback/admin');
      if (res.ok) {
        setFeedbacks(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMentorAttendance = async () => {
    try {
      const res = await authenticatedFetch('/api/admin/mentors/attendance');
      if (res.ok) {
        setMentorDailyAttendance(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      // Overview stats
      const overRes = await authenticatedFetch('/api/analytics/overview');
      if (overRes.ok) {
        const overData = await overRes.json();
        setOverview(overData);
      }
      
      // Students
      const studRes = await authenticatedFetch('/api/admin/students');
      if (studRes.ok) {
        const studData = await studRes.json();
        setStudents(studData);
        if (studData.length > 0) {
          setSelectedStudentId(String(studData[0].id));
        }
      }
      
      // Mentors
      const mentRes = await authenticatedFetch('/api/admin/mentors');
      if (mentRes.ok) {
        const mentData = await mentRes.json();
        setMentors(mentData);
        if (mentData.length > 0) {
          setSelectedMentorId(String(mentData[0].id));
        }
      }

      // Feedbacks
      fetchFeedbacks();
      // Mentor daily attendance
      fetchMentorAttendance();
      // Announcements
      fetchAnnouncements();
    } catch (err) {
      setMappingError('Error fetching admin data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      const res = await authenticatedFetch('/api/announcements');
      if (res.ok) {
        setAnnouncements(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };


  useEffect(() => {
    fetchData();
  }, []);

  const handleMapMentor = async (e) => {
    e.preventDefault();
    setMappingMessage('');
    setMappingError('');
    
    if (!selectedStudentId || !selectedMentorId) {
      setMappingError('Ensure both student and mentor are selected.');
      return;
    }

    try {
      const res = await authenticatedFetch(
        `/api/admin/students/${selectedStudentId}/assign-mentor?mentor_id=${selectedMentorId}`, {
          method: 'POST'
        }
      );
      if (res.ok) {
        setMappingMessage('Student and Mentor mapping updated successfully!');
        fetchData();
      } else {
        const err = await res.json();
        setMappingError(err.detail || 'Mapping failed.');
      }
    } catch (err) {
      setMappingError('Network error executing mapping.');
    }
  };

  const handleGenerateCertificate = async (studentId) => {
    setCertMessage('');
    try {
      const res = await authenticatedFetch(`/api/admin/students/${studentId}/generate-certificate`, {
        method: 'POST'
      });
      if (res.ok) {
        const cert = await res.json();
        setCertMessage(`Certificate created! Verification code: ${cert.certificate_code}`);
        fetchData();
      } else {
        const err = await res.json();
        setMappingError(err.detail || 'Failed to generate certificate.');
      }
    } catch (err) {
      setMappingError('Network error rendering PDF.');
    }
  };

  const handleUpdateFeedback = async (id, status, notes) => {
    setMappingMessage('');
    setMappingError('');
    try {
      const res = await authenticatedFetch(`/api/feedback/admin/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, admin_notes: notes })
      });
      if (res.ok) {
        setMappingMessage(`Feedback status updated to '${status}'`);
        setActiveNoteEditId(null);
        setAdminNoteText('');
        fetchFeedbacks();
      } else {
        const err = await res.json();
        setMappingError(err.detail || 'Failed to update feedback.');
      }
    } catch (err) {
      setMappingError('Error updating feedback.');
    }
  };

  const handleDeleteFeedback = async (id) => {
    if (!window.confirm('Are you sure you want to delete this feedback entry?')) return;
    setMappingMessage('');
    setMappingError('');
    try {
      const res = await authenticatedFetch(`/api/feedback/admin/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setMappingMessage('Feedback entry deleted.');
        fetchFeedbacks();
      } else {
        const err = await res.json();
        setMappingError(err.detail || 'Failed to delete feedback.');
      }
    } catch (err) {
      setMappingError('Error deleting feedback.');
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    setMappingMessage('');
    setMappingError('');
    if (!annTitle.trim() || !annContent.trim()) {
      setMappingError('Title and content are required.');
      return;
    }
    try {
      const res = await authenticatedFetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: annTitle, content: annContent })
      });
      if (res.ok) {
        setMappingMessage('Announcement broadcasted successfully!');
        setAnnTitle('');
        setAnnContent('');
        fetchAnnouncements();
      } else {
        const err = await res.json();
        setMappingError(err.detail || 'Failed to broadcast announcement.');
      }
    } catch (err) {
      setMappingError('Error broadcasting announcement.');
    }
  };

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    setMappingMessage('');
    setMappingError('');
    try {
      const res = await authenticatedFetch(`/api/announcements/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setMappingMessage('Announcement deleted.');
        fetchAnnouncements();
      } else {
        const err = await res.json();
        setMappingError(err.detail || 'Failed to delete announcement.');
      }
    } catch (err) {
      setMappingError('Error deleting announcement.');
    }
  };

  const filteredFeedbacks = feedbacks.filter((f) => {
    const matchStatus = feedbackStatusFilter === 'all' || f.status === feedbackStatusFilter;
    const matchCategory = feedbackCategoryFilter === 'all' || f.category === feedbackCategoryFilter;
    return matchStatus && matchCategory;
  });

  const avgFeedbackRating = feedbacks.length > 0
    ? (feedbacks.reduce((acc, f) => acc + f.rating, 0) / feedbacks.length).toFixed(1)
    : '5.0';

  const pendingFeedbackCount = feedbacks.filter(f => f.status === 'pending').length;
  const resolvedFeedbackCount = feedbacks.filter(f => f.status === 'resolved').length;


  if (loading && students.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        <Loader className="animate-spin text-blue-500 mr-3" /> Fetching admin dashboards...
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      {/* Navigation Header */}
      <nav className="glass-panel sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold font-heading bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent flex items-center gap-2">
            <Shield size={20} /> NEXORA'S CONTROL PANEL
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-slate-300">
            System Administrator
          </span>
          <button
            onClick={logout}
            className="px-3.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-400 hover:text-white"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 mt-8 space-y-8">
        
        {/* Messages */}
        {mappingMessage && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex gap-3">
            <CheckCircle size={18} /> <span>{mappingMessage}</span>
          </div>
        )}
        {certMessage && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex gap-3">
            <Award size={18} /> <span>{certMessage}</span>
          </div>
        )}
        {mappingError && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex gap-3">
            <AlertTriangle size={18} /> <span>{mappingError}</span>
          </div>
        )}

        {/* Welcome Admin Banner */}
        <div className="glass-panel p-6 rounded-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between bg-gradient-to-r from-emerald-50/50 to-teal-50/50 border border-slate-200 shadow-md">
          <div className="space-y-2 text-left">
            <h1 className="text-2xl font-bold font-heading bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              System Control Center
            </h1>
            <p className="text-slate-600 text-sm max-w-xl leading-relaxed">
              Manage mentor-student assignments, review platform feedback, issue secure cryptographically validated certificates, and monitor overall engagement metrics.
            </p>
          </div>
          <div className="relative mt-4 md:mt-0 w-32 h-32 md:w-40 md:h-40 flex items-center justify-center animate-float">
            <img src={adminCartoon} alt="Admin Illustration" className="w-full h-full object-contain rounded-xl drop-shadow-lg hover:scale-105 transition-transform duration-300" />
          </div>
        </div>

        {/* Global Analytics Overview Cards */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="glass-panel p-5 rounded-2xl">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Total Students</span>
            <h4 className="text-3xl font-black text-white font-heading mt-2">{overview.total_students}</h4>
            <p className="text-[10px] text-slate-400 mt-1">Enrolled and active in batch</p>
          </div>

          <div className="glass-panel p-5 rounded-2xl">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Total Mentors</span>
            <h4 className="text-3xl font-black text-white font-heading mt-2">{overview.total_mentors}</h4>
            <p className="text-[10px] text-slate-400 mt-1">Guiding active programs</p>
          </div>

          <div className="glass-panel p-5 rounded-2xl">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Attendance Avg</span>
            <h4 className="text-3xl font-black text-white font-heading mt-2">{Math.round(overview.overall_attendance_rate * 100)}%</h4>
            <p className="text-[10px] text-slate-400 mt-1">Global present ticks</p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border-l-2 border-l-red-500">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">AI predicted Risk Status</span>
            <div className="flex gap-4 mt-2">
              <div>
                <span className="block text-[10px] text-slate-500">Outstanding</span>
                <span className="text-emerald-400 font-bold text-lg font-heading">{overview.outstanding_count || 1}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500">On Track</span>
                <span className="text-cyan-400 font-bold text-lg font-heading">{overview.on_track_count || 1}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500">At Risk</span>
                <span className="text-red-400 font-bold text-lg font-heading animate-pulse">{overview.at_risk_count || 1}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Mappings and Operations Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Mentor Assignment Card */}
          <div className="glass-panel p-6 rounded-2xl lg:col-span-1">
            <h3 className="font-heading font-bold text-lg text-white mb-4 flex items-center gap-2">
              <UserPlus size={18} className="text-blue-400" /> Map Student to Mentor
            </h3>
            
            <form onSubmit={handleMapMentor} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Select Student</label>
                <select
                  required
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg text-sm text-slate-300 outline-none"
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.internship_domain})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Select Mentor</label>
                <select
                  required
                  className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg text-sm text-slate-300 outline-none"
                  value={selectedMentorId}
                  onChange={(e) => setSelectedMentorId(e.target.value)}
                >
                  {mentors.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.department})</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-xs hover:shadow-lg transition"
              >
                Assign Academic Mentor
              </button>
            </form>
          </div>

          {/* Interns Monitoring Directory */}
          <div className="glass-panel p-6 rounded-2xl lg:col-span-2">
            <h3 className="font-heading font-bold text-lg text-white mb-4 flex items-center gap-2">
              <Users size={18} className="text-cyan-400" /> Student Interns monitoring Directory
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-widest text-[9px]">
                    <th className="pb-3">Name / Domain</th>
                    <th className="pb-3">Mentor</th>
                    <th className="pb-3">KPI rates</th>
                    <th className="pb-3">AI Grade</th>
                    <th className="pb-3">Int. Score / Batch</th>
                    <th className="pb-3">Certificates</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-6 text-slate-500">No students registered yet.</td>
                    </tr>
                  ) : (
                    students.map((student) => {
                      const score = student.internship_score ?? 100;
                      const batch = student.batch || 'Gold Batch';
                      const eligible = student.eligible_for_completion !== false;
                      
                      let batchColor = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
                      if (batch === 'Platinum Batch') batchColor = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
                      if (batch === 'Gold Batch') batchColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                      if (batch === 'Remedial Batch') batchColor = 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse';

                      return (
                        <tr key={student.id} className="hover:bg-slate-900/40">
                          <td className="py-4">
                            <span className="block font-bold text-slate-200">{student.name}</span>
                            <span className="block text-[10px] text-slate-500">{student.college} | {student.internship_domain}</span>
                          </td>
                          <td className="py-4 text-slate-300">
                            {student.mentor ? student.mentor.name : <span className="text-slate-500 font-italic">Unmapped</span>}
                          </td>
                          <td className="py-4">
                            <span className="block text-[10px] text-slate-400">Att: {Math.round(student.attendance_rate * 100)}%</span>
                            <span className="block text-[10px] text-slate-400">Tasks: {Math.round(student.task_completion_rate * 100)}%</span>
                          </td>
                          <td className="py-4">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                              student.predicted_grade === 'Outstanding' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              student.predicted_grade === 'At Risk' ? 'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse' :
                              'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                            }`}>
                              {student.predicted_grade}
                            </span>
                          </td>
                          <td className="py-4">
                            <span className={`font-bold ${score >= 75 ? 'text-emerald-400' : 'text-red-400'}`}>{score}%</span>
                            <span className={`block mt-1 px-1.5 py-0.5 rounded text-[8px] font-bold border w-max ${batchColor}`}>
                              {batch}
                            </span>
                          </td>
                          <td className="py-4">
                            {student.certificate ? (
                              <a
                                href={`/api/admin/certificates/download/${student.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] font-bold text-yellow-500 hover:underline"
                              >
                                Download PDF
                              </a>
                            ) : eligible ? (
                              <button
                                onClick={() => handleGenerateCertificate(student.id)}
                                className="px-2 py-1 bg-slate-800 border border-slate-700 hover:border-slate-600 rounded text-[9px] font-bold text-slate-300 hover:text-white"
                              >
                                Generate PDF
                              </button>
                            ) : (
                              <span className="px-2 py-1 bg-slate-900 border border-red-500/20 text-red-400 rounded text-[8px] font-bold flex items-center gap-1 w-max" title="Ineligible: Score < 75%">
                                🔒 Locked
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* ══════════════════════════════════════════════════════════════════
            § Mentor Attendance Monitoring & Watch Board (Admin View)
            ══════════════════════════════════════════════════════════════════ */}
        <section className="glass-panel p-6 rounded-2xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
            <div>
              <h3 className="font-heading font-bold text-lg text-white flex items-center gap-2">
                <GraduationCap size={20} className="text-cyan-400" /> Academic Mentors & Attendance Directory
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Watch daily mentor attendance logs, present counts, and overall mentor attendance percentages.
              </p>
            </div>
            <span className="px-3 py-1 rounded text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Total Mentors: {mentors.length}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Mentor Overview & Attendance Rates */}
            <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-4">
              <h4 className="font-bold text-sm text-slate-200">Mentor Profiles & Attendance Rates</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-widest text-[9px]">
                      <th className="pb-2">Mentor Name</th>
                      <th className="pb-2">Department</th>
                      <th className="pb-2">Present / Total</th>
                      <th className="pb-2">Att. Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {mentors.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-4 text-slate-500">No mentors registered.</td>
                      </tr>
                    ) : (
                      mentors.map((m) => {
                        const attRatePct = Math.round((m.attendance_rate || 1) * 100);
                        return (
                          <tr key={m.id} className="hover:bg-slate-800/30">
                            <td className="py-2.5 font-bold text-slate-200">{m.name}</td>
                            <td className="py-2.5 text-slate-400 text-[11px]">{m.department || 'General'}</td>
                            <td className="py-2.5 text-slate-300 font-mono text-[11px]">
                              {m.present_count || 0} / {m.total_attendance || 0} days
                            </td>
                            <td className="py-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                attRatePct >= 90 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                attRatePct >= 75 ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                                'bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse'
                              }`}>
                                {attRatePct}%
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Daily Mentor Attendance Logs */}
            <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-200">Daily Mentor Attendance Logs ({mentorDailyAttendance.length})</h4>
                <span className="text-[10px] text-slate-500">Live attendance feed</span>
              </div>

              {mentorDailyAttendance.length === 0 ? (
                <p className="text-xs text-slate-500 py-8 text-center bg-slate-950/40 rounded-lg">
                  No mentor attendance records logged yet.
                </p>
              ) : (
                <div className="max-h-[240px] overflow-y-auto border border-slate-800/80 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[9px] sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Mentor</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Marked Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {mentorDailyAttendance.map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-800/30">
                          <td className="py-2 px-3 text-slate-300 font-mono text-[10px]">{rec.date}</td>
                          <td className="py-2 px-3 font-semibold text-slate-200">{rec.mentor_name}</td>
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
        </section>

        {/* Announcements Section */}
        <section className="glass-panel p-6 rounded-2xl space-y-6">
          <div className="border-b border-slate-800/80 pb-4">
            <h3 className="font-heading font-bold text-lg text-white flex items-center gap-2">
              <Megaphone size={20} className="text-yellow-400" /> Broadcast Announcements
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Send notifications and announcements to all students, mentors, and administrators.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Create Announcement */}
            <div className="bg-slate-900/60 p-5 rounded-xl border border-slate-800 lg:col-span-1 space-y-4">
              <h4 className="font-bold text-sm text-slate-200">Compose New Broadcast</h4>
              <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Announcement Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Weekly Technical Review Guidelines"
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-yellow-500 rounded-lg text-sm text-slate-200 outline-none"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Notice Message Content</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Provide details about deadlines, events, or changes..."
                    className="w-full p-4 bg-slate-950 border border-slate-800 focus:border-yellow-500 rounded-lg text-sm text-slate-200 outline-none"
                    value={annContent}
                    onChange={(e) => setAnnContent(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 rounded bg-gradient-to-r from-yellow-600 to-amber-500 hover:from-yellow-500 hover:to-amber-400 text-slate-950 font-extrabold text-xs transition shadow-md hover:shadow-yellow-500/10"
                >
                  Broadcast Notice
                </button>
              </form>
            </div>

            {/* Active Announcements List */}
            <div className="lg:col-span-2 space-y-4">
              <h4 className="font-bold text-sm text-slate-200">Active Broadcasts ({announcements.length})</h4>
              
              <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
                {announcements.length === 0 ? (
                  <p className="text-xs text-slate-500 py-12 text-center bg-slate-900/20 rounded-xl border border-slate-800/40">
                    No active announcements.
                  </p>
                ) : (
                  announcements.map((item) => (
                    <div key={item.id} className="p-4 bg-slate-900/60 border border-slate-850 rounded-xl hover:border-slate-800 transition flex justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-yellow-400" />
                          <h5 className="text-sm font-bold text-slate-100">{item.title}</h5>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">{item.content}</p>
                        <div className="text-[9px] text-slate-500 flex gap-2">
                          <span>Posted by: <strong className="text-slate-400">{item.sender_name}</strong></span>
                          <span>•</span>
                          <span>Date: {new Date(item.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleDeleteAnnouncement(item.id)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg h-fit self-center transition"
                        title="Delete Announcement"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        {/* User Feedback & Feature Suggestions Section */}
        <section className="glass-panel p-6 rounded-2xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
            <div>
              <h3 className="font-heading font-bold text-lg text-white flex items-center gap-2">
                <MessageSquare size={20} className="text-cyan-400" /> Portal Feedback & Feature Suggestions
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Review ratings, feature requests, and improvement feedback submitted by students and mentors.
              </p>
            </div>

            {/* Metrics */}
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
                <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest">Total Entries</span>
                <span className="text-sm font-extrabold text-white">{feedbacks.length}</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
                <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest">Avg Rating</span>
                <span className="text-sm font-extrabold text-yellow-400 flex items-center justify-center gap-1">
                  <Star size={12} fill="#f59e0b" /> {avgFeedbackRating}
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
                <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest">Pending Review</span>
                <span className="text-sm font-extrabold text-amber-400">{pendingFeedbackCount}</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-center">
                <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest">Resolved</span>
                <span className="text-sm font-extrabold text-emerald-400">{resolvedFeedbackCount}</span>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              <span className="text-xs text-slate-400 font-bold">Status:</span>
              {['all', 'pending', 'reviewed', 'resolved'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFeedbackStatusFilter(st)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition ${
                    feedbackStatusFilter === st
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'bg-slate-950 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold">Category:</span>
              <select
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded text-xs text-slate-300 outline-none"
                value={feedbackCategoryFilter}
                onChange={(e) => setFeedbackCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="Feature Request">Feature Request</option>
                <option value="Bug Report">Bug Report</option>
                <option value="UI / UX Improvement">UI / UX Improvement</option>
                <option value="Performance">Performance</option>
                <option value="General Feedback">General Feedback</option>
              </select>
            </div>
          </div>

          {/* Feedbacks Grid / List */}
          {filteredFeedbacks.length === 0 ? (
            <p className="text-xs text-slate-500 py-8 text-center bg-slate-900/40 rounded-xl">
              No feedback entries match the selected filters.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredFeedbacks.map((item) => {
                const statusStyles = {
                  pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                  reviewed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                  resolved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                };
                const roleStyles = {
                  student: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                  mentor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
                  admin: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                };

                return (
                  <div key={item.id} className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-3 hover:border-slate-700 transition">
                    <div className="flex flex-wrap justify-between items-start gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-100">{item.subject}</h4>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${roleStyles[item.role] || roleStyles.student}`}>
                            {item.role}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${statusStyles[item.status] || statusStyles.pending}`}>
                            {item.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                          <span>Submitter: <strong className="text-slate-200">{item.user_name}</strong> ({item.user_email})</span>
                          <span>•</span>
                          <span>Category: <strong className="text-slate-300">{item.category}</strong></span>
                          <span>•</span>
                          <span>Date: {new Date(item.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Rating */}
                      <div className="flex items-center gap-1 text-yellow-400 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={12} fill={s <= item.rating ? '#f59e0b' : 'transparent'} className={s <= item.rating ? 'text-yellow-500' : 'text-slate-700'} />
                        ))}
                      </div>
                    </div>

                    {/* Message content */}
                    <div className="p-3 bg-slate-950/60 rounded border border-slate-800/80 text-xs text-slate-300 leading-relaxed">
                      {item.message}
                    </div>

                    {/* Admin Response Note */}
                    {item.admin_notes && activeNoteEditId !== item.id && (
                      <div className="p-2.5 bg-cyan-950/20 border-l-2 border-l-cyan-500 rounded text-xs text-slate-300 flex justify-between items-center">
                        <div>
                          <strong className="block text-[9px] text-cyan-400 uppercase tracking-wider mb-0.5">Admin Response Note:</strong>
                          {item.admin_notes}
                        </div>
                        <button
                          onClick={() => { setActiveNoteEditId(item.id); setAdminNoteText(item.admin_notes || ''); }}
                          className="p-1 text-slate-400 hover:text-white"
                          title="Edit response note"
                        >
                          <Edit3 size={13} />
                        </button>
                      </div>
                    )}

                    {/* Inline note edit form */}
                    {activeNoteEditId === item.id && (
                      <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-2">
                        <label className="block text-[9px] font-bold text-cyan-400 uppercase tracking-wider">
                          Add / Edit Admin Response Note
                        </label>
                        <input
                          type="text"
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200 outline-none"
                          placeholder="e.g. Approved and planned for next sprint update..."
                          value={adminNoteText}
                          onChange={(e) => setAdminNoteText(e.target.value)}
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setActiveNoteEditId(null)}
                            className="px-2.5 py-1 text-[10px] text-slate-500 font-bold hover:text-slate-400"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleUpdateFeedback(item.id, item.status, adminNoteText)}
                            className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold rounded"
                          >
                            Save Note
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Actions Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
                      <div className="flex items-center gap-2">
                        {item.status !== 'reviewed' && (
                          <button
                            onClick={() => handleUpdateFeedback(item.id, 'reviewed', item.admin_notes)}
                            className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded text-[10px] font-bold transition"
                          >
                            Mark Reviewed
                          </button>
                        )}
                        {item.status !== 'resolved' && (
                          <button
                            onClick={() => handleUpdateFeedback(item.id, 'resolved', item.admin_notes)}
                            className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-bold transition"
                          >
                            Mark Resolved
                          </button>
                        )}
                        {!item.admin_notes && activeNoteEditId !== item.id && (
                          <button
                            onClick={() => { setActiveNoteEditId(item.id); setAdminNoteText(''); }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold transition flex items-center gap-1"
                          >
                            <Edit3 size={11} /> Add Admin Note
                          </button>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteFeedback(item.id)}
                        className="px-2.5 py-1 bg-slate-900 border border-slate-800 hover:border-red-500/30 text-slate-500 hover:text-red-400 rounded text-[10px] font-bold transition flex items-center gap-1"
                        title="Delete feedback"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

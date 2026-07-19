import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Shield, Users, GraduationCap, Calendar, Award, 
  UserPlus, CheckCircle, AlertTriangle, Activity, Loader
} from 'lucide-react';

export default function AdminDashboard() {
  const { authenticatedFetch, logout } = useAuth();
  
  // Dashboard states
  const [students, setStudents] = useState([]);
  const [mentors, setMentors] = useState([]);
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
    } catch (err) {
      setMappingError('Error fetching admin data.');
    } finally {
      setLoading(false);
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

      </div>
    </div>
  );
}

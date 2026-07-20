import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, User, Mail, Key, Book, ShieldAlert, Award, Hash } from 'lucide-react';
import logo from '../assets/logo.jpg';

export default function RegisterPage() {
  const [role, setRole] = useState('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [college, setCollege] = useState('');
  const [department, setDepartment] = useState('');
  const [skills, setSkills] = useState('');
  const [domain, setDomain] = useState('Artificial Intelligence');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const payload = {
      email,
      password,
      role,
      name,
      college: role === 'student' ? college : null,
      department: department || null,
      skills: role === 'student' ? skills : null,
      internship_domain: domain || null
    };

    try {
      await register(payload);
      setSuccess('Account created successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Registration failed. Try checking your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative px-6 py-12">
      <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="glass-panel max-w-lg w-full p-8 rounded-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3 mb-4">
            <img src={logo} alt="Nexora Logo" className="w-12 h-12 rounded-xl object-cover border border-slate-800" />
            <span className="text-3xl font-black font-heading tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
              NEXORA
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20">
              PORTAL
            </span>
          </div>
          <h2 className="text-2xl font-bold font-heading text-white">Create Account</h2>
          <p className="text-slate-400 text-sm mt-1">Enroll in the Nexora's Internship Portal</p>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex gap-3 mb-6">
            <ShieldAlert size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex gap-3 mb-6">
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Role selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Registration Role
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                className={`py-3 rounded-lg font-bold border text-xs md:text-sm transition ${
                  role === 'student'
                    ? 'bg-blue-600/10 border-blue-500 text-blue-400'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
                onClick={() => setRole('student')}
              >
                Student Intern
              </button>
              <button
                type="button"
                className={`py-3 rounded-lg font-bold border text-xs md:text-sm transition ${
                  role === 'mentor'
                    ? 'bg-blue-600/10 border-blue-500 text-blue-400'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
                onClick={() => setRole('mentor')}
              >
                Academic Mentor
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="text"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 focus:border-blue-500 rounded-lg text-sm text-slate-200 outline-none transition"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="email"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 focus:border-blue-500 rounded-lg text-sm text-slate-200 outline-none transition"
                  placeholder="johndoe@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Password
              </label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="password"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 focus:border-blue-500 rounded-lg text-sm text-slate-200 outline-none transition"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Department
              </label>
              <div className="relative">
                <Book className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  type="text"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 focus:border-blue-500 rounded-lg text-sm text-slate-200 outline-none transition"
                  placeholder="AI & Data Science"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>
            </div>
          </div>

          {role === 'student' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    College / Institute
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                      type="text"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 focus:border-blue-500 rounded-lg text-sm text-slate-200 outline-none transition"
                      placeholder="University College"
                      value={college}
                      onChange={(e) => setCollege(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Skills (Comma separated)
                  </label>
                  <div className="relative">
                    <Award className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input
                      type="text"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-900/80 border border-slate-800 focus:border-blue-500 rounded-lg text-sm text-slate-200 outline-none transition"
                      placeholder="Python, Pandas, ML"
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Internship Domain
                </label>
                <select
                  className="w-full px-4 py-2.5 bg-slate-900/80 border border-slate-800 focus:border-blue-500 rounded-lg text-sm text-slate-200 outline-none transition"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                >
                  <option value="Artificial Intelligence">Artificial Intelligence</option>
                  <option value="Data Science">Data Science</option>
                  <option value="Full-Stack Web Development">Full-Stack Web Development</option>
                  <option value="DevOps & Cloud Computing">DevOps & Cloud Computing</option>
                </select>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg transition"
          >
            {loading ? 'Registering user...' : 'Create Account'}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-slate-400 text-xs">
            Already have an account?{' '}
            <Link to="/login" className="text-cyan-400 font-semibold hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

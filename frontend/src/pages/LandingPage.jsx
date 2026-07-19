import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Sparkles, TrendingUp, BookOpen, Layers, Users } from 'lucide-react';
import logo from '../assets/logo.jpg';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Nexora Logo" className="w-8 h-8 rounded-lg object-cover border border-slate-800" />
          <span className="text-2xl font-black font-heading tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
            NEXORA
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-widest bg-blue-500/10 text-blue-400 border border-blue-500/20">
            PORTAL
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="px-4 py-2 text-sm font-semibold text-slate-300 hover:text-white transition">
            Sign In
          </Link>
          <Link to="/register" className="px-5 py-2.5 text-sm font-semibold rounded bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-[0_4px_20px_rgba(59,130,246,0.3)] transition-all">
            Join Intern Program
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 max-w-7xl mx-auto w-full px-6 py-12 flex-grow flex flex-col items-center justify-center text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-cyan-400 mb-8 animate-pulse">
          <Sparkles size={14} /> AI-Powered Performance & Evaluation Ecosystem
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold font-heading tracking-tight max-w-4xl leading-tight">
          Next-Generation{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400">
            Internship Management
          </span>
        </h1>
        
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mt-6 leading-relaxed">
          Unlock maximum student potential at <span className="text-white font-semibold">Nexora</span>. An intelligent platform driving performance scores, NLP-based reporting, and risk prediction analytics.
        </p>

        <div className="flex flex-wrap justify-center gap-5 mt-10">
          <Link to="/login" className="px-8 py-3.5 rounded font-bold bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-lg shadow-blue-500/20 transition-all transform hover:-translate-y-0.5">
            Access Dashboard
          </Link>
          <Link to="/register" className="px-8 py-3.5 rounded font-bold bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 transition-all transform hover:-translate-y-0.5">
            Student Registration
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl mt-24">
          <div className="glass-panel p-6 rounded-xl text-left hover:border-blue-500/20 transition">
            <div className="p-3 bg-blue-600/10 text-blue-400 rounded-lg w-fit mb-4">
              <TrendingUp size={22} />
            </div>
            <h3 className="text-lg font-bold text-white font-heading">ML Performance Prediction</h3>
            <p className="text-slate-400 text-sm mt-2">
              Predict completion probabilities and classify students' grades using Random Forest modeling based on real-time task records.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-xl text-left hover:border-cyan-500/20 transition">
            <div className="p-3 bg-cyan-600/10 text-cyan-400 rounded-lg w-fit mb-4">
              <Layers size={22} />
            </div>
            <h3 className="text-lg font-bold text-white font-heading">NLP Report Scoring</h3>
            <p className="text-slate-400 text-sm mt-2">
              Automatically calculate structural clarity and sentiment metrics on daily report logs to map blockers and progress tags.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-xl text-left hover:border-emerald-500/20 transition">
            <div className="p-3 bg-emerald-600/10 text-emerald-400 rounded-lg w-fit mb-4">
              <Shield size={22} />
            </div>
            <h3 className="text-lg font-bold text-white font-heading">Secured Certifications</h3>
            <p className="text-slate-400 text-sm mt-2">
              Issue tamper-proof certificates with anti-fraud hash verification codes, downloadable directly in high-res landscape PDF.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-900/60 bg-slate-950/40 py-6 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} Nexora Systems. Designed for Final Year Academic Thesis & Demo Simulation.
      </footer>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Briefcase, Plus, LogOut, Trash2, Star, Users, TrendingUp, CheckCircle, AlertCircle, Eye, Zap } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import api from '../lib/axios';

const JOB_TYPES = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
  { value: 'freelance', label: 'Freelance' },
];

const initialForm = {
  title: '',
  company: '',
  description: '',
  requiredSkills: '',
  minimumScore: 0,
  location: '',
  salary: '',
  jobType: 'full-time',
};

export default function RecruiterDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [filterSkills, setFilterSkills] = useState([]);
  const [matchMode, setMatchMode] = useState('all'); // 'all' or 'any'
  const [jobRequiredSkills, setJobRequiredSkills] = useState([]);
  const [testDifficultyFilter, setTestDifficultyFilter] = useState('all'); // all, beginner, intermediate, advanced, notested
  const [answerLevelFilter, setAnswerLevelFilter] = useState('all'); // all, beginner, intermediate, advanced, none
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [shortlistingId, setShortlistingId] = useState(null);

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    if (selectedJobId) loadCandidates(selectedJobId);
    else setCandidates([]);
  }, [selectedJobId]);

  async function loadJobs() {
    setLoadingJobs(true);
    try {
      const { data } = await api.get('/jobs');
      setJobs(data);
      if (data.length > 0 && !selectedJobId) setSelectedJobId(data[0]._id);
    } catch (err) {
      setJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  }

  async function loadCandidates(jobId) {
    setLoadingCandidates(true);
    try {
      const { data } = await api.get(`/jobs/${jobId}/candidates`);
      setCandidates(data.candidates || []);
      setJobRequiredSkills(data.job?.requiredSkills || []);
    } catch (err) {
      setCandidates([]);
    } finally {
      setLoadingCandidates(false);
    }
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFormError('');
  }

  function normalize(s) {
    return String(s ?? '').trim().toLowerCase();
  }

  function addFilterSkill(raw) {
    const s = normalize(raw);
    if (!s) return;
    setFilterSkills((prev) => (prev.includes(s) ? prev : [...prev, s]));
    setFilterText('');
  }

  function removeFilterSkill(s) {
    setFilterSkills((prev) => prev.filter((x) => x !== s));
  }

  function clearFilters() {
    setFilterSkills([]);
    setMatchMode('all');
    setTestDifficultyFilter('all');
    setAnswerLevelFilter('all');
    setFilterText('');
  }

  async function handleCreateJob(e) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const requiredSkills = form.requiredSkills
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean);
      await api.post('/jobs', {
        title: form.title.trim(),
        company: form.company?.trim(),
        description: form.description.trim(),
        requiredSkills,
        minimumScore: Number(form.minimumScore) || 0,
        location: form.location.trim(),
        salary: form.salary.trim(),
        jobType: form.jobType,
      });
      setForm(initialForm);
      setShowForm(false);
      loadJobs();
    } catch (err) {
      setFormError(err.response?.data?.error ?? 'Failed to create job.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleShortlist(jobId, candidateId) {
    setShortlistingId(candidateId);
    try {
      await api.post(`/jobs/${jobId}/shortlist`, { candidateId });
      loadCandidates(jobId);
    } finally {
      setShortlistingId(null);
    }
  }

  return (
    <DashboardLayout role="recruiter">
      <main className="relative z-10 max-w-7xl mx-auto p-6 space-y-8">
        {/* Welcome Section */}
        <motion.div id="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 border border-white/20 backdrop-blur-lg rounded-3xl p-8 text-white overflow-hidden relative">
            <div className="absolute -right-20 -top-20 w-40 h-40 bg-purple-500/30 rounded-full blur-3xl" />
            <div className="relative">
              <h2 className="text-2xl font-bold mb-2">Welcome back, {user?.name ?? 'Recruiter'}! 👋</h2>
              <p className="text-blue-100">Manage your job postings and discover exceptional candidates</p>
            </div>
          </div>
        </motion.div>

        {/* Create Job Button & Form */}
        <motion.div id="jobs" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <motion.button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(147, 51, 234, 0.6)' }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-emerald-500/50 transition"
          >
            <Plus className="w-5 h-5" />
            {showForm ? 'Cancel' : 'Post a New Job'}
          </motion.button>

          {showForm && (
            <motion.form
              onSubmit={handleCreateJob}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mt-6 bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-lg rounded-3xl border border-purple-500/30 p-8 space-y-6 shadow-2xl"
            >
              {formError && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">{formError}</p>
                </motion.div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div whileHover={{ scale: 1.02 }} className="md:col-span-2">
                  <label className="block text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 mb-2">Job Title *</label>
                  <input
                    name="title"
                    value={form.title}
                    onChange={handleFormChange}
                    required
                    className="w-full px-4 py-3 bg-slate-700/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
                    placeholder="e.g., Senior React Developer"
                  />
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }}>
                  <label className="block text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 mb-2">Company</label>
                  <input
                    name="company"
                    value={form.company}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
                    placeholder="Your company name"
                  />
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }}>
                  <label className="block text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-400 mb-2">Location</label>
                  <input
                    name="location"
                    value={form.location}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
                    placeholder="e.g., Remote, New York"
                  />
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }}>
                  <label className="block text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400 mb-2">Salary Range</label>
                  <input
                    name="salary"
                    value={form.salary}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
                    placeholder="e.g., $80k - $120k"
                  />
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }}>
                  <label className="block text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400 mb-2">Job Type *</label>
                  <select
                    name="jobType"
                    value={form.jobType}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-purple-500/30 rounded-xl text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition appearance-none cursor-pointer"
                  >
                    {JOB_TYPES.map((t) => (
                      <option key={t.value} value={t.value} className="bg-slate-700">
                        {t.label}
                      </option>
                    ))}
                  </select>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }}>
                  <label className="block text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-400 mb-2">Minimum Score (0–100)</label>
                  <input
                    name="minimumScore"
                    type="number"
                    min={0}
                    max={100}
                    value={form.minimumScore}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
                  />
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }} className="md:col-span-2">
                  <label className="block text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 mb-2">Description *</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleFormChange}
                    required
                    rows={4}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition resize-none"
                    placeholder="Describe the role, responsibilities, and requirements..."
                  />
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }} className="md:col-span-2">
                  <label className="block text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-pink-400 mb-2">Required Skills (comma-separated)</label>
                  <input
                    name="requiredSkills"
                    value={form.requiredSkills}
                    onChange={handleFormChange}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
                    placeholder="e.g., JavaScript, React, Node.js, MongoDB"
                  />
                </motion.div>
              </div>

              <motion.button
                type="submit"
                disabled={submitting}
                whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(34, 197, 94, 0.6)' }}
                whileTap={{ scale: 0.95 }}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-green-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? '⏳ Creating Job...' : '✨ Create Job Posting'}
              </motion.button>
            </motion.form>
          )}
        </motion.div>

        {/* Jobs & Candidates Section */}
        <motion.div id="candidates" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Job Selector */}
          <motion.div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Briefcase className="w-5 h-5 text-blue-400" />
                <h2 className="text-xl font-bold text-white">Your Jobs</h2>
                <span className="ml-auto px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full">{jobs.length}</span>
              </div>

              {loadingJobs ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }} className="flex justify-center py-8">
                  <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full" />
                </motion.div>
              ) : jobs.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 bg-gradient-to-br from-slate-700/50 to-purple-700/30 border border-purple-500/20 rounded-xl text-center">
                  <Briefcase className="w-12 h-12 text-gray-500 mx-auto mb-3 opacity-50" />
                  <p className="text-gray-300 text-sm">No jobs yet. Create one above! 🚀</p>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {jobs.map((j, idx) => (
                    <motion.button
                      key={j._id}
                      onClick={() => setSelectedJobId(j._id)}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      whileHover={{ scale: 1.05, x: 10 }}
                      whileTap={{ scale: 0.95 }}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition group cursor-pointer ${
                        selectedJobId === j._id
                          ? 'bg-gradient-to-br from-purple-600/50 to-pink-600/50 border-purple-400 shadow-lg shadow-purple-500/50'
                          : 'bg-gradient-to-br from-slate-700/50 to-slate-800/50 border-slate-600/50 hover:border-purple-500/50 hover:bg-slate-700/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white group-hover:text-purple-300 transition truncate">{j.title}</div>
                          <div className="text-sm text-gray-300 truncate">{j.company || 'Your Company'}</div>
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded-lg">{j.jobType}</span>
                            <span className="text-gray-500">📍 {j.location || 'Remote'}</span>
                          </div>
                        </div>
                        <motion.div className="flex flex-col items-end gap-1">
                          <div className="px-3 py-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold rounded-lg">{j.applicantCount || 0}</div>
                          <span className="text-xs text-gray-400">applications</span>
                        </motion.div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Candidates Section */}
          <motion.div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-lg rounded-3xl border border-purple-500/30 p-8 shadow-2xl">
              <div className="flex items-center gap-2 mb-6">
                <Users className="w-6 h-6 text-pink-400" />
                <h2 className="text-2xl font-bold text-white">Top Candidates</h2>
              </div>

              {/* Skill Filters */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-[300px]">
                    <input
                      value={filterText}
                      onChange={(e) => setFilterText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addFilterSkill(filterText);
                        }
                      }}
                      placeholder="Add skill filter..."
                      className="flex-1 px-4 py-2 bg-slate-700/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition text-sm"
                    />
                    <motion.button
                      type="button"
                      onClick={() => addFilterSkill(filterText)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition"
                    >
                      Add
                    </motion.button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-300 font-medium">Filter Mode:</label>
                    <select
                      value={matchMode}
                      onChange={(e) => setMatchMode(e.target.value)}
                      className="px-3 py-1.5 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                    >
                      <option value="all" className="bg-slate-700">All Skills</option>
                      <option value="any" className="bg-slate-700">Any Skill</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-300 font-medium">Test Difficulty:</label>
                    <select
                      value={testDifficultyFilter}
                      onChange={(e) => setTestDifficultyFilter(e.target.value)}
                      className="px-3 py-1.5 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                    >
                      <option value="all">All</option>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                      <option value="notested">No Test</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-300 font-medium">Answered Level:</label>
                    <select
                      value={answerLevelFilter}
                      onChange={(e) => setAnswerLevelFilter(e.target.value)}
                      className="px-3 py-1.5 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                    >
                      <option value="all">All</option>
                      <option value="beginner">Has Beginner Answers</option>
                      <option value="intermediate">Has Intermediate Answers</option>
                      <option value="advanced">Has Advanced Answers</option>
                      <option value="none">No Answers</option>
                    </select>
                  </div>
                  <motion.button
                    type="button"
                    onClick={() => setFilterSkills(jobRequiredSkills.map((s) => normalize(s)))}
                    disabled={!jobRequiredSkills || jobRequiredSkills.length === 0}
                    whileHover={!jobRequiredSkills || jobRequiredSkills.length === 0 ? {} : { scale: 1.05 }}
                    whileTap={!jobRequiredSkills || jobRequiredSkills.length === 0 ? {} : { scale: 0.95 }}
                    className="px-4 py-1.5 bg-gradient-to-r from-yellow-600 to-orange-600 text-white rounded-lg text-sm font-semibold hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Use Job Skills
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={clearFilters}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-1.5 bg-red-600/20 border border-red-500/50 text-red-300 rounded-lg text-sm font-semibold hover:bg-red-600/30 transition"
                  >
                    Clear
                  </motion.button>
                </div>

                {/* Active Filter Chips */}
                {filterSkills.length > 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-2">
                    {filterSkills.map((s, idx) => (
                      <motion.span
                        key={s}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ delay: idx * 0.05 }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm rounded-full font-medium"
                      >
                        <span className="capitalize">{s}</span>
                        <motion.button
                          onClick={() => removeFilterSkill(s)}
                          whileHover={{ scale: 1.2 }}
                          whileTap={{ scale: 0.8 }}
                          className="text-xs font-bold hover:text-red-200"
                        >
                          ✕
                        </motion.button>
                      </motion.span>
                    ))}
                  </motion.div>
                )}
              </motion.div>

              {/* Candidates Table */}
              {loadingCandidates ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }} className="flex justify-center py-12">
                  <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full" />
                </motion.div>
              ) : candidates.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-12">
                  <Eye className="w-16 h-16 text-gray-500 mb-4 opacity-30" />
                  <p className="text-gray-300 text-center">{selectedJobId ? 'No candidates found for this job.' : 'Select a job to see candidates.'}</p>
                </motion.div>
              ) : (
                (() => {
                  const bySkills = filterSkills.length === 0
                    ? candidates
                    : candidates.filter(({ candidate }) => {
                        const candidateSkillNames = Array.isArray(candidate.skills)
                          ? candidate.skills.map((sk) => (typeof sk === 'string' ? sk : sk?.name)).filter(Boolean).map(normalize)
                          : [];
                        if (matchMode === 'all') {
                          return filterSkills.every((f) => candidateSkillNames.includes(f));
                        }
                        return filterSkills.some((f) => candidateSkillNames.includes(f));
                      });

                  const filtered = bySkills.filter((item) => {
                    const latest = item.latestTest;

                    // Test difficulty filter
                    if (testDifficultyFilter && testDifficultyFilter !== 'all') {
                      if (testDifficultyFilter === 'notested') {
                        if (latest) return false;
                      } else {
                        if (!latest || (latest.difficulty || '').toLowerCase() !== testDifficultyFilter) return false;
                      }
                    }

                    // Answer level filter (whether candidate has answered questions at that level)
                    if (answerLevelFilter && answerLevelFilter !== 'all') {
                      if (answerLevelFilter === 'none') {
                        if (latest && (latest.totalQuestions || 0) > 0) return false;
                      } else {
                        // must have >0 answers at that difficulty
                        if (!latest || !(latest.difficultyCounts && latest.difficultyCounts[answerLevelFilter] > 0)) return false;
                      }
                    }

                    return true;
                  });

                  return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-300 border-b border-purple-500/30 pb-3">
                            <th className="pb-3 px-4 font-semibold">Candidate</th>
                            <th className="pb-3 px-4 font-semibold text-center">Test</th>
                            <th className="pb-3 px-4 font-semibold text-center">Match Score</th>
                            <th className="pb-3 px-4 font-semibold text-center">Status</th>
                            <th className="pb-3 px-4 font-semibold text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-500/20">
                          {filtered.map(({ candidate, matchPercentage, shortlisted, latestTest }, idx) => (
                            <motion.tr
                              key={candidate._id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              whileHover={{ backgroundColor: 'rgba(168, 85, 247, 0.1)' }}
                              className="hover:bg-purple-500/10 transition"
                            >
                              <td className="py-4 px-4">
                                <div>
                                  <div className="font-semibold text-white">{candidate.name ?? '—'}</div>
                                  <div className="text-xs text-gray-400">{candidate.email}</div>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-center">
                                {latestTest ? (
                                  <div className="space-y-1">
                                    <div className="font-bold text-white">{latestTest.score}%</div>
                                    <div className="text-xs text-gray-300">{latestTest.correctAnswers}/{latestTest.totalQuestions} correct</div>
                                    <div className="flex items-center justify-center gap-2 mt-2">
                                      <span className="text-xs px-2 py-0.5 bg-green-600/20 text-green-300 rounded">B:{latestTest.difficultyCounts.beginner}</span>
                                      <span className="text-xs px-2 py-0.5 bg-yellow-600/20 text-yellow-300 rounded">I:{latestTest.difficultyCounts.intermediate}</span>
                                      <span className="text-xs px-2 py-0.5 bg-red-600/20 text-red-300 rounded">A:{latestTest.difficultyCounts.advanced}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-sm text-gray-400">—</div>
                                )}
                              </td>
                              <td className="py-4 px-4 text-center">
                                <motion.div className="flex items-center justify-center">
                                  <div className={`relative w-16 h-16 flex items-center justify-center rounded-full font-bold text-lg transition ${
                                    matchPercentage >= 70
                                      ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/50'
                                      : matchPercentage >= 40
                                      ? 'bg-gradient-to-br from-yellow-500 to-orange-500 text-white shadow-lg shadow-yellow-500/50'
                                      : 'bg-gradient-to-br from-gray-600 to-gray-700 text-gray-300'
                                  }`}>
                                    {matchPercentage}%
                                    <motion.div className="absolute inset-0 rounded-full border-2 border-transparent" animate={{ borderColor: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0)'] }} transition={{ duration: 2, repeat: Infinity }} />
                                  </div>
                                </motion.div>
                              </td>
                              <td className="py-4 px-4 text-center">
                                {shortlisted ? (
                                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs font-bold rounded-full shadow-lg">
                                    <CheckCircle className="w-4 h-4" />
                                    Shortlisted
                                  </motion.span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-600/50 text-gray-300 text-xs font-semibold rounded-full border border-gray-500/30">Pending</span>
                                )}
                              </td>
                              <td className="py-4 px-4 text-right">
                                <motion.button
                                  type="button"
                                  onClick={() => handleShortlist(selectedJobId, candidate._id)}
                                  disabled={shortlisted || shortlistingId === candidate._id}
                                  whileHover={shortlisted ? {} : { scale: 1.1, boxShadow: '0 0 20px rgba(59, 130, 246, 0.6)' }}
                                  whileTap={shortlisted ? {} : { scale: 0.95 }}
                                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                                    shortlisted
                                      ? 'bg-gray-600/50 text-gray-400 cursor-default'
                                      : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 shadow-lg'
                                  }`}
                                >
                                  {shortlistingId === candidate._id ? '⏳' : shortlisted ? '✓' : '⭐ Shortlist'}
                                </motion.button>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </motion.div>
                  );
                })()
              )}
            </div>
          </motion.div>
        </motion.div>
      </main>
    </DashboardLayout>
  );
}

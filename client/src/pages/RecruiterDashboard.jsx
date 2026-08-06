import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Briefcase, Plus, LogOut, Trash2, Star, Users, TrendingUp, CheckCircle, AlertCircle, Eye, Zap, Pencil } from 'lucide-react';
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
  status: 'active',
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
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, shortlisted, accepted
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [shortlistingId, setShortlistingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [editingJob, setEditingJob] = useState(null);

  const selectedJob = jobs.find((job) => job._id === selectedJobId);

  useEffect(() => {
    loadJobs();
  }, []);

  useEffect(() => {
    if (selectedJobId) loadCandidates(selectedJobId);
    else setCandidates([]);
  }, [selectedJobId]);

  async function loadJobs({ forceSelectFirst = false } = {}) {
    setLoadingJobs(true);
    try {
      const { data } = await api.get('/jobs');
      setJobs(data);
      if (data.length === 0) {
        setSelectedJobId(null);
        return;
      }

      const hasSelected = data.some((job) => job._id === selectedJobId);
      if (forceSelectFirst || !hasSelected) {
        setSelectedJobId(data[0]._id);
      }
    } catch (err) {
      setJobs([]);
      setSelectedJobId(null);
    } finally {
      setLoadingJobs(false);
    }
  }

  async function loadCandidates(jobId) {
    setCandidates([]);
    setJobRequiredSkills([]);
    setLoadingCandidates(true);
    try {
      const { data } = await api.get(`/jobs/${jobId}/candidates`);
      setCandidates(Array.isArray(data.candidates) ? data.candidates : []);
      setJobRequiredSkills(data.job?.requiredSkills || []);
    } catch (err) {
      setCandidates([]);
      setJobRequiredSkills([]);
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
      const payload = {
        title: form.title.trim(),
        company: form.company?.trim(),
        description: form.description.trim(),
        requiredSkills,
        minimumScore: Number(form.minimumScore) || 0,
        location: form.location.trim(),
        salary: form.salary.trim(),
        jobType: form.jobType,
        status: form.status,
      };

      if (editingJob) {
        await api.put(`/jobs/${editingJob._id}`, payload);
      } else {
        await api.post('/jobs', payload);
      }

      setForm(initialForm);
      setEditingJob(null);
      setShowForm(false);
      loadJobs();
    } catch (err) {
      setFormError(err.response?.data?.error ?? 'Failed to save job.');
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

  async function handleReject(jobId, candidateId) {
    setRejectingId(candidateId);
    try {
      await api.post(`/jobs/${jobId}/reject`, { candidateId });
      loadCandidates(jobId);
    } finally {
      setRejectingId(null);
    }
  }

  async function handleDeleteJob(id) {
    if (!window.confirm('Delete this job? This cannot be undone.')) return;

    const wasSelected = selectedJobId === id;
    setJobs((prev) => prev.filter((job) => job._id !== id));
    if (wasSelected) {
      setSelectedJobId(null);
      setCandidates([]);
    }

    try {
      await api.delete(`/jobs/${id}`);
      if (!wasSelected) {
        await loadJobs();
      }
    } catch (err) {
      console.error('Delete job failed:', id, err.response?.status, err.response?.data);
      alert(err.response?.data?.error || 'Failed to delete job.');
      await loadJobs();
    }
  }

  async function handleEditJob(job) {
    setEditingJob(job);
    setForm({
      title: job.title || '',
      company: job.company || '',
      description: job.description || '',
      requiredSkills: Array.isArray(job.requiredSkills) ? job.requiredSkills.join(', ') : '',
      minimumScore: job.minimumScore || 0,
      location: job.location || '',
      salary: job.salary || '',
      jobType: job.jobType || 'full-time',
      status: job.status || 'active',
    });
    setFormError('');
    setShowForm(true);
  }

  function handleToggleJobForm() {
    const shouldOpen = !showForm;
    setShowForm(shouldOpen);
    if (shouldOpen) {
      setEditingJob(null);
      setForm(initialForm);
      setFormError('');
    }
  }

  return (
    <DashboardLayout role="recruiter">
      <main className="relative z-10 max-w-7xl mx-auto p-4 space-y-6">
        {/* Welcome Section */}
        <motion.div id="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="bg-slate-900/90 border border-slate-700 backdrop-blur-lg rounded-2xl p-5 text-white overflow-hidden relative">
            <div className="absolute -right-20 -top-20 w-40 h-40 bg-slate-700/30 rounded-full blur-3xl" />
            <div className="relative">
              <h2 className="text-xl font-bold mb-1">Welcome back, {user?.name ?? 'Recruiter'}! 👋</h2>
              <p className="text-slate-300 text-sm">Manage your job postings and discover exceptional candidates</p>
            </div>
          </div>
        </motion.div>

        {/* Create Job Button & Form */}
        <motion.div id="jobs" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <motion.button
            type="button"
            onClick={handleToggleJobForm}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl border border-slate-600 transition"
          >
            <Plus className="w-4 h-4" />
            {showForm ? 'Cancel' : 'Post a New Job'}
          </motion.button>

          {showForm && (
            <motion.form
              onSubmit={handleCreateJob}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mt-4 bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-lg rounded-2xl border border-purple-500/30 p-6 space-y-5 shadow-2xl"
            >
              {formError && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm">{formError}</p>
                </motion.div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <motion.div whileHover={{ scale: 1.02 }} className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-200 mb-2">Job Title *</label>
                  <input
                    name="title"
                    value={form.title}
                    onChange={handleFormChange}
                    required
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
                    placeholder="e.g., Senior React Developer"
                  />
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }}>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">Company</label>
                  <input
                    name="company"
                    value={form.company}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
                    placeholder="Your company name"
                  />
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }}>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">Location</label>
                  <input
                    name="location"
                    value={form.location}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
                    placeholder="e.g., Remote, New York"
                  />
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }}>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">Salary Range</label>
                  <input
                    name="salary"
                    value={form.salary}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
                    placeholder="e.g., $80k - $120k"
                  />
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }}>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">Job Type *</label>
                  <select
                    name="jobType"
                    value={form.jobType}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-purple-500/30 rounded-xl text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition appearance-none cursor-pointer"
                  >
                    {JOB_TYPES.map((t) => (
                      <option key={t.value} value={t.value} className="bg-slate-700">
                        {t.label}
                      </option>
                    ))}
                  </select>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }}>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">Minimum Score (0–100)</label>
                  <input
                    name="minimumScore"
                    type="number"
                    min={0}
                    max={100}
                    value={form.minimumScore}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 bg-slate-700/70 border border-slate-600 rounded-xl text-white placeholder-gray-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500/50 transition"
                  />
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }}>
                  <label className="block text-sm font-semibold text-slate-200 mb-2">Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 bg-slate-700/70 border border-slate-600 rounded-xl text-white focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500/50 transition appearance-none cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }} className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-200 mb-2">Description *</label>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleFormChange}
                    required
                    rows={3}
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition resize-none"
                    placeholder="Describe the role, responsibilities, and requirements..."
                  />
                </motion.div>

                <motion.div whileHover={{ scale: 1.02 }} className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-200 mb-2">Required Skills (comma-separated)</label>
                  <input
                    name="requiredSkills"
                    value={form.requiredSkills}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
                    placeholder="e.g., JavaScript, React, Node.js, MongoDB"
                  />
                </motion.div>
              </div>

              <motion.button
                type="submit"
                disabled={submitting}
                whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(100, 116, 139, 0.5)' }}
                whileTap={{ scale: 0.95 }}
                className="w-full px-6 py-2.5 bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-xl shadow-lg shadow-slate-900/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? '⏳ Saving Job...' : editingJob ? '💾 Update Job' : '✨ Create Job Posting'}
              </motion.button>
            </motion.form>
          )}
        </motion.div>

        {/* Jobs & Candidates Section */}
        <motion.div id="candidates" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Job Selector */}
          <motion.div className="lg:col-span-2">
            <div className="sticky top-20 space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Briefcase className="w-4 h-4 text-blue-400" />
                <h2 className="text-lg font-bold text-white">Your Jobs</h2>
                <span className="ml-auto px-2.5 py-0.5 bg-slate-700 text-slate-100 text-xs font-bold rounded-full">{jobs.length}</span>
              </div>

              {loadingJobs ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }} className="flex justify-center py-6">
                  <div className="w-8 h-8 border-3 border-slate-500 border-t-transparent rounded-full" />
                </motion.div>
              ) : jobs.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-5 bg-slate-800 border border-slate-700 rounded-xl text-center">
                  <Briefcase className="w-10 h-10 text-gray-500 mx-auto mb-2 opacity-50" />
                  <p className="text-gray-300 text-sm">No jobs yet. Create one above! 🚀</p>
                </motion.div>
              ) : (
                <div className="space-y-2.5">
                  {jobs.map((j, idx) => (
                    <motion.div
                      key={j._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`w-full rounded-xl border-2 transition ${
                        selectedJobId === j._id
                          ? 'bg-slate-700 border-slate-400 shadow-lg shadow-slate-900/30'
                          : 'bg-slate-800 border-slate-600 hover:border-slate-500 hover:bg-slate-700'
                      }`}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedJobId(j._id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedJobId(j._id);
                          }
                        }}
                        className="w-full text-left p-3.5 flex items-start justify-between gap-2 rounded-xl cursor-pointer"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white truncate">{j.title}</div>
                          <div className="text-sm text-gray-300 truncate">{j.company || 'Your Company'}</div>
                          <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400">
                            <span className="px-2 py-0.5 bg-slate-700 text-slate-100 rounded-lg">{j.jobType}</span>
                            <span className="text-slate-400">📍 {j.location || 'Remote'}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="px-2.5 py-0.5 bg-slate-700 text-slate-100 text-xs font-bold rounded-lg">{j.applicantCount || 0}</div>
                          <span className="text-xs text-slate-400">applications</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2 px-3.5 pb-3">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleEditJob(j);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-700 text-slate-100 border border-slate-600 hover:bg-slate-600 transition text-sm"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeleteJob(j._id);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-600/10 text-red-200 border border-red-500/30 hover:bg-red-600/20 transition text-sm"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Candidates Section */}
          <motion.div className="lg:col-span-3">
            <div className="bg-slate-900/95 backdrop-blur-lg rounded-2xl border border-slate-700 p-6 shadow-2xl">
              <div className="flex flex-col gap-2 mb-5">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-slate-300" />
                  <h2 className="text-xl font-bold text-white">
                    {selectedJob ? `Applicants for ${selectedJob.title}` : 'Top Candidates'}
                  </h2>
                </div>
                {selectedJob && (
                  <div className="flex items-center gap-3 text-sm text-slate-400">
                    <span>{candidates.length} applicant{candidates.length === 1 ? '' : 's'}</span>
                    <span className="h-4 w-px bg-slate-700" />
                    <span>Job type: {selectedJob.jobType}</span>
                    <span className="h-4 w-px bg-slate-700" />
                    <span>Location: {selectedJob.location || 'Remote'}</span>
                  </div>
                )}
              </div>

              {/* Skill Filters */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-5 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-[280px]">
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
                      className="flex-1 px-3.5 py-2 bg-slate-700/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition text-sm"
                    />
                    <motion.button
                      type="button"
                      onClick={() => addFilterSkill(filterText)}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-semibold transition"
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
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-300 font-medium">Status:</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-1.5 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white text-sm focus:border-purple-500 focus:outline-none"
                    >
                      <option value="all">All</option>
                      <option value="pending">Pending</option>
                      <option value="shortlisted">Shortlisted</option>
                      <option value="accepted">Accepted</option>
                    </select>
                  </div>
                  <motion.button
                    type="button"
                    onClick={() => setFilterSkills(jobRequiredSkills.map((s) => normalize(s)))}
                    disabled={!jobRequiredSkills || jobRequiredSkills.length === 0}
                    whileHover={!jobRequiredSkills || jobRequiredSkills.length === 0 ? {} : { scale: 1.03 }}
                    whileTap={!jobRequiredSkills || jobRequiredSkills.length === 0 ? {} : { scale: 0.97 }}
                    className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Use Job Skills
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={clearFilters}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-3.5 py-1.5 bg-red-600/20 border border-red-500/50 text-red-300 rounded-lg text-sm font-semibold hover:bg-red-600/30 transition"
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
                        className="inline-flex items-center gap-2 px-3 py-1 bg-slate-700 text-slate-100 text-sm rounded-full font-medium"
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
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }} className="flex justify-center py-10">
                  <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full" />
                </motion.div>
              ) : candidates.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-10">
                  <Eye className="w-14 h-14 text-gray-500 mb-3 opacity-30" />
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

                    // Status filter
                    if (statusFilter && statusFilter !== 'all') {
                      if ((item.status || 'pending') !== statusFilter) return false;
                    }

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
<tr className="text-left text-gray-300 border-b border-purple-500/30 pb-2">
                            <th className="pb-2 px-3 font-semibold">Candidate</th>
                            <th className="pb-2 px-3 font-semibold text-center">Test</th>
                            <th className="pb-2 px-3 font-semibold text-center">Project Score</th>
                            <th className="pb-2 px-3 font-semibold text-center">Match Score</th>
                            <th className="pb-2 px-3 font-semibold text-center">Status</th>
                            <th className="pb-2 px-3 font-semibold text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-purple-500/20">
{filtered.map(({ candidate, matchPercentage, latestTest, latestProject, status }, idx) => (
                            <motion.tr
                              key={candidate._id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              whileHover={{ backgroundColor: 'rgba(168, 85, 247, 0.1)' }}
                              className="hover:bg-purple-500/10 transition"
                            >
                              <td className="py-3 px-3">
                                <div>
                                  <div className="font-semibold text-white">{candidate.name ?? '—'}</div>
                                  <div className="text-xs text-gray-400">{candidate.email}</div>
                                </div>
                              </td>
                              <td className="py-3 px-3 text-center">
                                {latestTest ? (
                                  <div className="space-y-1">
                                    <div className="font-bold text-white">{latestTest.score}%</div>
                                    <div className="text-xs text-gray-300">{latestTest.correctAnswers}/{latestTest.totalQuestions} correct</div>
                                    <div className="flex items-center justify-center gap-1.5 mt-1">
                                      <span className="text-xs px-1.5 py-0.5 bg-green-600/20 text-green-300 rounded">B:{latestTest.difficultyCounts.beginner}</span>
                                      <span className="text-xs px-1.5 py-0.5 bg-yellow-600/20 text-yellow-300 rounded">I:{latestTest.difficultyCounts.intermediate}</span>
                                      <span className="text-xs px-1.5 py-0.5 bg-red-600/20 text-red-300 rounded">A:{latestTest.difficultyCounts.advanced}</span>
                                    </div>
                                  </div>
) : (
                                  <div className="text-sm text-gray-400">—</div>
                                )}
                              </td>
                              <td className="py-3 px-3 text-center">
                                {latestProject?.overallScore ? (
                                  <motion.div className="flex items-center justify-center">
                                    <div className={`relative w-14 h-14 flex items-center justify-center rounded-full font-bold text-base transition ${
                                      latestProject.overallScore >= 70
                                        ? 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-lg shadow-blue-500/50'
                                        : latestProject.overallScore >= 40
                                        ? 'bg-gradient-to-br from-yellow-500 to-orange-500 text-white shadow-lg shadow-yellow-500/50'
                                        : 'bg-gradient-to-br from-gray-600 to-gray-700 text-gray-300'
                                    }`}>
                                      {latestProject.overallScore}%
                                    </div>
                                  </motion.div>
                                ) : (
                                  <div className="text-sm text-gray-400">
                                    {latestProject ? 'Pending' : '—'}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <motion.div className="flex items-center justify-center">
                                  <div className={`relative w-14 h-14 flex items-center justify-center rounded-full font-bold text-base transition ${
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
                              <td className="py-3 px-3 text-center">
                                {status === 'shortlisted' ? (
                                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-xs font-bold rounded-full shadow-lg">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Shortlisted
                                  </motion.span>
                                ) : status === 'accepted' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600/20 text-blue-200 text-xs font-semibold rounded-full border border-blue-500/30">Accepted</span>
                                ) : status === 'rejected' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-600/20 text-red-200 text-xs font-semibold rounded-full border border-red-500/30">Rejected</span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-600/50 text-gray-300 text-xs font-semibold rounded-full border border-gray-500/30">Pending</span>
                                )}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <motion.button
                                    type="button"
                                    onClick={() => handleShortlist(selectedJobId, candidate._id)}
                                    disabled={status !== 'pending' || shortlistingId === candidate._id}
                                    whileHover={status !== 'pending' ? {} : { scale: 1.1, boxShadow: '0 0 20px rgba(59, 130, 246, 0.6)' }}
                                    whileTap={status !== 'pending' ? {} : { scale: 0.95 }}
                                    className={`px-3.5 py-1.5 rounded-lg font-semibold text-sm transition ${
                                      status === 'shortlisted'
                                        ? 'bg-green-600 text-white cursor-default'
                                        : status !== 'pending'
                                        ? 'bg-gray-600 text-gray-400 cursor-default'
                                        : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 shadow-lg'
                                    }`}
                                  >
                                    {shortlistingId === candidate._id ? '⏳' : status === 'shortlisted' ? '✓ Shortlisted' : '⭐ Shortlist'}
                                  </motion.button>
                                  <motion.button
                                    type="button"
                                    onClick={() => handleReject(selectedJobId, candidate._id)}
                                    disabled={status === 'rejected' || rejectingId === candidate._id}
                                    whileHover={status === 'rejected' ? {} : { scale: 1.1, boxShadow: '0 0 20px rgba(239, 68, 68, 0.6)' }}
                                    whileTap={status === 'rejected' ? {} : { scale: 0.95 }}
                                    className={`px-3.5 py-1.5 rounded-lg font-semibold text-sm transition ${
                                      status === 'rejected'
                                        ? 'bg-red-600 text-white cursor-default'
                                        : 'bg-gradient-to-r from-red-500 to-rose-500 text-white hover:from-red-600 hover:to-rose-600 shadow-lg'
                                    }`}
                                  >
                                    {rejectingId === candidate._id ? '⏳' : status === 'rejected' ? '✕ Rejected' : '✕ Reject'}
                                  </motion.button>
                                </div>
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

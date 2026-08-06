import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  User,
  Briefcase,
  Pencil,
  Trash2,
  Plus,
  X,
  Save,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import api from '../lib/axios';
import { DashboardLayout } from '../components/DashboardLayout';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const JOB_TYPES = [
  'full-time',
  'part-time',
  'contract',
  'internship',
  'freelance',
];

const emptyJobForm = {
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

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalJobs: 0,
    totalApplications: 0,
    totalCandidates: 0,
    totalRecruiters: 0,
    totalTests: 0,
    avgTestScore: 0,
    skillDistribution: [],
    mostDemandedSkills: [],
    platformHealth: 'good',
  });
  const [users, setUsers] = useState([]);
  const [moderationQueue, setModerationQueue] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [editingJob, setEditingJob] = useState(null);
  const [jobForm, setJobForm] = useState(emptyJobForm);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [growthMetrics, setGrowthMetrics] = useState({
    candidateGrowth: 15,
    recruiterGrowth: 8,
    applicationGrowth: 25,
  });

  useEffect(() => {
    fetchAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, modRes, analyticsRes, jobsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/moderation-queue'),
        api.get('/admin/analytics'),
        api.get('/admin/jobs'),
      ]);

      setStats(statsRes.data);
      setUsers(usersRes.data.users || usersRes.data);
      setModerationQueue(modRes.data.queue || modRes.data);
      setJobs(jobsRes.data.jobs || jobsRes.data || []);

      if (analyticsRes.data) {
        setStats((prev) => ({ ...prev, ...analyticsRes.data }));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveJob = async (jobId) => {
    try {
      await api.patch(`/admin/jobs/${jobId}/status`, { status: 'active' });
      fetchAdminData();
    } catch (err) {
      alert('Failed to approve job');
    }
  };

  const handleRejectJob = async (jobId) => {
    try {
      await api.patch(`/admin/jobs/${jobId}/status`, { status: 'suspended' });
      fetchAdminData();
    } catch (err) {
      alert('Failed to reject job');
    }
  };

  const handleToggleUser = async (userId, active) => {
    const action = active ? 'activate' : 'suspend';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
    try {
      await api.patch(`/admin/users/${userId}/status`, { active });
      fetchAdminData();
    } catch (err) {
      alert(`Failed to ${action} user`);
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Are you sure you want to delete this job? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/jobs/${jobId}`);
      fetchAdminData();
    } catch (err) {
      alert('Failed to delete job');
    }
  };

  const openEditJob = (job) => {
    setFormError('');
    setEditingJob(job);
    setJobForm({
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
    setShowForm(true);
  };

  const handleJobFormChange = (e) => {
    const { name, value } = e.target;
    setJobForm((prev) => ({ ...prev, [name]: value }));
    setFormError('');
  };

  const handleSaveJob = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const payload = {
        title: jobForm.title.trim(),
        company: jobForm.company.trim(),
        description: jobForm.description.trim(),
        requiredSkills: jobForm.requiredSkills
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter(Boolean),
        minimumScore: Number(jobForm.minimumScore) || 0,
        location: jobForm.location.trim(),
        salary: jobForm.salary.trim(),
        jobType: jobForm.jobType,
      };
      if (editingJob) {
        await api.put(`/admin/jobs/${editingJob._id}`, payload);
      } else {
        await api.post('/admin/jobs', payload);
      }
      setShowForm(false);
      setEditingJob(null);
      setJobForm(emptyJobForm);
      fetchAdminData();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Failed to save job');
    } finally {
      setSubmitting(false);
    }
  };

  const StatCard = ({ icon: Icon, label, value, color, trend }) => (
    <motion.div
      whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(147, 51, 234, 0.3)' }}
      whileTap={{ scale: 0.98 }}
      className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-lg rounded-3xl border border-purple-500/30 p-6 shadow-xl"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold mt-2 text-white">{value}</p>
          {trend && (
            <p className={`text-xs mt-1 ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from last month
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  );

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            <p className="mt-4 text-slate-400">Loading admin dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-pink-600/20 border border-white/20 backdrop-blur-lg rounded-3xl p-8 text-white overflow-hidden relative">
            <div className="absolute -right-20 -top-20 w-40 h-40 bg-purple-500/30 rounded-full blur-3xl" />
            <div className="relative">
              <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
              <p className="text-blue-100">Platform management and analytics</p>
            </div>
          </div>
        </motion.div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 text-red-400 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Stats Grid - Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <StatCard
            icon={Users}
            label="Total Users"
            value={stats.totalUsers}
            color="bg-blue-500/20 text-blue-400"
            trend={growthMetrics.candidateGrowth}
          />
          <StatCard
            icon={User}
            label="Candidates"
            value={stats.totalCandidates || Math.round(stats.totalUsers * 0.7)}
            color="bg-green-500/20 text-green-400"
            trend={growthMetrics.candidateGrowth}
          />
          <StatCard
            icon={Briefcase}
            label="Recruiters"
            value={stats.totalRecruiters || Math.round(stats.totalUsers * 0.25)}
            color="bg-blue-500/20 text-blue-400"
            trend={growthMetrics.recruiterGrowth}
          />
          <StatCard
            icon={FileText}
            label="Active Jobs"
            value={jobs.length || stats.totalJobs}
            color="bg-purple-500/20 text-purple-400"
            trend={8}
          />
          <StatCard
            icon={TrendingUp}
            label="Applications"
            value={stats.totalApplications}
            color="bg-green-500/20 text-green-400"
            trend={growthMetrics.applicationGrowth}
          />
          <StatCard
            icon={CheckCircle}
            label="Avg Test Score"
            value={`${stats.avgTestScore}%`}
            color="bg-orange-500/20 text-orange-400"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-slate-700">
          {['overview', 'jobs', 'users', 'moderation'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 font-semibold transition border-b-2 ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-lg rounded-3xl border border-purple-500/30 p-6 shadow-xl"
              >
                <h3 className="text-lg font-bold mb-4 text-white">User Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Candidates', value: stats.totalCandidates || Math.floor(stats.totalUsers * 0.7) },
                        { name: 'Recruiters', value: stats.totalRecruiters || Math.floor(stats.totalUsers * 0.25) },
                        { name: 'Admins', value: Math.floor(stats.totalUsers * 0.05) },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                  </PieChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-lg rounded-3xl border border-purple-500/30 p-6 shadow-xl"
              >
                <h3 className="text-lg font-bold mb-4 text-white">Growth Metrics (vs Last Month)</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-green-400" />
                      <span className="text-slate-300">Candidate Growth</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="w-5 h-5 text-green-400" />
                      <span className="font-bold text-green-400">+{growthMetrics.candidateGrowth}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Briefcase className="w-5 h-5 text-blue-400" />
                      <span className="text-slate-300">Recruiter Growth</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {growthMetrics.recruiterGrowth > 0 ? (
                        <ArrowUpRight className="w-5 h-5 text-green-400" />
                      ) : (
                        <ArrowDownRight className="w-5 h-5 text-red-400" />
                      )}
                      <span className={`font-bold ${growthMetrics.recruiterGrowth > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {growthMetrics.recruiterGrowth > 0 ? '+' : ''}{growthMetrics.recruiterGrowth}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-5 h-5 text-purple-400" />
                      <span className="text-slate-300">Application Growth</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="w-5 h-5 text-green-400" />
                      <span className="font-bold text-green-400">+{growthMetrics.applicationGrowth}%</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-lg rounded-3xl border border-purple-500/30 p-6 shadow-xl"
            >
              <h3 className="text-lg font-bold mb-4 text-white">Activity Trends (Last 4 Months)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    { month: 'Jan', applications: 40, candidates: 25, recruiters: 8 },
                    { month: 'Feb', applications: 65, candidates: 35, recruiters: 12 },
                    { month: 'Mar', applications: 55, candidates: 30, recruiters: 10 },
                    { month: 'Apr', applications: 85, candidates: 45, recruiters: 18 },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                  <Legend />
                  <Bar dataKey="applications" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="candidates" fill="#10b981" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="recruiters" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>

            {stats.mostDemandedSkills && stats.mostDemandedSkills.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-lg rounded-3xl border border-purple-500/30 p-6 shadow-xl"
              >
                <h3 className="text-lg font-bold mb-4 text-white">Most Demanded Skills</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart layout="vertical" data={stats.mostDemandedSkills.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis type="number" stroke="#94a3b8" />
                    <YAxis dataKey="skill" type="category" stroke="#94a3b8" width={100} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                    <Bar dataKey="demand" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}
          </div>
        )}

        {/* Jobs Tab */}
        {activeTab === 'jobs' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-6 h-6 text-purple-400" />
                <h2 className="text-2xl font-bold text-white">Manage Jobs</h2>
                <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full">
                  {jobs.length}
                </span>
              </div>
              <motion.button
                type="button"
                onClick={() => {
                  setEditingJob(null);
                  setJobForm(emptyJobForm);
                  setFormError('');
                  setShowForm((v) => !v);
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-emerald-500/50 transition"
              >
                <Plus className="w-5 h-5" />
                {showForm ? 'Cancel' : 'Post New Job'}
              </motion.button>
            </div>

            {showForm && (
              <motion.form
                onSubmit={handleSaveJob}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-lg rounded-3xl border border-purple-500/30 p-8 space-y-6 shadow-2xl"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-white">
                    {editingJob ? '✏️ Edit Job' : '✨ Post a New Job'}
                  </h3>
                  <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {formError && (
                  <div className="flex items-center gap-3 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm">{formError}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-blue-400 mb-2">Job Title *</label>
                    <input
                      name="title"
                      value={jobForm.title}
                      onChange={handleJobFormChange}
                      required
                      className="w-full px-4 py-3 bg-slate-700/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none transition"
                      placeholder="e.g., Senior React Developer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-emerald-400 mb-2">Company</label>
                    <input
                      name="company"
                      value={jobForm.company}
                      onChange={handleJobFormChange}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none transition"
                      placeholder="Company name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-pink-400 mb-2">Location</label>
                    <input
                      name="location"
                      value={jobForm.location}
                      onChange={handleJobFormChange}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none transition"
                      placeholder="e.g., Remote, New York"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-orange-400 mb-2">Salary Range</label>
                    <input
                      name="salary"
                      value={jobForm.salary}
                      onChange={handleJobFormChange}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none transition"
                      placeholder="e.g., $80k - $120k"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-indigo-400 mb-2">Job Type *</label>
                    <select
                      name="jobType"
                      value={jobForm.jobType}
                      onChange={handleJobFormChange}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-purple-500/30 rounded-xl text-white focus:border-purple-500 focus:outline-none transition appearance-none cursor-pointer"
                    >
                      {JOB_TYPES.map((t) => (
                        <option key={t} value={t} className="bg-slate-700">
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-cyan-400 mb-2">Status</label>
                    <select
                      name="status"
                      value={jobForm.status}
                      onChange={handleJobFormChange}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-purple-500/30 rounded-xl text-white focus:border-purple-500 focus:outline-none transition appearance-none cursor-pointer"
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-violet-400 mb-2">Minimum Score (0–100)</label>
                    <input
                      name="minimumScore"
                      type="number"
                      min={0}
                      max={100}
                      value={jobForm.minimumScore}
                      onChange={handleJobFormChange}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none transition"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-cyan-400 mb-2">Description *</label>
                    <textarea
                      name="description"
                      value={jobForm.description}
                      onChange={handleJobFormChange}
                      required
                      rows={4}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none transition resize-none"
                      placeholder="Describe the role, responsibilities, and requirements..."
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-red-400 mb-2">Required Skills (comma-separated)</label>
                    <input
                      name="requiredSkills"
                      value={jobForm.requiredSkills}
                      onChange={handleJobFormChange}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none transition"
                      placeholder="e.g., JavaScript, React, Node.js, MongoDB"
                    />
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-5 h-5" />
                  {submitting ? '⏳ Saving...' : editingJob ? '💾 Update Job' : '✨ Create Job Posting'}
                </motion.button>
              </motion.form>
            )}

            <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-lg rounded-3xl border border-purple-500/30 p-6 shadow-xl">
              {jobs.length === 0 ? (
                <div className="text-center py-12">
                  <Briefcase className="w-16 h-16 text-gray-500 mx-auto mb-4 opacity-40" />
                  <p className="text-slate-300 text-lg">No jobs posted yet.</p>
                  <p className="text-slate-500 text-sm">Click "Post New Job" to create one.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-purple-500/30">
                        <th className="text-left py-3 px-4 font-semibold text-slate-400">Title</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-400">Company</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-400">Type</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-400">Location</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-400">Status</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-400">Skills</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-400">Posted</th>
                        <th className="text-right py-3 px-4 font-semibold text-slate-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map((job) => (
                        <motion.tr
                          key={job._id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          whileHover={{ backgroundColor: 'rgba(168, 85, 247, 0.1)' }}
                          className="border-b border-purple-500/20 hover:bg-purple-500/10 transition"
                        >
                          <td className="py-3 px-4">
                            <div className="font-semibold text-white">{job.title}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-300">{job.company || '—'}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs font-semibold rounded-lg">
                              {job.jobType}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300">{job.location || 'Remote'}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-lg ${
                              job.status === 'active'
                                ? 'bg-green-500/15 text-green-300'
                                : job.status === 'suspended'
                                ? 'bg-red-500/15 text-red-300'
                                : 'bg-yellow-500/15 text-yellow-300'
                            }`}>
                              {job.status?.charAt(0).toUpperCase() + job.status?.slice(1)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {Array.isArray(job.requiredSkills) &&
                                job.requiredSkills.slice(0, 3).map((skill, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                                    {skill}
                                  </span>
                                ))}
                              {Array.isArray(job.requiredSkills) && job.requiredSkills.length > 3 && (
                                <span className="px-2 py-0.5 bg-slate-600 text-slate-300 text-xs rounded-full">
                                  +{job.requiredSkills.length - 3}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {new Date(job.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-end gap-2">
                              <motion.button
                                type="button"
                                onClick={() => openEditJob(job)}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                className="p-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded-lg transition"
                                title="Edit job"
                              >
                                <Pencil className="w-4 h-4" />
                              </motion.button>
                              <motion.button
                                type="button"
                                onClick={() => handleDeleteJob(job._id)}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                className="p-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg transition"
                                title="Delete job"
                              >
                                <Trash2 className="w-4 h-4" />
                              </motion.button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-lg rounded-3xl border border-purple-500/30 p-6 shadow-xl space-y-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-6 h-6 text-blue-400" />
              <h2 className="text-2xl font-bold text-white">Users</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-purple-500/30">
                    <th className="text-left py-3 px-4 font-semibold text-slate-400">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-400">Email</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-400">Role</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-400">Joined</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-400">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-400">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id} className="border-b border-purple-500/20 hover:bg-purple-500/10 transition">
                      <td className="py-3 px-4 font-medium text-white">{user.name}</td>
                      <td className="py-3 px-4 text-slate-400">{user.email}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          user.role === 'admin'
                            ? 'bg-red-900/30 text-red-400'
                            : user.role === 'recruiter'
                            ? 'bg-blue-900/30 text-blue-400'
                            : 'bg-green-900/30 text-green-400'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
                          user.suspended ? 'text-red-400' : 'text-green-400'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${user.suspended ? 'bg-red-400' : 'bg-green-400'}`}></div>
                          {user.suspended ? 'Suspended' : 'Active'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleUser(user._id, !!user.suspended)}
                          className="px-3 py-1 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded text-xs font-semibold transition"
                        >
                          {user.suspended ? 'Activate' : 'Suspend'}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Moderation Tab */}
        {activeTab === 'moderation' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {moderationQueue.length > 0 ? (
              moderationQueue.map((item) => (
                <div key={item._id} className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-lg rounded-3xl border border-purple-500/30 p-6 shadow-xl">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">{item.title}</h3>
                      <p className="text-slate-400 text-sm">Submitted by {item.submittedBy}</p>
                    </div>
                    <span className="px-3 py-1 bg-yellow-900/30 text-yellow-400 text-xs font-semibold rounded">
                      Pending Review
                    </span>
                  </div>

                  <p className="text-slate-300 mb-4">{item.description?.substring(0, 200)}...</p>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApproveJob(item._id)}
                      className="flex-1 px-4 py-2 bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded font-semibold transition"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectJob(item._id)}
                      className="flex-1 px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded font-semibold transition"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/80 backdrop-blur-lg rounded-3xl border border-purple-500/30 p-12 text-center shadow-xl">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <p className="text-slate-300 text-lg">No items pending moderation</p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}

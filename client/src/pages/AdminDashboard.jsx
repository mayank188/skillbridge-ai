import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, FileText, BarChart3, TrendingUp, AlertCircle, CheckCircle, ArrowUpRight, ArrowDownRight, User, Briefcase } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import api from '../lib/axios';
import { DashboardLayout } from '../components/DashboardLayout';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [growthMetrics, setGrowthMetrics] = useState({
    candidateGrowth: 15,
    recruiterGrowth: 8,
    applicationGrowth: 25,
  });

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, modRes, analyticsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/moderation-queue'),
        api.get('/admin/analytics'),
      ]);

      setStats(statsRes.data);
      setUsers(usersRes.data.users || usersRes.data);
      setModerationQueue(modRes.data.queue || modRes.data);
      
      // Extract analytics data if available
      if (analyticsRes.data) {
        setStats((prev) => ({
          ...prev,
          ...analyticsRes.data,
        }));
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveJob = async (jobId) => {
    try {
      await api.post(`/admin/jobs/${jobId}/approve`);
      fetchAdminData();
    } catch (err) {
      alert('Failed to approve job');
    }
  };

  const handleRejectJob = async (jobId) => {
    try {
      await api.post(`/admin/jobs/${jobId}/reject`);
      fetchAdminData();
    } catch (err) {
      alert('Failed to reject job');
    }
  };

  const handleSuspendUser = async (userId) => {
    if (window.confirm('Are you sure you want to suspend this user?')) {
      try {
        await api.post(`/admin/users/${userId}/suspend`);
        fetchAdminData();
      } catch (err) {
        alert('Failed to suspend user');
      }
    }
  };

  const StatCard = ({ icon: Icon, label, value, color, trend }) => (
    <motion.div whileHover={{ scale: 1.05 }} className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
          {trend && <p className={`text-xs mt-1 ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from last month
          </p>}
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
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
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
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
          <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
          <p className="text-slate-300">Platform management and analytics</p>
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
            value={stats.totalCandidates || stats.totalUsers * 0.7}
            color="bg-green-500/20 text-green-400"
            trend={growthMetrics.candidateGrowth}
          />
          <StatCard
            icon={Briefcase}
            label="Recruiters"
            value={stats.totalRecruiters || stats.totalUsers * 0.25}
            color="bg-blue-500/20 text-blue-400"
            trend={growthMetrics.recruiterGrowth}
          />
          <StatCard
            icon={FileText}
            label="Active Jobs"
            value={stats.totalJobs}
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
          {['overview', 'users', 'moderation'].map((tab) => (
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
            {/* First Row - Distribution Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* User Distribution */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-lg font-bold mb-4">User Distribution</h3>
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

              {/* Growth Trends */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-lg font-bold mb-4">Growth Metrics (vs Last Month)</h3>
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
                      {growthMetrics.recruiterGrowth > 0 ? 
                        <ArrowUpRight className="w-5 h-5 text-green-400" /> :
                        <ArrowDownRight className="w-5 h-5 text-red-400" />
                      }
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

            {/* Second Row - Activity Trend */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-bold mb-4">Activity Trends (Last 4 Months)</h3>
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

            {/* Third Row - Skills Analytics */}
            {stats.mostDemandedSkills && stats.mostDemandedSkills.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-lg font-bold mb-4">Most Demanded Skills</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart
                    layout="vertical"
                    data={stats.mostDemandedSkills.slice(0, 8)}
                  >
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

        {/* Users Tab */}
        {activeTab === 'users' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
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
                    <tr key={user._id} className="border-b border-slate-700 hover:bg-slate-700/50">
                      <td className="py-3 px-4 font-medium">{user.name}</td>
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
                          onClick={() => handleSuspendUser(user._id)}
                          className="px-3 py-1 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded text-xs font-semibold transition disabled:opacity-50"
                          disabled={user.suspended}
                        >
                          {user.suspended ? 'Suspended' : 'Suspend'}
                        </button>
                      </td>
                    </tr>
                  ))}
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
                <div key={item._id} className="bg-slate-800 border border-slate-700 rounded-lg p-6">
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
              <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700">
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

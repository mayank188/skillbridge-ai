import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Trophy, Zap, Target, FileText, TrendingUp, Upload, CheckCircle } from 'lucide-react';
import api from '../lib/axios';
import { DashboardLayout } from '../components/DashboardLayout';

export default function CandidateDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const { data } = await api.get('/candidate/dashboard');
      setDashboard(data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="candidate">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-slate-400">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout role="candidate">
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 text-red-400">{error}</div>
      </DashboardLayout>
    );
  }

  const skillCategoryData = {};
  (dashboard?.skills || []).forEach((skill) => {
    if (!skillCategoryData[skill.category]) {
      skillCategoryData[skill.category] = 0;
    }
    skillCategoryData[skill.category]++;
  });

  const categoryChartData = Object.entries(skillCategoryData).map(([category, count]) => ({
    category,
    skills: count,
  }));

  const industryLevel =
    dashboard?.skillIndex >= 80
      ? { label: 'Advanced', color: 'text-green-400', bg: 'bg-green-900/20' }
      : dashboard?.skillIndex >= 50
      ? { label: 'Intermediate', color: 'text-yellow-400', bg: 'bg-yellow-900/20' }
      : { label: 'Beginner', color: 'text-blue-400', bg: 'bg-blue-900/20' };

  return (
    <DashboardLayout role="candidate">
      <div className="space-y-6 max-w-7xl">
        {/* Welcome Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-blue-900/40 to-cyan-900/40 rounded-xl p-8 border border-blue-500/20">
          <h1 className="text-4xl font-bold mb-2">Welcome, {dashboard?.profile?.name}!</h1>
          <p className="text-slate-300">Track your skills, complete assessments, and land your dream job.</p>
        </motion.div>

        {/* Resume Upload & Test CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-cyan-600/10 rounded-xl" />
          <Link
            to="/candidate/resume-test"
            className="block relative bg-slate-800 hover:bg-slate-700 border border-blue-500/30 hover:border-blue-500/50 rounded-xl p-6 transition-all duration-300 transform hover:scale-105"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                  <Upload className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white mb-1">Upload Resume & Take Test</h2>
                  <p className="text-sm text-slate-400">Upload your resume and get a personalized test based on your skills</p>
                </div>
              </div>
              <Zap className="w-6 h-6 text-blue-400 flex-shrink-0" />
            </div>
          </Link>
        </motion.div>

        {/* Key Metrics */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="grid md:grid-cols-4 gap-4">
          {[
            {
              icon: Trophy,
              label: 'Skill Index',
              value: dashboard?.skillIndex || 0,
              suffix: '%',
              color: 'from-purple-500 to-pink-500',
            },
            {
              icon: Zap,
              label: 'Test Score',
              value: dashboard?.testScore || 0,
              suffix: '%',
              color: 'from-yellow-500 to-orange-500',
            },
            {
              icon: Target,
              label: 'Project Score',
              value: dashboard?.projectScore || 0,
              suffix: '%',
              color: 'from-cyan-500 to-blue-500',
            },
            {
              icon: FileText,
              label: 'Skills Added',
              value: dashboard?.skillCount || 0,
              color: 'from-green-500 to-emerald-500',
            },
            {
              icon: CheckCircle,
              label: 'Shortlisted',
              value: dashboard?.applicationCounts?.shortlisted || 0,
              color: 'from-blue-600 to-blue-400',
            },
          ].map((metric, idx) => (
            <motion.div key={idx} whileHover={{ scale: 1.05 }} className={`bg-gradient-to-br ${metric.color} rounded-lg p-6 text-white`}>
              <metric.icon className="w-8 h-8 mb-3 opacity-80" />
              <p className="text-sm text-white/80 mb-1">{metric.label}</p>
              <p className="text-3xl font-bold">
                {metric.value}
                {metric.suffix}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Industry Level */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className={`${industryLevel.bg} border border-slate-700 rounded-lg p-6`}>
          <h3 className="text-lg font-semibold mb-2">Industry Readiness</h3>
          <p className={`text-2xl font-bold ${industryLevel.color}`}>{industryLevel.label}</p>
          <p className="text-slate-400 mt-2">Your current skill assessment level</p>
        </motion.div>

        {/* Charts */}
        {categoryChartData.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold mb-4">Skills by Category</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis dataKey="category" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }} />
                <Bar dataKey="skills" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Recent Activity */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Tests */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold mb-4">Recent Tests</h3>
            {dashboard?.recentTests?.length > 0 ? (
              <div className="space-y-3">
                {dashboard.recentTests.map((test) => (
                  <div key={test._id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <div>
                      <p className="font-semibold">Test Score: {test.score}%</p>
                      <p className="text-sm text-slate-400">{test.duration}s duration</p>
                    </div>
                    <span className="text-xs text-slate-400">{new Date(test.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400">No tests completed yet</p>
            )}
          </motion.div>

          {/* Recent Projects */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h3 className="text-lg font-semibold mb-4">Recent Projects</h3>
            {dashboard?.recentProjects?.length > 0 ? (
              <div className="space-y-3">
                {dashboard.recentProjects.map((project) => (
                  <div key={project._id} className="p-3 bg-slate-700/50 rounded-lg">
                    <p className="font-semibold">{project.projectTitle}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        project.status === 'evaluated'
                          ? 'bg-green-900/30 text-green-400'
                          : project.status === 'submitted'
                          ? 'bg-yellow-900/30 text-yellow-400'
                          : 'bg-blue-900/30 text-blue-400'
                      }`}>
                        {project.status?.charAt(0).toUpperCase() + project.status?.slice(1)}
                      </span>
                      {project.evaluation?.overallScore && <span className="text-sm font-semibold">{project.evaluation.overallScore}%</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400">No projects submitted yet</p>
            )}
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}

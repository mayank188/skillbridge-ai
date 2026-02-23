import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, CheckCircle, XCircle, Clock, MessageCircle } from 'lucide-react';
import api from '../lib/axios';
import { DashboardLayout } from '../components/DashboardLayout';

const STATUS_CONFIG = {
  pending: { bg: 'bg-yellow-900/20', border: 'border-yellow-500/50', text: 'text-yellow-400', icon: Clock },
  shortlisted: { bg: 'bg-blue-900/20', border: 'border-blue-500/50', text: 'text-blue-400', icon: CheckCircle },
  rejected: { bg: 'bg-red-900/20', border: 'border-red-500/50', text: 'text-red-400', icon: XCircle },
  accepted: { bg: 'bg-green-900/20', border: 'border-green-500/50', text: 'text-green-400', icon: CheckCircle },
};

export default function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedApplication, setSelectedApplication] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/candidate/applications/recent');
      // Transform data to match expected format: list of applications with job/company info
      const list = Array.isArray(data) ? data.map((app) => ({
        _id: app._id,
        jobId: app.jobId?._id || app.jobId,
        jobTitle: app.jobId?.title || 'Position',
        companyName: app.jobId?.company || 'Company',
        status: app.status,
        appliedAt: app.createdAt,
        statusUpdatedAt: app.updatedAt || app.createdAt,
        matchScore: app.matchScore || 0,
      })) : [];
      setApplications(list);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  const filteredApplications =
    filterStatus === 'all' ? applications : applications.filter((app) => app.status === filterStatus);

  const statusCounts = {
    all: applications.length,
    pending: applications.filter((a) => a.status === 'pending').length,
    shortlisted: applications.filter((a) => a.status === 'shortlisted').length,
    accepted: applications.filter((a) => a.status === 'accepted').length,
    rejected: applications.filter((a) => a.status === 'rejected').length,
  };

  if (loading) {
    return (
      <DashboardLayout role="candidate">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-slate-400">Loading applications...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="candidate">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-bold mb-4">My Applications</h1>
          <p className="text-slate-300">Track your job applications and their status</p>
        </motion.div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 text-red-400 mb-8">
            {error}
          </div>
        )}

        {/* Status Filter */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {['all', 'pending', 'shortlisted', 'accepted', 'rejected'].map((status) => (
            <motion.button
              key={status}
              whileHover={{ scale: 1.05 }}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-3 rounded-lg font-semibold transition ${
                filterStatus === status
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <div className="text-sm capitalize">{status}</div>
              <div className="text-lg font-bold">{statusCounts[status]}</div>
            </motion.button>
          ))}
        </div>

        {/* Applications List */}
        <div className="space-y-4">
          {filteredApplications.length > 0 ? (
            filteredApplications.map((app, idx) => {
              const statusConfig = STATUS_CONFIG[app.status] || STATUS_CONFIG.pending;
              const StatusIcon = statusConfig.icon;

              return (
                <motion.div
                  key={app._id || idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => setSelectedApplication(app)}
                  className={`bg-slate-800 border rounded-lg p-6 hover:border-blue-500/50 cursor-pointer transition ${statusConfig.border}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${statusConfig.bg} border ${statusConfig.border}`}>
                        <Briefcase className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">{app.jobTitle || 'Position'}</h3>
                        <p className="text-slate-400">{app.companyName || 'Company'}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Applied {new Date(app.appliedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`w-5 h-5 ${statusConfig.text}`} />
                      <span className={`text-sm font-semibold ${statusConfig.text} capitalize`}>{app.status}</span>
                    </div>
                  </div>

                  {/* Match Score */}
                  {app.matchScore && (
                    <div className="mb-4 p-3 bg-slate-700/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-400">Compatibility</span>
                        <span className="text-sm font-bold text-blue-400">{app.matchScore}%</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full"
                          style={{ width: `${app.matchScore}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Status Update */}
                  {app.statusUpdatedAt && (
                    <p className="text-xs text-slate-500">
                      Last updated: {new Date(app.statusUpdatedAt).toLocaleDateString()}
                    </p>
                  )}
                </motion.div>
              );
            })
          ) : (
            <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700">
              <Briefcase className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-300 text-lg mb-2">No applications found</p>
              <p className="text-slate-500">Apply to jobs to track your applications here</p>
            </div>
          )}
        </div>

        {/* Application Details Modal */}
        {selectedApplication && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-800 rounded-lg border border-slate-700 max-w-2xl w-full p-6 max-h-96 overflow-y-auto"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{selectedApplication.jobTitle}</h2>
                  <p className="text-slate-400">{selectedApplication.companyName}</p>
                </div>
                <button
                  onClick={() => setSelectedApplication(null)}
                  className="text-2xl text-slate-400 hover:text-white"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                {/* Status */}
                <div>
                  <p className="text-sm text-slate-500 font-semibold mb-1">STATUS</p>
                  <div className="inline-block px-3 py-1 bg-blue-900/30 border border-blue-500/50 rounded-full text-blue-400 text-sm font-semibold capitalize">
                    {selectedApplication.status}
                  </div>
                </div>

                {/* Timeline */}
                {selectedApplication.timeline && (
                  <div>
                    <p className="text-sm text-slate-500 font-semibold mb-2">TIMELINE</p>
                    <div className="space-y-2">
                      {selectedApplication.timeline.map((event, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                          <div>
                            <p className="text-sm font-medium text-slate-300">{event.event}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(event.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message Support */}
                {selectedApplication.status === 'shortlisted' && (
                  <button className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition font-semibold">
                    <MessageCircle className="w-4 h-4" />
                    Message Recruiter
                  </button>
                )}

                <button
                  onClick={() => setSelectedApplication(null)}
                  className="w-full mt-4 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

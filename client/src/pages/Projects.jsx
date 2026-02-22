import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Code, CheckCircle, Clock, AlertCircle, Github } from 'lucide-react';
import api from '../lib/axios';
import { DashboardLayout } from '../components/DashboardLayout';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('available'); // available, submitted
  const [selectedProject, setSelectedProject] = useState(null);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [submissionData, setSubmissionData] = useState({
    githuURL: '',
    description: '',
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/projects');
      setProjects(data.projects || data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitProject = async () => {
    if (!submissionData.githuURL.trim()) {
      alert('Please provide a GitHub link');
      return;
    }

    try {
      await api.post(`/projects/${selectedProject._id}/submit`, {
        githubURL: submissionData.githuURL,
        description: submissionData.description,
      });
      alert('Project submitted successfully!');
      setShowSubmitForm(false);
      setSubmissionData({ githuURL: '', description: '' });
      fetchProjects();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit project');
    }
  };

  const availableProjects = projects.filter((p) => p.status === 'available' || !p.status);
  const submittedProjects = projects.filter((p) => p.status === 'submitted' || p.submission);

  if (loading) {
    return (
      <DashboardLayout role="candidate">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-slate-400">Loading projects...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="candidate">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Project Assignments</h1>
          <p className="text-slate-300">Complete projects to showcase your skills and boost your profile</p>
        </motion.div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 text-red-400 mb-8 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-8 border-b border-slate-700">
          <button
            onClick={() => setActiveTab('available')}
            className={`px-4 py-2 font-semibold transition border-b-2 ${
              activeTab === 'available'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            Available Assignments ({availableProjects.length})
          </button>
          <button
            onClick={() => setActiveTab('submitted')}
            className={`px-4 py-2 font-semibold transition border-b-2 ${
              activeTab === 'submitted'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            My Submissions ({submittedProjects.length})
          </button>
        </div>

        {/* Available Projects */}
        {activeTab === 'available' && (
          <div className="space-y-4">
            {availableProjects.length > 0 ? (
              availableProjects.map((project, idx) => (
                <motion.div
                  key={project._id || idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-blue-500/50 transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <Code className="w-6 h-6 text-blue-400 mt-1" />
                      <div>
                        <h3 className="text-xl font-bold text-white">{project.title}</h3>
                        <p className="text-slate-400 text-sm">{project.category}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {project.difficulty && (
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            project.difficulty === 'easy'
                              ? 'bg-green-900/30 text-green-400'
                              : project.difficulty === 'medium'
                              ? 'bg-yellow-900/30 text-yellow-400'
                              : 'bg-red-900/30 text-red-400'
                          }`}
                        >
                          {project.difficulty}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-slate-300 mb-4">{project.description}</p>

                  {/* Requirements */}
                  {project.requirements && project.requirements.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-slate-500 mb-2 font-semibold">REQUIREMENTS</p>
                      <ul className="text-sm text-slate-300 space-y-1">
                        {project.requirements.slice(0, 3).map((req, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-blue-400">•</span>
                            <span>{req}</span>
                          </li>
                        ))}
                        {project.requirements.length > 3 && (
                          <li className="text-slate-400">
                            +{project.requirements.length - 3} more requirements
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Skills */}
                  {project.skills && project.skills.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-slate-500 mb-2 font-semibold">SKILLS</p>
                      <div className="flex flex-wrap gap-2">
                        {project.skills.map((skill, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-purple-900/30 border border-purple-500/50 rounded-full text-xs text-purple-300"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {project.estimatedHours && (
                    <div className="flex items-center gap-2 text-slate-400 mb-4 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>Estimated: {project.estimatedHours} hours</span>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setSelectedProject(project);
                      setShowSubmitForm(true);
                    }}
                    className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition"
                  >
                    Start Project
                  </button>
                </motion.div>
              ))
            ) : (
              <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700">
                <p className="text-slate-300 text-lg">No available projects at the moment.</p>
              </div>
            )}
          </div>
        )}

        {/* Submitted Projects */}
        {activeTab === 'submitted' && (
          <div className="space-y-4">
            {submittedProjects.length > 0 ? (
              submittedProjects.map((project, idx) => (
                <motion.div
                  key={project._id || idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`bg-slate-800 border rounded-lg p-6 ${
                    project.evaluation?.score >= 80
                      ? 'border-green-500/50'
                      : project.evaluation?.score >= 60
                      ? 'border-yellow-500/50'
                      : 'border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-green-400 mt-1" />
                      <div>
                        <h3 className="text-xl font-bold text-white">{project.title}</h3>
                        <p className="text-slate-400 text-sm">
                          Submitted on {new Date(project.submission?.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {project.evaluation && (
                      <div className="text-right">
                        <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                          {project.evaluation.score}%
                        </div>
                      </div>
                    )}
                  </div>

                  {project.submission?.description && (
                    <p className="text-slate-300 mb-4">{project.submission.description}</p>
                  )}

                  {project.evaluation && (
                    <div className="mb-4 p-4 bg-slate-700/50 rounded-lg space-y-2">
                      {project.evaluation.feedback && (
                        <div>
                          <p className="text-xs text-slate-500 font-semibold mb-1">FEEDBACK</p>
                          <p className="text-slate-300 text-sm">{project.evaluation.feedback}</p>
                        </div>
                      )}
                      {project.evaluation.strengths && (
                        <div>
                          <p className="text-xs text-slate-500 font-semibold mb-1">STRENGTHS</p>
                          <ul className="text-sm text-green-300 space-y-1">
                            {project.evaluation.strengths.map((s, i) => (
                              <li key={i}>• {s}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {project.evaluation.improvementAreas && (
                        <div>
                          <p className="text-xs text-slate-500 font-semibold mb-1">AREAS TO IMPROVE</p>
                          <ul className="text-sm text-yellow-300 space-y-1">
                            {project.evaluation.improvementAreas.map((a, i) => (
                              <li key={i}>• {a}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {project.submission?.githubURL && (
                    <a
                      href={project.submission.githubURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition"
                    >
                      <Github className="w-4 h-4" />
                      View on GitHub
                    </a>
                  )}
                </motion.div>
              ))
            ) : (
              <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700">
                <p className="text-slate-300 text-lg">You haven't submitted any projects yet.</p>
              </div>
            )}
          </div>
        )}

        {/* Submission Modal */}
        {showSubmitForm && selectedProject && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-800 rounded-lg border border-slate-700 max-w-md w-full p-6"
            >
              <h2 className="text-2xl font-bold mb-4">Submit Project</h2>
              <p className="text-slate-400 mb-6">{selectedProject.title}</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">GitHub URL *</label>
                  <input
                    type="url"
                    placeholder="https://github.com/username/repo"
                    value={submissionData.githuURL}
                    onChange={(e) => setSubmissionData({ ...submissionData, githuURL: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Submission Notes</label>
                  <textarea
                    placeholder="Tell us about your implementation, challenges you faced, etc."
                    value={submissionData.description}
                    onChange={(e) => setSubmissionData({ ...submissionData, description: e.target.value })}
                    rows="4"
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none resize-none"
                  ></textarea>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowSubmitForm(false);
                      setSelectedProject(null);
                      setSubmissionData({ githuURL: '', description: '' });
                    }}
                    className="flex-1 px-4 py-2 border border-slate-600 rounded-lg hover:bg-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitProject}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg font-semibold hover:shadow-lg transition"
                  >
                    Submit Project
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

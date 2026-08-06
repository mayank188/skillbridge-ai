import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Code, CheckCircle, AlertCircle, Github, Sparkles, Loader, Download, ThumbsUp, Wrench, FileCode2 } from 'lucide-react';
import api from '../lib/axios';
import { DashboardLayout } from '../components/DashboardLayout';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('available'); // available, submitted
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [submissionData, setSubmissionData] = useState({
    githubURL: '',
    description: '',
  });
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [difficulty, setDifficulty] = useState('intermediate');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/project/history');
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateProject = async () => {
    setGenerating(true);
    setError(null);
    try {
      await api.post('/project/generate', { difficulty });
      alert('Project generated successfully! You can now start coding it.');
      await fetchProjects();
      setActiveTab('available');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate project. Please upload your resume and extract skills first.');
    } finally {
      setGenerating(false);
    }
  };

  const openSubmitForm = (project) => {
    setSelectedProject(project);
    setSubmissionData({ githubURL: '', description: '' });
    setShowSubmitForm(true);
  };

  const handleSubmitProject = async () => {
    if (!selectedProject) return;
    if (!submissionData.githubURL.trim()) {
      alert('Please provide a GitHub link');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post(`/project/submit`, {
        projectId: selectedProject._id,
        githubLink: submissionData.githubURL.trim(),
        description: submissionData.description.trim(),
      });

      if (data.status === 'evaluated') {
        alert(`Project submitted and analyzed! Overall score: ${data.evaluation?.overallScore}%`);
      } else {
        alert(data.message || 'Project submitted, but analysis is pending. Please make your repo public.');
      }
      setShowSubmitForm(false);
      setSelectedProject(null);
      await fetchProjects();
      setActiveTab('submitted');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit project');
    } finally {
      setSubmitting(false);
    }
  };

  const assignedProjects = projects.filter((p) => p.status === 'assigned');
  const submittedProjects = projects.filter((p) => p.status !== 'assigned');

  const downloadProjectSpec = (project) => {
    const content = [
      project.projectTitle,
      '',
      project.projectDescription || '',
      '',
      'REQUIREMENTS',
      ...(project.requirements || []).map((r) => `- ${r}`),
      '',
      'DELIVERABLES',
      ...(project.deliverables || []).map((d) => `- ${d}`),
      '',
      `Difficulty: ${project.difficulty || 'intermediate'}`,
    ].join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${project.projectTitle || 'project'}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

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
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-4">Project Assignments</h1>
            <p className="text-slate-300">Complete projects to showcase your skills and boost your profile</p>
          </div>
          <button
            onClick={handleGenerateProject}
            disabled={generating}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition disabled:opacity-60 disabled:pointer-events-none"
          >
            {generating ? <Loader className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {generating ? 'Generating...' : 'Generate Project from Skills'}
          </button>
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
            Assigned Projects ({assignedProjects.length})
          </button>
          <button
            onClick={() => setActiveTab('submitted')}
            className={`px-4 py-2 font-semibold transition border-b-2 ${
              activeTab === 'submitted'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-300'
            }`}
          >
            Submitted ({submittedProjects.length})
          </button>
        </div>

        {/* Assigned Projects */}
        {activeTab === 'available' && (
          <div className="space-y-4">
            {assignedProjects.length > 0 ? (
              assignedProjects.map((project, idx) => (
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
                        <h3 className="text-xl font-bold text-white">{project.projectTitle}</h3>
                        <p className="text-slate-400 text-sm">{project.difficulty}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-2">
                      {project.difficulty && (
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            project.difficulty === 'beginner'
                              ? 'bg-green-900/30 text-green-400'
                              : project.difficulty === 'intermediate'
                              ? 'bg-yellow-900/30 text-yellow-400'
                              : 'bg-red-900/30 text-red-400'
                          }`}
                        >
                          {project.difficulty}
                        </span>
                      )}
                      <button
                        onClick={() => downloadProjectSpec(project)}
                        title="Download project spec"
                        className="p-2 rounded-lg border border-slate-600 hover:bg-slate-700 transition"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-slate-300 mb-4">{project.projectDescription}</p>

                  {project.requirements && project.requirements.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-slate-500 mb-2 font-semibold">REQUIREMENTS</p>
                      <ul className="text-sm text-slate-300 space-y-1">
                        {project.requirements.map((req, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-blue-400">•</span>
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {project.deliverables && project.deliverables.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-slate-500 mb-2 font-semibold">DELIVERABLES</p>
                      <ul className="text-sm text-slate-300 space-y-1">
                        {project.deliverables.map((d, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-green-400">✓</span>
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <button
                    onClick={() => openSubmitForm(project)}
                    className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition"
                  >
                    Submit My Code
                  </button>
                </motion.div>
              ))
            ) : (
              <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700">
                <p className="text-slate-300 text-lg mb-2">No assigned projects yet.</p>
                <p className="text-slate-500">Click "Generate Project from Skills" to get a project based on your resume skills.</p>
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
                    project.evaluation?.overallScore >= 80
                      ? 'border-green-500/50'
                      : project.evaluation?.overallScore >= 60
                      ? 'border-yellow-500/50'
                      : 'border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-green-400 mt-1" />
                      <div>
                        <h3 className="text-xl font-bold text-white">{project.projectTitle}</h3>
                        <p className="text-slate-400 text-sm">
                          {project.status === 'submitted'
                            ? 'Submitted — awaiting analysis'
                            : `Submitted on ${new Date(project.submittedAt).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    {project.evaluation?.overallScore ? (
                      <div className="text-right">
                        <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                          {project.evaluation.overallScore}%
                        </div>
                      </div>
                    ) : project.evaluation?.source === 'pending' ? (
                      <div className="text-right">
                        <span className="px-3 py-1 bg-yellow-900/30 text-yellow-400 text-xs font-semibold rounded-full">Pending Analysis</span>
                      </div>
                    ) : null}
                  </div>

                  {project.githubLink && (
                    <a
                      href={project.githubLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition mb-4"
                    >
                      <Github className="w-4 h-4" />
                      View on GitHub
                    </a>
                  )}

                  {project.evaluation && project.evaluation.source !== 'pending' && (
                    <div className="mb-4 p-4 bg-slate-700/50 rounded-lg space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                        <div className="p-3 bg-slate-800 rounded-lg">
                          <p className="text-xs text-slate-500 mb-1">Code Quality</p>
                          <p className="text-xl font-bold text-white">{project.evaluation.codeQualityScore ?? '—'}</p>
                        </div>
                        <div className="p-3 bg-slate-800 rounded-lg">
                          <p className="text-xs text-slate-500 mb-1">Architecture</p>
                          <p className="text-xl font-bold text-white">{project.evaluation.architectureScore ?? '—'}</p>
                        </div>
                        <div className="p-3 bg-slate-800 rounded-lg">
                          <p className="text-xs text-slate-500 mb-1">Documentation</p>
                          <p className="text-xl font-bold text-white">{project.evaluation.documentationScore ?? '—'}</p>
                        </div>
                        <div className="p-3 bg-slate-800 rounded-lg">
                          <p className="text-xs text-slate-500 mb-1">Best Practices</p>
                          <p className="text-xl font-bold text-white">{project.evaluation.bestPracticesScore ?? '—'}</p>
                        </div>
                      </div>

                      {project.evaluation.structureSummary && (
                        <div className="flex flex-wrap items-center gap-2">
                          <FileCode2 className="w-4 h-4 text-blue-400" />
                          <span className="text-xs text-slate-400">{project.evaluation.structureSummary.fileCount} files</span>
                          {Array.isArray(project.evaluation.structureSummary.languages) &&
                            project.evaluation.structureSummary.languages.slice(0, 4).map((l, i) => (
                              <span key={i} className="px-2 py-0.5 bg-slate-800 text-xs text-slate-300 rounded-full">
                                {l.name} ({l.count})
                              </span>
                            ))}
                        </div>
                      )}

                      {project.evaluation.feedback && (
                        <div>
                          <p className="text-xs text-slate-500 font-semibold mb-1">FEEDBACK</p>
                          <p className="text-slate-300 text-sm">{project.evaluation.feedback}</p>
                        </div>
                      )}

                      {project.evaluation.strengths && project.evaluation.strengths.length > 0 && (
                        <div>
                          <p className="text-xs text-green-400 font-semibold mb-1 flex items-center gap-1">
                            <ThumbsUp className="w-3.5 h-3.5" /> STRENGTHS
                          </p>
                          <ul className="text-sm text-slate-300 space-y-1">
                            {project.evaluation.strengths.map((s, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-green-400">✓</span>
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {project.evaluation.improvements && project.evaluation.improvements.length > 0 && (
                        <div>
                          <p className="text-xs text-yellow-400 font-semibold mb-1 flex items-center gap-1">
                            <Wrench className="w-3.5 h-3.5" /> IMPROVEMENTS
                          </p>
                          <ul className="text-sm text-slate-300 space-y-1">
                            {project.evaluation.improvements.map((s, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <span className="text-yellow-400">→</span>
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {project.evaluation?.source === 'pending' && (
                    <div className="mb-4 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                      <p className="text-sm text-yellow-300">{project.evaluation.feedback || 'Analysis pending.'}</p>
                    </div>
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
              <p className="text-slate-400 mb-6">{selectedProject.projectTitle}</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">GitHub URL *</label>
                  <input
                    type="url"
                    placeholder="https://github.com/username/repo"
                    value={submissionData.githubURL}
                    onChange={(e) => setSubmissionData({ ...submissionData, githubURL: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Your repository will be automatically analyzed for code structure &amp; quality and scored by AI.
                  </p>
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
                    }}
                    disabled={submitting}
                    className="flex-1 px-4 py-2 border border-slate-600 rounded-lg hover:bg-slate-700 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitProject}
                    disabled={submitting}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg font-semibold hover:shadow-lg transition disabled:opacity-60"
                  >
                    {submitting ? <Loader className="w-4 h-4 animate-spin mx-auto" /> : 'Submit & Analyze'}
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

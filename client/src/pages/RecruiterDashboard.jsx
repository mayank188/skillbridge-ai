import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Recruiter Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user?.email}</span>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="text-sm text-blue-600 hover:underline"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-6">
        <p className="text-gray-600 mb-6">Welcome, {user?.name ?? user?.email}.</p>

        {/* Create job */}
        <div className="mb-8">
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            {showForm ? 'Cancel' : 'Create job'}
          </button>
          {showForm && (
            <form
              onSubmit={handleCreateJob}
              className="mt-4 bg-white rounded-xl border border-gray-200 p-6 space-y-4"
            >
              {formError && (
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{formError}</p>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Job title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Job description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Required skills (comma-separated)
                </label>
                <input
                  name="requiredSkills"
                  value={form.requiredSkills}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="e.g. JavaScript, React, Node.js"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum score (0–100)
                  </label>
                  <input
                    name="minimumScore"
                    type="number"
                    min={0}
                    max={100}
                    value={form.minimumScore}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job type *</label>
                  <select
                    name="jobType"
                    value={form.jobType}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {JOB_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    name="location"
                    value={form.location}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g. Remote"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary</label>
                  <input
                    name="salary"
                    value={form.salary}
                    onChange={handleFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="e.g. 80k-120k"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create job'}
              </button>
            </form>
          )}
        </div>

        {/* Job selector + candidates */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Job:</span>
            {loadingJobs ? (
              <span className="text-gray-500">Loading jobs...</span>
            ) : jobs.length === 0 ? (
              <span className="text-gray-500">No jobs yet. Create one above.</span>
            ) : (
              <select
                value={selectedJobId ?? ''}
                onChange={(e) => setSelectedJobId(e.target.value || null)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              >
                {jobs.map((j) => (
                  <option key={j._id} value={j._id}>
                    {j.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="p-4">
            <h2 className="text-lg font-medium text-gray-800 mb-3">Candidates</h2>
            {/* Skill filters */}
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <input
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addFilterSkill(filterText);
                    }
                  }}
                  placeholder="Add skill and press Enter (e.g. Flutter)"
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                />
                <button
                  type="button"
                  onClick={() => addFilterSkill(filterText)}
                  className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm"
                >
                  Add
                </button>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Mode:</label>
                <select
                  value={matchMode}
                  onChange={(e) => setMatchMode(e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">Match all</option>
                  <option value="any">Match any</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilterSkills(jobRequiredSkills.map((s) => normalize(s)))}
                  disabled={!jobRequiredSkills || jobRequiredSkills.length === 0}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm disabled:opacity-50"
                >
                  Use job required skills
                </button>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm"
                >
                  Clear
                </button>
              </div>
            </div>
            {/* Active filter chips */}
            {filterSkills.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {filterSkills.map((s) => (
                  <span key={s} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-sm">
                    <span className="capitalize">{s}</span>
                    <button onClick={() => removeFilterSkill(s)} className="text-xs text-gray-500">×</button>
                  </span>
                ))}
              </div>
            )}
            {loadingCandidates ? (
              <p className="text-gray-500 text-sm">Loading candidates...</p>
            ) : candidates.length === 0 ? (
              <p className="text-gray-500 text-sm">
                {selectedJobId ? 'No candidates found.' : 'Select a job to see candidates.'}
              </p>
            ) : (
              (() => {
                // filter candidates client-side according to filterSkills and matchMode
                const filtered = filterSkills.length === 0
                  ? candidates
                  : candidates.filter(({ candidate }) => {
                      const candidateSkillNames = Array.isArray(candidate.skills)
                        ? candidate.skills.map((sk) => (typeof sk === 'string' ? sk : sk?.name)).filter(Boolean).map(normalize)
                        : [];
                      if (matchMode === 'all') {
                        return filterSkills.every((f) => candidateSkillNames.includes(f));
                      }
                      // 'any'
                      return filterSkills.some((f) => candidateSkillNames.includes(f));
                    });

                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-600 border-b border-gray-200">
                      <th className="pb-2 pr-4">Name</th>
                      <th className="pb-2 pr-4">Email</th>
                      <th className="pb-2 pr-4">Match</th>
                      <th className="pb-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(({ candidate, matchPercentage, shortlisted }) => (
                      <tr key={candidate._id} className="border-b border-gray-100">
                        <td className="py-3 pr-4 font-medium text-gray-800">
                          {candidate.name ?? '—'}
                        </td>
                        <td className="py-3 pr-4 text-gray-600">{candidate.email}</td>
                        <td className="py-3 pr-4">
                          <span
                            className={
                              matchPercentage >= 70
                                ? 'text-green-600 font-medium'
                                : matchPercentage >= 40
                                  ? 'text-amber-600'
                                  : 'text-gray-600'
                            }
                          >
                            {matchPercentage}%
                          </span>
                        </td>
                        <td className="py-3">
                          <button
                            type="button"
                            onClick={() => handleShortlist(selectedJobId, candidate._id)}
                            disabled={shortlisted || shortlistingId === candidate._id}
                            className={`px-3 py-1 rounded-lg text-sm font-medium ${
                              shortlisted
                                ? 'bg-gray-100 text-gray-500 cursor-default'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            } disabled:opacity-70`}
                          >
                            {shortlisted ? 'Shortlisted' : 'Shortlist'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                    </table>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, DollarSign, Briefcase, Filter } from 'lucide-react';
import api from '../lib/axios';
import { DashboardLayout } from '../components/DashboardLayout';

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    location: '',
    experienceLevel: '',
    salaryMin: '',
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/candidate/jobs');
      // candidate endpoint returns an array of jobs with match info
      const list = Array.isArray(data) ? data : data.jobs || [];
      setJobs(list);
      setFilteredJobs(list);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = jobs;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (job) =>
          job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Location filter
    if (filters.location) {
      filtered = filtered.filter((job) =>
        job.location?.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    // Experience filter
    if (filters.experienceLevel) {
      filtered = filtered.filter((job) =>
        job.experienceLevel === filters.experienceLevel
      );
    }

    // Salary filter
    if (filters.salaryMin) {
      filtered = filtered.filter(
        (job) => job.salaryMin >= parseInt(filters.salaryMin)
      );
    }

    setFilteredJobs(filtered);
  }, [searchTerm, filters, jobs]);

  const handleApply = async (jobId) => {
    try {
      await api.post('/candidate/jobs/apply', { jobId });
      alert('Application submitted successfully!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to apply for job');
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="candidate">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-slate-400">Loading jobs...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="candidate">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Browse Opportunities</h1>
          <p className="text-slate-300">Find jobs that match your skills and experience</p>
        </motion.div>

        {/* Search and Filter */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, company, or skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            <button
              onClick={() => {
                setFilters({ location: '', experienceLevel: '', salaryMin: '' });
                setSearchTerm('');
              }}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition"
            >
              Clear All
            </button>
          </div>

          {filterOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <input
                  type="text"
                  placeholder="e.g., San Francisco, Remote"
                  value={filters.location}
                  onChange={(e) => setFilters({ ...filters, location: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Experience Level</label>
                <select
                  value={filters.experienceLevel}
                  onChange={(e) => setFilters({ ...filters, experienceLevel: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="">All Levels</option>
                  <option value="entry">Entry Level</option>
                  <option value="junior">Junior</option>
                  <option value="mid">Mid-Level</option>
                  <option value="senior">Senior</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Minimum Salary (USD)</label>
                <input
                  type="number"
                  placeholder="e.g., 50000"
                  value={filters.salaryMin}
                  onChange={(e) => setFilters({ ...filters, salaryMin: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </motion.div>
          )}
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 text-red-400 mb-8">
            {error}
          </div>
        )}

        {/* Jobs Grid */}
        <div className="space-y-4">
          {filteredJobs.length > 0 ? (
            filteredJobs.map((job, idx) => (
              <motion.div
                key={job._id || idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-blue-500/50 transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{job.title}</h3>
                    <p className="text-slate-400">{job.company}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-yellow-400 justify-end mb-2">
                      {job.matchPercentage && (
                        <>
                          <span className="text-lg font-bold">{job.matchPercentage}%</span>
                          <span className="text-sm">Match</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-slate-300 mb-4 line-clamp-2">{job.description}</p>

                {/* Job Details */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-slate-400">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">{job.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-sm">
                      ${job.salaryMin?.toLocaleString()}
                      {job.salaryMax && ` - $${job.salaryMax.toLocaleString()}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Briefcase className="w-4 h-4" />
                    <span className="text-sm">{job.experienceLevel}</span>
                  </div>
                  {job.type && (
                    <div className="text-slate-400 text-sm">
                      {job.type}
                    </div>
                  )}
                </div>

                {/* Required Skills */}
                {job.requiredSkills && job.requiredSkills.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-slate-500 mb-2">Required Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {job.requiredSkills.slice(0, 5).map((skill, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-blue-900/30 border border-blue-500/50 rounded-full text-xs text-blue-300"
                        >
                          {skill}
                        </span>
                      ))}
                      {job.requiredSkills.length > 5 && (
                        <span className="px-3 py-1 text-xs text-slate-400">
                          +{job.requiredSkills.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => handleApply(job._id)}
                  className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition"
                >
                  Apply Now
                </button>
              </motion.div>
            ))
          ) : (
            <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700">
              <p className="text-slate-300 text-lg">No jobs found. Try adjusting your filters.</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

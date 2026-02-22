import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Target, CheckCircle, AlertCircle, BookOpen } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import api from '../lib/axios';
import { DashboardLayout } from '../components/DashboardLayout';

export default function SkillGapAnalysis() {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [recommendedCourses, setRecommendedCourses] = useState([]);

  useEffect(() => {
    fetchGapAnalysis();
  }, []);

  const fetchGapAnalysis = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/candidate/skill-gap-analysis');
      setAnalysis(data.analysis);
      setRecommendedCourses(data.recommendedCourses || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch skill gap analysis');
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
            <p className="mt-4 text-slate-400">Analyzing your skills...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const skillData = analysis?.skills || [];
  const proficiencyData = analysis?.skillProficiency || [];

  return (
    <DashboardLayout role="candidate">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-bold mb-2">Skill Gap Analysis</h1>
          <p className="text-slate-300">
            Identify skill gaps and get personalized recommendations to improve your marketability
          </p>
        </motion.div>

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 text-red-400 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Overall Score */}
        {analysis && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-blue-900/40 to-cyan-900/40 rounded-lg p-8 border border-blue-500/20"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div>
                <p className="text-slate-400 mb-2">Average Proficiency</p>
                <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                  {Math.round(analysis.overallProficiency || 0)}%
                </div>
              </div>
              <div>
                <p className="text-slate-400 mb-2">Target Proficiency</p>
                <div className="text-5xl font-bold text-green-400">
                  {analysis.targetProficiency || 80}%
                </div>
              </div>
              <div>
                <p className="text-slate-400 mb-2">Gap to Close</p>
                <div className={`text-5xl font-bold ${
                  (analysis.targetProficiency || 80) - (analysis.overallProficiency || 0) > 20
                    ? 'text-yellow-400'
                    : 'text-green-400'
                }`}>
                  {Math.max(0, (analysis.targetProficiency || 80) - (analysis.overallProficiency || 0))}%
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Skills Radar Chart */}
        {proficiencyData.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-2xl font-bold mb-6">Skill Proficiency Map</h2>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={proficiencyData}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="skill" stroke="#94a3b8" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#94a3b8" />
                <Radar name="Current Level" dataKey="current" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.5} />
                <Radar name="Target Level" dataKey="target" stroke="#10b981" fill="#10b981" fillOpacity={0.5} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Skill Gaps */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="space-y-4">
          <h2 className="text-2xl font-bold">Your Skills Assessment</h2>

          {skillData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Strong Skills */}
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  Strong Skills
                </h3>
                <div className="space-y-3">
                  {skillData.filter((s) => s.proficiency >= 80).map((skill, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">{skill.name}</span>
                        <span className="text-sm font-bold text-green-400">{skill.proficiency}%</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${skill.proficiency}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* In-Progress Skills */}
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-blue-400">
                  <TrendingUp className="w-5 h-5" />
                  In-Progress
                </h3>
                <div className="space-y-3">
                  {skillData.filter((s) => s.proficiency >= 50 && s.proficiency < 80).map((skill, idx) => (
                    <div key={idx}>
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">{skill.name}</span>
                        <span className="text-sm font-bold text-blue-400">{skill.proficiency}%</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${skill.proficiency}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {/* Skills to Develop */}
          {skillData.filter((s) => s.proficiency < 50).length > 0 && (
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-orange-400">
                <Target className="w-5 h-5" />
                Skills to Develop
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {skillData.filter((s) => s.proficiency < 50).map((skill, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{skill.name}</span>
                      <span className="text-sm font-bold text-orange-400">{skill.proficiency}%</span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full"
                        style={{ width: `${skill.proficiency}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Recommendations */}
        {recommendedCourses.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="space-y-4">
            <h2 className="text-2xl font-bold">Recommended Learning Paths</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendedCourses.map((course, idx) => (
                <div key={idx} className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-blue-500/50 transition">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1">{course.title}</h3>
                      <p className="text-sm text-slate-400">{course.provider}</p>
                    </div>
                  </div>

                  <p className="text-slate-300 mb-4 text-sm">{course.description}</p>

                  <div className="flex items-center justify-between text-sm mb-4">
                    <span className="text-slate-400">
                      {course.duration}
                    </span>
                    <span className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded text-xs font-semibold">
                      For: {course.skillTarget}
                    </span>
                  </div>

                  <button className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition font-semibold text-sm">
                    View Course
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Action Items */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="bg-slate-800 rounded-lg p-8 border border-blue-500/20">
          <h2 className="text-2xl font-bold mb-6">Next Steps</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-blue-400">1</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Take Assessments</h3>
                <p className="text-slate-400 text-sm">Complete skill assessments to identify specific gaps</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-blue-400">2</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Learn New Skills</h3>
                <p className="text-slate-400 text-sm">Enroll in recommended courses and practice projects</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-blue-400">3</span>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Build Portfolio</h3>
                <p className="text-slate-400 text-sm">Complete projects to demonstrate your skills</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}

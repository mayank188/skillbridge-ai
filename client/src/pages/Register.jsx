import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, Mail, Lock, User, AlertCircle, Shield } from 'lucide-react';
import api from '../lib/axios';
import { useAuth } from '../context/AuthContext';

const ROLES = [
  { value: 'candidate', label: 'Candidate' },
  { value: 'recruiter', label: 'Recruiter' },
  { value: 'admin', label: 'Admin' },
];

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('candidate');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/register', { name, email, password, role });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);

      // Redirect based on user role
      if (data.user.role === 'candidate') {
        navigate('/candidate', { replace: true });
      } else if (data.user.role === 'recruiter') {
        navigate('/recruiter', { replace: true });
      } else if (data.user.role === 'admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.error ?? 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-gradient-to-br from-slate-800/80 to-purple-900/60 backdrop-blur-xl rounded-3xl border border-purple-500/30 p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 items-center justify-center mb-4 shadow-lg shadow-purple-500/30">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Create Account</h1>
            <p className="text-slate-400 mt-2">Join SkillBridge AI today</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-300"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </motion.div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-blue-300 mb-2">
                Name
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-3 bg-slate-700/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
                  placeholder="Your name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-blue-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-12 pr-4 py-3 bg-slate-700/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-blue-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-12 pr-4 py-3 bg-slate-700/50 border border-purple-500/30 rounded-xl text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
                  placeholder="At least 6 characters"
                />
              </div>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-semibold text-blue-300 mb-2">
                Role
              </label>
              <div className="relative">
                <Shield className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-700/50 border border-purple-500/30 rounded-xl text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition appearance-none cursor-pointer"
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value} className="bg-slate-700">
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={submitting}
              whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(147, 51, 234, 0.5)' }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {submitting ? 'Creating account...' : 'Register'}
            </motion.button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          © {new Date().getFullYear()} SkillBridge AI. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}

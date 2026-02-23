import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, LogOut, Home, BookOpen, Briefcase, BarChart, Users, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

export function DashboardLayout({ children, role = 'candidate' }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = {
    candidate: [
      { label: 'Dashboard', icon: Home, path: '/candidate' },
      { label: 'Assessments', icon: BookOpen, path: '/candidate/quiz' },
      { label: 'Projects', icon: Briefcase, path: '/candidate/projects' },
      { label: 'Jobs', icon: Briefcase, path: '/candidate/jobs' },
      { label: 'Applications', icon: BarChart, path: '/candidate/applications' },
    ],
    recruiter: [
      { label: 'Dashboard', icon: Home, path: '/recruiter' },
    ],
    admin: [
      { label: 'Dashboard', icon: Home, path: '/admin' },
      { label: 'Users', icon: Users, path: '/admin' },
      { label: 'Moderation', icon: Settings, path: '/admin' },
      { label: 'Analytics', icon: BarChart, path: '/admin' },
    ],
  };

  const items = menuItems[role] || menuItems.candidate;

  // Render a minimal layout for recruiter: no sidebar, show heading and content
  if (role === 'recruiter') {
    return (
      <div className="min-h-screen bg-slate-900 text-white">
        <div className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">SkillBridge AI</Link>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-slate-400">{user?.role}</p>
            </div>
            <button onClick={handleLogout} className="px-3 py-1.5 bg-red-600/20 text-red-300 rounded">Logout</button>
          </div>
        </div>

        <main className="max-w-7xl mx-auto p-6">
          <h1 className="text-3xl font-bold mb-4">Recruiter Dashboard</h1>
          <div>{children}</div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-900 text-white">
      {/* Sidebar */}
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        className={`fixed md:relative w-64 bg-slate-800 border-r border-slate-700 flex flex-col z-40 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-[-100%] md:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-slate-700">
          <Link to="/" className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
            SkillBridge AI
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          {items.map((item) => {
            const toPath = item.hash ? `${item.path}#${item.hash}` : item.path;
            const isActive = location.pathname === item.path && (item.hash ? location.hash === `#${item.hash}` : true);
            return (
              <Link
                key={toPath}
                to={toPath}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition ${
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="border-t border-slate-700 p-4">
          <div className="mb-4">
            <p className="text-sm text-slate-400">Logged in as</p>
            <p className="font-semibold truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600/30 transition"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 hover:bg-slate-700 rounded-lg"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="flex items-center gap-4 ml-auto">
            <div className="relative">
              <span className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center font-bold cursor-pointer">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

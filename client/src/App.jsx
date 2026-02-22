import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import CandidateDashboard from './pages/CandidateDashboard';
import RecruiterDashboard from './pages/RecruiterDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Quiz from './pages/Quiz';
import Projects from './pages/Projects';
import JobsBrowse from './pages/JobsBrowse';
import Applications from './pages/Applications';
import Test from './pages/Test';
import ResumeAndTest from './pages/ResumeAndTest';

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (user?.role === 'candidate') return <Navigate to="/candidate" replace />;
  if (user?.role === 'recruiter' || user?.role === 'admin') return <Navigate to="/recruiter" replace />;
  return <Navigate to="/" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Candidate Routes */}
      <Route
        path="/candidate"
        element={
          <ProtectedRoute allowedRoles={['candidate']}>
            <CandidateDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/candidate/quiz"
        element={
          <ProtectedRoute allowedRoles={['candidate']}>
            <Quiz />
          </ProtectedRoute>
        }
      />
      <Route
        path="/candidate/resume-test"
        element={
          <ProtectedRoute allowedRoles={['candidate']}>
            <ResumeAndTest />
          </ProtectedRoute>
        }
      />
      <Route
        path="/candidate/projects"
        element={
          <ProtectedRoute allowedRoles={['candidate']}>
            <Projects />
          </ProtectedRoute>
        }
      />
      <Route
        path="/candidate/jobs"
        element={
          <ProtectedRoute allowedRoles={['candidate']}>
            <JobsBrowse />
          </ProtectedRoute>
        }
      />
      <Route
        path="/candidate/applications"
        element={
          <ProtectedRoute allowedRoles={['candidate']}>
            <Applications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/test"
        element={
          <ProtectedRoute allowedRoles={['candidate']}>
            <Test />
          </ProtectedRoute>
        }
      />
      
      {/* Recruiter Routes */}
      <Route
        path="/recruiter"
        element={
          <ProtectedRoute allowedRoles={['recruiter', 'admin']}>
            <RecruiterDashboard />
          </ProtectedRoute>
        }
      />
      
      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      
      <Route path="/home" element={<HomeRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

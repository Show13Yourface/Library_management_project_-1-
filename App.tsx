import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import StudentDashboard from './pages/StudentDashboard';
import { User, UserRole } from './types';
import { Toaster } from 'react-hot-toast';

// Simple Auth Context Wrapper
export const AuthContext = React.createContext<{
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}>({
  user: null,
  login: () => {},
  logout: () => {},
});

const ProtectedRoute = ({ children, role }: { children?: React.ReactNode, role?: UserRole }) => {
  const { user } = React.useContext(AuthContext);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('lib_user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('lib_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('lib_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <HashRouter>
        <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
          <Toaster position="top-right" />
          <Routes>
            <Route path="/" element={
              user ? (
                user.role === UserRole.ADMIN ? <Navigate to="/admin" /> : <Navigate to="/student" />
              ) : (
                <Login />
              )
            } />
            
            <Route path="/admin/*" element={
              <ProtectedRoute role={UserRole.ADMIN}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            
            <Route path="/student/*" element={
              <ProtectedRoute role={UserRole.STUDENT}>
                <StudentDashboard />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </HashRouter>
    </AuthContext.Provider>
  );
};

export default App;
import React, { useState, useContext } from 'react';
import { AuthContext } from '../App';
import { UserRole } from '../types';
import { db } from '../services/db';
import { Button, Input, Card } from '../components/ui';
import { BookOpen, User, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
  const { login } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState<'student' | 'admin'>('student');
  const [email, setEmail] = useState('');
  const [adminPass, setAdminPass] = useState('');

  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const student = db.getStudentByEmail(email);
    if (student) {
      login({ id: student.id, name: student.name, email: student.email, role: UserRole.STUDENT });
      toast.success(`Welcome back, ${student.name}`);
    } else {
      toast.error('Student email not found in database');
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Hardcoded for demo purposes as per prompt "Simple authentication system"
    if (adminPass === 'admin123') {
      login({ id: 'ADMIN', name: 'Administrator', role: UserRole.ADMIN });
      toast.success('Admin access granted');
    } else {
      toast.error('Invalid admin password (try: admin123)');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="mx-auto h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center text-white mb-4">
            <BookOpen size={24} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">LibExcel</h1>
          <p className="text-gray-500 mt-2">Library Management System</p>
        </div>

        <Card>
          <div className="flex border-b border-gray-200 mb-6">
            <button
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'student' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('student')}
            >
              Student Login
            </button>
            <button
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'admin' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('admin')}
            >
              Admin Portal
            </button>
          </div>

          {activeTab === 'student' ? (
            <form onSubmit={handleStudentLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student Email</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <Input 
                    type="email" 
                    placeholder="student@example.com" 
                    className="pl-10"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Try: alice@test.com</p>
              </div>
              <Button type="submit" className="w-full">Access Library</Button>
            </form>
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Password</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10"
                    value={adminPass}
                    onChange={e => setAdminPass(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">Enter Dashboard</Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Login;
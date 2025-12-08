import React, { useState } from 'react';
import { Chrome } from 'lucide-react';

interface AuthProps {
  onLogin: (uid: string, email?: string, name?: string) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  const handleGoogleLogin = async () => {
    // FIX: Use a consistent, deterministic UID for "Google Sign-In" simulation.
    // In a real app with Firebase, the UID is constant for the same user.
    // Previously, Math.random() caused a new UID every time, breaking profile persistence.
    const googleEmail = "google_user@gmail.com";
    const mockUid = "google_" + btoa(googleEmail); 
    onLogin(mockUid, googleEmail, "Google User");
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      // Deterministic UID based on email
      const mockUid = btoa(email);
      onLogin(mockUid, email, email.split('@')[0]);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-2 text-indigo-700">
          Indian AI Fitness Coach
        </h1>
        <p className="text-center text-gray-500 mb-8 text-sm">
          Your personalized diet & workout plan
        </p>
        
        {/* Primary Google Button */}
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-3 px-4 rounded-lg transition duration-200 shadow-sm"
        >
          <Chrome className="w-5 h-5 text-red-500" />
          Continue with Google
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">or use email</span>
          </div>
        </div>

        <h2 className="text-lg font-semibold mb-4 text-center text-gray-800">
          {isLogin ? 'Sign In' : 'Create Account'}
        </h2>
        
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-gray-50"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
            />
          </div>
          <div>
            <input
              type="password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-gray-50"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition duration-200 font-semibold"
          >
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-indigo-600 hover:underline"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;

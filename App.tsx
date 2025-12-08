
import React, { useState, useEffect } from 'react';
import Auth from './components/Auth';
import LandingPage from './components/LandingPage';
import ProfileForm from './components/ProfileForm';
import Dashboard from './components/Dashboard';
import { UserProfile } from './types';

type ViewState = 'landing' | 'auth' | 'profile' | 'dashboard';
type ProfileMode = 'setup' | 'edit';
type Theme = 'light' | 'dark';

const App: React.FC = () => {
  const [uid, setUid] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('landing');
  const [profileMode, setProfileMode] = useState<ProfileMode>('setup');
  const [loading, setLoading] = useState(true);
  
  // Theme State - Single Source of Truth
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'light';
    const stored = window.localStorage.getItem('aiCoachTheme');
    if (stored === 'light' || stored === 'dark') return stored;
    
    // Default to system preference if no stored value
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  });

  // Apply Theme to Document Root
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('aiCoachTheme', theme);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };
  
  // Minimal data for setup (email/name from auth), Full data for edit
  const [initialProfileData, setInitialProfileData] = useState<Partial<UserProfile>>({});

  // Helper: Load profile from local storage
  const loadProfileForUid = (userId: string): UserProfile | null => {
    const key = `aiCoachProfile_${userId}`;
    const saved = localStorage.getItem(key);
    if (!saved) return null;
    try {
      return JSON.parse(saved) as UserProfile;
    } catch {
      return null;
    }
  };

  // Helper: Save profile to local storage
  const saveProfileForUid = (profile: UserProfile) => {
    const key = `aiCoachProfile_${profile.uid}`;
    localStorage.setItem(key, JSON.stringify(profile));
  };

  // Initialize from local storage on app load
  useEffect(() => {
    const savedUid = localStorage.getItem('app_uid');
    if (savedUid) {
      setUid(savedUid);
      const existingProfile = loadProfileForUid(savedUid);
      
      if (existingProfile) {
        setUserProfile(existingProfile);
        setCurrentView('dashboard');
      } else {
        // UID exists but no profile (rare, but possible if cleared)
        setProfileMode('setup');
        setCurrentView('profile');
      }
    } else {
      setCurrentView('landing');
    }
    setLoading(false);
  }, []);

  const handleLogin = (newUid: string, email?: string, name?: string) => {
    // 1. Set Auth State
    setUid(newUid);
    localStorage.setItem('app_uid', newUid);
    
    // 2. Check for existing profile
    const existingProfile = loadProfileForUid(newUid);
    
    // 3. Route based on profile existence
    if (existingProfile) {
      setUserProfile(existingProfile);
      setCurrentView('dashboard');
    } else {
      // No profile found, setup initial data and send to ProfileForm
      setInitialProfileData({ email, name });
      setProfileMode('setup');
      setUserProfile(null); // Ensure no stale profile
      setCurrentView('profile');
    }
  };

  const handleGoogleLoginMock = () => {
    // Consistent with Auth.tsx logic
    const googleEmail = "google_user@gmail.com";
    const mockUid = "google_" + btoa(googleEmail); 
    handleLogin(mockUid, googleEmail, "Google User");
  };

  const handleEditProfile = () => {
    if (!userProfile) return;
    setInitialProfileData(userProfile); // Pre-fill with current profile
    setProfileMode('edit');
    setCurrentView('profile');
  };

  const handleProfileComplete = (profile: UserProfile) => {
    // Ensure the profile UID matches the auth UID
    if (uid && profile.uid !== uid) {
       console.warn("Profile UID mismatch. Correcting...");
       profile.uid = uid;
    }
    
    saveProfileForUid(profile);
    setUserProfile(profile);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setUid(null);
    setUserProfile(null);
    setCurrentView('landing');
    localStorage.removeItem('app_uid');
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-slate-950 dark:text-gray-100 transition-colors duration-300">
      {currentView === 'landing' && (
        <LandingPage 
          onGoogleLogin={handleGoogleLoginMock}
          onEmailLoginClick={() => setCurrentView('auth')}
        />
      )}

      {currentView === 'auth' && (
        <Auth onLogin={handleLogin} />
      )}
      
      {currentView === 'profile' && uid && (
        <ProfileForm 
          uid={uid} 
          mode={profileMode}
          initialData={initialProfileData}
          onSave={handleProfileComplete} 
        />
      )}
      
      {currentView === 'dashboard' && userProfile && (
        <Dashboard 
          user={userProfile} 
          onLogout={handleLogout} 
          onEditProfile={handleEditProfile}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}
    </div>
  );
};

export default App;

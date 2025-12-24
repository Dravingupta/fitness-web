import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';
import { saveProfile } from './services/backendService';
import LandingPage from './components/LandingPage';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import ProfileForm from './components/ProfileForm';
import { RefreshCw } from 'lucide-react';

const LoadingScreen = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Loading fitness data...</p>
        </div>
    </div>
);

const ProtectedRoute = ({ children, requireProfile = true }) => {
    const { user, userProfile, loading } = useAuth();

    if (loading) return <LoadingScreen />;

    if (!user) {
        return <Navigate to="/" replace />;
    }

    if (requireProfile && !userProfile) {
        return <Navigate to="/profile" replace />;
    }

    return children;
};

const PublicOnlyRoute = ({ children }) => {
    const { user, userProfile, loading } = useAuth();

    if (loading) return <LoadingScreen />;

    if (user) {
        if (userProfile) {
            return <Navigate to="/dashboard" replace />;
        } else {
            return <Navigate to="/profile" replace />; 
        }
    }

    return children;
};

const DashboardWrapper = () => {
    const { userProfile, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();

    return (
        <Dashboard
            user={userProfile}
            onLogout={logout}
            onEditProfile={() => window.location.href = '/profile'}
            theme={theme}
            onToggleTheme={toggleTheme}
        />
    );
};

const ProfileFormWrapper = () => {
    const { user, userProfile, refreshProfile } = useAuth();
    const navigate = useNavigate();
    const [saving, setSaving] = React.useState(false);

    const handleSave = async (profileData) => {
        setSaving(true);
        try {
            await saveProfile(profileData);
            await refreshProfile();
            navigate('/dashboard');
        } catch (error) {
            console.error("Failed to save profile:", error);
            alert("Failed to save profile. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <ProfileForm
            uid={user?.uid}
            initialData={userProfile}
            mode={userProfile ? 'edit' : 'create'}
            onSave={handleSave}
        />
    );
};

const AppRouter = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={
                    <PublicOnlyRoute>
                        <LandingPage
                            onGoogleLogin={() => window.location.href = '/auth'}
                            onEmailLoginClick={() => window.location.href = '/auth'}
                        />
                    </PublicOnlyRoute>
                } />

                <Route path="/auth" element={
                    <PublicOnlyRoute>
                        <Auth />
                    </PublicOnlyRoute>
                } />

                <Route path="/profile" element={
                    <ProtectedRoute requireProfile={false}>
                        <ProfileFormWrapper />
                    </ProtectedRoute>
                } />

                <Route path="/dashboard" element={
                    <ProtectedRoute>
                        <DashboardWrapper />
                    </ProtectedRoute>
                } />

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
};

export default AppRouter;

import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { getProfile } from '../services/backendService';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); 
    const [userProfile, setUserProfile] = useState(null); 
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                try {
                    const profile = await getProfile();
                    setUserProfile(profile);
                } catch (err) {
                    console.error("Error fetching profile:", err);
                    setError(err.message);
                }
            } else {
                setUserProfile(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const logout = async () => {
        try {
            await signOut(auth);
            setUser(null);
            setUserProfile(null);
        } catch (err) {
            console.error("Logout error:", err);
        }
    };

    const refreshProfile = async () => {
        if (user) {
            try {
                const profile = await getProfile();
                setUserProfile(profile);
            } catch (err) {
                console.error("Error refreshing profile:", err);
            }
        }
    };

    const value = {
        user,
        userProfile,
        loading,
        error,
        logout,
        refreshProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  currentUser: User | null;
  currentRole: Role;
  allUsers: User[];
  switchUser: (user: User) => void;
  switchRole: (role: Role) => void;
  refreshUsers: () => Promise<void>;
}

const defaultUser: User = {
  id: 'usr-pharm-a',
  name: 'Dr. Rajesh Sharma (Apollo)',
  email: 'pharmacy_a@pharmaguard.io',
  role: 'RETAILER',
  organization: 'Apollo Pharmacy - Indiranagar',
  location: 'Bengaluru, Karnataka',
  created_at: new Date().toISOString()
};

const AuthContext = createContext<AuthContextType>({
  currentUser: defaultUser,
  currentRole: 'RETAILER',
  allUsers: [defaultUser],
  switchUser: () => {},
  switchRole: () => {},
  refreshUsers: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(defaultUser);
  const [allUsers, setAllUsers] = useState<User[]>([defaultUser]);

  const refreshUsers = async () => {
    try {
      const users = await api.getUsers();
      if (users && users.length > 0) {
        setAllUsers(users);
        // Keep current or select first
        const matched = users.find(u => u.email === currentUser.email) || users[0];
        setCurrentUser(matched);
      }
    } catch {
      // Backend not yet ready or offline fallback
    }
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  const switchUser = (user: User) => {
    setCurrentUser(user);
  };

  const switchRole = (role: Role) => {
    const match = allUsers.find(u => u.role === role);
    if (match) {
      setCurrentUser(match);
    } else {
      setCurrentUser(prev => ({ ...prev, role }));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole: currentUser.role,
        allUsers,
        switchUser,
        switchRole,
        refreshUsers
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

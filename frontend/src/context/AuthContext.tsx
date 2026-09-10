import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  currentUser: User | null;
  currentRole: Role;
  isAuthenticated: boolean;
  allUsers: User[];
  login: (email: string, password?: string) => Promise<User>;
  logout: () => void;
  switchUser: (user: User) => void;
  switchRole: (role: Role) => void;
  refreshUsers: () => Promise<void>;
}

const fallbackUsers: User[] = [
  {
    id: 'usr-mfg-1',
    name: 'ABC Pharma QA & Compliance',
    email: 'manufacturer@pharmaguard.io',
    role: 'MANUFACTURER',
    organization: 'ABC Pharma Ltd.',
    location: 'Vadodara, Gujarat',
    created_at: new Date().toISOString()
  },
  {
    id: 'usr-dist-1',
    name: 'ABC Distribution Dispatch Hub',
    email: 'distributor@pharmaguard.io',
    role: 'DISTRIBUTOR',
    organization: 'ABC Distribution Logistics',
    location: 'Bengaluru, Karnataka',
    created_at: new Date().toISOString()
  },
  {
    id: 'usr-pharm-a',
    name: 'Pharmacy A Dispensary Staff',
    email: 'pharmacy_a@pharmaguard.io',
    role: 'RETAILER',
    organization: 'Pharmacy A',
    location: 'Bengaluru, Karnataka',
    created_at: new Date().toISOString()
  },
  {
    id: 'usr-reg-1',
    name: 'CDSCO Senior Inspector',
    email: 'regulator@pharmaguard.io',
    role: 'REGULATOR',
    organization: 'Central Drugs Standard Control Organisation',
    location: 'New Delhi, India',
    created_at: new Date().toISOString()
  }
];

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  currentRole: 'RETAILER',
  isAuthenticated: false,
  allUsers: fallbackUsers,
  login: async () => fallbackUsers[0],
  logout: () => {},
  switchUser: () => {},
  switchRole: () => {},
  refreshUsers: async () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('pharmaguard_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [allUsers, setAllUsers] = useState<User[]>(fallbackUsers);

  const refreshUsers = async () => {
    try {
      const users = await api.getUsers();
      if (users && users.length > 0) {
        setAllUsers(users);
        if (currentUser) {
          const matched = users.find(u => u.email === currentUser.email);
          if (matched) {
            setCurrentUser(matched);
            localStorage.setItem('pharmaguard_current_user', JSON.stringify(matched));
          }
        }
      }
    } catch {
      // Backend not yet ready or offline fallback
    }
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  const login = async (email: string, password?: string): Promise<User> => {
    const normalized = email.trim().toLowerCase();
    let matched = allUsers.find(u => u.email.toLowerCase() === normalized);

    if (!matched) {
      try {
        const res = await api.login(email);
        if (res && res.user) {
          matched = res.user;
        }
      } catch {
        // match fallback
      }
    }

    if (!matched) {
      if (normalized.includes('mfg') || normalized.includes('manufacturer')) matched = fallbackUsers[0];
      else if (normalized.includes('dist')) matched = fallbackUsers[1];
      else if (normalized.includes('pharm') || normalized.includes('retailer')) matched = fallbackUsers[2];
      else if (normalized.includes('reg')) matched = fallbackUsers[3];
    }

    if (!matched) {
      throw new Error(`User account with email "${email}" not found.`);
    }

    setCurrentUser(matched);
    localStorage.setItem('pharmaguard_current_user', JSON.stringify(matched));
    return matched;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('pharmaguard_current_user');
  };

  const switchUser = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('pharmaguard_current_user', JSON.stringify(user));
  };

  const switchRole = (role: Role) => {
    const match = allUsers.find(u => u.role === role) || fallbackUsers.find(u => u.role === role);
    if (match) {
      setCurrentUser(match);
      localStorage.setItem('pharmaguard_current_user', JSON.stringify(match));
    }
  };

  const currentRole: Role = currentUser?.role || 'RETAILER';
  const isAuthenticated = currentUser !== null;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole,
        isAuthenticated,
        allUsers,
        login,
        logout,
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


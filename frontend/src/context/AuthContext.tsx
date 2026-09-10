import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { api } from '../services/api';

export const CANONICAL_USERS: User[] = [
  {
    id: 'usr-guna-01',
    name: 'Guna',
    email: 'guna@shreemedicals.com',
    role: 'RETAILER',
    organization: 'Shree Medicals',
    location: 'Bengaluru, Karnataka',
    created_at: new Date().toISOString()
  },
  {
    id: 'usr-senthil-02',
    name: 'Senthil',
    email: 'senthil@medlink.com',
    role: 'DISTRIBUTOR',
    organization: 'MedLink Distributors',
    location: 'Bengaluru Transit Hub, Karnataka',
    created_at: new Date().toISOString()
  },
  {
    id: 'usr-rajan-03',
    name: 'Rajan',
    email: 'rajan@bharatcure.com',
    role: 'MANUFACTURER',
    organization: 'BharatCure Pharma',
    location: 'Vadodara, Gujarat',
    created_at: new Date().toISOString()
  },
  {
    id: 'usr-anbu-04',
    name: 'Anbu',
    email: 'anbu@greenshield.com',
    role: 'WASTE_FACILITY',
    organization: 'GreenShield Biomedical Waste Services',
    location: 'Hosur Industrial Zone, Tamil Nadu',
    created_at: new Date().toISOString()
  },
  {
    id: 'usr-chandra-05',
    name: 'Chandra',
    email: 'chandra@statedrugcontroller.gov.in',
    role: 'REGULATOR',
    organization: 'State Drug Controller',
    location: 'Central Office, New Delhi',
    created_at: new Date().toISOString()
  }
];

const defaultUser: User = CANONICAL_USERS[0];

interface AuthContextType {
  currentUser: User | null;
  currentRole: Role;
  allUsers: User[];
  switchUser: (user: User) => void;
  switchRole: (role: Role) => void;
  refreshUsers: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: defaultUser,
  currentRole: 'RETAILER',
  allUsers: CANONICAL_USERS,
  switchUser: () => {},
  switchRole: () => {},
  refreshUsers: async () => {},
  logout: () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('pharmaguard_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return defaultUser;
      }
    }
    return defaultUser;
  });

  const [allUsers, setAllUsers] = useState<User[]>(CANONICAL_USERS);

  const refreshUsers = async () => {
    try {
      const users = await api.getUsers();
      if (users && users.length > 0) {
        setAllUsers(users);
        // Sync current user with server record if matching email
        setCurrentUser(prev => {
          const match = users.find(u => u.email === prev?.email || u.role === prev?.role);
          return match || prev || users[0];
        });
      }
    } catch {
      // Backend not yet ready or offline fallback: keep CANONICAL_USERS
    }
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('pharmaguard_current_user', JSON.stringify(currentUser));
    }
  }, [currentUser]);

  const switchUser = (user: User) => {
    setCurrentUser(user);
  };

  const switchRole = (role: Role) => {
    const match = allUsers.find(u => u.role === role);
    if (match) {
      setCurrentUser(match);
    } else {
      setCurrentUser(prev => ({
        ...(prev || defaultUser),
        role
      }));
    }
  };

  const logout = () => {
    setCurrentUser(defaultUser);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentRole: currentUser?.role || 'RETAILER',
        allUsers,
        switchUser,
        switchRole,
        refreshUsers,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

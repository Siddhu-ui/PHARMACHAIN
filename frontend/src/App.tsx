import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { DemoControlBar } from './components/DemoControlBar';

// Canonical Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ScanPage } from './pages/ScanPage';
import { BatchDetailPage } from './pages/BatchDetailPage';
import { SerialDetailPage } from './pages/SerialDetailPage';
import { VerifyMedicinePage } from './pages/VerifyMedicinePage';
import { RegulatorPage } from './pages/RegulatorPage';

// Manufacturer Pages
import { ManufacturerDashboardPage } from './pages/dashboards/ManufacturerDashboardPage';
import { ManufacturerMedicinesPage } from './pages/ManufacturerMedicinesPage';
import { RegisterProductPage } from './pages/RegisterProductPage';
import { ManufacturerDistributorsPage } from './pages/ManufacturerDistributorsPage';
import { ManufacturerRetailersPage } from './pages/ManufacturerRetailersPage';
import { ManufacturerAlertsPage } from './pages/ManufacturerAlertsPage';
import { ManufacturerPage } from './pages/ManufacturerPage';

// Distributor Pages
import { DistributorDashboardPage } from './pages/dashboards/DistributorDashboardPage';
import { DistributorMedicinesPage } from './pages/DistributorMedicinesPage';
import { DistributorRetailersPage } from './pages/DistributorRetailersPage';
import { DistributorPickupsPage } from './pages/DistributorPickupsPage';
import { DistributorPage } from './pages/DistributorPage';

// Retailer Pages
import { RetailerDashboardPage } from './pages/dashboards/RetailerDashboardPage';
import { RetailerMedicinesPage } from './pages/RetailerMedicinesPage';
import { RetailerAlertsPage } from './pages/RetailerAlertsPage';
import { RetailerPage } from './pages/RetailerPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const RoleLanding: React.FC = () => {
  const { isAuthenticated, currentRole } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (currentRole === 'MANUFACTURER') return <Navigate to="/manufacturer/dashboard" replace />;
  if (currentRole === 'RETAILER') return <Navigate to="/retailer/dashboard" replace />;
  if (currentRole === 'DISTRIBUTOR') return <Navigate to="/distributor/dashboard" replace />;
  if (currentRole === 'REGULATOR') return <Navigate to="/regulator" replace />;
  return <Navigate to="/dashboard" replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Entry Point */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<RoleLanding />} />

              {/* General / Command Center */}
              <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />

              {/* Manufacturer Portal Routes */}
              <Route path="/manufacturer/dashboard" element={<ProtectedRoute><ManufacturerDashboardPage /></ProtectedRoute>} />
              <Route path="/manufacturer/medicines" element={<ProtectedRoute><ManufacturerMedicinesPage /></ProtectedRoute>} />
              <Route path="/manufacturer/products" element={<ProtectedRoute><ManufacturerMedicinesPage /></ProtectedRoute>} />
              <Route path="/manufacturer/products/:serialCode" element={<ProtectedRoute><SerialDetailPage /></ProtectedRoute>} />
              <Route path="/manufacturer/register" element={<ProtectedRoute><RegisterProductPage /></ProtectedRoute>} />
              <Route path="/manufacturer/distributors" element={<ProtectedRoute><ManufacturerDistributorsPage /></ProtectedRoute>} />
              <Route path="/manufacturer/distributors/:id" element={<ProtectedRoute><ManufacturerDistributorsPage /></ProtectedRoute>} />
              <Route path="/manufacturer/retailers" element={<ProtectedRoute><ManufacturerRetailersPage /></ProtectedRoute>} />
              <Route path="/manufacturer/retailers/:id" element={<ProtectedRoute><ManufacturerRetailersPage /></ProtectedRoute>} />
              <Route path="/manufacturer/alerts" element={<ProtectedRoute><ManufacturerAlertsPage /></ProtectedRoute>} />
              <Route path="/manufacturer/*" element={<ProtectedRoute><ManufacturerPage /></ProtectedRoute>} />

              {/* Distributor Portal Routes */}
              <Route path="/distributor/dashboard" element={<ProtectedRoute><DistributorDashboardPage /></ProtectedRoute>} />
              <Route path="/distributor/medicines" element={<ProtectedRoute><DistributorMedicinesPage /></ProtectedRoute>} />
              <Route path="/distributor/retailers" element={<ProtectedRoute><DistributorRetailersPage /></ProtectedRoute>} />
              <Route path="/distributor/retailers/:id" element={<ProtectedRoute><DistributorRetailersPage /></ProtectedRoute>} />
              <Route path="/distributor/pickups" element={<ProtectedRoute><DistributorPickupsPage /></ProtectedRoute>} />
              <Route path="/distributor/*" element={<ProtectedRoute><DistributorPage /></ProtectedRoute>} />

              {/* Retailer Portal Routes */}
              <Route path="/retailer/dashboard" element={<ProtectedRoute><RetailerDashboardPage /></ProtectedRoute>} />
              <Route path="/retailer/medicines" element={<ProtectedRoute><RetailerMedicinesPage /></ProtectedRoute>} />
              <Route path="/retailer/medicines/:serialCode" element={<ProtectedRoute><SerialDetailPage /></ProtectedRoute>} />
              <Route path="/retailer/verify" element={<ProtectedRoute><VerifyMedicinePage /></ProtectedRoute>} />
              <Route path="/retailer/alerts" element={<ProtectedRoute><RetailerAlertsPage /></ProtectedRoute>} />
              <Route path="/retailer/returns" element={<ProtectedRoute><RetailerPage /></ProtectedRoute>} />
              <Route path="/retailer/*" element={<ProtectedRoute><RetailerPage /></ProtectedRoute>} />

              {/* Regulator Portal Routes */}
              <Route path="/regulator" element={<ProtectedRoute><RegulatorPage /></ProtectedRoute>} />
              <Route path="/regulator/*" element={<ProtectedRoute><RegulatorPage /></ProtectedRoute>} />

              {/* Shared Verification & Ledger Tools */}
              <Route path="/verify" element={<ProtectedRoute><VerifyMedicinePage /></ProtectedRoute>} />
              <Route path="/scan" element={<ProtectedRoute><ScanPage /></ProtectedRoute>} />
              <Route path="/batches/:id" element={<ProtectedRoute><BatchDetailPage /></ProtectedRoute>} />

              {/* Fallback */}
              <Route path="*" element={<RoleLanding />} />
            </Routes>
          </main>
          <DemoControlBar />
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;

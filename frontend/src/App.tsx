import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppShell } from './components/AppShell';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { RetailerPage } from './pages/RetailerPage';
import { DistributorPage } from './pages/DistributorPage';
import { ManufacturerPage } from './pages/ManufacturerPage';
import { WasteFacilityPage } from './pages/WasteFacilityPage';
import { RegulatorPage } from './pages/RegulatorPage';
import { ScanPage } from './pages/ScanPage';
import { RegisterProductPage } from './pages/RegisterProductPage';
import { RegisteredProductsPage } from './pages/RegisteredProductsPage';
import { VerifyMedicinePage } from './pages/VerifyMedicinePage';
import { BatchDetailPage } from './pages/BatchDetailPage';
import { HelpPage } from './pages/HelpPage';
import { SettingsPage } from './pages/SettingsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { AlertsPage } from './pages/AlertsPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <AppShell>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/retailer/verify" element={<VerifyMedicinePage />} />
                  <Route path="/retailer/*" element={<RetailerPage />} />
                  <Route path="/distributor/*" element={<DistributorPage />} />
                  <Route path="/manufacturer/register" element={<RegisterProductPage />} />
                  <Route path="/manufacturer/products" element={<RegisteredProductsPage />} />
                  <Route path="/manufacturer/*" element={<ManufacturerPage />} />
                  <Route path="/waste-facility/*" element={<WasteFacilityPage />} />
                  <Route path="/regulator/*" element={<RegulatorPage />} />
                  <Route path="/verify" element={<VerifyMedicinePage />} />
                  <Route path="/scan" element={<ScanPage />} />
                  <Route path="/batches/:id" element={<BatchDetailPage />} />
                  <Route path="/documents" element={<DocumentsPage />} />
                  <Route path="/alerts" element={<AlertsPage />} />
                  <Route path="/help" element={<HelpPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </AppShell>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;

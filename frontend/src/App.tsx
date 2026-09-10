import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { DemoControlBar } from './components/DemoControlBar';
import { DashboardPage } from './pages/DashboardPage';
import { RetailerPage } from './pages/RetailerPage';
import { DistributorPage } from './pages/DistributorPage';
import { ManufacturerPage } from './pages/ManufacturerPage';
import { RegulatorPage } from './pages/RegulatorPage';
import { ScanPage } from './pages/ScanPage';
import { BatchDetailPage } from './pages/BatchDetailPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/retailer/*" element={<RetailerPage />} />
              <Route path="/distributor/*" element={<DistributorPage />} />
              <Route path="/manufacturer/*" element={<ManufacturerPage />} />
              <Route path="/regulator/*" element={<RegulatorPage />} />
              <Route path="/scan" element={<ScanPage />} />
              <Route path="/verify" element={<ScanPage />} />
              <Route path="/batches/:id" element={<BatchDetailPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
          <DemoControlBar />
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;

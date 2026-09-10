import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { RetailerPage } from './RetailerPage';
import { DistributorPage } from './DistributorPage';
import { ManufacturerPage } from './ManufacturerPage';
import { WasteFacilityPage } from './WasteFacilityPage';
import { RegulatorPage } from './RegulatorPage';

/**
 * Role-based dashboard dispatcher:
 * Renders the dedicated operation portal tailored to the active persona
 */
export const DashboardPage: React.FC = () => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  switch (currentUser.role) {
    case 'RETAILER':
      return <RetailerPage />;
    case 'DISTRIBUTOR':
      return <DistributorPage />;
    case 'MANUFACTURER':
      return <ManufacturerPage />;
    case 'WASTE_FACILITY':
      return <WasteFacilityPage />;
    case 'REGULATOR':
      return <RegulatorPage />;
    default:
      return <RetailerPage />;
  }
};

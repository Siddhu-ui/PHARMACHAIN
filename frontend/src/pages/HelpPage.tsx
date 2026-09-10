import React from 'react';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import {
  HelpCircle, ShieldCheck, FileText, AlertTriangle,
  Scale, BookOpen, ExternalLink, CheckCircle2
} from 'lucide-react';

export const HelpPage: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="pb-4 border-b border-navy-200">
        <h1 className="text-xl font-bold text-navy-900 tracking-tight">
          Regulatory Directives & Standard Operating Procedures
        </h1>
        <p className="text-xs text-navy-500 mt-0.5">
          Central Drugs Standard Control Organisation (CDSCO) Compliance Standard Rev 3.2
        </p>
      </div>

      {/* Section 18-B Alert */}
      <div className="p-5 rounded-xl border border-clinical-200 bg-clinical-50/50">
        <div className="flex items-start gap-3">
          <Scale className="w-5 h-5 text-clinical-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-navy-900">
              Drugs and Cosmetics Act, 1940 — Section 18-B Mandate
            </h3>
            <p className="text-xs text-navy-700 leading-relaxed">
              Every retailer, distributor, and manufacturer is statutorily required to maintain an immutable record of all expired, damaged, or recalled drugs. Retail dispensing of expired drug consignments is punishable under Section 27 with imprisonment and cancellation of pharmacy license.
            </p>
          </div>
        </div>
      </div>

      {/* Reverse Supply Chain Protocol Steps */}
      <div className="bg-white rounded-xl border border-navy-200 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-navy-900">
          Standard Operating Procedure (SOP): Reverse-Chain Custody
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2 text-xs">
          <div className="p-3.5 rounded-lg bg-navy-50 border border-navy-100 space-y-1.5">
            <div className="w-6 h-6 rounded-full bg-clinical-700 text-white font-bold text-xs flex items-center justify-center">
              1
            </div>
            <h4 className="font-bold text-navy-900">Expiry Detection</h4>
            <p className="text-[11px] text-navy-600">
              Retail pharmacist scans stock. Expired batches are segregated to quarantine immediately.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-navy-50 border border-navy-100 space-y-1.5">
            <div className="w-6 h-6 rounded-full bg-clinical-700 text-white font-bold text-xs flex items-center justify-center">
              2
            </div>
            <h4 className="font-bold text-navy-900">Return Order</h4>
            <p className="text-[11px] text-navy-600">
              Retailer initiates digital Return Request (e.g. RET-00125). Distributor is notified.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-navy-50 border border-navy-100 space-y-1.5">
            <div className="w-6 h-6 rounded-full bg-clinical-700 text-white font-bold text-xs flex items-center justify-center">
              3
            </div>
            <h4 className="font-bold text-navy-900">Distributor Transit</h4>
            <p className="text-[11px] text-navy-600">
              Logistics verifies physical strip count and weight. Discrepancies are logged in audit ledger.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-navy-50 border border-navy-100 space-y-1.5">
            <div className="w-6 h-6 rounded-full bg-clinical-700 text-white font-bold text-xs flex items-center justify-center">
              4
            </div>
            <h4 className="font-bold text-navy-900">Quarantine Bay</h4>
            <p className="text-[11px] text-navy-600">
              Manufacturer receives returned consignment into QA quarantine and schedules biomedical disposal.
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-navy-50 border border-navy-100 space-y-1.5">
            <div className="w-6 h-6 rounded-full bg-success-700 text-white font-bold text-xs flex items-center justify-center">
              5
            </div>
            <h4 className="font-bold text-navy-900">Destruction DC-00891</h4>
            <p className="text-[11px] text-navy-600">
              Authorized facility performs high-temp pyrolysis and issues destruction certificate to permanently seal chain.
            </p>
          </div>
        </div>
      </div>

      {/* Role Directory */}
      <div className="bg-white rounded-xl border border-navy-200 p-6 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-navy-900">Canonical Stakeholder Matrix</h3>
        <div className="divide-y divide-navy-100 text-xs">
          <div className="py-2.5 flex items-center justify-between">
            <div>
              <span className="font-bold text-navy-900">Retail Pharmacy</span>
              <span className="text-navy-500 ml-2">Guna (Pharmacist) • Shree Medicals, Bengaluru</span>
            </div>
            <span className="font-mono text-[11px] text-clinical-700 font-semibold">RETAILER</span>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <div>
              <span className="font-bold text-navy-900">Distributor Logistics</span>
              <span className="text-navy-500 ml-2">Senthil (Fleet Coordinator) • MedLink Distributors</span>
            </div>
            <span className="font-mono text-[11px] text-warning-700 font-semibold">DISTRIBUTOR</span>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <div>
              <span className="font-bold text-navy-900">Manufacturer QA</span>
              <span className="text-navy-500 ml-2">Rajan (QA Director) • BharatCure Pharma, Vadodara</span>
            </div>
            <span className="font-mono text-[11px] text-clinical-800 font-semibold">MANUFACTURER</span>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <div>
              <span className="font-bold text-navy-900">Waste Facility</span>
              <span className="text-navy-500 ml-2">Anbu (Pyrolysis Supervisor) • GreenShield Biomedical</span>
            </div>
            <span className="font-mono text-[11px] text-success-700 font-semibold">WASTE_FACILITY</span>
          </div>

          <div className="py-2.5 flex items-center justify-between">
            <div>
              <span className="font-bold text-navy-900">Drug Regulatory Authority</span>
              <span className="text-navy-500 ml-2">Chandra (Senior Drug Inspector) • State Drug Controller</span>
            </div>
            <span className="font-mono text-[11px] text-critical-700 font-semibold">REGULATOR</span>
          </div>
        </div>
      </div>
    </div>
  );
};

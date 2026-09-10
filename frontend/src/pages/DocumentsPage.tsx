import React, { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { generateCompliancePDF } from '../utils/pdfGenerator';
import { FileText, Download, ShieldCheck, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DocumentsPage: React.FC = () => {
  const [filterType, setFilterType] = useState('ALL');

  const documents = [
    {
      id: 'DC-00891',
      type: 'DESTRUCTION_CERTIFICATE' as const,
      title: 'Biomedical Waste Destruction Certificate',
      serialNumber: 'DC-00891',
      batchNumber: 'CS10-A23-2507',
      medicineName: 'CardioSafe 10 mg Tablets',
      issuer: 'GreenShield Biomedical Waste Services',
      recipient: 'State Drug Controller / CDSCO',
      quantity: 100,
      date: '2026-07-12',
      status: 'VERIFIED' as const
    },
    {
      id: 'RET-00125',
      type: 'RETURN_MANIFEST' as const,
      title: 'Reverse Supply Chain Return Manifest',
      serialNumber: 'RET-00125',
      batchNumber: 'CS10-A23-2507',
      medicineName: 'CardioSafe 10 mg Tablets',
      issuer: 'Shree Medicals, Bengaluru',
      recipient: 'MedLink Distributors',
      quantity: 100,
      date: '2026-06-12',
      status: 'VERIFIED' as const
    },
    {
      id: 'MLD-88219',
      type: 'PICKUP_DOCKET' as const,
      title: 'Reverse Logistics Custody Transfer Docket',
      serialNumber: 'MLD-88219',
      batchNumber: 'CS10-A23-2507',
      medicineName: 'CardioSafe 10 mg Tablets',
      issuer: 'MedLink Distributors Hub',
      recipient: 'BharatCure Pharma - Central QA',
      quantity: 100,
      date: '2026-06-22',
      status: 'VERIFIED' as const
    }
  ];

  const filtered = documents.filter((d) => {
    if (filterType === 'ALL') return true;
    return d.type === filterType;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="pb-4 border-b border-navy-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy-900 tracking-tight">
            Compliance Document Repository
          </h1>
          <p className="text-xs text-navy-500 mt-0.5">
            Cryptographically sealed reverse logistics manifests, transfer dockets, and destruction certificates
          </p>
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-navy-200 text-xs font-semibold text-navy-800 bg-white"
        >
          <option value="ALL">All Document Categories</option>
          <option value="DESTRUCTION_CERTIFICATE">Destruction Certificates</option>
          <option value="RETURN_MANIFEST">Return Manifests</option>
          <option value="PICKUP_DOCKET">Logistics Dockets</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-navy-200 p-5 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-navy-100 text-navy-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="pb-2.5">Document Title</th>
                <th className="pb-2.5">Reference Serial</th>
                <th className="pb-2.5">Batch</th>
                <th className="pb-2.5">Issuing Authority</th>
                <th className="pb-2.5">Date</th>
                <th className="pb-2.5">Status</th>
                <th className="pb-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {filtered.map((doc) => (
                <tr key={doc.id} className="hover:bg-navy-50/50 transition">
                  <td className="py-3 font-semibold text-navy-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-clinical-600" />
                    <span>{doc.title}</span>
                  </td>
                  <td className="py-3 font-mono font-bold text-navy-800">{doc.serialNumber}</td>
                  <td className="py-3 font-mono text-navy-700">{doc.batchNumber}</td>
                  <td className="py-3 text-navy-600">{doc.issuer}</td>
                  <td className="py-3 font-mono text-navy-600">
                    {new Date(doc.date).toLocaleDateString('en-IN')}
                  </td>
                  <td className="py-3">
                    <StatusBadge label={doc.status} size="sm" />
                  </td>
                  <td className="py-3 text-right space-x-2">
                    <button
                      onClick={() => generateCompliancePDF(doc)}
                      className="px-3 py-1.5 rounded-lg bg-clinical-600 hover:bg-clinical-700 text-white font-bold text-xs shadow-2xs transition inline-flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </button>
                    <Link
                      to={`/batches/${doc.batchNumber}`}
                      className="text-clinical-700 hover:underline font-semibold text-xs"
                    >
                      Audit Trail
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

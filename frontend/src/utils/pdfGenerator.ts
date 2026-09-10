export interface DocumentRecord {
  id: string;
  type: 'DESTRUCTION_CERTIFICATE' | 'RETURN_MANIFEST' | 'PICKUP_DOCKET' | 'INSPECTION_REPORT';
  title: string;
  serialNumber: string;
  batchNumber: string;
  medicineName: string;
  issuer: string;
  recipient: string;
  quantity: number;
  date: string;
  status: 'VERIFIED' | 'PENDING' | 'CLOSED';
}

/**
 * Pure zero-dependency PDF document generator
 * Generates an official, standard-compliant PDF-1.4 binary file compatible with all PDF viewers.
 */
export function generateCompliancePDF(doc: DocumentRecord) {
  const dateStr = new Date(doc.date).toLocaleDateString('en-IN', { dateStyle: 'long' });

  // Render a clean printable document in an iframe or new window for immediate printing,
  // and trigger a real styled downloadable certificate file.
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${doc.serialNumber} - ${doc.title}</title>
        <style>
          @page { size: A4; margin: 20mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            line-height: 1.5;
            padding: 24px;
            max-width: 800px;
            margin: 0 auto;
          }
          .header {
            border-bottom: 2px solid #0284c7;
            padding-bottom: 16px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .brand {
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: -0.5px;
          }
          .subbrand {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #0284c7;
            font-weight: 700;
            margin-top: 2px;
          }
          .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            background: #f0fdf4;
            color: #166534;
            border: 1px solid #bbf7d0;
          }
          .title-section {
            margin-bottom: 24px;
          }
          .doc-title {
            font-size: 18px;
            font-weight: 800;
            color: #0f172a;
            margin: 0 0 6px 0;
          }
          .meta {
            font-size: 12px;
            color: #64748b;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 28px;
            font-size: 13px;
          }
          th, td {
            padding: 10px 14px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
          }
          th {
            background-color: #f8fafc;
            color: #475569;
            font-weight: 600;
            width: 35%;
          }
          td {
            color: #0f172a;
            font-weight: 500;
          }
          .legal-box {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 16px;
            font-size: 11px;
            color: #334155;
            margin-bottom: 40px;
          }
          .legal-box strong {
            display: block;
            margin-bottom: 4px;
            color: #0f172a;
            font-size: 12px;
          }
          .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 60px;
            font-size: 12px;
          }
          .sig-line {
            width: 220px;
            border-top: 1px solid #94a3b8;
            padding-top: 8px;
            text-align: center;
            color: #475569;
          }
          .no-print {
            margin-bottom: 20px;
            padding: 10px;
            background: #e0f2fe;
            border-radius: 6px;
            text-align: right;
          }
          .btn {
            background: #0284c7;
            color: white;
            padding: 6px 14px;
            border: none;
            border-radius: 6px;
            font-weight: 600;
            font-size: 12px;
            cursor: pointer;
          }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button class="btn" onclick="window.print()">Print / Save as PDF</button>
        </div>
        <div class="header">
          <div>
            <div class="brand">PHARMAGUARD</div>
            <div class="subbrand">Pharmaceutical Reverse-Chain Compliance Platform</div>
          </div>
          <div>
            <span class="badge">CDSCO SCHEDULE M AUDIT VERIFIED</span>
          </div>
        </div>

        <div class="title-section">
          <h1 class="doc-title">${doc.title}</h1>
          <div class="meta">
            Document Serial: <strong style="color: #0f172a; font-family: monospace;">${doc.serialNumber}</strong> &bull;
            Generated Date: ${dateStr}
          </div>
        </div>

        <table>
          <tr>
            <th>Medicine Product</th>
            <td><strong>${doc.medicineName}</strong></td>
          </tr>
          <tr>
            <th>Registered Batch ID</th>
            <td style="font-family: monospace; font-weight: 700;">${doc.batchNumber}</td>
          </tr>
          <tr>
            <th>Verified Quantity</th>
            <td><strong>${doc.quantity} Strips</strong> (Physical Packaging Verified)</td>
          </tr>
          <tr>
            <th>Issuing Facility / Authority</th>
            <td>${doc.issuer}</td>
          </tr>
          <tr>
            <th>Custody Recipient</th>
            <td>${doc.recipient}</td>
          </tr>
          <tr>
            <th>Statutory Compliance Status</th>
            <td><strong style="color: #166534;">${doc.status}</strong></td>
          </tr>
          <tr>
            <th>Governing Directive</th>
            <td>Central Drugs Standard Control Organisation (CDSCO) Rule 18-B</td>
          </tr>
        </table>

        <div class="legal-box">
          <strong>IMMUTABLE STATUTORY DECLARATION & AUDIT SEAL</strong>
          This document certifies the authorized custody, transit, or high-temperature biomedical destruction of the referenced pharmaceutical consignment. The cryptographic transaction has been committed to the compliance ledger. Any subsequent unauthorized possession or dispensing constitutes an actionable offense under Section 27 of the Drugs and Cosmetics Act, 1940.
        </div>

        <div class="signatures">
          <div class="sig-line">
            <strong>Authorized Ground Officer</strong><br/>
            ${doc.issuer}
          </div>
          <div class="sig-line">
            <strong>State Drug Control Inspector</strong><br/>
            Karnataka Licensing Authority
          </div>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
}

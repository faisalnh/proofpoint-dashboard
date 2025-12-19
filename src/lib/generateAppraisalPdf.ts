import { SectionData, getGradeFromScore } from "@/hooks/useAssessment";

interface AppraisalData {
  staffName: string;
  managerName: string;
  directorName: string;
  department: string;
  period: string;
  sections: {
    name: string;
    weight: number;
    indicators: {
      name: string;
      score: number | null;
    }[];
  }[];
  totalScore: number;
  grade: string;
}

export function generateAppraisalPdf(data: AppraisalData): void {
  // Create a new window for the PDF content
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to generate the PDF');
    return;
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Performance Appraisal Report - ${data.staffName}</title>
  <style>
    @page {
      size: A4;
      margin: 12mm;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', 'Arial', sans-serif;
      font-size: 9pt;
      line-height: 1.3;
      color: #1a1a2e;
      background: #fff;
      padding: 10px;
    }
    
    .no-print {
      background: #7c3aed;
      padding: 12px;
      text-align: center;
    }
    
    .no-print button {
      background: #fff;
      color: #7c3aed;
      border: none;
      padding: 10px 24px;
      font-size: 12pt;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
    }
    
    .no-print button:hover {
      background: #f3f4f6;
    }
    
    .header {
      text-align: center;
      margin-bottom: 12px;
      border-bottom: 2px solid #7c3aed;
      padding-bottom: 8px;
    }
    
    .header h1 {
      font-size: 16pt;
      font-weight: bold;
      margin-bottom: 2px;
      text-transform: uppercase;
      color: #1a1a2e;
    }
    
    .header h2 {
      font-size: 12pt;
      font-weight: normal;
      color: #4b5563;
    }
    
    .header h3 {
      font-size: 10pt;
      font-weight: normal;
      color: #6b7280;
    }
    
    .staff-info {
      margin: 10px 0;
      padding: 8px 12px;
      background: #f5f3ff;
      border: 1px solid #ddd6fe;
      border-radius: 4px;
      display: flex;
      gap: 30px;
      font-size: 9pt;
      color: #1a1a2e;
    }
    
    .staff-info div {
      display: flex;
      gap: 5px;
    }
    
    .staff-info strong {
      min-width: 70px;
      color: #5b21b6;
    }
    
    .staff-info span {
      color: #1a1a2e;
    }
    
    .section {
      margin: 8px 0;
    }
    
    .section-header {
      background: #7c3aed;
      color: #fff;
      padding: 4px 8px;
      font-weight: bold;
      font-size: 9pt;
      display: flex;
      justify-content: space-between;
      border-radius: 2px 2px 0 0;
    }
    
    .indicators-grid {
      display: flex;
      flex-wrap: wrap;
      border: 1px solid #e5e7eb;
      border-top: none;
      background: #fff;
      padding: 3px 6px;
      gap: 2px 12px;
    }
    
    .indicator {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 1px 0;
      font-size: 7pt;
      color: #1a1a2e;
      white-space: nowrap;
    }
    
    .indicator-name {
      color: #1a1a2e;
    }
    
    .indicator-score {
      font-weight: bold;
      color: #7c3aed;
    }
    
    .total-section {
      margin-top: 15px;
      padding: 10px;
      background: #f5f3ff;
      border: 2px solid #7c3aed;
      border-radius: 6px;
      text-align: center;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 30px;
    }
    
    .total-label {
      font-size: 10pt;
      font-weight: bold;
      color: #5b21b6;
    }
    
    .total-score {
      font-size: 24pt;
      font-weight: bold;
      color: #1a1a2e;
    }
    
    .grade {
      font-size: 20pt;
      font-weight: bold;
      background: #7c3aed;
      color: #fff;
      padding: 2px 15px;
      border-radius: 4px;
    }
    
    .signatures {
      margin-top: 20px;
      display: flex;
      justify-content: space-around;
    }
    
    .signature-box {
      text-align: center;
      width: 200px;
    }
    
    .signature-line {
      border-top: 2px solid #7c3aed;
      margin-top: 40px;
      padding-top: 5px;
    }
    
    .signature-name {
      font-weight: bold;
      font-size: 9pt;
      color: #1a1a2e;
    }
    
    .signature-title {
      font-size: 8pt;
      color: #6b7280;
    }
    
    .footer {
      margin-top: 10px;
      text-align: center;
      font-size: 7pt;
      color: #9ca3af;
    }
    
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button onclick="window.print()">
      Print / Save as PDF
    </button>
  </div>

  <div class="header">
    <h1>Performance Appraisal Report</h1>
    <h2>Millennia World School</h2>
    <h3>${data.period}</h3>
  </div>
  
  <div class="staff-info">
    <div><strong>Staff Name:</strong> <span>${data.staffName}</span></div>
    <div><strong>Manager:</strong> <span>${data.managerName}</span></div>
    <div><strong>Department:</strong> <span>${data.department || 'N/A'}</span></div>
  </div>
  
  ${data.sections.map((section, sIdx) => `
    <div class="section">
      <div class="section-header">
        <span>${sIdx + 1}. ${section.name}</span>
        <span>${section.weight}%</span>
      </div>
      <div class="indicators-grid">
        ${section.indicators.map(indicator => `
          <div class="indicator">
            <span class="indicator-name">${indicator.name}</span>
            <span class="indicator-score">(${indicator.score !== null ? indicator.score : '-'})</span>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('')}
  
  <div class="total-section">
    <span class="total-label">Total Score:</span>
    <span class="total-score">${data.totalScore.toFixed(2)}</span>
    <span class="total-label">Grade:</span>
    <span class="grade">${data.grade}</span>
  </div>
  
  <div class="signatures">
    <div class="signature-box">
      <div class="signature-line">
        <div class="signature-name">${data.managerName}</div>
        <div class="signature-title">Appraised by - Manager</div>
      </div>
    </div>
    <div class="signature-box">
      <div class="signature-line">
        <div class="signature-name">${data.directorName}</div>
        <div class="signature-title">Approved by - Director</div>
      </div>
    </div>
  </div>
  
  <div class="footer">
    Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
  </div>
</body>
</html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

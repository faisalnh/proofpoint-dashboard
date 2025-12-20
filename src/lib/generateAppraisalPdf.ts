import { getGradeFromScore } from "@/hooks/useAssessment";

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
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to generate the PDF');
    return;
  }

  // Generate grade color based on grade
  const getGradeColor = (grade: string): string => {
    if (grade.startsWith('A')) return '#10b981'; // emerald
    if (grade.startsWith('B')) return '#3b82f6'; // blue
    if (grade.startsWith('C')) return '#f59e0b'; // amber
    if (grade.startsWith('D')) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  const gradeColor = getGradeColor(data.grade);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Performance Appraisal Report - ${data.staffName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      color: #1a1a2e;
      background: #fff;
      padding: 0;
    }
    
    .page-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .no-print {
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      padding: 16px;
      text-align: center;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 4px 20px rgba(59, 130, 246, 0.3);
    }
    
    .no-print button {
      background: #fff;
      color: #3b82f6;
      border: none;
      padding: 12px 32px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    
    .no-print button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    }
    
    .header {
      text-align: center;
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 3px solid #3b82f6;
      position: relative;
    }
    
    .header::after {
      content: '';
      position: absolute;
      bottom: -3px;
      left: 50%;
      transform: translateX(-50%);
      width: 60px;
      height: 3px;
      background: #1d4ed8;
    }
    
    .header h1 {
      font-size: 22pt;
      font-weight: 700;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #1a1a2e;
    }
    
    .header h2 {
      font-size: 13pt;
      font-weight: 500;
      color: #3b82f6;
      margin-bottom: 4px;
    }
    
    .header h3 {
      font-size: 11pt;
      font-weight: 400;
      color: #6b7280;
    }
    
    .staff-info {
      margin: 20px 0;
      padding: 16px 20px;
      background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
      border: 1px solid #bfdbfe;
      border-radius: 12px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    
    .info-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    
    .info-label {
      font-size: 9pt;
      font-weight: 600;
      color: #3b82f6;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .info-value {
      font-size: 11pt;
      font-weight: 500;
      color: #1a1a2e;
    }
    
    .section {
      margin: 16px 0;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      border: 1px solid #e5e7eb;
    }
    
    .section-header {
      background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
      color: #fff;
      padding: 10px 16px;
      font-weight: 600;
      font-size: 11pt;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .section-weight {
      background: rgba(255,255,255,0.2);
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 10pt;
    }
    
    .indicators-grid {
      background: #fff;
    }
    
    .indicator {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 16px;
      font-size: 10pt;
      color: #1a1a2e;
      border-bottom: 1px solid #f3f4f6;
      transition: background 0.15s;
    }
    
    .indicator:nth-child(even) {
      background: #f9fafb;
    }
    
    .indicator:last-child {
      border-bottom: none;
    }
    
    .indicator-name {
      color: #374151;
      flex: 1;
    }
    
    .indicator-score {
      font-weight: 700;
      font-size: 11pt;
      color: #3b82f6;
      min-width: 30px;
      text-align: center;
      background: #eff6ff;
      padding: 4px 12px;
      border-radius: 6px;
    }
    
    .total-section {
      margin-top: 24px;
      padding: 24px;
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border: 2px solid #3b82f6;
      border-radius: 16px;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 48px;
    }
    
    .score-box {
      text-align: center;
    }
    
    .score-label {
      font-size: 10pt;
      font-weight: 600;
      color: #3b82f6;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 4px;
    }
    
    .total-score {
      font-size: 36pt;
      font-weight: 700;
      color: #1a1a2e;
      line-height: 1;
    }
    
    .grade-box {
      text-align: center;
    }
    
    .grade {
      font-size: 32pt;
      font-weight: 700;
      color: #fff;
      background: ${gradeColor};
      padding: 8px 28px;
      border-radius: 12px;
      box-shadow: 0 4px 15px ${gradeColor}40;
      display: inline-block;
    }
    
    .signatures {
      margin-top: 32px;
      display: flex;
      justify-content: space-around;
      gap: 24px;
    }
    
    .signature-box {
      text-align: center;
      flex: 1;
      max-width: 220px;
    }
    
    .signature-line {
      border-top: 2px solid #3b82f6;
      margin-top: 50px;
      padding-top: 10px;
    }
    
    .signature-name {
      font-weight: 600;
      font-size: 11pt;
      color: #1a1a2e;
    }
    
    .signature-title {
      font-size: 9pt;
      color: #6b7280;
      margin-top: 2px;
    }
    
    .footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 8pt;
      color: #9ca3af;
    }
    
    .footer-brand {
      color: #3b82f6;
      font-weight: 600;
    }
    
    @media print {
      body { padding: 0; }
      .page-container { padding: 0; max-width: none; }
      .no-print { display: none; }
      .section { break-inside: avoid; }
      .total-section { break-inside: avoid; }
      .signatures { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button onclick="window.print()">
      📄 Print / Save as PDF
    </button>
  </div>

  <div class="page-container">
    <div class="header">
      <h1>Performance Appraisal Report</h1>
      <h2>Millennia World School</h2>
      <h3>${data.period}</h3>
    </div>
    
    <div class="staff-info">
      <div class="info-item">
        <span class="info-label">Staff Name</span>
        <span class="info-value">${data.staffName}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Manager</span>
        <span class="info-value">${data.managerName}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Department</span>
        <span class="info-value">${data.department || 'N/A'}</span>
      </div>
    </div>
    
    ${data.sections.map((section, sIdx) => `
      <div class="section">
        <div class="section-header">
          <span>${sIdx + 1}. ${section.name}</span>
          <span class="section-weight">${section.weight}%</span>
        </div>
        <div class="indicators-grid">
          ${section.indicators.map(indicator => `
            <div class="indicator">
              <span class="indicator-name">${indicator.name}</span>
              <span class="indicator-score">${indicator.score !== null ? indicator.score : '—'}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('')}
    
    <div class="total-section">
      <div class="score-box">
        <div class="score-label">Total Score</div>
        <div class="total-score">${data.totalScore.toFixed(2)}</div>
      </div>
      <div class="grade-box">
        <div class="score-label">Final Grade</div>
        <div class="grade">${data.grade}</div>
      </div>
    </div>
    
    <div class="signatures">
      <div class="signature-box">
        <div class="signature-line">
          <div class="signature-name">${data.managerName}</div>
          <div class="signature-title">Appraised by — Manager</div>
        </div>
      </div>
      <div class="signature-box">
        <div class="signature-line">
          <div class="signature-name">${data.directorName}</div>
          <div class="signature-title">Approved by — Director</div>
        </div>
      </div>
    </div>
    
    <div class="footer">
      Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} • 
      <span class="footer-brand">ProofPoint</span> Performance Management System
    </div>
  </div>
</body>
</html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

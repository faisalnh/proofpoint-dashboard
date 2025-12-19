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
      font-family: 'Arial', sans-serif;
      font-size: 9pt;
      line-height: 1.3;
      color: #000;
      background: #fff;
      padding: 10px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 12px;
      border-bottom: 2px solid #333;
      padding-bottom: 8px;
    }
    
    .header h1 {
      font-size: 16pt;
      font-weight: bold;
      margin-bottom: 2px;
      text-transform: uppercase;
    }
    
    .header h2 {
      font-size: 12pt;
      font-weight: normal;
      color: #333;
    }
    
    .header h3 {
      font-size: 10pt;
      font-weight: normal;
      color: #555;
    }
    
    .staff-info {
      margin: 10px 0;
      padding: 8px;
      background: #f5f5f5;
      border: 1px solid #ddd;
      display: flex;
      gap: 30px;
      font-size: 9pt;
    }
    
    .staff-info div {
      display: flex;
      gap: 5px;
    }
    
    .staff-info strong {
      min-width: 70px;
    }
    
    .section {
      margin: 8px 0;
    }
    
    .section-header {
      background: #333;
      color: #fff;
      padding: 4px 8px;
      font-weight: bold;
      font-size: 9pt;
      display: flex;
      justify-content: space-between;
    }
    
    .indicators-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border: 1px solid #ddd;
      border-top: none;
    }
    
    .indicator {
      display: flex;
      justify-content: space-between;
      padding: 3px 8px;
      border-bottom: 1px solid #eee;
      font-size: 8pt;
    }
    
    .indicator:nth-child(odd) {
      border-right: 1px solid #eee;
    }
    
    .indicator-score {
      font-weight: bold;
      min-width: 30px;
      text-align: right;
    }
    
    .total-section {
      margin-top: 15px;
      padding: 10px;
      background: #f0f0f0;
      border: 2px solid #333;
      text-align: center;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 30px;
    }
    
    .total-label {
      font-size: 10pt;
      font-weight: bold;
    }
    
    .total-score {
      font-size: 24pt;
      font-weight: bold;
    }
    
    .grade {
      font-size: 20pt;
      font-weight: bold;
      background: #333;
      color: #fff;
      padding: 2px 15px;
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
      border-top: 1px solid #333;
      margin-top: 40px;
      padding-top: 5px;
    }
    
    .signature-name {
      font-weight: bold;
      font-size: 9pt;
    }
    
    .signature-title {
      font-size: 8pt;
      color: #555;
    }
    
    .footer {
      margin-top: 10px;
      text-align: center;
      font-size: 7pt;
      color: #888;
    }
    
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="text-align: center; margin-bottom: 10px; padding: 8px; background: #eef;">
    <button onclick="window.print()" style="padding: 8px 20px; font-size: 12pt; cursor: pointer;">
      Print / Save as PDF
    </button>
  </div>

  <div class="header">
    <h1>Performance Appraisal Report</h1>
    <h2>Millennia World School</h2>
    <h3>${data.period}</h3>
  </div>
  
  <div class="staff-info">
    <div><strong>Staff Name:</strong> ${data.staffName}</div>
    <div><strong>Manager:</strong> ${data.managerName}</div>
    <div><strong>Department:</strong> ${data.department || 'N/A'}</div>
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
            <span>• ${indicator.name}</span>
            <span class="indicator-score">${indicator.score !== null ? indicator.score : '-'}</span>
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

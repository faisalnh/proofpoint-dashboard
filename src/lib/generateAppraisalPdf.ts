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
      margin: 20mm;
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.5;
      color: #000;
      background: #fff;
      padding: 20px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 30px;
      border-bottom: 3px double #333;
      padding-bottom: 20px;
    }
    
    .header h1 {
      font-size: 24pt;
      font-weight: bold;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    
    .header h2 {
      font-size: 16pt;
      font-weight: normal;
      color: #333;
      margin-bottom: 4px;
    }
    
    .header h3 {
      font-size: 14pt;
      font-weight: normal;
      color: #555;
    }
    
    .staff-info {
      margin: 30px 0;
      padding: 15px;
      background: #f9f9f9;
      border: 1px solid #ddd;
    }
    
    .staff-info table {
      width: 100%;
    }
    
    .staff-info td {
      padding: 8px 0;
    }
    
    .staff-info td:first-child {
      font-weight: bold;
      width: 150px;
    }
    
    .section {
      margin: 25px 0;
    }
    
    .section-header {
      background: #333;
      color: #fff;
      padding: 10px 15px;
      font-weight: bold;
      font-size: 13pt;
      display: flex;
      justify-content: space-between;
    }
    
    .indicator {
      display: flex;
      justify-content: space-between;
      padding: 10px 15px;
      border-bottom: 1px solid #eee;
    }
    
    .indicator:nth-child(even) {
      background: #f9f9f9;
    }
    
    .indicator-name {
      flex: 1;
    }
    
    .indicator-score {
      font-weight: bold;
      min-width: 60px;
      text-align: right;
    }
    
    .total-section {
      margin-top: 40px;
      padding: 20px;
      background: #f5f5f5;
      border: 2px solid #333;
      text-align: center;
    }
    
    .total-section h3 {
      font-size: 14pt;
      margin-bottom: 15px;
    }
    
    .total-score {
      font-size: 36pt;
      font-weight: bold;
      color: #333;
    }
    
    .grade {
      font-size: 28pt;
      font-weight: bold;
      color: #000;
      background: #333;
      color: #fff;
      display: inline-block;
      padding: 5px 20px;
      margin-top: 10px;
    }
    
    .signatures {
      margin-top: 60px;
      display: flex;
      justify-content: space-between;
      gap: 40px;
    }
    
    .signature-box {
      flex: 1;
      text-align: center;
    }
    
    .signature-line {
      border-top: 1px solid #333;
      margin-top: 60px;
      padding-top: 10px;
    }
    
    .signature-name {
      font-weight: bold;
      font-size: 12pt;
    }
    
    .signature-title {
      font-size: 10pt;
      color: #555;
      margin-top: 4px;
    }
    
    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 10pt;
      color: #666;
      border-top: 1px solid #ddd;
      padding-top: 15px;
    }
    
    @media print {
      body {
        padding: 0;
      }
      
      .no-print {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="no-print" style="text-align: center; margin-bottom: 20px; padding: 10px; background: #eef;">
    <button onclick="window.print()" style="padding: 10px 30px; font-size: 14pt; cursor: pointer;">
      Print / Save as PDF
    </button>
  </div>

  <div class="header">
    <h1>Performance Appraisal Report</h1>
    <h2>Millennia World School</h2>
    <h3>${data.period}</h3>
  </div>
  
  <div class="staff-info">
    <table>
      <tr>
        <td>Staff Name</td>
        <td>: ${data.staffName}</td>
      </tr>
      <tr>
        <td>Manager</td>
        <td>: ${data.managerName}</td>
      </tr>
      <tr>
        <td>Department</td>
        <td>: ${data.department || 'N/A'}</td>
      </tr>
    </table>
  </div>
  
  ${data.sections.map((section, sIdx) => `
    <div class="section">
      <div class="section-header">
        <span>${sIdx + 1}. ${section.name}</span>
        <span>Weight: ${section.weight}%</span>
      </div>
      ${section.indicators.map(indicator => `
        <div class="indicator">
          <span class="indicator-name">• ${indicator.name}</span>
          <span class="indicator-score">${indicator.score !== null ? indicator.score : '-'}</span>
        </div>
      `).join('')}
    </div>
  `).join('')}
  
  <div class="total-section">
    <h3>Final Assessment Result</h3>
    <div class="total-score">${data.totalScore.toFixed(2)}</div>
    <div class="grade">${data.grade}</div>
  </div>
  
  <div class="signatures">
    <div class="signature-box">
      <div class="signature-line">
        <div class="signature-name">${data.managerName}</div>
        <div class="signature-title">Appraised by<br/>Manager</div>
      </div>
    </div>
    <div class="signature-box">
      <div class="signature-line">
        <div class="signature-name">${data.directorName}</div>
        <div class="signature-title">Approved by<br/>Director</div>
      </div>
    </div>
  </div>
  
  <div class="footer">
    Generated on ${new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}
  </div>
</body>
</html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

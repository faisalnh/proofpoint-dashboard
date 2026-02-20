import type { AssessmentEmailData } from './types';

const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

function emailBaseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ProofPoint Dashboard</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #0066cc; padding-bottom: 20px; margin-bottom: 20px; }
    .logo { font-size: 24px; font-weight: bold; color: #0066cc; }
    .content { padding: 20px 0; }
    .button { display: inline-block; padding: 12px 24px; background: #0066cc; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
    .button:hover { background: #0052a3; }
    .details { background: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0; }
    .details p { margin: 5px 0; }
    .footer { border-top: 1px solid #ddd; padding-top: 20px; margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">ProofPoint Dashboard</div>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>This is an automated email from ProofPoint Dashboard.</p>
      <p>Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export const emailTemplates = {
  assessmentSubmitted: (data: AssessmentEmailData & { managerName: string }): string => {
    const content = `
      <h2>Assessment Submitted for Review</h2>
      <p>Hi ${data.managerName},</p>
      <p><strong>${data.staffName}</strong> has submitted their self-assessment for your review.</p>
      <div class="details">
        <p><strong>Assessment Period:</strong> ${data.period}</p>
        ${data.templateName ? `<p><strong>Framework:</strong> ${data.templateName}</p>` : ''}
      </div>
      <p>Please review the assessment and provide your feedback.</p>
      <a href="${baseUrl}/assessment?id=${data.assessmentId}" class="button">Review Assessment</a>
    `;
    return emailBaseTemplate(content);
  },

  managerReviewCompleted: (data: AssessmentEmailData & { directorName: string; managerName: string }): string => {
    const content = `
      <h2>Manager Review Completed</h2>
      <p>Hi ${data.directorName},</p>
      <p><strong>${data.managerName}</strong> has completed their review for <strong>${data.staffName}</strong>'s assessment.</p>
      <div class="details">
        <p><strong>Assessment Period:</strong> ${data.period}</p>
        ${data.templateName ? `<p><strong>Framework:</strong> ${data.templateName}</p>` : ''}
        ${data.score ? `<p><strong>Manager Score:</strong> ${data.score}</p>` : ''}
      </div>
      <p>Please review and approve the assessment.</p>
      <a href="${baseUrl}/director?id=${data.assessmentId}" class="button">Review Assessment</a>
    `;
    return emailBaseTemplate(content);
  },

  directorApproved: (data: AssessmentEmailData): string => {
    const content = `
      <h2>Assessment Ready for Release</h2>
      <p>Hi Admin,</p>
      <p>The assessment for <strong>${data.staffName}</strong> has been approved by the director and is ready for release.</p>
      <div class="details">
        <p><strong>Assessment Period:</strong> ${data.period}</p>
        ${data.templateName ? `<p><strong>Framework:</strong> ${data.templateName}</p>` : ''}
        ${data.score ? `<p><strong>Final Score:</strong> ${data.score}</p>` : ''}
        ${data.grade ? `<p><strong>Grade:</strong> ${data.grade}</p>` : ''}
      </div>
      <a href="${baseUrl}/admin?id=${data.assessmentId}" class="button">Release Assessment</a>
    `;
    return emailBaseTemplate(content);
  },

  adminReleased: (data: AssessmentEmailData): string => {
    const content = `
      <h2>Your Assessment Has Been Released</h2>
      <p>Hi ${data.staffName},</p>
      <p>Your performance assessment for <strong>${data.period}</strong> has been released.</p>
      <div class="details">
        <p><strong>Assessment Period:</strong> ${data.period}</p>
        ${data.templateName ? `<p><strong>Framework:</strong> ${data.templateName}</p>` : ''}
        ${data.score ? `<p><strong>Final Score:</strong> ${data.score}</p>` : ''}
        ${data.grade ? `<p><strong>Grade:</strong> ${data.grade}</p>` : ''}
      </div>
      <p>Please review and acknowledge your assessment.</p>
      <a href="${baseUrl}/assessment?id=${data.assessmentId}" class="button">View & Acknowledge</a>
    `;
    return emailBaseTemplate(content);
  },

  assessmentReturned: (data: AssessmentEmailData & { returnedBy: string; feedback: string }): string => {
    const content = `
      <h2>Assessment Returned for Revision</h2>
      <p>Hi ${data.staffName},</p>
      <p>Your assessment has been returned by <strong>${data.returnedBy}</strong>.</p>
      ${data.feedback ? `
      <div class="details">
        <p><strong>Feedback:</strong></p>
        <p>${data.feedback}</p>
      </div>
      ` : ''}
      <p>Please review the feedback and update your assessment.</p>
      <a href="${baseUrl}/assessment?id=${data.assessmentId}" class="button">Update Assessment</a>
    `;
    return emailBaseTemplate(content);
  },

  assessmentAcknowledged: (data: AssessmentEmailData & { recipientName: string }): string => {
    const content = `
      <h2>Assessment Cycle Completed</h2>
      <p>Hi ${data.recipientName},</p>
      <p><strong>${data.staffName}</strong> has acknowledged their assessment for <strong>${data.period}</strong>.</p>
      <div class="details">
        <p><strong>Assessment Period:</strong> ${data.period}</p>
        ${data.score ? `<p><strong>Final Score:</strong> ${data.score}</p>` : ''}
        ${data.grade ? `<p><strong>Grade:</strong> ${data.grade}</p>` : ''}
      </div>
      <p>The assessment cycle is now complete.</p>
      <a href="${baseUrl}/assessment?id=${data.assessmentId}" class="button">View Assessment</a>
    `;
    return emailBaseTemplate(content);
  },
};

export const emailSubjects = {
  assessmentSubmitted: (staffName: string) => `Action Required: ${staffName} submitted assessment for review`,
  managerReviewCompleted: (staffName: string) => `Action Required: Manager review completed for ${staffName}`,
  directorApproved: (staffName: string) => `Action Required: Assessment approved for ${staffName}`,
  adminReleased: () => `Your assessment has been released - Action Required`,
  assessmentReturned: () => `Assessment returned: Please review and resubmit`,
  assessmentAcknowledged: (staffName: string) => `Assessment cycle completed for ${staffName}`,
};

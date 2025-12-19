// Assessment status labels and helpers

export type AssessmentStatus = 
  | 'draft' 
  | 'self_submitted' 
  | 'manager_reviewed' 
  | 'acknowledged' 
  | 'approved' 
  | 'rejected';

export interface StatusInfo {
  label: string;
  description: string;
  step: number;
}

export const STATUS_CONFIG: Record<AssessmentStatus, StatusInfo> = {
  draft: {
    label: 'Draft',
    description: 'In progress - not yet submitted',
    step: 1,
  },
  self_submitted: {
    label: 'Submitted',
    description: 'Awaiting manager appraisal',
    step: 1,
  },
  manager_reviewed: {
    label: 'Manager Reviewed',
    description: 'Awaiting director approval',
    step: 2,
  },
  approved: {
    label: 'Director Approved',
    description: 'Awaiting staff acknowledgement',
    step: 3,
  },
  acknowledged: {
    label: 'Acknowledged',
    description: 'Assessment complete',
    step: 4,
  },
  rejected: {
    label: 'Rejected',
    description: 'Sent back for revision',
    step: 3,
  },
};

export function getStatusInfo(status: string): StatusInfo {
  return STATUS_CONFIG[status as AssessmentStatus] || {
    label: status.replace('_', ' '),
    description: '',
    step: 0,
  };
}

export function getStatusLabel(status: string): string {
  return getStatusInfo(status).label;
}

export function getCurrentStep(status: string): number {
  return getStatusInfo(status).step;
}

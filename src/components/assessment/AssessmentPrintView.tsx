
import { Assessment, SectionData } from "@/hooks/useAssessment";
import { format } from "date-fns";

interface AssessmentPrintViewProps {
    assessment: Assessment;
    sections: SectionData[];
    staffName?: string;
}

export function AssessmentPrintView({ assessment, sections, staffName }: AssessmentPrintViewProps) {
    const managerScore = Number(assessment.final_score) || 0;

    // Helper to get grade label and color
    const getGradeInfo = (score: number) => {
        if (score > 3.71) return { label: "Exceptional", grade: "A+", color: "text-blue-600" };
        if (score > 3.41) return { label: "Outstanding", grade: "A", color: "text-blue-600" };
        if (score > 3.11) return { label: "Excellent", grade: "A-", color: "text-blue-500" };
        if (score > 2.71) return { label: "Very Good", grade: "B+", color: "text-emerald-600" };
        if (score > 2.41) return { label: "Good", grade: "B", color: "text-emerald-500" };
        if (score > 2.11) return { label: "Above Average", grade: "B-", color: "text-emerald-400" };
        if (score > 1.71) return { label: "Satisfactory", grade: "C+", color: "text-amber-500" };
        if (score > 1.41) return { label: "Adequate", grade: "C", color: "text-amber-600" };
        if (score > 1.11) return { label: "Needs Improvement", grade: "C-", color: "text-orange-500" };
        if (score > 0.71) return { label: "Below Standard", grade: "D", color: "text-red-500" };
        return { label: "Unsatisfactory", grade: "F", color: "text-red-600" };
    };

    const gradeInfo = getGradeInfo(managerScore);

    // Score badge helper
    const getScoreBadge = (score: number | null) => {
        if (score === null) return <span className="text-slate-400">-</span>;
        let bgColor = "bg-slate-100 text-slate-600";
        if (score >= 3.5) bgColor = "bg-blue-100 text-blue-700";
        else if (score >= 2.5) bgColor = "bg-emerald-100 text-emerald-700";
        else if (score >= 1.5) bgColor = "bg-amber-100 text-amber-700";
        else bgColor = "bg-red-100 text-red-700";
        return <span className={`inline-flex items-center justify-center w-9 h-9 rounded-lg font-mono font-bold ${bgColor}`}>{score}</span>;
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-white text-slate-900 overflow-auto print:static print:p-0 print:overflow-visible font-sans leading-normal">
            {/* Header: Slimmer & More Professional */}
            <div className="bg-gradient-to-r from-blue-700 via-violet-700 to-indigo-700 text-white px-8 py-4">
                <div className="flex justify-between items-end max-w-5xl mx-auto">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight uppercase">Performance Appraisal</h1>
                        <p className="text-blue-100 text-[10px] font-medium opacity-80 mt-0.5">Confidential • Generated {format(new Date(), 'MMM d, yyyy h:mm a')}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-[11px] font-bold text-blue-100/90">{assessment.period}</div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto p-8 pt-6 space-y-6">
                {/* Employee Info: De-containerized & Airy */}
                <div className="border-b border-slate-200 pb-4 mb-2">
                    <div className="grid grid-cols-12 gap-8 items-end">
                        <div className="col-span-4">
                            <div className="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-1">Employee</div>
                            <div className="text-lg font-bold text-slate-900 leading-none">{staffName || assessment.staff_name || "Staff Member"}</div>
                            <div className="text-[11px] font-medium text-slate-500 mt-1">{assessment.staff_job_title || "Position not set"}</div>
                        </div>
                        <div className="col-span-3 border-l border-slate-100 pl-6">
                            <div className="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-1">Department</div>
                            <div className="text-sm font-semibold text-slate-700">{assessment.staff_department || "General"}</div>
                        </div>
                        <div className="col-span-2 border-l border-slate-100 pl-6">
                            <div className="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-1">Status</div>
                            <div className="text-sm font-semibold text-emerald-600 capitalize">{assessment.status.replace('_', ' ')}</div>
                        </div>
                        <div className="col-span-3 border-l border-slate-100 pl-6 text-right">
                            <div className="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-1">Period Ending</div>
                            <div className="text-sm font-semibold text-slate-700">{assessment.period}</div>
                        </div>
                    </div>
                </div>

                {/* Executive Summary */}
                <section className="space-y-4 break-inside-avoid shadow-none">
                    <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-900">Executive Summary</h2>
                    </div>

                    <div className="grid grid-cols-12 gap-8 items-start pt-2">
                        {/* Rating Block */}
                        <div className="col-span-4 bg-slate-50 p-4 border border-slate-200">
                            <div className="flex items-baseline gap-2">
                                <span className={`text-4xl font-mono font-bold ${gradeInfo.color}`}>{managerScore.toFixed(2)}</span>
                                <span className={`text-xl font-bold ${gradeInfo.color}`}>{gradeInfo.grade}</span>
                            </div>
                            <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mt-1">{gradeInfo.label}</div>
                            <div className="text-[9px] text-slate-400 mt-4 leading-tight italic">Combined performance score across all weighted sections</div>
                        </div>

                        {/* Breakdown block */}
                        <div className="col-span-8">
                            <div className="text-[10px] font-bold uppercase text-slate-400 mb-3 tracking-widest">Section Results</div>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                                {sections.map(section => {
                                    const sectionIndicators = section.indicators.filter((i: any) => i.managerScore !== null && i.managerScore !== undefined);
                                    const sectionAvg = sectionIndicators.length > 0
                                        ? sectionIndicators.reduce((acc: number, i: any) => acc + (i.managerScore ?? 0), 0) / sectionIndicators.length
                                        : null;
                                    const sectionGrade = sectionAvg !== null ? getGradeInfo(sectionAvg) : null;

                                    return (
                                        <div key={section.id} className="flex items-center justify-between text-[11px] border-b border-slate-100 pb-1">
                                            <span className="text-slate-600 font-medium">{section.name}</span>
                                            {sectionAvg !== null ? (
                                                <div className="flex items-center gap-1.5 font-mono">
                                                    <span className={`font-bold ${sectionGrade?.color}`}>{sectionAvg.toFixed(2)}</span>
                                                    <span className={`font-bold opacity-70 ${sectionGrade?.color}`}>{sectionGrade?.grade}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-300">-</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-8 pt-4">
                        <div className="space-y-2">
                            <h3 className="text-[10px] font-bold uppercase text-slate-900 tracking-wider">Manager's Feedback</h3>
                            <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                                {assessment.manager_notes || "No feedback provided."}
                            </div>
                        </div>
                        {assessment.director_comments && (
                            <div className="space-y-2">
                                <h3 className="text-[10px] font-bold uppercase text-slate-900 tracking-wider">Director's Comments</h3>
                                <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                                    {assessment.director_comments}
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* Detailed Assessment */}
                <section className="pt-4 space-y-6">
                    <div className="flex items-center gap-2 border-b border-slate-900 pb-2">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-900">Breakdown</h2>
                    </div>

                    <div className="space-y-10">
                        {sections.map(section => {
                            const sectionIndicators = section.indicators.filter((i: any) => i.managerScore !== null && i.managerScore !== undefined);
                            const sectionAvg = sectionIndicators.length > 0
                                ? sectionIndicators.reduce((acc: number, i: any) => acc + (i.managerScore ?? 0), 0) / sectionIndicators.length
                                : null;
                            const sectionGrade = sectionAvg !== null ? getGradeInfo(sectionAvg) : null;

                            return (
                                <div key={section.id} className="break-inside-avoid">
                                    <div className="flex justify-between items-baseline border-b border-slate-600 pb-1 mb-4">
                                        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800">{section.name}</h3>
                                        {sectionAvg !== null && (
                                            <span className={`text-[11px] font-mono font-bold ${sectionGrade?.color}`}>
                                                Average Score: {sectionAvg.toFixed(2)} {sectionGrade?.grade}
                                            </span>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <div className="grid grid-cols-12 gap-4 px-1 py-1 text-[9px] font-bold uppercase text-slate-400 border-b border-slate-100">
                                            <div className="col-span-8">Indicator</div>
                                            <div className="col-span-1 text-center">Score</div>
                                            <div className="col-span-3 text-right">Performance Level</div>
                                        </div>
                                        {section.indicators.map((ind: any) => {
                                            const scoreLabel = ind.score_options?.find((opt: any) => opt.score === ind.managerScore)?.label;
                                            const scoreColor = ind.managerScore >= 3.5 ? 'text-blue-700 bg-blue-50/50' :
                                                ind.managerScore >= 2.5 ? 'text-emerald-700 bg-emerald-50/50' :
                                                    ind.managerScore >= 1.5 ? 'text-amber-700 bg-amber-50/50' :
                                                        'text-red-700 bg-red-50/50';

                                            return (
                                                <div key={ind.id} className="py-3 border-b border-slate-100 break-inside-avoid">
                                                    <div className="grid grid-cols-12 gap-4 items-start">
                                                        <div className="col-span-8">
                                                            <div className="font-bold text-slate-800 text-xs">{ind.name}</div>
                                                            <div className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">{ind.description}</div>
                                                        </div>
                                                        <div className="col-span-1 text-center font-mono font-bold text-sm text-slate-700">
                                                            {ind.managerScore ?? '-'}
                                                        </div>
                                                        <div className="col-span-3 text-right">
                                                            {scoreLabel && (
                                                                <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded ${scoreColor} tracking-tight`}>
                                                                    {scoreLabel}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {ind.managerEvidence && (
                                                        <div className="mt-2 text-[11px] text-slate-600 whitespace-pre-wrap leading-snug">
                                                            <span className="font-bold text-slate-400 uppercase text-[8px] tracking-wide mr-2">Manager Obs:</span>
                                                            {typeof ind.managerEvidence === 'string' ? ind.managerEvidence :
                                                                Array.isArray(ind.managerEvidence) ? ind.managerEvidence[0]?.notes : ''}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Approval History */}
                <section className="pt-8 border-t border-slate-900 mt-12 break-inside-avoid">
                    <div className="grid grid-cols-2 gap-16">
                        {/* Manager */}
                        <div className="space-y-4">
                            <div className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">Appraiser Approval</div>
                            <div className="pt-8 border-b border-slate-200 pb-2 relative">
                                <div className="text-xl font-bold text-slate-900 italic serif">{assessment.manager_name || "Manager Signature"}</div>
                                <div className="text-[10px] text-slate-500 mt-2">
                                    Signed at <span className="font-semibold">{assessment.manager_reviewed_at ? format(new Date(assessment.manager_reviewed_at), 'MMM d, yyyy h:mm a') : 'Pending'}</span>
                                </div>
                            </div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase">Manager</div>
                        </div>

                        {/* Director */}
                        <div className="space-y-4">
                            <div className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">Management Oversight</div>
                            <div className="pt-8 border-b border-slate-200 pb-2 relative">
                                <div className="text-xl font-bold text-slate-900 italic serif">{assessment.director_name || "Director Signature"}</div>
                                <div className="text-[10px] text-slate-500 mt-2">
                                    Approved at <span className="font-semibold">{assessment.director_approved_at ? format(new Date(assessment.director_approved_at), 'MMM d, yyyy h:mm a') : 'Pending'}</span>
                                </div>
                            </div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase">Director / HR Manager</div>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <div className="text-center text-[9px] text-slate-300 pt-12">
                    ProofPoint Performance Management System • Official Document
                </div>
            </div>
        </div>
    );
}

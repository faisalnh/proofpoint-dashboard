import { Assessment } from "@/hooks/useAssessment";
import { DomainData } from "@/components/assessment/AssessmentSection";
import { format } from "date-fns";

interface AssessmentPrintViewProps {
    assessment: Assessment;
    domains: DomainData[];
    staffName?: string;
}

export function AssessmentPrintView({ assessment, domains, staffName }: AssessmentPrintViewProps) {
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

    return (
        <div className="fixed inset-0 z-[9999] bg-white text-slate-900 overflow-auto print:static print:p-0 print:overflow-visible font-sans leading-normal">
            {/* Header: Slimmer & More Professional */}
            <div className="bg-gradient-to-r from-blue-700 via-violet-700 to-indigo-700 text-white px-8 py-4">
                <div className="flex justify-between items-end max-w-5xl mx-auto">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight uppercase">Performance Framework Report</h1>
                        <p className="text-blue-100 text-[10px] font-medium opacity-80 mt-0.5">Confidential • Generated {format(new Date(), 'MMM d, yyyy h:mm a')}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-[11px] font-bold text-blue-100/90 tracking-widest uppercase">{assessment.period}</div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto p-10 pt-8 space-y-10">
                {/* Employee Info */}
                <div className="border-b-2 border-slate-200 pb-6">
                    <div className="grid grid-cols-12 gap-10 items-end">
                        <div className="col-span-4">
                            <div className="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-1.5">Employee Details</div>
                            <div className="text-2xl font-black text-slate-900 leading-none">{staffName || assessment.staff_name || "Staff Member"}</div>
                            <div className="text-[11px] font-bold text-slate-500 mt-2 uppercase tracking-wide tracking-tighter">{assessment.staff_job_title || "Position not set"}</div>
                        </div>
                        <div className="col-span-3 border-l border-slate-100 pl-8">
                            <div className="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-1.5">Functional Unit</div>
                            <div className="text-sm font-bold text-slate-700">{assessment.staff_department || "General"}</div>
                        </div>
                        <div className="col-span-2 border-l border-slate-100 pl-8">
                            <div className="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-1.5">Cycle Phase</div>
                            <div className="text-sm font-bold text-emerald-600 uppercase tracking-tight">{assessment.status.replace('_', ' ')}</div>
                        </div>
                        <div className="col-span-3 border-l border-slate-100 pl-8 text-right">
                            <div className="text-[9px] text-slate-400 uppercase font-bold tracking-widest mb-1.5">Reporting Period</div>
                            <div className="text-sm font-bold text-slate-700 uppercase tracking-tighter">{assessment.period}</div>
                        </div>
                    </div>
                </div>

                {/* Executive Summary */}
                <section className="space-y-6 break-inside-avoid">
                    <div className="flex items-center gap-2 border-b-2 border-slate-900 pb-2">
                        <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">I. Executive Summary</h2>
                    </div>

                    <div className="grid grid-cols-12 gap-10 items-start pt-2">
                        <div className="col-span-4 bg-slate-50 p-6 border-2 border-slate-200 rounded-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-600/5 rounded-bl-full pointer-events-none" />
                            <div className="flex items-baseline gap-2">
                                <span className={`text-5xl font-mono font-black ${gradeInfo.color}`}>{managerScore.toFixed(2)}</span>
                                <span className={`text-2xl font-black ${gradeInfo.color}`}>{gradeInfo.grade}</span>
                            </div>
                            <div className="text-[11px] uppercase font-black text-slate-500 tracking-widest mt-2">{gradeInfo.label}</div>
                            <div className="text-[9px] text-slate-400 mt-6 leading-relaxed italic font-medium">Framework-wide weighted performance score adjusted for implementation status.</div>
                        </div>

                        <div className="col-span-8 space-y-4">
                            <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Domain Performance Breakdown</div>
                            <div className="grid grid-cols-2 gap-x-10 gap-y-3">
                                {domains.map(domain => {
                                    let allKPIs: any[] = [];
                                    domain.standards.forEach(s => allKPIs = [...allKPIs, ...s.kpis]);

                                    const scoredKPIs = allKPIs.filter(k => k.managerScore !== null && k.managerScore !== undefined && k.managerScore !== 'X');
                                    const avg = scoredKPIs.length > 0
                                        ? scoredKPIs.reduce((acc, k) => acc + Number(k.managerScore), 0) / scoredKPIs.length
                                        : null;

                                    const domainGrade = avg !== null ? getGradeInfo(avg) : null;

                                    return (
                                        <div key={domain.id} className="flex items-center justify-between text-[11px] border-b border-slate-100 pb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-slate-400 font-mono font-bold w-6">{domain.weight}%</span>
                                                <span className="text-slate-800 font-bold uppercase tracking-tight">{domain.name}</span>
                                            </div>
                                            {avg !== null ? (
                                                <div className="flex items-center gap-2 font-mono">
                                                    <span className={`font-black ${domainGrade?.color}`}>{avg.toFixed(2)}</span>
                                                    <span className={`font-bold opacity-50 ${domainGrade?.color}`}>{domainGrade?.grade}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 font-bold">-</span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Comments Section */}
                <section className="grid grid-cols-2 gap-10 break-inside-avoid border-t-2 border-slate-100 pt-8">
                    <div className="space-y-4">
                        <h3 className="text-[10px] font-black uppercase text-slate-900 tracking-widest flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
                            Manager Narrative
                        </h3>
                        <div className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50/50 p-4 rounded-xl border border-slate-100 italic">
                            {assessment.manager_notes || "No narrative feedback provided for this cycle."}
                        </div>
                    </div>
                    {assessment.director_comments && (
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase text-slate-900 tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-violet-600 rounded-full" />
                                Director Oversight
                            </h3>
                            <div className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                                {assessment.director_comments}
                            </div>
                        </div>
                    )}
                </section>

                {/* Detailed Framework Breakdown */}
                <section className="pt-6 space-y-8">
                    <div className="flex items-center gap-2 border-b-2 border-slate-900 pb-2">
                        <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">II. Detailed Framework Breakdown</h2>
                    </div>

                    <div className="space-y-12">
                        {domains.map(domain => (
                            <div key={domain.id} className="space-y-8 break-inside-avoid-page">
                                <div className="bg-slate-900 text-white px-6 py-3 rounded-lg flex justify-between items-center shadow-lg">
                                    <h3 className="font-black text-sm uppercase tracking-widest">{domain.name}</h3>
                                    <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest opacity-80">
                                        <span>Contribution: {domain.weight}%</span>
                                        <span>{domain.standards.length} Standards</span>
                                    </div>
                                </div>

                                <div className="space-y-10 pl-4 border-l-4 border-slate-100">
                                    {domain.standards.map((standard, stdIdx) => (
                                        <div key={standard.id} className="space-y-4 break-inside-avoid">
                                            <div className="flex items-center gap-3 border-b border-slate-300 pb-2">
                                                <div className="bg-slate-200 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">STD {stdIdx + 1}</div>
                                                <h4 className="font-black text-xs uppercase text-slate-800 tracking-wide italic">{standard.name}</h4>
                                            </div>

                                            <div className="space-y-1">
                                                <div className="grid grid-cols-12 gap-6 px-4 py-2 text-[9px] font-black uppercase text-slate-400 border-b border-slate-100 bg-slate-50/30">
                                                    <div className="col-span-8">Key Performance Indicator (KPI)</div>
                                                    <div className="col-span-1 text-center">Score</div>
                                                    <div className="col-span-3 text-right">Rubric Alignment</div>
                                                </div>

                                                {standard.kpis.map((kpi) => {
                                                    const score = kpi.managerScore;
                                                    const isX = score === 'X';
                                                    const numericScore = typeof score === 'number' ? score : null;

                                                    const labels: Record<number, string> = {
                                                        1: "BEGINNING",
                                                        2: "DEVELOPING",
                                                        3: "PROFICIENT",
                                                        4: "EXEMPLARY"
                                                    };

                                                    const scoreLabel = isX ? "NOT IMPLEMENTED" : (numericScore ? labels[numericScore] : "NOT RATED");
                                                    const scoreColor = isX ? 'text-slate-500 bg-slate-100' :
                                                        (numericScore && numericScore >= 3.5 ? 'text-blue-700 bg-blue-50' :
                                                            numericScore && numericScore >= 2.5 ? 'text-emerald-700 bg-emerald-50' :
                                                                numericScore && numericScore >= 1.5 ? 'text-amber-700 bg-amber-50' :
                                                                    'text-red-700 bg-red-50');

                                                    return (
                                                        <div key={kpi.id} className="py-5 px-4 border-b border-slate-100 break-inside-avoid hover:bg-slate-50/20 transition-colors">
                                                            <div className="grid grid-cols-12 gap-6 items-start">
                                                                <div className="col-span-8">
                                                                    <div className="font-black text-slate-900 text-[13px] leading-tight mb-1">{kpi.name}</div>
                                                                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{kpi.description}</p>
                                                                </div>
                                                                <div className="col-span-1 text-center">
                                                                    <div className="font-mono font-black text-lg text-slate-900">
                                                                        {score ?? '-'}
                                                                    </div>
                                                                </div>
                                                                <div className="col-span-3 text-right">
                                                                    <span className={`inline-block text-[9px] font-black px-3 py-1 rounded-full ${scoreColor} tracking-widest`}>
                                                                        {scoreLabel}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            {kpi.managerEvidence && (
                                                                <div className="mt-4 text-[11px] text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 border-l-4 border-l-blue-400">
                                                                    <span className="font-black text-blue-600 uppercase text-[8px] tracking-widest block mb-1">Assessor Rationale:</span>
                                                                    {typeof kpi.managerEvidence === 'string' ? kpi.managerEvidence : ''}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Final Acknowledgement and Signatures */}
                <section className="pt-12 border-t-2 border-slate-900 mt-16 break-inside-avoid">
                    <div className="mb-12 space-y-4">
                        <h3 className="text-[10px] font-black uppercase text-slate-900 tracking-widest">III. Staff Acknowledgement</h3>
                        <div className="text-[11px] text-slate-700 leading-relaxed bg-slate-50 p-6 rounded-xl border border-slate-200 min-h-[100px] italic">
                            {assessment.staff_notes || "Performance review results acknowledged via electronic framework signature."}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-20">
                        {/* Manager */}
                        <div className="space-y-6">
                            <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Assessing Authority</div>
                            <div className="pt-8 border-b-2 border-slate-200 pb-3 relative">
                                <div className="text-2xl font-black text-slate-900 italic serif tracking-tight">{assessment.manager_name || "Assessor Name"}</div>
                                <div className="text-[10px] text-slate-500 mt-3 font-bold uppercase tracking-wider">
                                    Timestamp: <span className="text-slate-800">{assessment.manager_reviewed_at ? format(new Date(assessment.manager_reviewed_at), 'MMM d, yyyy h:mm a') : 'Verification Pending'}</span>
                                </div>
                            </div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manager / Primary Evaluator</div>
                        </div>

                        {/* Director */}
                        <div className="space-y-6">
                            <div className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Oversight Approval</div>
                            <div className="pt-8 border-b-2 border-slate-200 pb-3 relative">
                                <div className="text-2xl font-black text-slate-900 italic serif tracking-tight">{assessment.director_name || "Director Name"}</div>
                                <div className="text-[10px] text-slate-500 mt-3 font-bold uppercase tracking-wider">
                                    Timestamp: <span className="text-slate-800">{assessment.director_approved_at ? format(new Date(assessment.director_approved_at), 'MMM d, yyyy h:mm a') : 'Verification Pending'}</span>
                                </div>
                            </div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Management Sign-Off</div>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <div className="flex justify-between items-center text-[9px] text-slate-400 pt-16 border-t border-slate-100">
                    <div className="font-bold uppercase tracking-widest">ProofPoint Performance Management System • Framework v2.0</div>
                    <div className="font-mono">REF: {assessment.id.substring(0, 8).toUpperCase()}</div>
                </div>
            </div>
        </div>
    );
}

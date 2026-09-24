import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, CartesianGrid } from 'recharts';
import { Activity, Zap } from 'lucide-react';

export default function QualityAnalytics({ sessionData }) {
    if (!sessionData || !sessionData.originalProfile) {
        return null;
    }
    
    const original = sessionData.originalProfile;
    const current = sessionData.profile;
    
    // Check if cleaned has actually occurred
    const hasCleaned = original.dqs !== current.dqs || JSON.stringify(original.issues) !== JSON.stringify(current.issues);

    if (!hasCleaned) {
        return (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 flex flex-col items-center justify-center text-center shadow-sm">
                <div className="bg-primary-100 text-primary-600 p-4 rounded-full mb-4 shadow-sm">
                    <Activity size={32} />
                </div>
                <h4 className="font-extrabold text-slate-800 text-xl tracking-tight">Analytics Awaiting Execution</h4>
                <p className="text-slate-500 text-sm mt-2 max-w-md font-medium">When you map your configured sanitizations, this dashboard will generate comparative Before vs After data quality visualizations highlighting algorithmic improvements.</p>
            </div>
        );
    }
    
    // 1. DQS Comparison Data
    const dqsData = [
        { name: 'Initial Quality (Before)', score: original.dqs, fill: '#cbd5e1' }, 
        { name: 'Sanitized Quality (After)', score: current.dqs, fill: '#10b981' } 
    ];
    
    // 2. Missing Values Comparison Data
    const missingData = [];
    const origMissing = original.issues?.missing_values || {};
    const currMissing = current.issues?.missing_values || {};
    const allMissingCols = new Set([...Object.keys(origMissing), ...Object.keys(currMissing)]);
    
    allMissingCols.forEach(col => {
        missingData.push({
            name: col,
            Before: origMissing[col] || 0,
            After: currMissing[col] || 0
        });
    });

    // 3. Data Quality Metrics Comparison (Tabular Only)
    const metricsData = sessionData.isImage ? [] : [
        { subject: 'Completeness', Before: original.completeness || 0, After: current.completeness || 0 },
        { subject: 'Consistency', Before: original.consistency || 0, After: current.consistency || 0 },
        { subject: 'Validity', Before: original.validity || 0, After: current.validity || 0 },
        { subject: 'Uniqueness', Before: original.uniqueness || 0, After: current.uniqueness || 0 }
    ];
    
    // 4. Image Issues Comparison Data
    const imageIssuesData = sessionData.isImage ? [
        { name: 'Blurry', Before: original.issues?.blurry || 0, After: current.issues?.blurry || 0 },
        { name: 'Corrupt', Before: original.issues?.corrupt || 0, After: current.issues?.corrupt || 0 },
        { name: 'Duplicates', Before: original.issues?.duplicates || 0, After: current.issues?.duplicates || 0 }
    ] : [];

    const dqsJump = (current.dqs - original.dqs).toFixed(1);
    const completenessJump = !sessionData.isImage ? (current.completeness - original.completeness).toFixed(1) : 0;
    const issuesFixed = sessionData.isImage ? 
        ((original.issues?.blurry || 0) + (original.issues?.corrupt || 0) + (original.issues?.duplicates || 0)) - 
        ((current.issues?.blurry || 0) + (current.issues?.corrupt || 0) + (current.issues?.duplicates || 0)) : 0;

    return (
        <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 flex flex-col relative overflow-hidden group hover:border-primary-200 transition-colors">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
                 <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                     <Activity size={20} className="text-primary-500" /> Quality Improvement Analytics
                 </h3>
                 <div className="flex gap-2">
                     {dqsJump > 0 && <span className="text-xs font-bold bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1 shadow-sm"><Zap size={14} className="fill-emerald-500" /> +{dqsJump} DQS</span>}
                     {!sessionData.isImage && completenessJump > 0 && <span className="text-xs font-bold bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg border border-blue-200 flex items-center gap-1 shadow-sm">+{completenessJump}% Completeness</span>}
                     {sessionData.isImage && issuesFixed > 0 && <span className="text-xs font-bold bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg border border-blue-200 flex items-center gap-1 shadow-sm">+{issuesFixed} Filtered</span>}
                 </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Chart A: DQS */}
                 <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm h-[320px] flex flex-col">
                     <h4 className="text-sm font-bold text-slate-700 mb-4 tracking-tight">DQS Benchmark</h4>
                     <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={dqsData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                             <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                             <XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} />
                             <YAxis domain={[0, 100]} tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} />
                             <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                             <Bar dataKey="score" radius={[4, 4, 0, 0]} animationDuration={1000} />
                         </BarChart>
                     </ResponsiveContainer>
                 </div>
                 
                 {/* Chart B: Missing Values / Image Issues */}
                 <div className={`bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm h-[320px] flex flex-col ${sessionData.isImage ? 'col-span-2 lg:col-span-2' : ''}`}>
                     <h4 className="text-sm font-bold text-slate-700 mb-4 tracking-tight">{sessionData.isImage ? 'Anomalies Filtered' : 'Missing Cells Resolved'}</h4>
                     {(sessionData.isImage ? imageIssuesData : missingData).length > 0 ? (
                         <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={sessionData.isImage ? imageIssuesData : missingData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                 <XAxis dataKey="name" tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} truncateByClip={true} />
                                 <YAxis tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} />
                                 <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                 <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} iconType="circle" />
                                 <Bar dataKey="Before" fill="#cbd5e1" radius={[4, 4, 0, 0]} animationDuration={1000} />
                                 <Bar dataKey="After" fill="#3b82f6" radius={[4, 4, 0, 0]} animationDuration={1000} />
                             </BarChart>
                         </ResponsiveContainer>
                     ) : (
                         <div className="flex-1 flex items-center justify-center text-slate-400 text-sm font-medium italic">No anomalies to display.</div>
                     )}
                 </div>
                 
                 {/* Chart C: Core Metrics Radar (Tabular Only) */}
                 {!sessionData.isImage && (
                     <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm h-[320px] flex flex-col">
                         <h4 className="text-sm font-bold text-slate-700 mb-1 tracking-tight">Core Integrity Metrics</h4>
                         <ResponsiveContainer width="100%" height="100%">
                             <RadarChart cx="50%" cy="50%" outerRadius="50%" data={metricsData} margin={{top: 10, bottom: 10, left: 10, right: 10}}>
                                 <PolarGrid stroke="#e2e8f0" />
                                 <PolarAngleAxis dataKey="subject" tick={{fontSize: 9, fill: '#475569', fontWeight: 700}} />
                                 <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                 <Radar name="Before" dataKey="Before" stroke="#94a3b8" fill="#cbd5e1" fillOpacity={0.4} animationDuration={1000} />
                                 <Radar name="After" dataKey="After" stroke="#10b981" fill="#10b981" fillOpacity={0.6} animationDuration={1000} />
                                 <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', bottom: 0 }} iconType="circle" />
                                 <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                             </RadarChart>
                         </ResponsiveContainer>
                     </div>
                 )}
            </div>
        </div>
    );
}

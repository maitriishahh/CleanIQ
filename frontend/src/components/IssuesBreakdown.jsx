import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, Loader2, CheckCircle2, ChevronRight, X, XCircle } from 'lucide-react';
import axios from 'axios';

export default function IssuesBreakdown({ sessionData, onProfileUpdate, setGlobalLogs }) {
  const profile = sessionData?.profile || {};
  // Consider both explicit isImage and file_type
  const isImage = sessionData?.isImage || sessionData?.file_type === 'image';
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const [loadingAction, setLoadingAction] = useState(null);
  const [localLogs, setLocalLogs] = useState([]);
  const [notification, setNotification] = useState({ visible: false, message: '', type: 'success' });

  const data = [];
  let totalIssues = 0;

  if (isImage) {
      const { blurry = 0, corrupt = 0, duplicates = 0 } = profile.issues || {};
      if (blurry > 0) data.push({ name: 'Blurry', actionTarget: 'filter_blurry', actionLabel: 'Filter', value: blurry, fill: '#f59e0b' });
      if (corrupt > 0) data.push({ name: 'Corrupt', actionTarget: 'remove_corrupt', actionLabel: 'Remove', value: corrupt, fill: '#ef4444' });
      if (duplicates > 0) data.push({ name: 'Duplicates', actionTarget: 'remove_duplicates', actionLabel: 'Remove', value: duplicates, fill: '#3b82f6' });
      totalIssues = blurry + corrupt + duplicates;
  } else {
      const { missing_values = {}, duplicate_rows = 0, outliers = {} } = profile?.issues || {};
      const missingCount = Object.values(missing_values).reduce((a, b) => a + b, 0);
      const outlierCount = Object.values(outliers).reduce((a, b) => a + b, 0);
      
      if (missingCount > 0) data.push({ name: 'Missing Values', value: missingCount, fill: '#f59e0b' });
      if (duplicate_rows > 0) data.push({ name: 'Duplicate Rows', value: duplicate_rows, fill: '#3b82f6' });
      if (outlierCount > 0) data.push({ name: 'Outliers', value: outlierCount, fill: '#8b5cf6' });
      totalIssues = missingCount + duplicate_rows + outlierCount;
  }

  const handleClean = async (operations) => {
    setLoadingAction(operations.join(','));
    try {
      const res = await axios.post(`${baseUrl}/clean/images`, {
        session_id: sessionData.session_id,
        operations
      });
      
      const newProfile = res.data.profile;
      const logs = res.data.cleaning_log || [];
      
      if (onProfileUpdate) onProfileUpdate(newProfile);
      
      const logMessages = logs.map(l => l.message);
      setLocalLogs(prev => [...logMessages, ...prev]);
      if (setGlobalLogs) {
        setGlobalLogs(prev => [...logMessages, ...prev]);
      }
      
      showNotification('Dataset cleaned successfully', 'success');
    } catch (error) {
      console.error(error);
      const is404 = error?.response?.status === 404;
      showNotification(is404 ? 'Session expired. Please re-upload dataset.' : 'Error cleaning dataset', 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  const showNotification = (msg, type = 'success') => {
    setNotification({ visible: true, message: msg, type });
    setTimeout(() => {
      setNotification({ visible: false, message: '', type: 'success' });
    }, 4000);
  };

  const activeIssues = data.map(d => d.actionTarget).filter(Boolean);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col md:flex-row shadow-soft gap-8 h-full relative overflow-hidden group hover:border-primary-200 transition-colors">
      
      {/* Custom Notification Pop-up */}
      <div className={`absolute top-4 right-4 z-50 transition-all duration-500 transform ${notification.visible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0 pointer-events-none'}`}>
        <div className={`py-2 px-4 rounded-xl shadow-lg border flex items-center gap-2 ${notification.type === 'error' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
            {notification.type === 'error' ? (
                <XCircle size={18} className="text-rose-500" />
            ) : (
                <CheckCircle2 size={18} className="text-emerald-500" />
            )}
            <span className="font-semibold text-sm">{notification.message}</span>
        </div>
      </div>

      <div className="w-full md:w-1/3 h-full min-h-[220px]">
         {totalIssues === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-emerald-500 bg-emerald-50 border border-emerald-100 rounded-full w-40 h-40 mx-auto">
                 <CheckCircle2 size={32} className="mb-2" />
                 <span className="font-bold text-center">Dataset Pristine!</span>
             </div>
         ) : (
             <ResponsiveContainer width="100%" height={220}>
               <PieChart>
                 <Pie
                   data={data}
                   cx="50%"
                   cy="50%"
                   innerRadius={60}
                   outerRadius={80}
                   paddingAngle={5}
                   dataKey="value"
                 >
                   {data.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={entry.fill} className="hover:opacity-80 transition-opacity" />
                   ))}
                 </Pie>
                 <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
               </PieChart>
             </ResponsiveContainer>
         )}
      </div>
      
      <div className="w-full md:w-2/3 pr-4 flex flex-col">
        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-2">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle size={20} className="text-primary-500" />
                Identified Issues
            </h3>
            {isImage && totalIssues > 0 && (
                <button
                    onClick={() => handleClean(activeIssues)}
                    disabled={loadingAction !== null}
                    className="text-sm bg-primary-600 hover:bg-primary-700 text-white font-semibold py-1.5 px-4 rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                    {loadingAction === activeIssues.join(',') ? <Loader2 size={16} className="animate-spin" /> : 'Clean All Issues'}
                </button>
            )}
        </div>
        
        {totalIssues === 0 ? (
             <div className="text-slate-500 bg-slate-50 p-4 rounded-xl text-center border border-slate-100 mt-auto mb-auto">No anomalies found. Your dataset is pristine.</div>
        ) : (
            <div className="flex flex-col flex-1">
                <ul className="space-y-3">
                  {data.map((item, i) => (
                    <li key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100">
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.fill }}></span>
                        <span className="font-semibold text-slate-700">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                         <span className="text-sm font-bold bg-white px-3 py-1 rounded-lg text-slate-600 shadow-sm">{item.value} detected</span>
                         
                         {isImage && item.actionTarget && (
                            <button
                                onClick={() => handleClean([item.actionTarget])}
                                disabled={loadingAction !== null}
                                className={`text-sm font-semibold py-1 px-3 rounded-lg border transition-colors flex items-center gap-1 ${loadingAction === item.actionTarget ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-primary-600 border-primary-200 hover:bg-primary-50'}`}
                            >
                                {loadingAction === item.actionTarget ? <Loader2 size={14} className="animate-spin" /> : item.actionLabel}
                            </button>
                         )}
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Local Action Log for Images */}
                {isImage && localLogs.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-slate-100">
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Action Log</h4>
                        <div className="space-y-2 max-h-[100px] overflow-y-auto pr-2 custom-scrollbar">
                            {localLogs.map((log, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-sm text-slate-600 bg-emerald-50 py-1.5 px-3 rounded-lg border border-emerald-100">
                                    <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                                    <span>{log}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
}

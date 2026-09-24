import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Layers, FileSpreadsheet, ListChecks, CheckCircle2, Loader2 } from 'lucide-react';

export default function CleaningTransparency({ sessionData, logs }) {
  const [dataPreview, setDataPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewState, setViewState] = useState('original');

  const baseUrl = import.meta.env.VITE_API_URL;
  const isImage = sessionData?.isImage;

  useEffect(() => {
     if (isImage || !sessionData?.session_id) return;
     
     const fetchData = async () => {
         setLoading(true);
         try {
             // Fetch diffs map
             const res = await axios.get(`${baseUrl}/data/preview/${sessionData.session_id}`);
             setDataPreview(res.data);
         } catch (err) {
             console.error(err);
         } finally {
             setLoading(false);
         }
     };
     fetchData();
  }, [sessionData?.profile, sessionData?.session_id, isImage, baseUrl]); 

  if (isImage) return null;

  return (
    <div className="bg-white rounded-2xl shadow-soft border border-slate-100 flex flex-col relative overflow-hidden group hover:border-primary-200 transition-colors">
       {logs && logs.length > 0 && (
           <div className="p-6 border-b border-slate-100 bg-slate-50/70">
               <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                 <ListChecks size={18} className="text-emerald-500" /> Action Log History
               </h3>
               <div className="space-y-3">
                   {logs.map((log, i) => (
                       <div key={i} className="flex items-start gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm animate-in slide-in-from-top-2 duration-300">
                           <CheckCircle2 size={18} className="text-emerald-500 mt-0.5 shrink-0" />
                           <div className="w-full">
                               <p className="text-sm font-semibold text-slate-800">{log.message}</p>
                               <div className="flex gap-4 mt-2">
                                   <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">Method: {log.method}</span>
                                   <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">Value Used: {log.value_used}</span>
                                   <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">Rows Updated: {log.rows_affected}</span>
                               </div>
                           </div>
                       </div>
                   ))}
               </div>
           </div>
       )}

       <div className="p-6">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                 <div>
                     <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                         <Layers size={20} className="text-primary-500" /> Cleaning Transparency Panel
                     </h3>
                     <p className="text-sm text-slate-500 mt-1">
                         Review a sample of your dataset. Modified cells are highlighted in yellow.
                     </p>
                 </div>
                 
                 <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl border border-slate-200 shadow-sm">
                     <button
                        onClick={() => setViewState('original')}
                        className={`text-sm px-4 py-2 rounded-lg font-bold transition-all ${viewState === 'original' ? 'bg-white shadow-sm text-slate-800 border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                     >Original Data</button>
                     <button
                        onClick={() => setViewState('cleaned')}
                        className={`text-sm px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 ${viewState === 'cleaned' ? 'bg-primary-500 shadow-glow text-white border-primary-600' : 'text-slate-500 hover:text-slate-700'}`}
                     >
                        Cleaned Data 
                        {logs && logs.length > 0 && viewState !== 'cleaned' && <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm animate-pulse"></span>}
                     </button>
                 </div>
           </div>
           
           {loading ? (
                 <div className="flex items-center justify-center py-20 bg-slate-50 rounded-xl border border-slate-100">
                     <Loader2 size={36} className="animate-spin text-primary-500" />
                 </div>
           ) : !dataPreview ? (
                 <div className="text-center py-10 text-slate-500">No tabular preview available</div>
           ) : (
                 <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm max-h-[400px] overflow-y-auto">
                     <table className="w-full text-left text-sm text-slate-600 border-collapse">
                         <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 shadow-sm sticky top-0 z-10">
                             <tr>
                                 <th className="p-3 w-10 text-center sticky left-0 z-20 bg-slate-100 border-r border-slate-200">ID</th>
                                 {dataPreview.columns.map((col, idx) => (
                                     <th key={idx} className="p-3 whitespace-nowrap bg-slate-50">{col}</th>
                                 ))}
                             </tr>
                         </thead>
                         <tbody>
                             {(viewState === 'cleaned' ? dataPreview.current_data : dataPreview.original_data).map((row, rowIdx) => {
                                 const changedCols = typeof dataPreview.diff[rowIdx] !== 'undefined' ? dataPreview.diff[rowIdx] : [];
                                 
                                 return (
                                     <tr key={rowIdx} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors`}>
                                         <td className="p-3 text-center text-slate-400 font-medium sticky left-0 z-10 bg-white border-r border-slate-100">{rowIdx}</td>
                                         {dataPreview.columns.map((col, colIdx) => (
                                             <td 
                                               key={colIdx} 
                                               className={`p-3 whitespace-nowrap transition-colors ${changedCols.includes(col) ? 'bg-yellow-100/70 font-bold text-amber-900 border-x border-amber-200' : ''}`}
                                             >
                                                 {row[col] !== "" ? row[col] : <span className="text-rose-400 italic font-mono text-xs font-bold tracking-widest bg-rose-50 px-1 py-0.5 rounded">NaN</span>}
                                             </td>
                                         ))}
                                     </tr>
                                 );
                             })}
                         </tbody>
                     </table>
                     {dataPreview.current_data.length === 0 && (
                         <div className="p-16 flex items-center justify-center flex-col text-slate-500 bg-slate-50 border-t border-slate-100">
                             <FileSpreadsheet size={48} className="mb-4 text-slate-300" />
                             <span className="text-lg font-medium text-slate-600">Dataset is currently empty</span>
                             <span className="text-sm">Rows have been entirely dropped by the applied heuristics.</span>
                         </div>
                     )}
                 </div>
           )}
           <div className="mt-4 text-xs font-medium text-slate-400 flex items-center justify-between">
               <span>Previewing the first {dataPreview?.current_data?.length || 0} modified rows payload subsets for maximum React memory optimization.</span>
               {viewState === 'cleaned' && <span className="flex items-center gap-1.5 bg-yellow-50 text-amber-600 px-2 py-1 rounded border border-yellow-200"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-sm"></span> Highlights active changes</span>}
           </div>
       </div>
    </div>
  );
}

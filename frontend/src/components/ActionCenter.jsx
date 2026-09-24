import React, { useState } from 'react';
import axios from 'axios';
import { DownloadCloud, Sparkles, Loader2, Settings2, CheckCircle2, ChevronRight, HelpCircle, FileDown, TextCursor } from 'lucide-react';

export default function ActionCenter({ sessionData, onProfileUpdate, setLogs }) {
  const [loading, setLoading] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingCSV, setDownloadingCSV] = useState(false);
  const [methods, setMethods] = useState({});
  const [successMsg, setSuccessMsg] = useState('');
  
  const baseUrl = import.meta.env.VITE_API_URL;
  const isImage = sessionData?.isImage;
  const profile = sessionData?.profile || {};
  
  const missingCols = profile.issues?.missing_values || {};
  const missingColNames = Object.keys(missingCols);
  
  const textCols = profile.issues?.text_issues || {};
  const textColNames = Object.keys(textCols);
  
  const imputationReasons = profile.imputation_reasons || {};

  const handleMethodChange = (col, val) => {
      setMethods(prev => ({ ...prev, [col]: val }));
  };

  const applyFix = async () => {
      setLoading(true);
      setSuccessMsg('');
      
      const operations = {};
      missingColNames.forEach(col => {
          operations[col] = methods[col] || 'suggested';
      });
      textColNames.forEach(col => {
          // Fallback to intelligent NLP filter if not manually overridden 
          operations[col] = methods[col] || 'clean_text';
      });
      
      try {
          const res = await axios.post(`${baseUrl}/clean/tabular`, {
              session_id: sessionData.session_id,
              operations: operations
          });
          onProfileUpdate(res.data.profile);
          if (res.data.cleaning_log) {
              setLogs(res.data.cleaning_log);
          }
          setSuccessMsg('Successfully executed multi-modal architectural algorithms!');
          setTimeout(() => setSuccessMsg(''), 4000);
      } catch (err) {
          console.error(err);
      } finally {
          setLoading(false);
      }
  };

  const handleDownloadPDF = async () => {
      setDownloadingPDF(true);
      try {
          const res = await axios.get(`${baseUrl}/report/${sessionData.session_id}`, {
              responseType: 'blob'
          });
          const url = window.URL.createObjectURL(new Blob([res.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `CleanIQ_Report.pdf`);
          document.body.appendChild(link);
          link.click();
      } catch (err) {
          console.error(err);
      } finally {
          setDownloadingPDF(false);
      }
  };

  const handleDownloadCSV = async () => {
      setDownloadingCSV(true);
      try {
          const res = await axios.get(`${baseUrl}/download/${sessionData.session_id}`, {
              responseType: 'blob'
          });
          
          let originalName = profile.filename || (isImage ? "dataset.zip" : "dataset.csv");
          if (isImage) {
              if (originalName.includes('.')) {
                  originalName = originalName.substring(0, originalName.lastIndexOf('.')) + ".zip";
              } else {
                  originalName += ".zip";
              }
          } else if (originalName.endsWith('.xlsx') || originalName.endsWith('.xls')) {
              originalName = originalName.replace(/\.[^/.]+$/, ".csv");
          }
          
          const url = window.URL.createObjectURL(new Blob([res.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `cleaned_${originalName}`);
          document.body.appendChild(link);
          link.click();
      } catch (err) {
          console.error(err);
      } finally {
          setDownloadingCSV(false);
      }
  };

  return (
    <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-6 flex flex-col relative overflow-hidden group hover:border-primary-200 transition-colors">
         <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
             <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                 <Settings2 size={20} className="text-primary-500" /> Validation Engine Sandbox
             </h3>
             <div className="flex items-center gap-2">
                 <button
                   onClick={handleDownloadCSV}
                   disabled={downloadingCSV}
                   className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm"
                 >
                     {downloadingCSV ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                     {isImage ? "Download Cleaned Dataset (.zip)" : "Download Cleaned Dataset (.csv)"}
                 </button>
                 <button
                   onClick={handleDownloadPDF}
                   disabled={downloadingPDF}
                   className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm"
                 >
                     {downloadingPDF ? <Loader2 size={16} className="animate-spin" /> : <DownloadCloud size={16} />}
                     Download PDF Report
                 </button>
             </div>
         </div>
         
         {!isImage ? (
             <div className="flex-1">
                 {(missingColNames.length > 0 || textColNames.length > 0) ? (
                     <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
                         <div className="mb-4">
                            <h4 className="font-bold text-slate-700 flex items-center gap-1.5"><HelpCircle size={16} className="text-amber-500"/> Hybrid Reasoning Engine</h4>
                            <p className="text-xs text-slate-500 font-medium tracking-wide">CleanIQ mathematically analyzes Outlier IQR bounds, Cardinality constraints, Skewness, sparse Missing ranges, and NLP string patterns to infer exact distinct ML algorithms bypassing rigid blind heuristic deployments.</p>
                         </div>
                         
                         <div className="grid grid-cols-1 gap-4 mb-6 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                             {/* Standard Imputation Anomalies */}
                             {missingColNames.map(col => {
                                 const reasonObj = imputationReasons[col] || {};
                                 const suggestedMethod = reasonObj.suggested_method || 'auto';
                                 
                                 return (
                                 <div key={`missing-${col}`} className="bg-amber-50/40 p-5 rounded-xl border border-amber-200 shadow-sm relative overflow-hidden group hover:border-amber-300 transition-colors">
                                      <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400"></div>
                                      
                                      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
                                          <div className="flex-1">
                                              <div className="flex flex-wrap items-center gap-2 mb-3">
                                                  <label className="text-base font-extrabold text-slate-800">{col}</label>
                                                  <span className="text-xs bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full border border-rose-200 shadow-sm">
                                                     {missingCols[col]} empty cells / {profile.total_rows} rows
                                                  </span>
                                                  <span className="text-xs bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded border border-amber-300 shadow-sm flex items-center gap-1">
                                                     <Sparkles size={12} className="text-amber-600" /> Assigned Override: {suggestedMethod.toUpperCase().replace('_', ' ')}
                                                  </span>
                                              </div>
                                              
                                              <p className="text-sm text-slate-700/90 leading-relaxed mb-3 font-medium bg-white/50 p-2.5 rounded-lg border border-amber-100/50 italic shadow-sm">
                                                  {reasonObj.reasoning || "Data insufficient to formulate distinct algorithmic logic. Defaulting to algorithmic Auto."}
                                              </p>
                                              
                                              {reasonObj.reasoning_factors && reasonObj.reasoning_factors.length > 0 && (
                                                  <ul className="space-y-1.5 mb-3">
                                                      {reasonObj.reasoning_factors.map((factor, idx) => (
                                                          <li key={idx} className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                                                              <ChevronRight size={14} className="text-amber-500" /> {factor}
                                                          </li>
                                                      ))}
                                                  </ul>
                                              )}
                                              
                                              {reasonObj.suggested_value && (
                                                  <div className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 inline-block shadow-sm">
                                                      Predicted Output Signature: {reasonObj.suggested_value}
                                                  </div>
                                              )}
                                          </div>
                                          
                                          <div className="w-full xl:w-56 shrink-0 flex flex-col items-start xl:items-end p-4 bg-white rounded-xl border border-slate-200 shadow-sm h-fit">
                                               <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Action Interface</span>
                                               <select 
                                                   className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-2.5 shadow-sm"
                                                   value={methods[col] || "suggested"}
                                                   onChange={(e) => handleMethodChange(col, e.target.value)}
                                               >
                                                   <option value="suggested">Run AI Suggestion</option>
                                                   <option value="mean">Force Mean Logic</option>
                                                   <option value="median">Force Median Bounds</option>
                                                   <option value="mode">Force Exact Mode</option>
                                                   <option value="knn">Execute KNN Array</option>
                                                   <option value="drop_row">Drop Anomalous Bounds</option>
                                                   <option value="drop_column">Purge Entire Component</option>
                                               </select>
                                          </div>
                                      </div>
                                 </div>
                                 )
                             })}
                             
                             {/* NLP Specific Tracking Anomalies */}
                             {textColNames.map(col => {
                                 const tIssues = textCols[col] || {};
                                 const totalIssuesCount = (tIssues.html_count || 0) + (tIssues.url_count || 0) + (tIssues.whitespace_count || 0) + (tIssues.special_char_count || 0) + (tIssues.short_text_count || 0);

                                 return (
                                 <div key={`text-${col}`} className="bg-sky-50/40 p-5 rounded-xl border border-sky-200 shadow-sm relative overflow-hidden group hover:border-sky-300 transition-colors">
                                      <div className="absolute top-0 left-0 w-1.5 h-full bg-sky-400"></div>
                                      
                                      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-4">
                                          <div className="flex-1">
                                              <div className="flex flex-wrap items-center gap-2 mb-3">
                                                  <label className="text-base font-extrabold text-slate-800">{col}</label>
                                                  <span className="text-xs bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full border border-rose-200 shadow-sm">
                                                     {totalIssuesCount} NLP artifacts flagged
                                                  </span>
                                                  <span className="text-xs bg-sky-100 text-sky-900 font-bold px-2 py-0.5 rounded border border-sky-300 shadow-sm flex items-center gap-1">
                                                     <TextCursor size={12} className="text-sky-600" /> Predicted Execution: TEXT_SANITIZATION
                                                  </span>
                                              </div>
                                              
                                              <p className="text-sm text-slate-700/90 leading-relaxed mb-3 font-medium bg-white/50 p-2.5 rounded-lg border border-sky-100/50 italic shadow-sm">
                                                  Dataset schema natively triggers the NLP parsing boundary isolating massive subsets of underlying unstructured web-artifacts implicitly leaking through object nodes.
                                              </p>
                                              
                                              <ul className="space-y-1.5 mb-3">
                                                  {tIssues.html_count > 0 && (
                                                      <li className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                                                          <ChevronRight size={14} className="text-sky-500" /> {tIssues.html_count} rows evaluating nested DOM HTML elements
                                                      </li>
                                                  )}
                                                  {tIssues.url_count > 0 && (
                                                      <li className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                                                          <ChevronRight size={14} className="text-sky-500" /> {tIssues.url_count} rows leaking unmasked URI/URL links
                                                      </li>
                                                  )}
                                                  {tIssues.whitespace_count > 0 && (
                                                      <li className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                                                          <ChevronRight size={14} className="text-sky-500" /> {tIssues.whitespace_count} rows leaking arbitrary tab/spacing boundaries
                                                      </li>
                                                  )}
                                                  {tIssues.special_char_count > 0 && (
                                                      <li className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                                                          <ChevronRight size={14} className="text-sky-500" /> {tIssues.special_char_count} rows mapping extremely aggressive char-noise
                                                      </li>
                                                  )}
                                                  {tIssues.short_text_count > 0 && (
                                                      <li className="text-xs font-semibold text-slate-600 flex items-center gap-2">
                                                          <ChevronRight size={14} className="text-sky-500" /> {tIssues.short_text_count} critically undersampled text rows (&lt;3 explicit words)
                                                      </li>
                                                  )}
                                              </ul>
                                          </div>
                                          
                                          <div className="w-full xl:w-56 shrink-0 flex flex-col items-start xl:items-end p-4 bg-white rounded-xl border border-slate-200 shadow-sm h-fit">
                                               <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Data NLP Router</span>
                                               <select 
                                                   className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm font-bold rounded-lg focus:ring-primary-500 focus:border-primary-500 block p-2.5 shadow-sm"
                                                   value={methods[col] || "clean_text"}
                                                   onChange={(e) => handleMethodChange(col, e.target.value)}
                                               >
                                                   <option value="clean_text">Execute Intelligent Text Engine</option>
                                                   <option value="drop_row">Drop Erroneous NLP Arrays</option>
                                                   <option value="drop_column">Purge Corrupted Column</option>
                                                   <option value="ignore">Bypass Text Checks (Ignore)</option>
                                               </select>
                                          </div>
                                      </div>
                                 </div>
                                 )
                             })}
                         </div>
                         <div className="flex items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm pt-4">
                             <button 
                                onClick={applyFix}
                                disabled={loading}
                                className="bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-glow hover:shadow-lg flex items-center gap-2 w-full md:w-auto justify-center">
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                Map Configured Sanitizations
                             </button>
                             {successMsg && (
                                 <span className="text-sm font-bold text-emerald-600 flex items-center gap-1.5 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200 shadow-sm animate-in fade-in zoom-in duration-300">
                                     <CheckCircle2 size={18} /> {successMsg}
                                 </span>
                             )}
                         </div>
                     </div>
                 ) : (
                     <div className="bg-slate-50 border border-slate-200 rounded-xl p-10 flex flex-col items-center justify-center text-center shadow-sm">
                         <div className="bg-emerald-100 text-emerald-600 p-4 rounded-full mb-4 shadow-sm">
                             <CheckCircle2 size={36} />
                         </div>
                         <h4 className="font-extrabold text-slate-800 text-xl tracking-tight">Dataset Layout Fully Pristine</h4>
                         <p className="text-slate-500 text-sm mt-2 font-medium">All columns implicitly scale above structural validation constraints mapping explicit absolute cleanliness internally.</p>
                     </div>
                 )}
             </div>
         ) : (
             <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                 <p className="text-slate-500 text-center font-medium">Validation schemas natively isolated inside structured array bindings rather than rigid tensor matrices.</p>
             </div>
         )}
    </div>
  );
}

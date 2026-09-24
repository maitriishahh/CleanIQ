import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Clock, DownloadCloud, FileSpreadsheet, Image as ImageIcon, Loader2 } from 'lucide-react';

export default function History() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState(null);
    
    const baseUrl = import.meta.env.VITE_API_URL;

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await axios.get(`${baseUrl}/history`);
                setHistory(res.data.history);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const handleDownload = async (sessionId, filename) => {
      setDownloadingId(sessionId);
      try {
          const res = await axios.get(`${baseUrl}/report/${sessionId}`, {
              responseType: 'blob'
          });
          const url = window.URL.createObjectURL(new Blob([res.data]));
          const link = document.createElement('a');
          link.href = url;
          link.setAttribute('download', `CleanIQ_Report_${filename}.pdf`);
          document.body.appendChild(link);
          link.click();
      } catch (err) {
          console.error(err);
      } finally {
          setDownloadingId(null);
      }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20">
                <Loader2 size={40} className="animate-spin text-primary-500" />
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-500">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-slate-800 flex items-center gap-3 tracking-tight">
                    <Clock className="text-primary-500" size={28} /> Session History
                </h2>
                <p className="text-slate-500 mt-2 text-lg">View recently processed datasets, review improvements, and download past reports.</p>
            </div>
            
            {history.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-soft">
                    <Clock size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-xl font-bold text-slate-700">No history found</h3>
                    <p className="text-slate-500 mt-2">Upload a dataset in your Workspace to see history here.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {history.map((session, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-soft group hover:border-primary-300 transition-colors">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-3 rounded-xl ${session.file_type === 'tabular' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                        {session.file_type === 'tabular' ? <FileSpreadsheet size={24} /> : <ImageIcon size={24} />}
                                    </div>
                                    <div className="truncate">
                                        <h4 className="font-bold text-slate-800 truncate max-w-[200px] block" title={session.filename}>{session.filename}</h4>
                                        <p className="text-xs font-medium text-slate-400 mt-1">{new Date(session.created_at).toLocaleDateString()} at {new Date(session.created_at).toLocaleTimeString()}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100 flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Initial DQS</p>
                                    <p className="text-2xl font-black text-slate-700">{session.dqs_before || 0}</p>
                                </div>
                                <div className="h-8 w-px bg-slate-200 mx-4"></div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Final DQS</p>
                                    <p className="text-2xl font-black text-emerald-500 flex items-center gap-1">
                                        {session.dqs_after || session.dqs_before || 0}
                                    </p>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => handleDownload(session.session_id, session.filename)}
                                disabled={downloadingId === session.session_id}
                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-primary-600 hover:border-primary-200 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {downloadingId === session.session_id ? <Loader2 size={18} className="animate-spin" /> : <DownloadCloud size={18} />} Export Action Report
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

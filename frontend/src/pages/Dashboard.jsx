import React, { useState } from 'react';
import axios from 'axios';
import Uploader from '../components/Uploader';
import DQSCard from '../components/DQSCard';
import IssuesBreakdown from '../components/IssuesBreakdown';
import ChatAssistant from '../components/ChatAssistant';
import ActionCenter from '../components/ActionCenter';
import QualityAnalytics from '../components/QualityAnalytics';
import CleaningTransparency from '../components/CleaningTransparency';
import { RotateCcw, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const [sessionData, setSessionData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [undoLoading, setUndoLoading] = useState(false);
  
  const baseUrl = import.meta.env.VITE_API_URL;

  const handleUndo = async () => {
      setUndoLoading(true);
      try {
          const res = await axios.post(`${baseUrl}/clean/undo`, {
              session_id: sessionData.session_id,
              message: "undo"
          });
          setSessionData({...sessionData, profile: sessionData.originalProfile});
          setLogs([]);
      } catch (err) {
          console.error(err);
      } finally {
          setUndoLoading(false);
      }
  };

  if (!sessionData) {
    return (
      <div className="flex flex-col items-center justify-center pt-20 pb-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 text-primary-600 text-sm font-semibold mb-6 border border-primary-100">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
            </span>
            Multi-Modal Analysis Ready
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-800 mb-4">
            Clean Data, <span className="text-primary-600">Instantly.</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
            Upload Tabular (CSV/Excel) or Image Datasets (ZIP). Let AI analyze, discover issues, and suggest intelligent actions to achieve pristine data quality.
          </p>
        </div>
        <div className="w-full max-w-3xl transition-all duration-500 hover:shadow-glow rounded-xl">
           <Uploader onUploadComplete={(data) => setSessionData({...data, originalProfile: data.profile})} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in zoom-in duration-500">
      <div className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Quality Assessment Report</h2>
          <p className="text-slate-500 mt-1">Showing insights for <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{sessionData?.profile?.filename || 'Uploaded Dataset'}</span></p>
        </div>
        <div className="flex items-center gap-3">
            <button 
              onClick={handleUndo} 
              disabled={undoLoading || logs.length === 0}
              className={`text-sm px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${logs.length > 0 ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 shadow-sm' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
              {undoLoading ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />} Undo All Changes
            </button>
            <button 
              onClick={() => { setSessionData(null); setLogs([]); }} 
              className="text-sm px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg font-medium transition-colors border border-slate-200 shadow-sm">
              Start New Analysis
            </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <DQSCard sessionData={sessionData} />
        </div>
        <div className="lg:col-span-2">
          <IssuesBreakdown 
            sessionData={sessionData} 
            onProfileUpdate={(updatedProfile) => setSessionData({...sessionData, profile: updatedProfile})}
            setGlobalLogs={setLogs}
          />
        </div>
      </div>
      
      <div className="mt-2 grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 flex flex-col gap-6">
             <ActionCenter 
               sessionData={sessionData} 
               onProfileUpdate={(updatedProfile) => setSessionData({...sessionData, profile: updatedProfile})} 
               setLogs={setLogs}
             />
             <QualityAnalytics sessionData={sessionData} />
             <CleaningTransparency sessionData={sessionData} logs={logs} />
        </div>
        <div className="xl:col-span-1">
             <ChatAssistant sessionId={sessionData.session_id} summary={sessionData.profile} />
        </div>
      </div>
    </div>
  );
}

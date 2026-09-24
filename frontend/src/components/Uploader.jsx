import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileSpreadsheet, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';

export default function Uploader({ onUploadComplete }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    
    setLoading(true);
    setError('');
    
    const isImage = file.name.endsWith('.zip');
    const endpoint = isImage ? '/upload/image' : '/upload/tabular';
    const baseUrl = import.meta.env.VITE_API_URL;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await axios.post(`${baseUrl}${endpoint}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      onUploadComplete({
        session_id: response.data.session_id,
        profile: { ...response.data.profile, filename: file.name },
        isImage
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Error uploading and processing file.');
    } finally {
      setLoading(false);
    }
  }, [onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/zip': ['.zip', '.x-zip-compressed']
    },
    multiple: false
  });

  return (
    <div className="bg-white rounded-2xl shadow-soft border border-slate-100 p-2 overflow-hidden relative group">
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 ${isDragActive ? 'border-primary-500 bg-primary-50/50' : 'border-slate-300 hover:border-primary-400 hover:bg-slate-50'}`}
      >
        <input {...getInputProps()} />
        <div className="flex justify-center mb-6">
          <div className="bg-white text-primary-600 p-4 rounded-xl shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
            {loading ? <Loader2 size={36} className="animate-spin" /> : <UploadCloud size={36} />}
          </div>
        </div>
        
        {loading ? (
          <div className="animate-pulse">
            <h3 className="text-xl font-semibold text-slate-800">Processing Dataset...</h3>
            <p className="text-slate-500 mt-2">Generating unified Multi-Modal Data Quality profile</p>
          </div>
        ) : (
          <div>
            <h3 className="text-xl font-semibold text-slate-800">Drag & Drop Dataset Here</h3>
            <p className="text-slate-500 mt-2">or click to browse from your computer</p>
            
            <div className="flex items-center justify-center gap-6 mt-10">
               <div className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                 <FileSpreadsheet size={18} className="text-emerald-500" /> Tabular (CSV/Excel)
               </div>
               <div className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                 <ImageIcon size={18} className="text-blue-500" /> Image Folder (ZIP)
               </div>
            </div>
          </div>
        )}
      </div>
      
      {error && (
        <div className="absolute bottom-4 left-4 right-4 p-4 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-200 flex items-center justify-start gap-3 shadow-sm animate-in slide-in-from-bottom-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}
    </div>
  );
}

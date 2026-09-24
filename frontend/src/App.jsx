import React, { useState } from 'react';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import HelpModal from './components/HelpModal';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans relative">
      <Navigation 
        currentPage={currentPage}
        onNavigate={setCurrentPage} 
        onOpenHelp={() => setIsHelpOpen(true)} 
      />
      <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-8">
        {currentPage === 'dashboard' ? <Dashboard /> : <History />}
      </main>
      
      {isHelpOpen && <HelpModal onClose={() => setIsHelpOpen(false)} />}
    </div>
  );
}

export default App;

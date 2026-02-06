import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { HashRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import WorkshopBooking from './pages/WorkshopBooking';
import BookingSummary from './pages/BookingSummary';
import { useEffect } from 'react';
import { initWixBridge } from '@/api/wixBridge';
import VersionLogger, { addLog } from '@/components/VersionLogger';

// Wrapper component to conditionally show VersionLogger
function AppContent() {
  const location = useLocation();
  const isSummaryPage = location.pathname === '/summary';

  useEffect(() => {
    // Initialize communication with Wix
    initWixBridge();
    if (!isSummaryPage) {
      addLog('App initialized', 'success');
    }
  }, [isSummaryPage]);

  return (
    <>
      <Routes>
        <Route path="/summary" element={<BookingSummary />} />
        <Route path="*" element={<WorkshopBooking />} />
      </Routes>
      {!isSummaryPage && <Toaster />}
      {!isSummaryPage && <VersionLogger />}
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <AppContent />
      </Router>
    </QueryClientProvider>
  )
}

export default App

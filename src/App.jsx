import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import WorkshopBooking from './pages/WorkshopBooking';
import BookingSummary from './pages/BookingSummary';
import { useEffect } from 'react';
import { initWixBridge } from '@/api/wixBridge';
import VersionLogger, { addLog } from '@/components/VersionLogger';

function App() {
  useEffect(() => {
    // Initialize communication with Wix
    initWixBridge();
    addLog('App initialized', 'success');
  }, []);

  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router basename="/Kan-bonim-booking-flow">
        <Routes>
          <Route path="/summary" element={<BookingSummary />} />
          <Route path="*" element={<WorkshopBooking />} />
        </Routes>
        <Toaster />
        <VersionLogger />
      </Router>
    </QueryClientProvider>
  )
}

export default App

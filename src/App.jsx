import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import WorkshopBooking from './pages/WorkshopBooking';
import { useEffect } from 'react';
import { initWixBridge } from '@/api/wixBridge';

function App() {
  useEffect(() => {
    // Initialize communication with Wix
    initWixBridge();
  }, []);

  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <Routes>
          <Route path="*" element={<WorkshopBooking />} />
        </Routes>
        <Toaster />
      </Router>
    </QueryClientProvider>
  )
}

export default App

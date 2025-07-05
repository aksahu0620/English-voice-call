import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { SignedIn, SignedOut } from '@clerk/clerk-react';
import { SocketProvider } from './context/SocketContext';

// Components
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import CallInterface from './components/call/CallInterface';
import FriendsPage from './components/friends/FriendsPage';
import HistoryPage from './components/history/HistoryPage';
import Layout from './components/Layout';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SignedOut>
        <LandingPage />
      </SignedOut>
      <SignedIn>
        <SocketProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/call/:callId" element={<CallInterface />} />
              <Route path="/friends" element={<FriendsPage />} />
              <Route path="/history" element={<HistoryPage />} />
            </Routes>
          </Layout>
        </SocketProvider>
      </SignedIn>
    </div>
  );
}

export default App;
import React, { useState, useEffect } from 'react';
import { Home, Pill, Activity, Clock } from 'lucide-react';
import { useSupabase } from './hooks/useSupabase';
import DashboardView from './components/DashboardView';
import MedicationsView from './components/MedicationsView';
import VitalsView from './components/VitalsView';
import TrackerView from './components/TrackerView';
import { sendNotification } from './utils/notifications';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // State
  const [vitals, setVitals, vitalsReady] = useSupabase('axell_vitals', {
    temperatures: [],
    waterIntake: [],
    diapers: []
  });
  
  const [medications, setMedications, medsReady] = useSupabase('axell_meds', {
    history: [],
    alarms: []
  });
  
  const [gelTimer, setGelTimer, gelReady] = useSupabase('axell_gel_timer', null);
  const [rounds, setRounds, roundsReady] = useSupabase('axell_rounds', []);

  if (!vitalsReady || !medsReady || !gelReady || !roundsReady) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
        <h2 className="text-primary">Loading Data...</h2>
        <p className="text-muted">Syncing with Supabase</p>
      </div>
    );
  }

  // Alarm Checker
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      
      // Check Med Alarms
      let medsChanged = false;
      const updatedAlarms = medications.alarms.map(alarm => {
        if (!alarm.notified && new Date(alarm.time) <= now) {
          sendNotification("Medication Due!", `It's time for ${alarm.name}`);
          medsChanged = true;
          return { ...alarm, notified: true };
        }
        return alarm;
      });
      
      if (medsChanged) {
        setMedications(prev => ({ ...prev, alarms: updatedAlarms }));
      }
      
      // Check Gel Timer
      if (gelTimer && !gelTimer.notified && new Date(gelTimer.expiresAt) <= now) {
        sendNotification("Change Fever Gel!", "The cooling gel timer has expired.");
        setGelTimer(prev => ({ ...prev, notified: true }));
      }
      
    }, 10000); // Check every 10 seconds
    
    return () => clearInterval(interval);
  }, [medications.alarms, gelTimer, setMedications, setGelTimer]);

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView vitals={vitals} medications={medications} gelTimer={gelTimer} />;
      case 'meds':
        return <MedicationsView medications={medications} setMedications={setMedications} />;
      case 'vitals':
        return <VitalsView vitals={vitals} setVitals={setVitals} />;
      case 'tracker':
        return <TrackerView gelTimer={gelTimer} setGelTimer={setGelTimer} rounds={rounds} setRounds={setRounds} />;
      default:
        return <DashboardView vitals={vitals} medications={medications} gelTimer={gelTimer} />;
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>Axell Tracker</h1>
      </header>

      <main style={{ paddingBottom: '100px' }}>
        {renderView()}
      </main>

      <nav className="bottom-nav">
        <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          <Home size={24} />
          <span>Home</span>
        </button>
        <button className={`nav-item ${activeTab === 'meds' ? 'active' : ''}`} onClick={() => setActiveTab('meds')}>
          <Pill size={24} />
          <span>Meds</span>
        </button>
        <button className={`nav-item ${activeTab === 'vitals' ? 'active' : ''}`} onClick={() => setActiveTab('vitals')}>
          <Activity size={24} />
          <span>Vitals</span>
        </button>
        <button className={`nav-item ${activeTab === 'tracker' ? 'active' : ''}`} onClick={() => setActiveTab('tracker')}>
          <Clock size={24} />
          <span>Track</span>
        </button>
      </nav>
    </div>
  );
}

export default App;

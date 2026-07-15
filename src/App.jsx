import React, { useState, useEffect } from 'react';
import { Home, Pill, Activity, Clock } from 'lucide-react';
import { useSupabase } from './hooks/useSupabase';
import { useHealthLogs } from './hooks/useHealthLogs';
import DashboardView from './components/DashboardView';
import MedicationsView from './components/MedicationsView';
import VitalsView from './components/VitalsView';
import TrackerView from './components/TrackerView';
import { sendNotification } from './utils/notifications';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // State from Supabase
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

  // Structured health_logs table — Realtime listeners fire fetchLogs() on any change
  const { logs: healthLogs, insertLog, isReady: logsReady } = useHealthLogs();

  // Alarm Checker
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      
      // Check Medication Alarms — use functional updater to avoid stale closure
      setMedications(prev => {
        if (!prev?.alarms) return prev;
        let changed = false;
        const updatedAlarms = prev.alarms.map(alarm => {
          if (!alarm.notified && new Date(alarm.time) <= now) {
            sendNotification("Medication Due!", `It's time for ${alarm.name}`);
            changed = true;
            return { ...alarm, notified: true };
          }
          return alarm;
        });
        return changed ? { ...prev, alarms: updatedAlarms } : prev;
      });
      
      // Check Gel Timer
      if (gelTimer && !gelTimer.notified && new Date(gelTimer.expiresAt) <= now) {
        sendNotification("Change Fever Gel!", "The cooling gel timer has expired.");
        setGelTimer(prev => ({ ...prev, notified: true }));
      }
      
    }, 5000); // Check every 5 seconds for snappier notifications
    
    return () => clearInterval(interval);
  }, [gelTimer, setMedications, setGelTimer]);

  if (!vitalsReady || !medsReady || !gelReady || !roundsReady || !logsReady) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', background: 'var(--background)' }}>
        <div className="progress-ring-container" style={{ margin: '0 0 20px 0' }}>
          <div className="loading-dots" style={{ fontSize: '2rem', color: 'var(--primary)', fontWeight: 'bold' }}>
            Syncing<span>.</span><span>.</span><span>.</span>
          </div>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' }}>Connecting to Supabase Database</p>
      </div>
    );
  }

  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView vitals={vitals} medications={medications} gelTimer={gelTimer} healthLogs={healthLogs} />;
      case 'meds':
        return <MedicationsView medications={medications} setMedications={setMedications} insertLog={insertLog} />;
      case 'vitals':
        return <VitalsView vitals={vitals} setVitals={setVitals} insertLog={insertLog} />;
      case 'tracker':
        return <TrackerView gelTimer={gelTimer} setGelTimer={setGelTimer} rounds={rounds} setRounds={setRounds} insertLog={insertLog} />;
      default:
        return <DashboardView vitals={vitals} medications={medications} gelTimer={gelTimer} healthLogs={healthLogs} />;
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
        <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')} id="nav-btn-dashboard">
          <Home size={22} />
          <span>Home</span>
        </button>
        <button className={`nav-item ${activeTab === 'meds' ? 'active' : ''}`} onClick={() => setActiveTab('meds')} id="nav-btn-meds">
          <Pill size={22} />
          <span>Meds</span>
        </button>
        <button className={`nav-item ${activeTab === 'vitals' ? 'active' : ''}`} onClick={() => setActiveTab('vitals')} id="nav-btn-vitals">
          <Activity size={22} />
          <span>Vitals</span>
        </button>
        <button className={`nav-item ${activeTab === 'tracker' ? 'active' : ''}`} onClick={() => setActiveTab('tracker')} id="nav-btn-tracker">
          <Clock size={22} />
          <span>Track</span>
        </button>
      </nav>
    </div>
  );
}

export default App;

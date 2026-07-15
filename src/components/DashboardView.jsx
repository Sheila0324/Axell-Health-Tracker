import React, { useState, useEffect, useMemo } from 'react';
import { format, parseISO, differenceInSeconds } from 'date-fns';
import { Thermometer, Droplets, Clock, Activity, ClipboardCopy, Baby } from 'lucide-react';

export default function DashboardView({ vitals, medications, gelTimer, healthLogs = [] }) {
  const [gelProgress, setGelProgress] = useState(100);
  const [gelTimeLeft, setGelTimeLeft] = useState('');

  const safeTemperatures = vitals?.temperatures || [];
  const safeAlarms = medications?.alarms || [];
  const latestTemp = safeTemperatures[0];
  const nextMedication = safeAlarms.find(m => new Date(m.time) > new Date()) || safeAlarms[0];

  const getTempStatus = (val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return { text: 'Unknown', class: 'temp-normal' };
    if (num >= 38.0) return { text: 'Fever Alert', class: 'temp-fever' };
    if (num >= 37.3) return { text: 'Warm', class: 'temp-warm' };
    return { text: 'Normal', class: 'temp-normal' };
  };

  const tempStatus = latestTemp ? getTempStatus(latestTemp.value) : null;

  // Real-time calculation for Cooling Gel Progress & Timer
  useEffect(() => {
    if (!gelTimer) {
      setGelProgress(0);
      setGelTimeLeft('');
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const start = parseISO(gelTimer.appliedAt);
      const end = parseISO(gelTimer.expiresAt);
      
      const totalSec = differenceInSeconds(end, start);
      const remainingSec = differenceInSeconds(end, now);
      
      if (remainingSec <= 0) {
        setGelProgress(0);
        setGelTimeLeft('Expired!');
      } else {
        const pct = Math.max(0, Math.min(100, (remainingSec / totalSec) * 100));
        setGelProgress(pct);

        const h = Math.floor(remainingSec / 3600);
        const m = Math.floor((remainingSec % 3600) / 60);
        const s = remainingSec % 60;
        setGelTimeLeft(`${h}h ${m}m ${s}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [gelTimer]);

  // SVG Progress Ring Specs
  const radius = 50;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (gelProgress / 100) * circumference;

  // ---------- Shift Summary Logic ----------
  const [timeFilter, setTimeFilter] = useState('3h'); // '3h', '6h', 'nurse'
  const [copySuccess, setCopySuccess] = useState(false);

  const shiftSummary = useMemo(() => {
    let startTime = new Date();
    
    if (timeFilter === '3h') {
      startTime.setHours(startTime.getHours() - 3);
    } else if (timeFilter === '6h') {
      startTime.setHours(startTime.getHours() - 6);
    } else if (timeFilter === 'nurse') {
      // Find the most recent nurse visit
      const lastNurseLog = healthLogs.find(l => l.category === 'note' && l.type === 'Nurse Visit');
      if (lastNurseLog) {
        startTime = parseISO(lastNurseLog.created_at);
      } else {
        // Fallback if no nurse log exists
        startTime.setHours(startTime.getHours() - 12);
      }
    }

    let hydration = 0;
    let wetDiapers = 0;
    let dirtyDiapers = 0;

    healthLogs.forEach(log => {
      const logTime = parseISO(log.created_at);
      if (logTime >= startTime) {
        if (log.category === 'water') {
          hydration += Number(log.value) || 0;
        } else if (log.category === 'diaper') {
          if (log.type === 'pee' || log.type === 'both') wetDiapers++;
          if (log.type === 'poop' || log.type === 'both') dirtyDiapers++;
        }
      }
    });

    return { startTime, hydration, wetDiapers, dirtyDiapers };
  }, [timeFilter, healthLogs]);

  const handleCopySummary = () => {
    const { startTime, hydration, wetDiapers, dirtyDiapers } = shiftSummary;
    const timeRangeStr = `${format(startTime, 'h:mma')} - ${format(new Date(), 'h:mma')}`;
    const text = `Shift Summary (${timeRangeStr}): Water: ${hydration}ml | Diapers: ${wetDiapers} Wet, ${dirtyDiapers} Dirty`;
    
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };
  // ----------------------------------------

  return (
    <div>

      {/* Shift Summary */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="card-title" style={{ margin: 0 }}>
            <Activity size={20} className="text-primary" /> 
            Shift Summary
          </h2>
          <button 
            onClick={handleCopySummary}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', 
              background: 'var(--input-bg)', border: '1px solid var(--border)', 
              color: copySuccess ? 'var(--primary)' : 'var(--text-main)', 
              padding: '6px 12px', borderRadius: 'var(--radius-sm)', 
              cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600',
              transition: 'all 0.2s ease'
            }}
          >
            <ClipboardCopy size={14} /> 
            {copySuccess ? 'Copied!' : 'Copy'}
          </button>
        </div>

        {/* Time Toggles */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
          <button 
            className={`btn ${timeFilter === 'nurse' ? 'btn-primary' : 'btn-secondary'}`} 
            onClick={() => setTimeFilter('nurse')}
            style={{ flex: '1 0 auto', padding: '8px 12px', fontSize: '0.85rem' }}
          >
            Since Nurse Check
          </button>
          <button 
            className={`btn ${timeFilter === '3h' ? 'btn-primary' : 'btn-secondary'}`} 
            onClick={() => setTimeFilter('3h')}
            style={{ flex: '1 0 auto', padding: '8px 12px', fontSize: '0.85rem' }}
          >
            Last 3 Hours
          </button>
          <button 
            className={`btn ${timeFilter === '6h' ? 'btn-primary' : 'btn-secondary'}`} 
            onClick={() => setTimeFilter('6h')}
            style={{ flex: '1 0 auto', padding: '8px 12px', fontSize: '0.85rem' }}
          >
            Last 6 Hours
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid-2-no-pad" style={{ gap: '12px' }}>
          <div style={{ background: 'var(--input-bg)', borderRadius: 'var(--radius-sm)', padding: '16px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Droplets size={24} className="text-info" />
            <div style={{ fontSize: '1.6rem', fontWeight: '800', color: 'var(--text-main)' }}>
              {shiftSummary.hydration} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>ml</span>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Hydration
            </span>
          </div>
          <div style={{ background: 'var(--input-bg)', borderRadius: 'var(--radius-sm)', padding: '16px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Baby size={24} className="text-warning" />
            <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)', display: 'flex', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span>{shiftSummary.wetDiapers}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>WET</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span>{shiftSummary.dirtyDiapers}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>DIRTY</span>
              </div>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Diaper Changes
            </span>
          </div>
        </div>
        <div className="timestamp" style={{ textAlign: 'center', marginTop: '12px', fontSize: '0.75rem' }}>
          Tracking since {format(shiftSummary.startTime, 'h:mm a')}
        </div>
      </div>

      {/* Grid: Vitals & Meds */}
      <div className="grid-2-no-pad" style={{ padding: '0 24px' }}>
        <div className="card" style={{ margin: '0' }}>
          <h2 className="card-title" style={{ fontSize: '1rem', marginBottom: '14px' }}>
            <Thermometer size={18} className="text-danger" /> 
            Last Temp
          </h2>
          {latestTemp ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span style={{ fontSize: '1.8rem', fontWeight: '800', tracking: '-1px' }}>{latestTemp.value}</span>
                <span style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-muted)' }}>°C</span>
              </div>
              <span className={`temp-badge ${tempStatus.class}`} style={{ width: 'fit-content' }}>
                {tempStatus.text}
              </span>
              <div className="timestamp" style={{ marginTop: '4px' }}>
                Logged at {format(parseISO(latestTemp.time), 'hh:mm a')}
              </div>
            </div>
          ) : (
            <div style={{ padding: '10px 0' }}>
              <p className="timestamp">No data logged yet</p>
            </div>
          )}
        </div>

        <div className="card" style={{ margin: '0' }}>
          <h2 className="card-title" style={{ fontSize: '1rem', marginBottom: '14px' }}>
            <Clock size={18} className="text-primary" /> 
            Next Meds
          </h2>
          {nextMedication ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: '800', fontSize: '1.05rem', color: 'var(--text-main)' }}>
                  {nextMedication.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                  {new Date(nextMedication.time) <= new Date() && (
                    <span className="alarm-pulse" style={{ marginRight: '6px' }} />
                  )}
                  <span className="timestamp" style={{ fontWeight: '700', color: 'var(--primary)' }}>
                    {format(parseISO(nextMedication.time), 'hh:mm a')}
                  </span>
                </div>
              </div>
              <div className="timestamp" style={{ marginTop: 'auto' }}>
                {new Date(nextMedication.time) <= new Date() ? 'PAST DUE!' : 'Upcoming Alert'}
              </div>
            </div>
          ) : (
            <div style={{ padding: '10px 0' }}>
              <p className="timestamp">No scheduled alarms</p>
            </div>
          )}
        </div>
      </div>

      {/* Cooling Gel status */}
      <div className="card">
        <h2 className="card-title">
          <Droplets size={20} className="text-info" /> 
          Cooling Gel Timer
        </h2>
        {gelTimer ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            {/* SVG Progress Ring */}
            <div className="progress-ring-container">
              <svg width="120" height="120">
                <circle
                  stroke="var(--border)"
                  fill="transparent"
                  strokeWidth={strokeWidth}
                  r={radius}
                  cx="60"
                  cy="60"
                />
                <circle
                  stroke="var(--info)"
                  fill="transparent"
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  r={radius}
                  cx="60"
                  cy="60"
                  style={{ transition: 'stroke-dashoffset 1s linear', transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                />
              </svg>
              <div className="progress-text" style={{ color: 'var(--info)' }}>
                {Math.round(gelProgress)}%
                <span>Left</span>
              </div>
            </div>

            {/* Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums' }}>
                {gelTimeLeft}
              </div>
              <div className="timestamp" style={{ fontSize: '0.85rem' }}>
                Applied: <strong>{format(parseISO(gelTimer.appliedAt), 'hh:mm a')}</strong>
              </div>
              <div className="timestamp" style={{ fontSize: '0.85rem' }}>
                Expires: <strong>{format(parseISO(gelTimer.expiresAt), 'hh:mm a')}</strong>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0', gap: '12px' }}>
            <p className="timestamp" style={{ textAlign: 'center' }}>No cooling gel timer currently running.</p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', margin: '0 16px' }}>
              Apply cooling gel to log progress and sound alerts when it's time to replace.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

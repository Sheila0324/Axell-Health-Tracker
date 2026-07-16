import React, { useState, useEffect, useMemo } from 'react';
import { format, parseISO, differenceInSeconds } from 'date-fns';
import { Thermometer, Droplets, Clock, Activity, ClipboardCopy, Baby, CalendarClock, CheckCircle, Stethoscope, Mic, MicOff, X } from 'lucide-react';

export default function DashboardView({ vitals, medications, gelTimer, healthLogs = [], insertLog, intervals = {}, setIntervals }) {
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

  // ---------- Quick Diaper Logger Logic ----------
  const [diaperModalType, setDiaperModalType] = useState(null); // 'poop' or 'both'
  const [toastMessage, setToastMessage] = useState('');

  const handleQuickDiaperLog = async (type, details = null) => {
    if (insertLog) {
      await insertLog({ category: 'diaper', type, details });
      setToastMessage(`✅ ${type === 'pee' ? 'Wet' : 'Dirty'} Diaper Logged!`);
      setTimeout(() => setToastMessage(''), 2500);
      setDiaperModalType(null);
    }
  };
  // -----------------------------------------------

  // ---------- Staff Visit Logger State ----------
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [visitorType, setVisitorType] = useState('Doctor');
  const [staffChecklist, setStaffChecklist] = useState([]);
  const [staffNotes, setStaffNotes] = useState('');
  const [isDictating, setIsDictating] = useState(false);
  
  const toggleChecklistItem = (item) => {
    if (staffChecklist.includes(item)) {
      setStaffChecklist(staffChecklist.filter(i => i !== item));
    } else {
      setStaffChecklist([...staffChecklist, item]);
    }
  };

  const stopDictating = () => {
    if (window.currentRecognition) {
      window.currentRecognition.stop();
      window.currentRecognition = null;
    }
    setIsDictating(false);
  };

  const handleDictate = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Your browser doesn't support the native Web Speech API.");
      return;
    }

    if (isDictating) {
      stopDictating();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onstart = () => setIsDictating(true);
    
    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setStaffNotes(prev => (prev + ' ' + finalTranscript).trim());
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setIsDictating(false);
    };

    recognition.onend = () => {
      setIsDictating(false);
    };

    recognition.start();
    window.currentRecognition = recognition;
  };

  const handleSaveStaffLog = async () => {
    if (!insertLog) return;
    const checklistStr = staffChecklist.length > 0 ? `[${staffChecklist.join(', ')}]` : '';
    const details = `${checklistStr} ${staffNotes}`.trim();
    
    await insertLog({
      category: 'note',
      type: visitorType,
      details: details || 'Routine Visit'
    });
    
    setToastMessage(`✅ ${visitorType} Visit Logged!`);
    setTimeout(() => setToastMessage(''), 2500);
    
    setShowStaffModal(false);
    setVisitorType('Doctor');
    setStaffChecklist([]);
    setStaffNotes('');
    stopDictating();
  };
  // ----------------------------------------------

  // ---------- Upcoming Schedule Logic ----------
  const [scheduleUpdateTrigger, setScheduleUpdateTrigger] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setScheduleUpdateTrigger(v => v + 1), 60000); // Update every minute to refresh colors/times
    return () => clearInterval(timer);
  }, []);

  const [setupIntervals, setSetupIntervals] = useState({});

  const { upcomingItems, missingIntervals } = useMemo(() => {
    const upcoming = [];
    const missing = [];
    
    // Map to track the most recent log per unique item
    const latestLogs = new Map();

    healthLogs.forEach(log => {
      if (log.category === 'vitals' && log.type === 'temp') {
        if (!latestLogs.has('Vitals Check')) {
          latestLogs.set('Vitals Check', { name: 'Vitals Check', type: 'vitals', time: parseISO(log.created_at) });
        }
      } else if (log.category === 'medicine' && log.type === 'dose' && log.details) {
        const medName = log.details.trim();
        if (!latestLogs.has(medName)) {
          latestLogs.set(medName, { name: medName, type: 'meds', time: parseISO(log.created_at) });
        }
      }
    });

    latestLogs.forEach((itemData, itemName) => {
      const intervalHours = intervals[itemName];
      
      if (intervalHours === undefined || intervalHours === null) {
        missing.push({ id: itemName, ...itemData });
      } else {
        const nextDue = new Date(itemData.time.getTime() + intervalHours * 3600 * 1000);
        upcoming.push({
          id: itemName,
          name: itemName,
          type: itemData.type,
          lastTime: itemData.time,
          nextDue,
        });
      }
    });

    return { 
      upcomingItems: upcoming.sort((a, b) => a.nextDue - b.nextDue),
      missingIntervals: missing
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [healthLogs, scheduleUpdateTrigger, intervals]);

  const handleSaveInterval = (itemName) => {
    const hours = parseFloat(setupIntervals[itemName] || 4); // default 4 if empty
    if (!isNaN(hours) && hours > 0 && setIntervals) {
      setIntervals(prev => ({ ...prev, [itemName]: hours }));
      setSetupIntervals(prev => {
        const copy = { ...prev };
        delete copy[itemName];
        return copy;
      });
    }
  };

  const handleMarkAsDone = async (item) => {
    if (!insertLog) return;
    if (item.type === 'vitals') {
      const tempStr = window.prompt("Enter Temperature (°C):");
      if (!tempStr || isNaN(tempStr)) return;
      await insertLog({ category: 'vitals', type: 'temp', value: parseFloat(tempStr), unit: 'C' });
    } else {
      await insertLog({ category: 'medicine', type: 'dose', details: item.name });
    }
  };
  // ---------------------------------------------

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

      {/* Quick Diaper Logger */}
      <div className="card" style={{ position: 'relative' }}>
        <h2 className="card-title" style={{ marginBottom: '16px' }}>
          <Baby size={20} className="text-warning" /> 
          Quick Diaper Log
        </h2>

        {toastMessage && (
          <div style={{
            position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)',
            background: 'var(--primary)', color: 'white', padding: '8px 16px',
            borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 10,
            animation: 'fadeInOut 2.5s ease forwards'
          }}>
            {toastMessage}
          </div>
        )}

        {diaperModalType ? (
          <div style={{ background: 'var(--input-bg)', padding: '16px', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)' }}>
            <span style={{ display: 'block', marginBottom: '12px', fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)', textAlign: 'center' }}>
              Select Consistency for {diaperModalType === 'poop' ? 'Poop' : 'Both'}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={() => handleQuickDiaperLog(diaperModalType, 'Formed/Hard')}>Formed / Hard</button>
              <button className="btn btn-secondary" onClick={() => handleQuickDiaperLog(diaperModalType, 'Loose')}>Loose</button>
              <button className="btn btn-secondary" onClick={() => handleQuickDiaperLog(diaperModalType, 'Watery/Diarrhea')}>Watery / Diarrhea</button>
              <button className="btn btn-secondary" onClick={() => setDiaperModalType(null)} style={{ marginTop: '8px', background: 'transparent', border: '1px solid var(--border)' }}>Cancel</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => handleQuickDiaperLog('pee', 'Urine')}
              style={{ flex: 1, borderLeft: '4px solid #facc15', padding: '14px 8px', fontSize: '1rem', display: 'flex', justifyContent: 'center', gap: '6px' }}
            >
              💦 Pee
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => setDiaperModalType('poop')}
              style={{ flex: 1, borderLeft: '4px solid #854d0e', padding: '14px 8px', fontSize: '1rem', display: 'flex', justifyContent: 'center', gap: '6px' }}
            >
              💩 Poop
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => setDiaperModalType('both')}
              style={{ flex: 1, borderLeft: '4px solid var(--primary)', padding: '14px 8px', fontSize: '1rem', display: 'flex', justifyContent: 'center', gap: '6px' }}
            >
              👶 Both
            </button>
          </div>
        )}
      </div>

      {/* Upcoming Schedule Timeline */}
      <div className="card">
        <h2 className="card-title">
          <CalendarClock size={20} className="text-primary" /> 
          Upcoming Schedule
        </h2>

        {missingIntervals.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px', marginBottom: '16px' }}>
            {missingIntervals.map(missing => (
              <div key={missing.id} style={{ background: 'var(--input-bg)', border: '1px solid var(--primary)', borderRadius: 'var(--radius-sm)', padding: '12px' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '8px' }}>
                  <strong>Detected new item:</strong> {missing.name}<br/>
                  How often should this be given?
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input 
                    type="number" 
                    className="input-field" 
                    style={{ width: '80px', padding: '6px' }}
                    placeholder="e.g. 6"
                    value={setupIntervals[missing.id] || ''}
                    onChange={e => setSetupIntervals(prev => ({ ...prev, [missing.id]: e.target.value }))}
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>hours</span>
                  <button 
                    className="btn btn-primary" 
                    style={{ padding: '6px 12px', fontSize: '0.8rem', marginLeft: 'auto' }}
                    onClick={() => handleSaveInterval(missing.id)}
                  >
                    Save
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {upcomingItems.length === 0 && missingIntervals.length === 0 ? (
          <p className="timestamp" style={{ textAlign: 'center', padding: '12px 0' }}>Log meds or vitals to see them here.</p>
        ) : upcomingItems.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
            {upcomingItems.map(item => {
              const now = new Date();
              const diffMs = item.nextDue - now;
              const diffMins = Math.floor(diffMs / 60000);
              const isPastDue = diffMins < 0;
              const isDueSoon = !isPastDue && diffMins <= 60;
              
              let statusColor = 'var(--text-muted)';
              let statusBorder = 'var(--border)';
              if (isPastDue) {
                statusColor = 'var(--danger)';
                statusBorder = 'var(--danger)';
              } else if (isDueSoon) {
                statusColor = 'var(--warning)';
                statusBorder = 'var(--warning)';
              }

              let timeText = '';
              if (isPastDue) {
                timeText = `Past due by ${Math.abs(diffMins)} mins`;
              } else if (diffMins < 60) {
                timeText = `Due in ${diffMins} mins`;
              } else {
                const hrs = Math.floor(diffMins / 60);
                const mins = diffMins % 60;
                timeText = `Due in ${hrs}h ${mins}m`;
              }

              return (
                <div key={item.id} style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: 'var(--input-bg)', borderLeft: `4px solid ${statusBorder}`, 
                  borderRadius: 'var(--radius-sm)', padding: '12px 16px' 
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>{item.name}</strong>
                    <div style={{ fontSize: '0.85rem', color: statusColor, fontWeight: '700' }}>
                      {timeText} <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>(at {format(item.nextDue, 'h:mm a')})</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleMarkAsDone(item)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: 'transparent', border: '1px solid var(--border)',
                      color: 'var(--text-main)', padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-main)'; }}
                  >
                    <CheckCircle size={16} /> Done
                  </button>
                </div>
              );
            })}
          </div>
        )}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontWeight: '800', fontSize: '1.05rem', color: 'var(--text-main)', wordBreak: 'break-word' }}>
                {nextMedication.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {new Date(nextMedication.time) <= new Date() && (
                  <span className="alarm-pulse" />
                )}
                <span className="timestamp" style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '0.9rem' }}>
                  {format(parseISO(nextMedication.time), 'hh:mm a')}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                <span className="timestamp" style={{ fontSize: '0.75rem' }}>
                  {new Date(nextMedication.time) <= new Date() ? '⚠️ PAST DUE' : 'Upcoming'}
                </span>
                <button
                  title="Log dose now"
                  onClick={async () => {
                    if (!insertLog) return;
                    await insertLog({ category: 'medicine', type: 'dose', details: nextMedication.name });
                    setToastMessage(`✅ ${nextMedication.name} logged!`);
                    setTimeout(() => setToastMessage(''), 2500);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    background: 'var(--primary)', color: 'white', border: 'none',
                    padding: '5px 10px', borderRadius: '20px',
                    cursor: 'pointer', fontSize: '0.72rem', fontWeight: '700',
                    letterSpacing: '0.3px',
                    boxShadow: '0 2px 6px rgba(99,102,241,0.4)',
                    transition: 'all 0.18s ease', whiteSpace: 'nowrap',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.filter = 'brightness(1.15)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.filter = 'brightness(1)'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <CheckCircle size={12} /> Log
                </button>
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

      {/* Staff Visit FAB */}
      <button 
        onClick={() => setShowStaffModal(true)}
        style={{
          position: 'fixed', bottom: '24px', right: '24px',
          width: '64px', height: '64px', borderRadius: '32px',
          background: 'linear-gradient(135deg, var(--primary), #3b82f6)',
          color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center',
          boxShadow: '0 4px 16px rgba(59, 130, 246, 0.4)',
          border: 'none', cursor: 'pointer', zIndex: 50, transition: 'transform 0.2s ease'
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        <Stethoscope size={32} />
      </button>

      {/* Staff Visit Modal */}
      {showStaffModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100, padding: '16px'
        }}>
          <div style={{
            background: 'var(--card-bg)', width: '100%', maxWidth: '400px',
            borderRadius: 'var(--radius-lg)', padding: '24px', position: 'relative',
            maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border)'
          }}>
            <button 
              onClick={() => { setShowStaffModal(false); stopDictating(); }}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={24} />
            </button>
            
            <h2 className="card-title" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Stethoscope size={24} className="text-primary" /> Log Staff Visit
            </h2>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Who Visited?</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['Doctor', 'Specialist', 'Nurse', 'Other'].map(type => (
                  <button 
                    key={type}
                    onClick={() => setVisitorType(type)}
                    className={`btn ${visitorType === type ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: '1 0 40%' }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Quick Checklist</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {['Checked Lungs', 'Checked Vitals', 'IV Check', 'Blood Draw', 'Meds Given'].map(item => (
                  <button 
                    key={item}
                    onClick={() => toggleChecklistItem(item)}
                    style={{ 
                      background: staffChecklist.includes(item) ? 'var(--primary)' : 'var(--input-bg)',
                      color: staffChecklist.includes(item) ? 'white' : 'var(--text-main)',
                      border: `1px solid ${staffChecklist.includes(item) ? 'var(--primary)' : 'var(--border)'}`,
                      padding: '6px 12px', borderRadius: '16px', fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>What did they say?</label>
                {(window.SpeechRecognition || window.webkitSpeechRecognition) && (
                  <button 
                    onClick={handleDictate}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '4px', background: isDictating ? '#fee2e2' : 'var(--input-bg)',
                      color: isDictating ? 'var(--danger)' : 'var(--text-main)', border: `1px solid ${isDictating ? 'var(--danger)' : 'var(--border)'}`,
                      padding: '4px 10px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer'
                    }}
                  >
                    {isDictating ? <><MicOff size={14} /> Stop</> : <><Mic size={14} /> Dictate</>}
                  </button>
                )}
              </div>
              <textarea 
                className="input-field"
                value={staffNotes}
                onChange={e => setStaffNotes(e.target.value)}
                placeholder="Doctor said lungs sound clear..."
                rows={4}
                style={{ resize: 'vertical' }}
              />
              {isDictating && <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="alarm-pulse" style={{ width: '6px', height: '6px' }} /> Listening...
              </div>}
            </div>

            <button className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: '1rem' }} onClick={handleSaveStaffLog}>
              Save Visit Log
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

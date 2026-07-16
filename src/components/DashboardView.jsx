import React, { useState, useEffect, useMemo } from 'react';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { Thermometer, Droplets, Clock, Activity, ClipboardCopy, Baby, CalendarClock, CheckCircle, Stethoscope, Mic, MicOff, X, TrendingUp, Flame, Timer } from 'lucide-react';

export default function DashboardView({ vitals, medications, healthLogs = [], insertLog, intervals = {}, setIntervals }) {

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

  // ---------- Shift Summary Logic ----------
  const [timeFilter, setTimeFilter] = useState('nurse'); // 'nurse', '3h', '6h'
  const [copySuccess, setCopySuccess] = useState(false);
  const [nurseCheckToast, setNurseCheckToast] = useState(false);

  const handleNurseCheck = async () => {
    if (!insertLog) return;
    const lastNurseLog = healthLogs.find(
      l => l.category === 'note' && (l.type === 'Nurse' || l.type === 'Nurse Visit')
    );
    const startTime = lastNurseLog ? parseISO(lastNurseLog.created_at) : new Date(0);
    
    let hydration = 0;
    let wet = 0;
    let dry = 0;
    
    healthLogs.forEach(l => {
      const logTime = parseISO(l.created_at);
      if (logTime > startTime) {
        if (l.category === 'water') {
          hydration += Number(l.value) || 0;
        } else if (l.category === 'diaper') {
          if (l.type === 'pee' || l.type === 'both') wet++;
          if (l.type === 'poop' || l.type === 'both') dry++;
        }
      }
    });

    await insertLog({
      category: 'note',
      type: 'Nurse Visit',
      details: `💧 Water: ${hydration}ml | 👶 Diapers: ${wet} WET, ${dry} DIRTY`
    });

    setNurseCheckToast(true);
    setTimeout(() => setNurseCheckToast(false), 2500);
  };

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
    
    setToastMessage(`\u2705 ${visitorType} Visit Logged!`);
    setTimeout(() => setToastMessage(''), 2500);
    
    setShowStaffModal(false);
    setVisitorType('Doctor');
    setStaffChecklist([]);
    setStaffNotes('');
    stopDictating();
  };
  // --------------------------------------------------


  // ---------- Fever Episode Analysis ----------
  const feverAnalysis = useMemo(() => {
    const temps = [...(vitals?.temperatures || [])]
      .map(t => ({ ...t, time: parseISO(t.time), value: parseFloat(t.value) }))
      .sort((a, b) => a.time - b.time); // oldest first

    if (temps.length === 0) return { episodes: [], hoursSinceLastFever: null, avgIntervalHours: null, currentlyFevering: false };

    const FEVER_THRESHOLD = 38.0;
    const GAP_HOURS = 4; // readings > 4h apart = new episode

    // Group into episodes: consecutive fever readings within GAP_HOURS of each other
    const episodes = [];
    let currentEpisode = null;

    temps.forEach((t) => {
      const isFever = t.value >= FEVER_THRESHOLD;
      if (isFever) {
        if (!currentEpisode) {
          currentEpisode = { start: t.time, end: t.time, peak: t.value, readings: [t] };
        } else {
          const gapMins = differenceInMinutes(t.time, currentEpisode.end);
          if (gapMins <= GAP_HOURS * 60) {
            // Same episode — extend
            currentEpisode.end = t.time;
            currentEpisode.peak = Math.max(currentEpisode.peak, t.value);
            currentEpisode.readings.push(t);
          } else {
            // New episode
            episodes.push(currentEpisode);
            currentEpisode = { start: t.time, end: t.time, peak: t.value, readings: [t] };
          }
        }
      } else {
        // Normal temp — close the episode if one was open
        if (currentEpisode) {
          episodes.push(currentEpisode);
          currentEpisode = null;
        }
      }
    });
    if (currentEpisode) episodes.push(currentEpisode);

    // Compute stats per episode
    const enriched = episodes.map((ep, i) => {
      const durationMins = differenceInMinutes(ep.end, ep.start);
      return { ...ep, durationMins, index: i + 1 };
    });

    // Currently fevering? last reading >= threshold
    const lastTemp = temps[temps.length - 1];
    const currentlyFevering = lastTemp ? lastTemp.value >= FEVER_THRESHOLD : false;

    // Hours since last fever ended (end of most recent episode)
    const lastEpisode = enriched[enriched.length - 1];
    const hoursSinceLastFever = lastEpisode && !currentlyFevering
      ? differenceInMinutes(new Date(), lastEpisode.end) / 60
      : null;

    // Average interval between episode starts
    let avgIntervalHours = null;
    if (enriched.length >= 2) {
      let totalGap = 0;
      for (let i = 1; i < enriched.length; i++) {
        totalGap += differenceInMinutes(enriched[i].start, enriched[i - 1].start);
      }
      avgIntervalHours = totalGap / (enriched.length - 1) / 60;
    }

    return { episodes: enriched.reverse(), hoursSinceLastFever, avgIntervalHours, currentlyFevering };
  }, [vitals?.temperatures]);

  const [feverTick, setFeverTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setFeverTick(v => v + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const liveSinceFever = useMemo(() => {
    const temps = [...(vitals?.temperatures || [])]
      .map(t => ({ ...t, time: parseISO(t.time), value: parseFloat(t.value) }))
      .sort((a, b) => a.time - b.time);
    const lastFeverReading = [...temps].reverse().find(t => t.value >= 38.0);
    if (!lastFeverReading) return null;
    const mins = differenceInMinutes(new Date(), lastFeverReading.time);
    return mins;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vitals?.temperatures, feverTick]);
  // -------------------------------------------

  return (
    <div>

      {/* Shift Summary */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="card-title" style={{ margin: 0 }}>
            <Activity size={20} className="text-primary" /> 
            Shift Summary
          </h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button 
              onClick={handleNurseCheck}
              style={{ 
                display: 'flex', alignItems: 'center', gap: '6px', 
                background: nurseCheckToast ? 'var(--primary)' : 'var(--input-bg)', 
                border: `1px solid ${nurseCheckToast ? 'var(--primary)' : 'var(--border)'}`, 
                color: nurseCheckToast ? 'white' : 'var(--text-main)', 
                padding: '6px 12px', borderRadius: 'var(--radius-sm)', 
                cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => { if (!nurseCheckToast) { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; } }}
              onMouseOut={(e) => { if (!nurseCheckToast) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-main)'; } }}
            >
              <CheckCircle size={14} /> 
              {nurseCheckToast ? 'Logged! ✓' : 'Log Nurse Check'}
            </button>
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
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
              {timeFilter === 'nurse' ? 'Water (Nurse Check)' : 'Total Hydration'}
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
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
              {timeFilter === 'nurse' ? 'Diapers (Nurse Check)' : 'Diaper Changes'}
            </span>
          </div>
        </div>
        <div className="timestamp" style={{ textAlign: 'center', marginTop: '12px', fontSize: '0.75rem' }}>
          {timeFilter === 'nurse'
            ? `Since last nurse check at ${format(shiftSummary.startTime, 'h:mm a')}`
            : `Tracking since ${format(shiftSummary.startTime, 'h:mm a')}`
          }
        </div>
      </div>

      {/* Fever Analysis Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="card-title" style={{ margin: 0 }}>
            <Flame size={20} style={{ color: '#f97316' }} />
            Fever Analysis
          </h2>
          {feverAnalysis.currentlyFevering ? (
            <span style={{
              background: 'rgba(239,68,68,0.15)', color: '#ef4444',
              border: '1px solid #ef4444', borderRadius: '20px',
              padding: '4px 12px', fontSize: '0.75rem', fontWeight: '800',
              display: 'flex', alignItems: 'center', gap: '5px', animation: 'pulse 1.5s ease infinite'
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
              FEVER ACTIVE
            </span>
          ) : liveSinceFever !== null ? (
            <span style={{
              background: 'rgba(34,197,94,0.12)', color: '#22c55e',
              border: '1px solid rgba(34,197,94,0.3)', borderRadius: '20px',
              padding: '4px 12px', fontSize: '0.75rem', fontWeight: '700'
            }}>
              Fever-free
            </span>
          ) : null}
        </div>

        {feverAnalysis.episodes.length === 0 ? (
          <p className="timestamp" style={{ textAlign: 'center', padding: '16px 0' }}>
            No fever episodes detected yet.
          </p>
        ) : (
          <>
            {/* Summary Stats Row */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              {/* Since last fever */}
              <div style={{
                flex: 1, background: 'var(--input-bg)', borderRadius: 'var(--radius-sm)',
                padding: '14px 12px', border: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
              }}>
                <Timer size={18} style={{ color: '#6366f1' }} />
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-main)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                  {liveSinceFever !== null
                    ? feverAnalysis.currentlyFevering
                      ? '—'
                      : `${Math.floor(liveSinceFever / 60)}h ${liveSinceFever % 60}m`
                    : '—'}
                </div>
                <span style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
                  {feverAnalysis.currentlyFevering ? 'Currently Fevering' : 'Since Last Fever'}
                </span>
              </div>

              {/* Total episodes */}
              <div style={{
                flex: 1, background: 'var(--input-bg)', borderRadius: 'var(--radius-sm)',
                padding: '14px 12px', border: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
              }}>
                <Flame size={18} style={{ color: '#f97316' }} />
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-main)', lineHeight: 1.1 }}>
                  {feverAnalysis.episodes.length}
                </div>
                <span style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
                  Fever Episodes
                </span>
              </div>

              {/* Avg interval */}
              <div style={{
                flex: 1, background: 'var(--input-bg)', borderRadius: 'var(--radius-sm)',
                padding: '14px 12px', border: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
              }}>
                <TrendingUp size={18} style={{ color: '#a855f7' }} />
                <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-main)', lineHeight: 1.1 }}>
                  {feverAnalysis.avgIntervalHours !== null
                    ? `${feverAnalysis.avgIntervalHours.toFixed(1)}h`
                    : '—'}
                </div>
                <span style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
                  Avg Interval
                </span>
              </div>
            </div>

            {/* Episode Timeline */}
            <div style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>
              Episode History
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {feverAnalysis.episodes.map((ep, i) => {
                const isFirst = i === 0;
                const durationH = Math.floor(ep.durationMins / 60);
                const durationM = ep.durationMins % 60;
                const durationStr = ep.durationMins < 1
                  ? '< 1 min'
                  : durationH > 0
                    ? `${durationH}h ${durationM}m`
                    : `${durationM}m`;
                const isOngoing = isFirst && feverAnalysis.currentlyFevering;
                return (
                  <div key={i} style={{
                    background: isOngoing ? 'rgba(239,68,68,0.08)' : 'var(--input-bg)',
                    border: `1px solid ${isOngoing ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
                    borderLeft: `4px solid ${isOngoing ? '#ef4444' : '#f97316'}`,
                    borderRadius: 'var(--radius-sm)', padding: '12px 14px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: '800', color: isOngoing ? '#ef4444' : '#f97316', textTransform: 'uppercase' }}>
                            Episode {feverAnalysis.episodes.length - i}
                          </span>
                          {isOngoing && (
                            <span style={{ fontSize: '0.65rem', background: '#ef4444', color: 'white', padding: '1px 6px', borderRadius: '8px', fontWeight: '700' }}>
                              ONGOING
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          <span style={{ color: 'var(--text-main)', fontWeight: '700' }}>{format(ep.start, 'MMM d, hh:mm a')}</span>
                          {' '}→{' '}
                          {isOngoing
                            ? <span style={{ color: '#ef4444', fontWeight: '700' }}>now</span>
                            : <span style={{ color: 'var(--text-main)', fontWeight: '700' }}>{format(ep.end, 'hh:mm a')}</span>
                          }
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '2px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            ⏱ <strong style={{ color: 'var(--text-main)' }}>{durationStr}</strong>
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            🌡 Peak <strong style={{ color: '#ef4444' }}>{ep.peak.toFixed(1)}°C</strong>
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            📊 <strong style={{ color: 'var(--text-main)' }}>{ep.readings.length}</strong> readings
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
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

import React, { useState } from 'react';
import { Pill, Plus, Bell, Trash2, Edit2, Calendar, Clock, CheckCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

export default function MedicationsView({ medications, setMedications, insertLog }) {
  const [medName, setMedName] = useState('');
  const [alarmTime, setAlarmTime] = useState('');
  const [promptData, setPromptData] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Custom date/time log
  const [showCustomLog, setShowCustomLog] = useState(false);
  const [customMedName, setCustomMedName] = useState('');
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const nowTimeStr = format(new Date(), 'HH:mm');
  const [customDate, setCustomDate] = useState(todayStr);
  const [customTime, setCustomTime] = useState(nowTimeStr);

  const handleAddMedication = (e) => {
    e.preventDefault();
    if (!medName.trim()) return;
    const newMed = { id: uuidv4(), name: medName.trim(), time: new Date().toISOString() };
    setMedications(prev => ({
      ...prev,
      history: [newMed, ...(prev?.history || [])]
    }));
    insertLog({ category: 'medicine', type: 'dose', details: medName.trim() });
    setMedName('');
  };

  const handleAddCustomLog = (e) => {
    e.preventDefault();
    if (!customMedName.trim() || !customDate || !customTime) return;
    const dateTimeStr = `${customDate}T${customTime}:00`;
    const loggedAt = new Date(dateTimeStr);
    if (isNaN(loggedAt.getTime())) return;
    const newMed = { id: uuidv4(), name: customMedName.trim(), time: loggedAt.toISOString() };
    setMedications(prev => ({
      ...prev,
      history: [newMed, ...(prev?.history || [])].sort((a, b) => new Date(b.time) - new Date(a.time))
    }));
    insertLog({ category: 'medicine', type: 'dose', details: customMedName.trim(), created_at: loggedAt.toISOString() });
    setCustomMedName('');
    setCustomDate(todayStr);
    setCustomTime(nowTimeStr);
    setShowCustomLog(false);
  };

  const handleAddAlarm = (e) => {
    e.preventDefault();
    if (!medName.trim() || !alarmTime) return;
    
    const today = new Date();
    const [hours, minutes] = alarmTime.split(':');
    today.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const newAlarm = { 
      id: uuidv4(), 
      name: medName.trim(), 
      time: today.toISOString(), 
      notified: false 
    };
    
    setMedications(prev => ({
      ...prev,
      alarms: [...(prev?.alarms || []), newAlarm].sort((a, b) => new Date(a.time) - new Date(b.time))
    }));
    setMedName('');
    setAlarmTime('');
    
    alert(`Alarm set for ${newAlarm.name} at ${format(today, 'hh:mm a')}`);
  };

  const confirmAction = () => {
    if (promptData.type === 'delete_alarm') {
      setMedications(prev => ({ 
        ...prev, 
        alarms: (prev?.alarms || []).filter(a => a.id !== promptData.id) 
      }));
    } else if (promptData.type === 'delete_history') {
      setMedications(prev => ({ 
        ...prev, 
        history: (prev?.history || []).filter(h => h.id !== promptData.id) 
      }));
    } else if (promptData.type === 'edit_history') {
      if (promptData.value && promptData.value.trim() !== '') {
        setMedications(prev => ({
          ...prev,
          history: (prev?.history || []).map(h => h.id === promptData.id ? { ...h, name: promptData.value.trim() } : h)
        }));
      }
    }
    setPromptData(null);
  };

  return (
    <div>
      {/* Log & Alarm Controls */}
      <div className="card">
        <h2 className="card-title">
          <Pill size={20} className="text-primary" /> 
          Medication Logger
        </h2>
        <div className="input-group">
          <label htmlFor="med-name-input">Medication Name</label>
          <input 
            id="med-name-input"
            type="text" 
            placeholder="e.g. Paracetamol, Ibuprofen" 
            value={medName} 
            onChange={(e) => setMedName(e.target.value)} 
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handleAddMedication}
            disabled={!medName.trim()}
            style={{ opacity: medName.trim() ? 1 : 0.6 }}
          >
            <Plus size={18} /> Log Taken Now
          </button>

          {/* Custom date/time log toggle */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setShowCustomLog(v => !v);
              if (!showCustomLog && medName.trim() && !customMedName.trim()) {
                setCustomMedName(medName.trim());
              }
            }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}
          >
            <Clock size={16} /> {showCustomLog ? 'Hide Custom Time' : 'Log with Custom Date & Time'}
          </button>

          {showCustomLog && (
            <div style={{
              background: 'var(--input-bg)',
              border: '1.5px solid var(--primary)',
              borderRadius: 'var(--radius-sm)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Log Entry for: <em style={{ textTransform: 'none', fontStyle: 'normal', color: 'var(--text-main)' }}>{medName}</em>
              </span>
              <div className="input-group" style={{ margin: 0 }}>
                <label htmlFor="custom-med-name">Medication Name</label>
                <input
                  id="custom-med-name"
                  type="text"
                  placeholder="e.g. Paracetamol"
                  value={customMedName}
                  onChange={e => setCustomMedName(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div className="input-group" style={{ margin: 0, flex: 1 }}>
                  <label htmlFor="custom-log-date">Date</label>
                  <input
                    id="custom-log-date"
                    type="date"
                    value={customDate}
                    onChange={e => setCustomDate(e.target.value)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1.5px solid var(--border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text-main)',
                      fontWeight: '500',
                      outline: 'none',
                      width: '100%'
                    }}
                  />
                </div>
                <div className="input-group" style={{ margin: 0, flex: 1 }}>
                  <label htmlFor="custom-log-time">Time</label>
                  <input
                    id="custom-log-time"
                    type="time"
                    value={customTime}
                    onChange={e => setCustomTime(e.target.value)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1.5px solid var(--border)',
                      background: 'var(--input-bg)',
                      color: 'var(--text-main)',
                      fontWeight: '500',
                      outline: 'none',
                      width: '100%'
                    }}
                  />
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAddCustomLog}
                disabled={!customMedName.trim() || !customDate || !customTime}
                style={{ opacity: (customMedName.trim() && customDate && customTime) ? 1 : 0.6 }}
              >
                <Calendar size={16} /> Save Custom Log
              </button>
            </div>
          )}
          
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
              Or Schedule Alarm
            </span>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input 
                type="time" 
                value={alarmTime} 
                onChange={(e) => setAlarmTime(e.target.value)} 
                style={{ 
                  flex: 1, 
                  padding: '12px', 
                  borderRadius: 'var(--radius-sm)', 
                  border: '1.5px solid var(--border)', 
                  background: 'var(--input-bg)',
                  color: 'var(--text-main)',
                  fontWeight: '500',
                  outline: 'none'
                }}
              />
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleAddAlarm}
                disabled={!medName.trim() || !alarmTime}
                style={{ width: 'auto', flex: 1, opacity: (medName.trim() && alarmTime) ? 1 : 0.6 }}
              >
                <Bell size={16} /> Set Alarm
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Alarms */}
      <div className="card" style={{ position: 'relative' }}>
        {toastMessage && (
          <div style={{
            position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)',
            background: 'var(--primary)', color: 'white', padding: '8px 16px',
            borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)', zIndex: 10,
            whiteSpace: 'nowrap',
          }}>
            {toastMessage}
          </div>
        )}
        <h2 className="card-title" style={{ justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell size={20} className="text-warning" /> Alarms
          </span>
          <span style={{ fontSize: '0.8rem', fontWeight: '700', padding: '4px 10px', background: 'var(--input-bg)', borderRadius: '12px', color: 'var(--text-muted)' }}>
            {(medications?.alarms || []).length} Active
          </span>
        </h2>
        {(medications?.alarms || []).length === 0 ? (
          <p className="timestamp" style={{ textAlign: 'center', padding: '12px 0' }}>No alarms set.</p>
        ) : (
          (medications?.alarms || []).map(med => (
            <div key={med.id} className="list-item">
              <div>
                <strong style={{ fontSize: '0.98rem' }}>{med.name}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="timestamp" style={{ fontWeight: '700', color: 'var(--primary)', background: 'var(--input-bg)', padding: '4px 8px', borderRadius: '6px' }}>
                  {format(parseISO(med.time), 'hh:mm a')}
                </span>
                <button
                  title="Log dose now"
                  onClick={async () => {
                    if (!insertLog) return;
                    await insertLog({ category: 'medicine', type: 'dose', details: med.name });
                    setToastMessage(`✅ ${med.name} logged!`);
                    setTimeout(() => setToastMessage(''), 2500);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    background: 'var(--primary)', color: 'white', border: 'none',
                    padding: '5px 10px', borderRadius: '20px',
                    cursor: 'pointer', fontSize: '0.72rem', fontWeight: '700',
                    letterSpacing: '0.3px',
                    boxShadow: '0 2px 6px rgba(99,102,241,0.35)',
                    transition: 'all 0.18s ease', whiteSpace: 'nowrap',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.filter = 'brightness(1.15)'; e.currentTarget.style.transform = 'scale(1.05)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.filter = 'brightness(1)'; e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <CheckCircle size={12} /> Log
                </button>
                <Trash2 
                  size={16} 
                  className="text-white" 
                  style={{ cursor: 'pointer', transition: 'color 0.2s' }} 
                  onClick={() => setPromptData({ type: 'delete_alarm', id: med.id, text: `Remove alarm for ${med.name}?` })} 
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* History logs */}
      <div className="card">
        <h2 className="card-title">
          <Calendar size={20} className="text-info" /> 
          Recent Medication History
        </h2>
        {(medications?.history || []).length === 0 ? (
          <p className="timestamp" style={{ textAlign: 'center', padding: '12px 0' }}>No history recorded.</p>
        ) : (
          (medications?.history || []).slice(0, 10).map(med => (
            <div key={med.id} className="list-item">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <strong style={{ fontSize: '0.98rem' }}>{med.name}</strong>
                <span className="timestamp">{format(parseISO(med.time), 'MMM d, hh:mm a')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <button 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px' }} 
                  onClick={() => setPromptData({ type: 'edit_history', id: med.id, text: 'Edit Medication Log Name', value: med.name })}
                  title="Edit entry"
                >
                  <Edit2 size={16} className="text-white" />
                </button>
                <button 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px' }} 
                  onClick={() => setPromptData({ type: 'delete_history', id: med.id, text: 'Delete this administration record?' })}
                  title="Delete entry"
                >
                  <Trash2 size={16} className="text-white" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Action Prompt Modal */}
      {promptData && (
        <div className="modal-backdrop">
          <div className="card modal-content" style={{ margin: 0 }}>
            <p style={{ marginBottom: '18px', fontWeight: '800', color: 'var(--text-main)', fontSize: '1.05rem', textAlign: 'center' }}>
              {promptData.text}
            </p>
            {promptData.type.startsWith('edit') && (
              <div className="input-group">
                <input 
                  type="text"
                  style={{ width: '100%' }}
                  value={promptData.value} 
                  onChange={e => setPromptData({ ...promptData, value: e.target.value })} 
                  autoFocus
                />
              </div>
            )}
            <div className="grid-2-no-pad" style={{ marginTop: '8px' }}>
              <button className="btn btn-secondary" onClick={() => setPromptData(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmAction}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

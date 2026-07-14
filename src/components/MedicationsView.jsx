import React, { useState } from 'react';
import { Pill, Plus, Bell, Trash2, Edit2, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

export default function MedicationsView({ medications, setMedications }) {
  const [medName, setMedName] = useState('');
  const [alarmTime, setAlarmTime] = useState('');
  const [promptData, setPromptData] = useState(null);

  const handleAddMedication = (e) => {
    e.preventDefault();
    if (!medName.trim()) return;
    const newMed = { id: uuidv4(), name: medName.trim(), time: new Date().toISOString() };
    setMedications(prev => ({
      ...prev,
      history: [newMed, ...(prev?.history || [])]
    }));
    setMedName('');
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
      <div className="card">
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span className="timestamp" style={{ fontWeight: '700', color: 'var(--primary)', background: 'var(--input-bg)', padding: '4px 8px', borderRadius: '6px' }}>
                  {format(parseISO(med.time), 'hh:mm a')}
                </span>
                <Trash2 
                  size={16} 
                  className="text-danger" 
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
                  <Edit2 size={16} className="text-primary" />
                </button>
                <button 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '4px' }} 
                  onClick={() => setPromptData({ type: 'delete_history', id: med.id, text: 'Delete this administration record?' })}
                  title="Delete entry"
                >
                  <Trash2 size={16} className="text-danger" />
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

import React, { useState } from 'react';
import { Pill, Plus, Bell, Trash2, Edit2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { sendNotification } from '../utils/notifications';

export default function MedicationsView({ medications, setMedications }) {
  const [medName, setMedName] = useState('');
  const [alarmTime, setAlarmTime] = useState('');

  const handleAddMedication = (e) => {
    e.preventDefault();
    if (!medName) return;
    const newMed = { id: uuidv4(), name: medName, time: new Date().toISOString() };
    setMedications(prev => ({
      ...prev,
      history: [newMed, ...prev.history]
    }));
    setMedName('');
  };

  const handleAddAlarm = (e) => {
    e.preventDefault();
    if (!medName || !alarmTime) return;
    
    const today = new Date();
    const [hours, minutes] = alarmTime.split(':');
    today.setHours(hours, minutes, 0, 0);

    const newAlarm = { id: uuidv4(), name: medName, time: today.toISOString(), notified: false };
    setMedications(prev => ({
      ...prev,
      alarms: [...prev.alarms, newAlarm].sort((a, b) => new Date(a.time) - new Date(b.time))
    }));
    setMedName('');
    setAlarmTime('');
    
    alert(`Alarm set for ${medName} at ${format(today, 'hh:mm a')}`);
  };

  const deleteAlarm = (id) => {
    if (window.confirm('Delete this alarm?')) {
      setMedications(prev => ({ ...prev, alarms: prev.alarms.filter(a => a.id !== id) }));
    }
  };

  const deleteHistory = (id) => {
    if (window.confirm('Delete this log?')) {
      setMedications(prev => ({ ...prev, history: prev.history.filter(h => h.id !== id) }));
    }
  };

  const editHistory = (id, currentName) => {
    const newName = window.prompt('Edit medication name:', currentName);
    if (newName && newName.trim() !== '') {
      setMedications(prev => ({
        ...prev,
        history: prev.history.map(h => h.id === id ? { ...h, name: newName.trim() } : h)
      }));
    }
  };

  return (
    <div>
      <div className="card">
        <h2 className="card-title"><Pill size={20} className="text-primary" /> Track Medication</h2>
        <form onSubmit={handleAddMedication} className="input-group">
          <label>Medication Name</label>
          <input 
            type="text" 
            placeholder="e.g. Paracetamol" 
            value={medName} 
            onChange={(e) => setMedName(e.target.value)} 
          />
          <div className="grid-2 mt-2" style={{ marginTop: '12px' }}>
            <button type="submit" className="btn btn-primary" onClick={handleAddMedication}>
              Log Taken Now
            </button>
            <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
               <input 
                 type="time" 
                 value={alarmTime} 
                 onChange={(e) => setAlarmTime(e.target.value)} 
               />
               <button type="button" className="btn btn-secondary" onClick={handleAddAlarm}>
                 <Bell size={16} /> Set Alarm
               </button>
            </div>
          </div>
        </form>
      </div>

      <div className="card">
        <h2 className="card-title">Upcoming Alarms</h2>
        {medications.alarms.filter(a => new Date(a.time) > new Date()).length === 0 ? (
          <p className="timestamp">No upcoming alarms.</p>
        ) : (
          medications.alarms
            .filter(a => new Date(a.time) > new Date())
            .map(med => (
            <div key={med.id} className="list-item">
              <div>
                <strong>{med.name}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="timestamp">{format(parseISO(med.time), 'hh:mm a')}</span>
                <Trash2 size={16} className="text-danger" style={{ cursor: 'pointer' }} onClick={() => deleteAlarm(med.id)} />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <h2 className="card-title">Recent History</h2>
        {medications.history.length === 0 ? (
          <p className="timestamp">No history.</p>
        ) : (
          medications.history.slice(0, 10).map(med => (
            <div key={med.id} className="list-item">
              <div>
                <strong>{med.name}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="timestamp">{format(parseISO(med.time), 'MMM d, hh:mm a')}</span>
                <Edit2 size={16} className="text-primary" style={{ cursor: 'pointer' }} onClick={() => editHistory(med.id, med.name)} />
                <Trash2 size={16} className="text-danger" style={{ cursor: 'pointer' }} onClick={() => deleteHistory(med.id)} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

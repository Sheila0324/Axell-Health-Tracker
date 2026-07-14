import React, { useState } from 'react';
import { Thermometer, Droplets, Baby, Trash2, Edit2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

export default function VitalsView({ vitals, setVitals }) {
  const [temp, setTemp] = useState('');
  const [water, setWater] = useState('');

  const logTemp = (e) => {
    e.preventDefault();
    if (!temp) return;
    const newTemp = { id: uuidv4(), value: temp, time: new Date().toISOString() };
    setVitals(prev => ({ ...prev, temperatures: [newTemp, ...prev.temperatures] }));
    setTemp('');
  };

  const logWater = (e) => {
    e.preventDefault();
    if (!water) return;
    const newWater = { id: uuidv4(), value: water, time: new Date().toISOString() };
    setVitals(prev => ({ ...prev, waterIntake: [newWater, ...prev.waterIntake] }));
    setWater('');
  };

  const logDiaper = (type) => {
    const newDiaper = { id: uuidv4(), type, time: new Date().toISOString() };
    setVitals(prev => ({ ...prev, diapers: [newDiaper, ...prev.diapers] }));
  };

  const deleteTemp = (id) => {
    if (window.confirm('Delete this temperature log?')) {
      setVitals(prev => ({ ...prev, temperatures: prev.temperatures.filter(t => t.id !== id) }));
    }
  };

  const editTemp = (id, currentVal) => {
    const newVal = window.prompt('Edit temperature (°C):', currentVal);
    if (newVal && !isNaN(newVal)) {
      setVitals(prev => ({
        ...prev,
        temperatures: prev.temperatures.map(t => t.id === id ? { ...t, value: newVal } : t)
      }));
    }
  };

  const deleteWater = (id) => {
    if (window.confirm('Delete this water log?')) {
      setVitals(prev => ({ ...prev, waterIntake: prev.waterIntake.filter(w => w.id !== id) }));
    }
  };

  const editWater = (id, currentVal) => {
    const newVal = window.prompt('Edit water intake (ml):', currentVal);
    if (newVal && !isNaN(newVal)) {
      setVitals(prev => ({
        ...prev,
        waterIntake: prev.waterIntake.map(w => w.id === id ? { ...w, value: newVal } : w)
      }));
    }
  };

  const deleteDiaper = (id) => {
    if (window.confirm('Delete this diaper log?')) {
      setVitals(prev => ({ ...prev, diapers: prev.diapers.filter(d => d.id !== id) }));
    }
  };

  return (
    <div>
      <div className="card">
        <h2 className="card-title"><Thermometer size={20} className="text-danger" /> Temperature</h2>
        <form onSubmit={logTemp} className="input-group">
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="number" 
              step="0.1" 
              placeholder="e.g. 37.5" 
              value={temp} 
              onChange={(e) => setTemp(e.target.value)} 
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>Log °C</button>
          </div>
        </form>
        <div style={{ marginTop: '12px' }}>
          {vitals.temperatures.slice(0, 10).map(t => (
            <div key={t.id} className="list-item">
              <strong>{t.value}°C</strong>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="timestamp">{format(parseISO(t.time), 'hh:mm a')}</span>
                <Edit2 size={16} className="text-primary" style={{ cursor: 'pointer' }} onClick={() => editTemp(t.id, t.value)} />
                <Trash2 size={16} className="text-danger" style={{ cursor: 'pointer' }} onClick={() => deleteTemp(t.id)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="card-title"><Droplets size={20} className="text-primary" /> Water Intake</h2>
        <form onSubmit={logWater} className="input-group">
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="number" 
              placeholder="ml" 
              value={water} 
              onChange={(e) => setWater(e.target.value)} 
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>Log ml</button>
          </div>
        </form>
        <div style={{ marginTop: '12px' }}>
          {vitals.waterIntake.slice(0, 10).map(w => (
            <div key={w.id} className="list-item">
              <strong>{w.value} ml</strong>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="timestamp">{format(parseISO(w.time), 'hh:mm a')}</span>
                <Edit2 size={16} className="text-primary" style={{ cursor: 'pointer' }} onClick={() => editWater(w.id, w.value)} />
                <Trash2 size={16} className="text-danger" style={{ cursor: 'pointer' }} onClick={() => deleteWater(w.id)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="card-title"><Baby size={20} className="text-warning" /> Diaper Changes</h2>
        <div className="grid-2">
          <button className="btn btn-secondary" onClick={() => logDiaper('Urine')}>💦 Urine</button>
          <button className="btn btn-secondary" onClick={() => logDiaper('Poop')}>💩 Poop</button>
          <button className="btn btn-secondary" onClick={() => logDiaper('Both')} style={{ gridColumn: 'span 2' }}>Both</button>
        </div>
        <div style={{ marginTop: '12px' }}>
          {vitals.diapers.slice(0, 10).map(d => (
            <div key={d.id} className="list-item">
              <strong>{d.type}</strong>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="timestamp">{format(parseISO(d.time), 'hh:mm a')}</span>
                <Trash2 size={16} className="text-danger" style={{ cursor: 'pointer' }} onClick={() => deleteDiaper(d.id)} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Thermometer, Droplets, Baby, Trash2, Edit2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

export default function VitalsView({ vitals, setVitals }) {
  const [temp, setTemp] = useState('');
  const [water, setWater] = useState('');
  const [promptData, setPromptData] = useState(null);

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

  const confirmAction = () => {
    if (promptData.type === 'delete_temp') {
      setVitals(prev => ({ ...prev, temperatures: prev.temperatures.filter(t => t.id !== promptData.id) }));
    } else if (promptData.type === 'edit_temp') {
      if (promptData.value && !isNaN(promptData.value)) {
        setVitals(prev => ({
          ...prev,
          temperatures: prev.temperatures.map(t => t.id === promptData.id ? { ...t, value: promptData.value } : t)
        }));
      }
    } else if (promptData.type === 'delete_water') {
      setVitals(prev => ({ ...prev, waterIntake: prev.waterIntake.filter(w => w.id !== promptData.id) }));
    } else if (promptData.type === 'edit_water') {
      if (promptData.value && !isNaN(promptData.value)) {
        setVitals(prev => ({
          ...prev,
          waterIntake: prev.waterIntake.map(w => w.id === promptData.id ? { ...w, value: promptData.value } : w)
        }));
      }
    } else if (promptData.type === 'delete_diaper') {
      setVitals(prev => ({ ...prev, diapers: prev.diapers.filter(d => d.id !== promptData.id) }));
    }
    setPromptData(null);
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
          {(vitals?.temperatures || []).slice(0, 10).map(t => (
            <div key={t.id} className="list-item">
              <strong>{t.value}°C</strong>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="timestamp">{format(parseISO(t.time), 'hh:mm a')}</span>
                <Edit2 size={16} className="text-primary" style={{ cursor: 'pointer' }} onClick={() => setPromptData({ type: 'edit_temp', id: t.id, text: 'Edit temperature (°C):', value: t.value })} />
                <Trash2 size={16} className="text-danger" style={{ cursor: 'pointer' }} onClick={() => setPromptData({ type: 'delete_temp', id: t.id, text: 'Delete this temperature log?' })} />
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
          {(vitals?.waterIntake || []).slice(0, 10).map(w => (
            <div key={w.id} className="list-item">
              <strong>{w.value} ml</strong>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="timestamp">{format(parseISO(w.time), 'hh:mm a')}</span>
                <Edit2 size={16} className="text-primary" style={{ cursor: 'pointer' }} onClick={() => setPromptData({ type: 'edit_water', id: w.id, text: 'Edit water intake (ml):', value: w.value })} />
                <Trash2 size={16} className="text-danger" style={{ cursor: 'pointer' }} onClick={() => setPromptData({ type: 'delete_water', id: w.id, text: 'Delete this water log?' })} />
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
          {(vitals?.diapers || []).slice(0, 10).map(d => (
            <div key={d.id} className="list-item">
              <strong>{d.type}</strong>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span className="timestamp">{format(parseISO(d.time), 'hh:mm a')}</span>
                <Trash2 size={16} className="text-danger" style={{ cursor: 'pointer' }} onClick={() => setPromptData({ type: 'delete_diaper', id: d.id, text: 'Delete this diaper log?' })} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {promptData && (
        <div className="modal-backdrop">
          <div className="card modal-content">
            <p style={{ marginBottom: '16px', fontWeight: 'bold' }}>{promptData.text}</p>
            {promptData.type.startsWith('edit') && (
              <input 
                type="number"
                step="0.1"
                className="input-group"
                style={{ width: '100%', padding: '12px', marginBottom: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}
                value={promptData.value} 
                onChange={e => setPromptData({ ...promptData, value: e.target.value })} 
              />
            )}
            <div className="grid-2">
              <button className="btn btn-secondary" onClick={() => setPromptData(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmAction}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

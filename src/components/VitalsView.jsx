import React, { useState, useMemo } from 'react';
import { Thermometer, Droplets, Baby, Trash2, Edit2, Plus, History, X, CheckCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

export default function VitalsView({ vitals, setVitals, insertLog, healthLogs = [] }) {
  const [temp, setTemp] = useState('');
  const [water, setWater] = useState('');
  const [promptData, setPromptData] = useState(null);
  const [showAllTemps, setShowAllTemps] = useState(false);
  const [nurseCheckToast, setNurseCheckToast] = useState(false);

  // Water total since last nurse check
  const waterSinceLastNurse = useMemo(() => {
    const lastNurseLog = healthLogs.find(
      l => l.category === 'note' && (l.type === 'Nurse' || l.type === 'Nurse Visit')
    );
    const startTime = lastNurseLog ? parseISO(lastNurseLog.created_at) : new Date(0);
    return healthLogs
      .filter(l => l.category === 'water' && parseISO(l.created_at) > startTime)
      .reduce((sum, l) => sum + (Number(l.value) || 0), 0);
  }, [healthLogs]);

  // Diapers since last nurse check
  const diapersSinceLastNurse = useMemo(() => {
    const lastNurseLog = healthLogs.find(
      l => l.category === 'note' && (l.type === 'Nurse' || l.type === 'Nurse Visit')
    );
    const startTime = lastNurseLog ? parseISO(lastNurseLog.created_at) : new Date(0);
    let wet = 0;
    let dirty = 0;
    healthLogs.forEach(l => {
      if (l.category === 'diaper' && parseISO(l.created_at) > startTime) {
        if (l.type === 'pee' || l.type === 'both') wet++;
        if (l.type === 'poop' || l.type === 'both') dirty++;
      }
    });
    return { wet, dirty };
  }, [healthLogs]);

  const handleNurseCheck = async () => {
    if (!insertLog) return;
    await insertLog({
      category: 'note',
      type: 'Nurse Visit',
      details: `💧 Water: ${waterSinceLastNurse}ml | 👶 Diapers: ${diapersSinceLastNurse.wet} WET, ${diapersSinceLastNurse.dirty} DIRTY`
    });
    setNurseCheckToast(true);
    setTimeout(() => setNurseCheckToast(false), 2500);
  };

  const logTemp = (e) => {
    if (e) e.preventDefault();
    if (!temp || isNaN(temp)) return;
    const newTemp = { id: uuidv4(), value: parseFloat(temp).toFixed(1), time: new Date().toISOString() };
    setVitals(prev => ({ 
      ...prev, 
      temperatures: [newTemp, ...(prev?.temperatures || [])] 
    }));
    insertLog({ category: 'vitals', type: 'temp', value: parseFloat(temp), unit: 'C' });
    setTemp('');
  };

  const logWater = (e) => {
    if (e) e.preventDefault();
    if (!water || isNaN(water)) return;
    const newWater = { id: uuidv4(), value: parseInt(water).toString(), time: new Date().toISOString() };
    setVitals(prev => ({ 
      ...prev, 
      waterIntake: [newWater, ...(prev?.waterIntake || [])] 
    }));
    insertLog({ category: 'water', type: 'water', value: parseInt(water), unit: 'ml' });
    setWater('');
  };

  const quickLogWater = (amount) => {
    const newWater = { id: uuidv4(), value: amount.toString(), time: new Date().toISOString() };
    setVitals(prev => ({ 
      ...prev, 
      waterIntake: [newWater, ...(prev?.waterIntake || [])] 
    }));
    insertLog({ category: 'water', type: 'water', value: amount, unit: 'ml' });
  };

  const logDiaper = (type) => {
    const newDiaper = { id: uuidv4(), type, time: new Date().toISOString() };
    setVitals(prev => ({ 
      ...prev, 
      diapers: [newDiaper, ...(prev?.diapers || [])] 
    }));
    const diaperType = type === 'Urine' ? 'pee' : type === 'Poop' ? 'poop' : 'both';
    insertLog({ category: 'diaper', type: diaperType, details: type });
  };

  const getTempStatus = (val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return { text: 'Normal', class: 'temp-normal' };
    if (num >= 38.0) return { text: 'Fever', class: 'temp-fever' };
    if (num >= 37.3) return { text: 'Warm', class: 'temp-warm' };
    return { text: 'Normal', class: 'temp-normal' };
  };

  const confirmAction = () => {
    if (promptData.type === 'delete_temp') {
      setVitals(prev => ({ ...prev, temperatures: (prev?.temperatures || []).filter(t => t.id !== promptData.id) }));
    } else if (promptData.type === 'edit_temp') {
      if (promptData.value && !isNaN(promptData.value)) {
        setVitals(prev => ({
          ...prev,
          temperatures: (prev?.temperatures || []).map(t => t.id === promptData.id ? { ...t, value: parseFloat(promptData.value).toFixed(1) } : t)
        }));
      }
    } else if (promptData.type === 'delete_water') {
      setVitals(prev => ({ ...prev, waterIntake: (prev?.waterIntake || []).filter(w => w.id !== promptData.id) }));
    } else if (promptData.type === 'edit_water') {
      if (promptData.value && !isNaN(promptData.value)) {
        setVitals(prev => ({
          ...prev,
          waterIntake: (prev?.waterIntake || []).map(w => w.id === promptData.id ? { ...w, value: parseInt(promptData.value).toString() } : w)
        }));
      }
    } else if (promptData.type === 'delete_diaper') {
      setVitals(prev => ({ ...prev, diapers: (prev?.diapers || []).filter(d => d.id !== promptData.id) }));
    }
    setPromptData(null);
  };

  return (
    <div>
      {/* Temperature Logger */}
      <div className="card">
        <h2 className="card-title" style={{ justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Thermometer size={20} className="text-danger" />
            Temperature Logs
          </span>
          {(vitals?.temperatures || []).length > 0 && (
            <button
              onClick={() => setShowAllTemps(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--primary)', fontSize: '0.8rem', fontWeight: '700', padding: '4px 0' }}
            >
              <History size={14} /> View All ({(vitals?.temperatures || []).length})
            </button>
          )}
        </h2>
        <form onSubmit={logTemp} className="input-group">
          <label htmlFor="temp-input">Body Temperature (°C)</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              id="temp-input"
              type="number" 
              step="0.1" 
              placeholder="e.g. 37.2" 
              value={temp} 
              onChange={(e) => setTemp(e.target.value)} 
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '0 24px' }}>
              Log
            </button>
          </div>
        </form>

        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {(vitals?.temperatures || []).slice(0, 5).map(t => {
            const status = getTempStatus(t.value);
            return (
              <div key={t.id} className="list-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <strong style={{ fontSize: '1.05rem' }}>{t.value}°C</strong>
                  <span className={`temp-badge ${status.class}`} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                    {status.text}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span className="timestamp">{format(parseISO(t.time), 'hh:mm a')}</span>
                  <Edit2 
                    size={15} 
                    className="text-white" 
                    style={{ cursor: 'pointer' }} 
                    onClick={() => setPromptData({ type: 'edit_temp', id: t.id, text: 'Edit temperature (°C):', value: t.value })} 
                  />
                  <Trash2 
                    size={15} 
                    className="text-white" 
                    style={{ cursor: 'pointer' }} 
                    onClick={() => setPromptData({ type: 'delete_temp', id: t.id, text: 'Delete this temperature record?' })} 
                  />
                </div>
              </div>
            );
          })}
          {(vitals?.temperatures || []).length > 5 && (
            <button
              onClick={() => setShowAllTemps(true)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '700', textAlign: 'center', marginTop: '6px', padding: '4px', width: '100%' }}
            >
              + {(vitals?.temperatures || []).length - 5} more — View all logs
            </button>
          )}
        </div>
      </div>

      {/* Water Intake */}
      <div className="card">
        <h2 className="card-title">
          <Droplets size={20} className="text-info" /> 
          Water Intake
        </h2>
        <form onSubmit={logWater} className="input-group">
          <label htmlFor="water-input">Water volume (ml)</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input 
              id="water-input"
              type="number" 
              placeholder="e.g. 100" 
              value={water} 
              onChange={(e) => setWater(e.target.value)} 
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '0 24px' }}>
              Log
            </button>
          </div>
        </form>

        {/* Quick Log Cup Buttons */}
        <div style={{ marginBottom: '16px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
            Quick Presets
          </span>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
            {[50, 100, 150, 200].map(amount => (
              <button 
                key={amount} 
                className="btn btn-secondary" 
                onClick={() => quickLogWater(amount)}
                style={{ padding: '8px 12px', fontSize: '0.85rem', flex: 1 }}
              >
                +{amount}ml
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {(vitals?.waterIntake || []).slice(0, 5).map(w => (
            <div key={w.id} className="list-item">
              <strong style={{ fontSize: '1.02rem', color: 'var(--info)' }}>{w.value} ml</strong>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span className="timestamp">{format(parseISO(w.time), 'hh:mm a')}</span>
                <Edit2 
                  size={15} 
                  className="text-white" 
                  style={{ cursor: 'pointer' }} 
                  onClick={() => setPromptData({ type: 'edit_water', id: w.id, text: 'Edit water intake (ml):', value: w.value })} 
                />
                <Trash2 
                  size={15} 
                  className="text-white" 
                  style={{ cursor: 'pointer' }} 
                  onClick={() => setPromptData({ type: 'delete_water', id: w.id, text: 'Delete this water intake record?' })} 
                />
              </div>
            </div>
          ))}
          {(vitals?.waterIntake || []).length > 5 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '6px' }}>
              Showing latest 5 records
            </span>
          )}
        </div>

        {/* Nurse Check Summary Bar */}
        <div style={{
          marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Since Last Nurse Check
            </span>
            <span style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--info)', fontVariantNumeric: 'tabular-nums' }}>
              {waterSinceLastNurse} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>ml</span>
            </span>
          </div>
          <button
            onClick={handleNurseCheck}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: nurseCheckToast ? 'var(--primary)' : 'var(--input-bg)',
              color: nurseCheckToast ? 'white' : 'var(--text-main)',
              border: `1px solid ${nurseCheckToast ? 'var(--primary)' : 'var(--border)'}`,
              padding: '8px 14px', borderRadius: 'var(--radius-sm)',
              cursor: 'pointer', fontSize: '0.82rem', fontWeight: '700',
              transition: 'all 0.2s ease', whiteSpace: 'nowrap',
            }}
            onMouseOver={(e) => { if (!nurseCheckToast) { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; } }}
            onMouseOut={(e) => { if (!nurseCheckToast) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-main)'; } }}
          >
            <CheckCircle size={14} />
            {nurseCheckToast ? 'Logged! ✓' : 'Log Nurse Check'}
          </button>
        </div>
      </div>

      {/* Diaper Changes */}
      <div className="card">
        <h2 className="card-title">
          <Baby size={20} className="text-warning" /> 
          Diaper Changes
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="grid-2-no-pad">
            <button className="btn btn-secondary" onClick={() => logDiaper('Urine')} style={{ borderLeft: '4px solid #facc15' }}>
              💦 Urine
            </button>
            <button className="btn btn-secondary" onClick={() => logDiaper('Poop')} style={{ borderLeft: '4px solid #854d0e' }}>
              💩 Poop
            </button>
          </div>
          <button className="btn btn-secondary" onClick={() => logDiaper('Both')} style={{ borderLeft: '4px solid var(--primary)' }}>
            👶 Both (Urine & Poop)
          </button>
        </div>

        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {(vitals?.diapers || []).slice(0, 5).map(d => {
            let color = 'var(--primary)';
            if (d.type === 'Urine') color = '#facc15';
            if (d.type === 'Poop') color = '#854d0e';
            
            return (
              <div key={d.id} className="list-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                  <strong style={{ fontSize: '0.98rem' }}>{d.type}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span className="timestamp">{format(parseISO(d.time), 'MMM d, hh:mm a')}</span>
                  <Trash2 
                    size={15} 
                    className="text-white" 
                    style={{ cursor: 'pointer' }} 
                    onClick={() => setPromptData({ type: 'delete_diaper', id: d.id, text: `Delete this ${d.type} diaper log?` })} 
                  />
                </div>
              </div>
            );
          })}
          {(vitals?.diapers || []).length > 5 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '6px' }}>
              Showing latest 5 records
            </span>
          )}
        </div>

        {/* Nurse Check Summary Bar */}
        <div style={{
          marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Since Last Nurse Check
            </span>
            <span style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--warning)', fontVariantNumeric: 'tabular-nums' }}>
              {diapersSinceLastNurse.wet} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>WET</span>
              {'  /  '}
              {diapersSinceLastNurse.dirty} <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)' }}>DIRTY</span>
            </span>
          </div>
          <button
            onClick={handleNurseCheck}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: nurseCheckToast ? 'var(--primary)' : 'var(--input-bg)',
              color: nurseCheckToast ? 'white' : 'var(--text-main)',
              border: `1px solid ${nurseCheckToast ? 'var(--primary)' : 'var(--border)'}`,
              padding: '8px 14px', borderRadius: 'var(--radius-sm)',
              cursor: 'pointer', fontSize: '0.82rem', fontWeight: '700',
              transition: 'all 0.2s ease', whiteSpace: 'nowrap',
            }}
            onMouseOver={(e) => { if (!nurseCheckToast) { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; } }}
            onMouseOut={(e) => { if (!nurseCheckToast) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-main)'; } }}
          >
            <CheckCircle size={14} />
            {nurseCheckToast ? 'Logged! ✓' : 'Log Nurse Check'}
          </button>
        </div>
      </div>

      {/* Temperature Full History Modal */}
      {showAllTemps && (
        <div className="modal-backdrop" onClick={() => setShowAllTemps(false)}>
          <div
            className="card modal-content"
            style={{ margin: 0, maxWidth: '480px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '1rem', color: 'var(--text-main)' }}>
                <Thermometer size={18} className="text-danger" />
                All Temperature Logs
                <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '2px 8px', background: 'var(--input-bg)', borderRadius: '10px', color: 'var(--text-muted)' }}>
                  {(vitals?.temperatures || []).length} records
                </span>
              </span>
              <button onClick={() => setShowAllTemps(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                <X size={20} />
              </button>
            </div>

            {/* Scrollable List */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {(vitals?.temperatures || []).length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0', fontSize: '0.9rem' }}>No temperature records yet.</p>
              ) : (
                (() => {
                  // Group by date
                  const groups = {};
                  (vitals?.temperatures || []).forEach(t => {
                    const dateKey = format(parseISO(t.time), 'MMM d, yyyy');
                    if (!groups[dateKey]) groups[dateKey] = [];
                    groups[dateKey].push(t);
                  });
                  return Object.entries(groups).map(([date, records]) => (
                    <div key={date}>
                      <div style={{ fontSize: '0.72rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', margin: '10px 0 6px', paddingLeft: '4px' }}>
                        {date}
                      </div>
                      {records.map(t => {
                        const status = getTempStatus(t.value);
                        return (
                          <div key={t.id} className="list-item">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <strong style={{ fontSize: '1.05rem' }}>{t.value}°C</strong>
                              <span className={`temp-badge ${status.class}`} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                                {status.text}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                              <span className="timestamp">{format(parseISO(t.time), 'hh:mm a')}</span>
                              <Edit2
                                size={15}
                                className="text-white"
                                style={{ cursor: 'pointer' }}
                                onClick={() => { setShowAllTemps(false); setPromptData({ type: 'edit_temp', id: t.id, text: 'Edit temperature (°C):', value: t.value }); }}
                              />
                              <Trash2
                                size={15}
                                className="text-white"
                                style={{ cursor: 'pointer' }}
                                onClick={() => { setShowAllTemps(false); setPromptData({ type: 'delete_temp', id: t.id, text: 'Delete this temperature record?' }); }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Prompts */}
      {promptData && (
        <div className="modal-backdrop">
          <div className="card modal-content" style={{ margin: 0 }}>
            <p style={{ marginBottom: '18px', fontWeight: '800', color: 'var(--text-main)', fontSize: '1.05rem', textAlign: 'center' }}>
              {promptData.text}
            </p>
            {promptData.type.startsWith('edit') && (
              <div className="input-group">
                <input 
                  type="number"
                  step={promptData.type === 'edit_temp' ? '0.1' : '1'}
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

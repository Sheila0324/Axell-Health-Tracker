import React, { useState, useEffect } from 'react';
import { Snowflake, Users, Play, Square, Trash2, Edit2 } from 'lucide-react';
import { format, differenceInSeconds, parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

export default function TrackerView({ gelTimer, setGelTimer, rounds, setRounds }) {
  const [duration, setDuration] = useState('4');
  const [timeLeft, setTimeLeft] = useState(null);

  const [roundNote, setRoundNote] = useState('');
  const [promptData, setPromptData] = useState(null);

  useEffect(() => {
    let interval;
    if (gelTimer) {
      interval = setInterval(() => {
        const diff = differenceInSeconds(parseISO(gelTimer.expiresAt), new Date());
        if (diff <= 0) {
          setTimeLeft('Expired!');
        } else {
          const h = Math.floor(diff / 3600);
          const m = Math.floor((diff % 3600) / 60);
          const s = diff % 60;
          setTimeLeft(`${h}h ${m}m ${s}s`);
        }
      }, 1000);
    } else {
      setTimeLeft(null);
    }
    return () => clearInterval(interval);
  }, [gelTimer]);

  const startGel = () => {
    const now = new Date();
    const expires = new Date(now.getTime() + parseInt(duration) * 3600 * 1000);
    setGelTimer({
      id: uuidv4(),
      appliedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      notified: false
    });
  };

  const stopGel = () => {
    setGelTimer(null);
  };

  const logRound = (person) => {
    const newRound = { id: uuidv4(), person, note: roundNote, time: new Date().toISOString() };
    setRounds(prev => [newRound, ...prev]);
    setRoundNote('');
  };

  const confirmAction = () => {
    if (promptData.type === 'delete_round') {
      setRounds(prev => prev.filter(r => r.id !== promptData.id));
    } else if (promptData.type === 'edit_round') {
      if (promptData.value !== undefined) {
        setRounds(prev => prev.map(r => r.id === promptData.id ? { ...r, note: promptData.value } : r));
      }
    }
    setPromptData(null);
  };

  return (
    <div>
      <div className="card">
        <h2 className="card-title"><Snowflake size={20} className="text-secondary" /> Cooling Fever Gel</h2>
        {!gelTimer ? (
          <div className="input-group">
            <label>Duration (Hours)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select value={duration} onChange={e => setDuration(e.target.value)} style={{ flex: 1 }}>
                <option value="2">2 Hours</option>
                <option value="4">4 Hours</option>
                <option value="6">6 Hours</option>
                <option value="8">8 Hours</option>
              </select>
              <button className="btn btn-primary" onClick={startGel} style={{ width: 'auto' }}>
                <Play size={16} /> Start
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="timer-display">{timeLeft}</div>
            <p className="timestamp" style={{ textAlign: 'center', marginBottom: '16px' }}>
              Applied at {format(parseISO(gelTimer.appliedAt), 'hh:mm a')}
            </p>
            <button className="btn btn-danger" onClick={stopGel}>
              <Square size={16} /> Stop Timer
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="card-title"><Users size={20} className="text-primary" /> Doctor/Nurse Rounds</h2>
        <div className="input-group">
          <input 
            type="text" 
            placeholder="Add an optional note (e.g. Temp is normal)" 
            value={roundNote}
            onChange={(e) => setRoundNote(e.target.value)}
          />
        </div>
        <div className="grid-2">
          <button className="btn btn-secondary" onClick={() => logRound('Nurse')}>Nurse Round</button>
          <button className="btn btn-secondary" onClick={() => logRound('Doctor')}>Doctor Round</button>
        </div>
        <div style={{ marginTop: '16px' }}>
          {rounds.slice(0, 10).map(r => (
            <div key={r.id} className="list-item" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <strong>{r.person}</strong>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="timestamp">{format(parseISO(r.time), 'MMM d, hh:mm a')}</span>
                  <Edit2 size={16} className="text-primary" style={{ cursor: 'pointer' }} onClick={() => setPromptData({ type: 'edit_round', id: r.id, text: 'Edit note:', value: r.note || '' })} />
                  <Trash2 size={16} className="text-danger" style={{ cursor: 'pointer' }} onClick={() => setPromptData({ type: 'delete_round', id: r.id, text: 'Delete this round log?' })} />
                </div>
              </div>
              {r.note && <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px' }}>{r.note}</div>}
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
                type="text"
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

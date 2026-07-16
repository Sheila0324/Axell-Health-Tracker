import React, { useState } from 'react';
import { Users, Trash2, Edit2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

export default function TrackerView({ rounds, setRounds, insertLog }) {
  const [roundNote, setRoundNote] = useState('');
  const [promptData, setPromptData] = useState(null);

  const logRound = (person) => {
    const newRound = { id: uuidv4(), person, note: roundNote.trim(), time: new Date().toISOString() };
    setRounds(prev => [newRound, ...(prev || [])]);
    insertLog({ category: 'note', type: person, details: roundNote.trim() || null });
    setRoundNote('');
  };

  const confirmAction = () => {
    if (promptData.type === 'delete_round') {
      setRounds(prev => (prev || []).filter(r => r.id !== promptData.id));
    } else if (promptData.type === 'edit_round') {
      if (promptData.value !== undefined) {
        setRounds(prev => (prev || []).map(r => r.id === promptData.id ? { ...r, note: promptData.value.trim() } : r));
      }
    }
    setPromptData(null);
  };

  return (
    <div>
      <div className="card">
        <h2 className="card-title">
          <Users size={20} className="text-primary" /> 
          Doctor & Nurse Rounds
        </h2>
        <div className="input-group">
          <label htmlFor="round-note-input">Optional Visit Note</label>
          <input 
            id="round-note-input"
            type="text" 
            placeholder="e.g. Temperature checked, sleeping well" 
            value={roundNote}
            onChange={(e) => setRoundNote(e.target.value)}
          />
        </div>
        <div className="grid-2-no-pad" style={{ marginBottom: '20px' }}>
          <button className="btn btn-secondary" onClick={() => logRound('Nurse Visit')} style={{ borderLeft: '4px solid var(--primary-start)' }}>
            Nurse Round
          </button>
          <button className="btn btn-secondary" onClick={() => logRound('Doctor Visit')} style={{ borderLeft: '4px solid var(--accent)' }}>
            Doctor Round
          </button>
        </div>

        {/* Vertical Stepper Timeline */}
        <h3 style={{ fontSize: '0.85rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
          Visit Logs
        </h3>
        
        {(rounds || []).length === 0 ? (
          <p className="timestamp" style={{ textAlign: 'center', padding: '16px 0' }}>No round logs recorded yet.</p>
        ) : (
          <div className="timeline">
            {(rounds || []).slice(0, 10).map(r => (
              <div key={r.id} className="timeline-item">
                <div className="timeline-dot" style={{ background: r.person.includes('Doctor') ? 'var(--accent)' : 'var(--primary)' }} />
                <div className="timeline-header">
                  <span className="timeline-title" style={{ color: 'var(--text-main)' }}>{r.person}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span className="timestamp">{format(parseISO(r.time), 'MMM d, hh:mm a')}</span>
                    <button 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '2px' }}
                      onClick={() => setPromptData({ type: 'edit_round', id: r.id, text: 'Edit visit note:', value: r.note || '' })}
                      title="Edit note"
                    >
                      <Edit2 size={14} className="text-white" />
                    </button>
                    <button 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: '2px' }}
                      onClick={() => setPromptData({ type: 'delete_round', id: r.id, text: 'Delete this visit entry?' })}
                      title="Delete entry"
                    >
                      <Trash2 size={14} className="text-white" />
                    </button>
                  </div>
                </div>
                <div className="timeline-content">
                  {r.note ? (
                    <span style={{ color: 'var(--text-main)' }}>{r.note}</span>
                  ) : (
                    <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No notes added.</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirmation prompts */}
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

import React from 'react';
import { format, differenceInMinutes, parseISO } from 'date-fns';
import { Activity, Thermometer, Droplets, Clock } from 'lucide-react';
import { requestNotificationPermission } from '../utils/notifications';

export default function DashboardView({ vitals, medications, gelTimer }) {
  const latestTemp = vitals.temperatures[0];
  const nextMedication = medications.alarms.find(m => new Date(m.time) > new Date()) || medications.alarms[0];
  
  const activateNotifications = () => {
    requestNotificationPermission().then(granted => {
      if (granted) {
        alert("Notifications enabled! Keep this tab open to ensure alarms sound.");
      }
    });
  };

  return (
    <div>
      <div className="card">
        <h2 className="card-title"><Activity size={20} className="text-primary" /> Quick Actions</h2>
        <button className="btn btn-secondary" onClick={activateNotifications}>
          Enable Notifications & Audio Alarms
        </button>
      </div>

      <div className="grid-2">
        <div className="card" style={{ margin: '0' }}>
          <h2 className="card-title"><Thermometer size={16} /> Latest Temp</h2>
          {latestTemp ? (
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{latestTemp.value}°C</div>
              <div className="timestamp">{format(parseISO(latestTemp.time), 'hh:mm a')}</div>
            </div>
          ) : (
            <p className="timestamp">No data yet</p>
          )}
        </div>

        <div className="card" style={{ margin: '0' }}>
          <h2 className="card-title"><Clock size={16} /> Next Meds</h2>
          {nextMedication ? (
            <div>
              <div style={{ fontWeight: 'bold' }}>{nextMedication.name}</div>
              <div className="timestamp">{format(parseISO(nextMedication.time), 'hh:mm a')}</div>
            </div>
          ) : (
            <p className="timestamp">No alarms set</p>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="card-title"><Droplets size={20} /> Cooling Gel Status</h2>
        {gelTimer ? (
          <div>
            <p>Applied at: <strong>{format(parseISO(gelTimer.appliedAt), 'hh:mm a')}</strong></p>
            <p>Change at: <strong>{format(parseISO(gelTimer.expiresAt), 'hh:mm a')}</strong></p>
          </div>
        ) : (
          <p className="timestamp">No active gel timer</p>
        )}
      </div>
    </div>
  );
}

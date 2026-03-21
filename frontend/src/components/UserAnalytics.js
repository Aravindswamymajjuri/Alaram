import React, { useEffect, useState, useContext } from 'react';
import { analyticsApi } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { formatTimeOnly12Hour } from '../utils/dateFormatter';
import { Users, CheckCircle, Timer, TrendingUp, BarChart3, Check, Hourglass, ChevronDown } from './Icons';
import '../styles/analytics.css';

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const RingChart = ({ value = 0, size = 52, stroke = 5 }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const filled = Math.min(100, Math.max(0, value / 100)) * c;
  const color = value >= 75 ? '#10B981' : value >= 50 ? '#F59E0B' : '#EF4444';
  return (
    <div className="ring-chart" style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={`${filled} ${c}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="ring-label" style={{ color }}>
        {value}<span style={{ fontSize: '0.5rem' }}>%</span>
      </div>
    </div>
  );
};

export const UserAnalytics = () => {
  const { user } = useContext(AuthContext);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedUser, setExpandedUser] = useState(null);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const response = await analyticsApi.getAnalytics();
        if (response.data.success) setAnalytics(response.data.analytics);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };
    if (user) loadAnalytics();
  }, [user]);

  if (loading) return <div className="an-loading">Loading analytics…</div>;
  if (error)   return <div className="an-error">{error}</div>;
  if (!analytics || analytics.userStats.length === 0) {
    return (
      <div className="an-empty">
        <BarChart3 size={36} />
        <p>No data yet — create and assign tasks to see performance stats.</p>
      </div>
    );
  }

  const s = analytics.summary;
  const overallRate = s.totalAssignedTasks > 0
    ? Math.round((s.completedTotal / s.totalAssignedTasks) * 100) : 0;

  return (
    <div className="an-root">

      {/* ── Page title ── */}
      <div className="an-page-header">
        <div className="an-page-icon"><BarChart3 size={16} /></div>
        <div>
          <div className="an-page-title">Analytics</div>
          <div className="an-page-sub">Performance overview for assigned tasks</div>
        </div>
      </div>

      {/* ── Summary strip ── */}
      <div className="an-summary">
        <div className="an-stat-card an-stat-indigo">
          <div className="an-stat-icon"><Users size={18} /></div>
          <div className="an-stat-body">
            <div className="an-stat-num">{s.totalAssignedTasks}</div>
            <div className="an-stat-lbl">Total Assigned</div>
          </div>
        </div>
        <div className="an-stat-card an-stat-green">
          <div className="an-stat-icon"><CheckCircle size={18} /></div>
          <div className="an-stat-body">
            <div className="an-stat-num">{s.totalCompletedOnTime}</div>
            <div className="an-stat-lbl">On-Time</div>
            <div className="an-stat-hint">{s.completionRate}% rate</div>
          </div>
        </div>
        <div className="an-stat-card an-stat-amber">
          <div className="an-stat-icon"><Timer size={18} /></div>
          <div className="an-stat-body">
            <div className="an-stat-num">{s.totalCompletedLate}</div>
            <div className="an-stat-lbl">Late</div>
          </div>
        </div>
        <div className="an-stat-card an-stat-purple">
          <div className="an-stat-icon"><TrendingUp size={18} /></div>
          <div className="an-stat-body">
            <div className="an-stat-num">{overallRate}%</div>
            <div className="an-stat-lbl">Completion</div>
            <div className="an-stat-hint">{s.completedTotal} of {s.totalAssignedTasks}</div>
          </div>
        </div>
      </div>

      {/* ── User performance ── */}
      <div className="an-section-label">User Performance</div>
      <div className="an-users">
        {analytics.userStats.map((u) => {
          const open = expandedUser === u.userId;
          return (
            <div key={u.userId} className={`an-user-card${open ? ' open' : ''}`}>

              {/* Card header — click to expand */}
              <div className="an-user-header" onClick={() => setExpandedUser(open ? null : u.userId)}>
                <div className="an-user-avatar">{getInitials(u.userName)}</div>
                <div className="an-user-meta">
                  <div className="an-user-name">{u.userName}</div>
                  <div className="an-user-sub">
                    {u.completedTotal} completed · {u.totalAssigned - u.completedTotal} pending
                  </div>
                </div>
                <RingChart value={u.completionRate} />
                <div className={`an-chevron${open ? ' open' : ''}`}><ChevronDown size={16} /></div>
              </div>

              {/* Stats row */}
              <div className="an-user-stats">
                <div className="an-user-stat an-us-indigo">
                  <div className="an-us-val">{u.totalAssigned}</div>
                  <div className="an-us-key">Assigned</div>
                </div>
                <div className="an-user-stat an-us-green">
                  <div className="an-us-val">{u.completedTotal}</div>
                  <div className="an-us-key">Completed</div>
                </div>
                <div className="an-user-stat an-us-blue">
                  <div className="an-us-val">{u.completedOnTime}</div>
                  <div className="an-us-key">On-Time</div>
                </div>
                <div className="an-user-stat an-us-amber">
                  <div className="an-us-val">{u.completedLate}</div>
                  <div className="an-us-key">Late</div>
                </div>
              </div>

              {/* Progress bars */}
              <div className="an-user-bars">
                <div className="an-bar-row">
                  <span className="an-bar-lbl">Completion</span>
                  <div className="an-bar-track">
                    <div className="an-bar-fill green" style={{ width: `${u.completionRate}%` }} />
                  </div>
                  <span className="an-bar-pct">{u.completionRate}%</span>
                </div>
                <div className="an-bar-row">
                  <span className="an-bar-lbl">On-Time</span>
                  <div className="an-bar-track">
                    <div className="an-bar-fill indigo" style={{ width: `${u.onTimeRate}%` }} />
                  </div>
                  <span className="an-bar-pct">{u.onTimeRate}%</span>
                </div>
              </div>

              {/* Expanded task details */}
              {open && (
                <div className="an-task-panel">
                  {u.completedTasks.length > 0 && (
                    <div className="an-task-group">
                      <div className="an-task-group-title green">
                        <CheckCircle size={11} /> On-Time ({u.completedTasks.length})
                      </div>
                      {u.completedTasks.slice(0, 4).map((t, i) => (
                        <div key={i} className="an-task-row on-time">
                          <div className="an-task-text">
                            <span className="an-task-name">{t.taskTitle}</span>
                            <span className="an-task-when">{formatTimeOnly12Hour(t.completedAt)}</span>
                          </div>
                          <span className="an-task-pill green"><Check size={9} /> Early</span>
                        </div>
                      ))}
                      {u.completedTasks.length > 4 && (
                        <div className="an-task-more">+{u.completedTasks.length - 4} more</div>
                      )}
                    </div>
                  )}
                  {u.lateCompletedTasks.length > 0 && (
                    <div className="an-task-group">
                      <div className="an-task-group-title amber">
                        <Timer size={11} /> Late ({u.lateCompletedTasks.length})
                      </div>
                      {u.lateCompletedTasks.slice(0, 4).map((t, i) => (
                        <div key={i} className="an-task-row late">
                          <div className="an-task-text">
                            <span className="an-task-name">{t.taskTitle}</span>
                            <span className="an-task-when">{formatTimeOnly12Hour(t.completedAt)}</span>
                          </div>
                          <span className="an-task-pill amber"><Timer size={9} /> Late</span>
                        </div>
                      ))}
                      {u.lateCompletedTasks.length > 4 && (
                        <div className="an-task-more">+{u.lateCompletedTasks.length - 4} more</div>
                      )}
                    </div>
                  )}
                  {u.pendingTasks.length > 0 && (
                    <div className="an-task-group">
                      <div className="an-task-group-title slate">
                        <Hourglass size={11} /> Pending ({u.pendingTasks.length})
                      </div>
                      {u.pendingTasks.slice(0, 4).map((t, i) => (
                        <div key={i} className="an-task-row pending">
                          <div className="an-task-text">
                            <span className="an-task-name">{t.taskTitle}</span>
                            <span className="an-task-when">Status: {t.status}</span>
                          </div>
                          <span className="an-task-pill slate"><Hourglass size={9} /> Pending</span>
                        </div>
                      ))}
                      {u.pendingTasks.length > 4 && (
                        <div className="an-task-more">+{u.pendingTasks.length - 4} more</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default UserAnalytics;

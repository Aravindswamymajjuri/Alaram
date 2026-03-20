import React, { useEffect, useState, useContext } from 'react';
import { analyticsApi } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { formatTimeOnly12Hour } from '../utils/dateFormatter';
import '../styles/analytics.css';

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
        if (response.data.success) {
          console.log('📊 Analytics data received:', response.data.analytics);
          const summary = response.data.analytics.summary;
          console.log(`📈 Summary: On-Time: ${summary.totalCompletedOnTime}, Late: ${summary.totalCompletedLate}, Total: ${summary.completedTotal}`);
          setAnalytics(response.data.analytics);
        }
      } catch (err) {
        console.error('Error loading analytics:', err);
        setError(err.response?.data?.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadAnalytics();
    }
  }, [user]);

  if (loading) {
    return <div className="analytics-loading">Loading analytics...</div>;
  }

  if (error) {
    return <div className="analytics-error">Error: {error}</div>;
  }

  if (!analytics || analytics.userStats.length === 0) {
    return (
      <div className="analytics-empty">
        <p>📊 No analytics data available. Create and assign tasks to see statistics.</p>
      </div>
    );
  }

  const summary = analytics.summary;

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h2>📊 Task Analytics & Performance</h2>
        <p>Track assigned user performance and task completion metrics</p>
      </div>

      {/* Summary Cards */}
      <div className="analytics-summary">
        <div className="summary-card total-assigned">
          <div className="card-icon">👥</div>
          <div className="card-content">
            <div className="card-label">Total Assigned Tasks</div>
            <div className="card-value">{summary.totalAssignedTasks}</div>
          </div>
        </div>

        <div className="summary-card completed-ontime">
          <div className="card-icon">✅</div>
          <div className="card-content">
            <div className="card-label">Completed On-Time</div>
            <div className="card-value">{summary.totalCompletedOnTime}</div>
            <div className="card-percentage">{summary.completionRate}% rate</div>
          </div>
        </div>

        <div className="summary-card completed-late">
          <div className="card-icon">⏱️</div>
          <div className="card-content">
            <div className="card-label">Completed Late</div>
            <div className="card-value">{summary.totalCompletedLate}</div>
          </div>
        </div>

        <div className="summary-card completion-rate">
          <div className="card-icon">📈</div>
          <div className="card-content">
            <div className="card-label">Overall Completion Rate</div>
            <div className="card-value">
              {summary.completedTotal}/{summary.totalAssignedTasks}
            </div>
            <div className="card-percentage">
              {summary.totalAssignedTasks > 0
                ? ((summary.completedTotal / summary.totalAssignedTasks) * 100).toFixed(1)
                : 0}
              %
            </div>
          </div>
        </div>
      </div>

      {/* User Performance Table */}
      <div className="analytics-table-container">
        <h3>User Performance Details</h3>
        <div className="analytics-table">
          <div className="table-header">
            <div className="col-name">User Name</div>
            <div className="col-assigned">Assigned</div>
            <div className="col-completed">Completed</div>
            <div className="col-ontime">On-Time</div>
            <div className="col-late">Late</div>
            <div className="col-rate">Completion</div>
            <div className="col-ontime-rate">On-Time Rate</div>
            <div className="col-action">Actions</div>
          </div>

          {analytics.userStats.map((userStat) => (
            <div key={userStat.userId} className="table-body">
              <div className="table-row main-row">
                <div className="col-name">
                  <span className="user-name">{userStat.userName}</span>
                </div>
                <div className="col-assigned">
                  <span className="badge badge-info">{userStat.totalAssigned}</span>
                </div>
                <div className="col-completed">
                  <span className="badge badge-success">{userStat.completedTotal}</span>
                </div>
                <div className="col-ontime">
                  <span className="badge badge-ontime">{userStat.completedOnTime}</span>
                </div>
                <div className="col-late">
                  <span className="badge badge-late">{userStat.completedLate}</span>
                </div>
                <div className="col-rate">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${userStat.completionRate}%` }}
                    />
                    <span className="progress-text">{userStat.completionRate}%</span>
                  </div>
                </div>
                <div className="col-ontime-rate">
                  <div className="progress-bar">
                    <div
                      className="progress-fill-ontime"
                      style={{ width: `${userStat.onTimeRate}%` }}
                    />
                    <span className="progress-text">{userStat.onTimeRate}%</span>
                  </div>
                </div>
                <div className="col-action">
                  <button
                    className="btn-expand"
                    onClick={() =>
                      setExpandedUser(expandedUser === userStat.userId ? null : userStat.userId)
                    }
                  >
                    {expandedUser === userStat.userId ? '▼' : '▶'}
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedUser === userStat.userId && (
                <div className="table-expansion">
                  {/* Completed On-Time Tasks */}
                  {userStat.completedTasks.length > 0 && (
                    <div className="task-section">
                      <h4>✅ Completed On-Time ({userStat.completedTasks.length})</h4>
                      <div className="task-list">
                        {userStat.completedTasks.slice(0, 3).map((task, idx) => (
                          <div key={idx} className="task-item on-time">
                            <div className="task-info">
                              <span className="task-title">{task.taskTitle}</span>
                              <span className="task-time">
                                Completed at {formatTimeOnly12Hour(task.completedAt)}
                              </span>
                            </div>
                            <span className="task-badge">✓ Early</span>
                          </div>
                        ))}
                        {userStat.completedTasks.length > 3 && (
                          <div className="task-more">
                            +{userStat.completedTasks.length - 3} more on-time tasks
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Completed Late Tasks */}
                  {userStat.lateCompletedTasks.length > 0 && (
                    <div className="task-section">
                      <h4>⏱️ Completed Late ({userStat.lateCompletedTasks.length})</h4>
                      <div className="task-list">
                        {userStat.lateCompletedTasks.slice(0, 3).map((task, idx) => (
                          <div key={idx} className="task-item late">
                            <div className="task-info">
                              <span className="task-title">{task.taskTitle}</span>
                              <span className="task-time">
                                Completed at {formatTimeOnly12Hour(task.completedAt)}
                              </span>
                            </div>
                            <span className="task-badge">⏱️ Late</span>
                          </div>
                        ))}
                        {userStat.lateCompletedTasks.length > 3 && (
                          <div className="task-more">
                            +{userStat.lateCompletedTasks.length - 3} more late tasks
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Pending Tasks */}
                  {userStat.pendingTasks.length > 0 && (
                    <div className="task-section">
                      <h4>⏳ Pending Tasks ({userStat.pendingTasks.length})</h4>
                      <div className="task-list">
                        {userStat.pendingTasks.slice(0, 3).map((task, idx) => (
                          <div key={idx} className="task-item pending">
                            <div className="task-info">
                              <span className="task-title">{task.taskTitle}</span>
                              <span className="task-time">Status: {task.status}</span>
                            </div>
                            <span className="task-badge">⏳ Pending</span>
                          </div>
                        ))}
                        {userStat.pendingTasks.length > 3 && (
                          <div className="task-more">
                            +{userStat.pendingTasks.length - 3} more pending tasks
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserAnalytics;

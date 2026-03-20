import React, { useContext, useState } from 'react';
import { TaskContext } from '../context/TaskContext';
import { AuthContext } from '../context/AuthContext';
import { formatAlarmTimeIST12Hour, formatTimeOnly12Hour } from '../utils/dateFormatter';
import ReasonModal from './ReasonModal';
import '../styles/components.css';

export const TaskList = ({ tasks, onTasksUpdated }) => {
  const { markComplete, deleteTask } = useContext(TaskContext);
  const { user } = useContext(AuthContext);
  const [reasonModalData, setReasonModalData] = useState(null);

  const isTaskLate = (task) => {
    const now = new Date();
    const taskTime = new Date(task.alarmTime);
    const fiveMinutesAfter = new Date(taskTime.getTime() + 5 * 60000);
    return now > fiveMinutesAfter;
  };

  const getTimeDelayMinutes = (task) => {
    const now = new Date();
    const taskTime = new Date(task.alarmTime);
    const delayMS = now - taskTime;
    return Math.floor(delayMS / 60000);
  };

  const hasAlarmTimeArrived = (task) => {
    const now = new Date();
    const taskTime = new Date(task.alarmTime);
    return now >= taskTime;
  };

  const getTimeUntilAlarm = (task) => {
    const now = new Date();
    const taskTime = new Date(task.alarmTime);
    const diffMS = taskTime - now;
    const minutes = Math.floor(diffMS / 60000);
    const seconds = Math.floor((diffMS % 60000) / 1000);
    if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const handleMarkComplete = async (task) => {
    const isLate = isTaskLate(task);
    const isAssigned = task.assignedUsers?.some((u) => u._id === user?._id);

    // Always show reason modal for assigned users (required for late, optional for on-time)
    if (isAssigned) {
      setReasonModalData({
        taskId: task._id,
        taskTitle: task.title,
        timeDelayMinutes: getTimeDelayMinutes(task),
        isLate: isLate,
      });
    } else {
      // Creator or viewer marking complete - proceed without reason
      try {
        await markComplete(task._id, null);
        onTasksUpdated();
      } catch (err) {
        console.error('Error marking task complete:', err);
      }
    }
  };

  const handleReasonSubmit = async (reason) => {
    try {
      console.log('📝 handleReasonSubmit called with reason:', reason);
      // Pass reason as-is (null, empty string, or actual reason)
      await markComplete(reasonModalData.taskId, reason);
      setReasonModalData(null);
      onTasksUpdated();
    } catch (err) {
      console.error('Error marking task complete with reason:', err);
      alert('Error completing task. Please try again.');
    }
  };

  const handleReasonCancel = () => {
    setReasonModalData(null);
  };

  const handleDelete = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await deleteTask(taskId);
        onTasksUpdated();
      } catch (err) {
        console.error('Error deleting task:', err);
      }
    }
  };

  const isAssignedUser = (task, currentUser) => {
    return task.assignedUsers?.some((u) => u._id === currentUser?._id);
  };

  if (tasks.length === 0) {
    return (
      <div className="empty-state">
        <p>No tasks found</p>
      </div>
    );
  }

  return (
    <>
      <div className="task-list">
        {tasks.map((task) => {
          const isCreator = task.createdBy._id === user?._id;
          const isAssigned = isAssignedUser(task, user);
          const userRole = isCreator ? 'Creator' : isAssigned ? 'Assigned' : 'Viewer';
          const isLate = isTaskLate(task);

          return (
            <div key={task._id} className={`task-card status-${task.status}`}>
              <div className="task-header">
                <div className="task-title-section">
                  <h3>{task.title}</h3>
                  <span className={`user-role role-${userRole.toLowerCase()}`}>
                    {userRole === 'Creator' && '👑 Creator'}
                    {userRole === 'Assigned' && '✓ Assigned to You'}
                    {userRole === 'Viewer' && '👁️ Viewer'}
                  </span>
                </div>
                <span className={`priority priority-${task.priority}`}>
                  {task.priority?.toUpperCase()}
                </span>
              </div>

              {task.description && (
                <p className="task-description">{task.description}</p>
              )}

              <div className="task-details">
                <div className="detail">
                  <span className="label">⏰ Alarm Time:</span>
                  <span>{formatAlarmTimeIST12Hour(task.alarmTime)}</span>
                </div>

                {isLate && task.status === 'pending' && (
                  <div className="detail late-warning">
                    <span className="label">⚠️ Late:</span>
                    <span className="late-text">{getTimeDelayMinutes(task)} minutes past scheduled time</span>
                  </div>
                )}

                {task.category && (
                  <div className="detail">
                    <span className="label">📂 Category:</span>
                    <span>{task.category}</span>
                  </div>
                )}

                {task.reminderTimes?.length > 0 && (
                  <div className="detail">
                    <span className="label">🔔 Reminders:</span>
                    <span>{task.reminderTimes.join(', ')} min before</span>
                  </div>
                )}

                <div className="detail">
                  <span className="label">👤 Created by:</span>
                  <span>{task.createdBy.name}</span>
                </div>

                {task.assignedUsers?.length > 0 && (
                  <div className="detail">
                    <span className="label">👥 Assigned to:</span>
                    <span>{task.assignedUsers.map((u) => u.name).join(', ')}</span>
                  </div>
                )}

                {task.completedBy?.length > 0 && (
                  <div className="detail">
                    <span className="label">✅ Completed by:</span>
                    <div className="completed-by-list">
                      {task.completedBy.map((completion, index) => {
                        console.log(`📋 Rendering completion ${index}:`, completion);
                        return (
                          <div key={index} className="completed-by-item">
                            <span className="completed-user">{completion.userId.name}</span>
                            <span className="completed-time">
                              at {formatTimeOnly12Hour(completion.completedAt)}
                            </span>
                            {completion.reason && (
                              <span className="completion-reason">
                                📝 Reason: {completion.reason}
                              </span>
                            )}
                            {!completion.reason && (
                              <span style={{fontSize: '0.75rem', color: '#999'}}>
                                (no reason provided)
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="task-actions">
                {task.status === 'pending' && (
                  <button
                    className={`btn-complete ${isAssigned ? 'btn-assigned' : ''} ${isLate && isAssigned ? 'btn-late' : ''}`}
                    onClick={() => handleMarkComplete(task)}
                    disabled={!hasAlarmTimeArrived(task)}
                    title={
                      !hasAlarmTimeArrived(task)
                        ? `Alarm time not reached yet. Time remaining: ${getTimeUntilAlarm(task)}`
                        : isAssigned
                        ? isLate
                          ? 'Mark this task as done (you\'ll need to provide a reason)'
                          : 'Mark this task as done'
                        : 'You can mark tasks assigned to you as done'
                    }
                  >
                    ✓ Mark Done
                    {isAssigned && <span className="assigned-indicator"> (Your Task)</span>}
                    {isLate && isAssigned && <span className="late-indicator"> (Late)</span>}
                  </button>
                )}

                {isCreator && (
                  <button
                    className="btn-delete"
                    onClick={() => handleDelete(task._id)}
                    title="Only creator can delete tasks"
                  >
                    🗑️ Delete
                  </button>
                )}

                {!isCreator && !isAssigned && (
                  <div className="task-permission-note">
                    👁️ View Only - You cannot modify this task
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {reasonModalData && (
        <ReasonModal
          taskTitle={reasonModalData.taskTitle}
          timeDelayMinutes={reasonModalData.timeDelayMinutes}
          isLate={reasonModalData.isLate}
          onSubmit={handleReasonSubmit}
          onCancel={handleReasonCancel}
        />
      )}
    </>
  );
};

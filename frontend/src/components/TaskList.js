import React, { useContext } from 'react';
import { TaskContext } from '../context/TaskContext';
import { AuthContext } from '../context/AuthContext';
import { formatAlarmTimeIST12Hour } from '../utils/dateFormatter';
import '../styles/components.css';

export const TaskList = ({ tasks, onTasksUpdated }) => {
  const { markComplete, deleteTask } = useContext(TaskContext);
  const { user } = useContext(AuthContext);

  const handleMarkComplete = async (taskId) => {
    try {
      await markComplete(taskId);
      onTasksUpdated();
    } catch (err) {
      console.error('Error marking task complete:', err);
    }
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
    <div className="task-list">
      {tasks.map((task) => {
        const isCreator = task.createdBy._id === user?._id;
        const isAssigned = isAssignedUser(task, user);
        const userRole = isCreator ? 'Creator' : isAssigned ? 'Assigned' : 'Viewer';

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
                  <span>{task.completedBy.map((c) => c.userId.name).join(', ')}</span>
                </div>
              )}
            </div>

            <div className="task-actions">
              {task.status === 'pending' && (
                <button
                  className={`btn-complete ${isAssigned ? 'btn-assigned' : ''}`}
                  onClick={() => handleMarkComplete(task._id)}
                  title={isAssigned ? 'Mark this task as done' : 'You can mark tasks assigned to you as done'}
                >
                  ✓ Mark Done
                  {isAssigned && <span className="assigned-indicator"> (Your Task)</span>}
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
  );
};

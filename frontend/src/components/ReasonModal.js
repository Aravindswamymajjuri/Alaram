import React, { useState } from 'react';
import { Timer, AlertTriangle, CheckCircle, X } from './Icons';
import '../styles/reasonModal.css';

export const ReasonModal = ({ taskTitle, timeDelayMinutes, onSubmit, onCancel, isLate = false }) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Reason is required only for late completions
    if (isLate && !reason.trim()) {
      alert('Please provide a reason for the delay');
      return;
    }

    setIsSubmitting(true);
    try {
      // Send reason as a non-empty string or null
      const reasonToSend = reason && reason.trim().length > 0 ? reason.trim() : null;
      console.log('Submitting reason:', reasonToSend);
      await onSubmit(reasonToSend);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="reason-modal-overlay">
      <div className="reason-modal">
        <div className="modal-header">
          <h2><Timer size={22} /> Task Completion</h2>
          <button className="modal-close" onClick={onCancel}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <div className={`delay-info ${isLate ? 'delay-late' : 'delay-ontime'}`}>
            <p className="task-title">
              <strong>{taskTitle}</strong>
            </p>
            {isLate ? (
              <p className="delay-message">
                <AlertTriangle size={16} className="delay-icon" />
                This task was not completed within <strong>5 minutes</strong> of the scheduled time.
                <br />
                <span className="delay-time">({timeDelayMinutes} minutes late)</span>
              </p>
            ) : (
              <p className="delay-message">
                <CheckCircle size={16} className="delay-icon" />
                You're marking this task as complete on time.
                <br />
                <span className="delay-time ontime">(Optional: Add notes about the completion)</span>
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="reason">
                {isLate ? 'Why couldn\'t you complete the task on time?' : 'Add any notes about this task (optional)'}
              </label>
              <textarea
                id="reason"
                className="reason-textarea"
                placeholder={isLate ? 'Enter your reason here...' : 'Enter notes here (optional)...'}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                rows={4}
                disabled={isSubmitting}
              />
              <div className="char-count">
                {reason.length}/500 characters
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit & Mark Complete'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReasonModal;

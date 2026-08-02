// Toast Notification Container
export function ToastContainer({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span className="toast-msg">{t.message}</span>
        </div>
      ))}
    </div>
  );
}

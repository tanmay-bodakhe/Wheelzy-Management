// Stats Bar Component
export function StatsBar({ stats }) {
  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon">📋</div>
        <div className="stat-value">{stats.total}</div>
        <div className="stat-label">Total Entries</div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">📅</div>
        <div className="stat-value">{stats.today}</div>
        <div className="stat-label">Today</div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">💰</div>
        <div className="stat-value">₹{stats.revenue.toFixed(0)}</div>
        <div className="stat-label">Total Revenue</div>
      </div>
      <div className="stat-card">
        <div className="stat-icon">🛡️</div>
        <div className="stat-value">₹{stats.deposit.toFixed(0)}</div>
        <div className="stat-label">Deposits</div>
      </div>
    </div>
  );
}

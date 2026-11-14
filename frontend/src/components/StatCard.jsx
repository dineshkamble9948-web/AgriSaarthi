
export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend
}) {
  return (
    <div className="stat-card">
      <div className="stat-top">
        <span>{title}</span>

        <div className={`stat-icon ${color}`}>
          <Icon size={21} />
        </div>
      </div>

      <h2>{value}</h2>

      <div className="stat-bottom">
        <span className="stat-trend">{trend}</span>
        <span>{subtitle}</span>
      </div>
    </div>
  );
}

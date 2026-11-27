
export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
  onClick
}) {
  return (
    <div
      className={`stat-card ${onClick ? "stat-card-clickable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={onClick ? { cursor: "pointer" } : undefined}
    >
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

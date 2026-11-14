
export default function FeatureCard({
  title,
  description,
  icon: Icon,
  color,
  onClick,
  status = "Explore"
}) {
  return (
    <button className="feature-card" onClick={onClick}>
      <div className={`feature-icon ${color}`}>
        <Icon size={23} />
      </div>

      <div className="feature-content">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>

      <div className="feature-footer">
        <span>{status}</span>
        <span className="feature-arrow">→</span>
      </div>
    </button>
  );
}

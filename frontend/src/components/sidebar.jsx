
import {
  Sprout,
  X,
  Leaf
} from "lucide-react";
import navigation from "./navigation";

export default function Sidebar({ activePage, setActivePage, mobileOpen, setMobileOpen }) {
  return (
    <>
      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}

      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-icon">
            <Leaf size={23} />
          </div>

          <div>
            <h2>AgriSaarthi</h2>
            <span>SMART FARMING PLATFORM</span>
          </div>

          <button className="mobile-close" onClick={() => setMobileOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="farm-selector">
          <div className="farm-avatar">F</div>
          <div>
            <strong>My Farm</strong>
            <span>Primary farmland</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navigation.map((group) => (
            <div className="nav-group" key={group.title}>
              <p className="nav-heading">{group.title}</p>

              {group.items.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.name}
                    className={`nav-item ${activePage === item.name ? "active" : ""}`}
                    onClick={() => {
                      setActivePage(item.name);
                      setMobileOpen(false);
                    }}
                  >
                    <Icon size={19} strokeWidth={1.8} />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <Sprout size={22} />
            <strong>Growing smarter, together.</strong>
            <span>Your farm. Your data. Better decisions.</span>
          </div>

          <div className="sidebar-version">AgriSaarthi v1.0 · Development</div>
        </div>
      </aside>
    </>
  );
}

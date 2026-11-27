import {
  LayoutDashboard,
  Map,
  Sprout,
  TrendingUp,
  User,
  CalendarDays,
  Landmark
} from "lucide-react";
import { useLanguage } from "../utils/LanguageContext";

export default function MobileBottomNav({ activePage, setActivePage }) {
  const { lang, t } = useLanguage();

  const navItems = [
    {
      id: "Dashboard",
      label: lang === "kn" ? "ಮುಖಪುಟ" : "Home",
      icon: LayoutDashboard,
      page: "Dashboard"
    },
    {
      id: "My Farm",
      label: lang === "kn" ? "ನನ್ನ ಜಮೀನು" : "My Farm",
      icon: Map,
      page: "Farm Digital Twin"
    },
    {
      id: "Advisory",
      label: lang === "kn" ? "ಸಲಹೆ" : "Advisory",
      icon: Sprout,
      page: "Crop Recommendation"
    },
    {
      id: "Market",
      label: lang === "kn" ? "ಮಾರುಕಟ್ಟೆ" : "Market",
      icon: TrendingUp,
      page: "Market Intelligence"
    },
    {
      id: "Schemes",
      label: lang === "kn" ? "ಯೋಜನೆಗಳು" : "Schemes",
      icon: Landmark,
      page: "Government Schemes"
    }
  ];

  return (
    <nav
      className="mobile-bottom-nav"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "64px",
        backgroundColor: "#ffffff",
        borderTop: "1px solid #e2e8f0",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        zIndex: 1000,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        boxShadow: "0 -2px 10px rgba(0, 0, 0, 0.05)"
      }}
      aria-label="Mobile Bottom Navigation"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activePage === item.page;

        return (
          <button
            key={item.id}
            onClick={() => setActivePage(item.page)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minWidth: "48px",
              minHeight: "48px",
              background: "none",
              border: "none",
              padding: "4px 8px",
              color: isActive ? "#15803d" : "#64748b",
              fontWeight: isActive ? "700" : "500",
              cursor: "pointer",
              transition: "all 0.15s ease",
              touchAction: "manipulation"
            }}
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
            <span style={{ fontSize: "0.68rem", marginTop: "3px" }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}


import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  Globe,
  LogOut,
  Menu,
  Search,
  UsersRound
} from "lucide-react";
import navigation from "./navigation";
import { useLanguage } from "../utils/LanguageContext";

const searchItems = navigation.flatMap((group) => (
  group.items.map((item) => ({ name: item.name, group: group.title }))
));

export default function Header({
  activePage,
  setActivePage,
  setMobileOpen,
  user,
  onLogout,
  onSwitchAccount
}) {
  const { lang, toggleLanguage, t } = useLanguage();
  const name = user?.name || "Farmer User";
  const [openPanel, setOpenPanel] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const headerRef = useRef(null);
  const searchInputRef = useRef(null);

  const filteredSearchItems = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase();
    return searchItems.filter((item) => (
      !query
      || item.name.toLocaleLowerCase().includes(query)
      || item.group.toLocaleLowerCase().includes(query)
    ));
  }, [searchQuery]);

  useEffect(() => {
    if (openPanel === "search") searchInputRef.current?.focus();
  }, [openPanel]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!headerRef.current?.contains(event.target)) setOpenPanel("");
    };
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "k") {
        event.preventDefault();
        setOpenPanel("search");
      } else if (event.key === "Escape") {
        setOpenPanel("");
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const openSearchResult = (page) => {
    setActivePage(page);
    setOpenPanel("");
    setSearchQuery("");
  };

  const submitSearch = (event) => {
    event.preventDefault();
    if (filteredSearchItems[0]) openSearchResult(filteredSearchItems[0].name);
  };

  return (
    <header className="top-header" ref={headerRef}>
      <div className="header-left">
        <button
          className="menu-button"
          type="button"
          aria-label="Open navigation menu"
          onClick={() => setMobileOpen(true)}
        >
          <Menu size={22} />
        </button>

        <div>
          <span className="breadcrumb">AgriSaarthi /</span>
          <h2>{activePage}</h2>
        </div>
      </div>

      <div className="header-right">
        <button
          className="secondary-button language-toggle-btn"
          type="button"
          onClick={toggleLanguage}
          title="Switch Language / ಭಾಷೆಯನ್ನು ಬದಲಿಸಿ (NFR6 & UR8)"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "6px 12px",
            fontSize: "13px",
            fontWeight: "600",
            borderRadius: "8px",
            cursor: "pointer"
          }}
        >
          <Globe size={16} />
          <span>{lang === "en" ? "ಕನ್ನಡ" : "English"}</span>
        </button>

        <div className="header-action-wrap">
          <button
            className="header-search"
            type="button"
            title="Search"
            aria-label="Search pages"
            aria-expanded={openPanel === "search"}
            onClick={() => setOpenPanel(openPanel === "search" ? "" : "search")}
          >
            <Search size={19} />
          </button>
          {openPanel === "search" && (
            <div className="header-popover header-search-popover" role="dialog" aria-label="Search pages">
              <form className="header-search-form" onSubmit={submitSearch}>
                <Search size={17} />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search pages and modules"
                  aria-label="Search pages and modules"
                />
                <kbd>Esc</kbd>
              </form>
              <div className="header-search-results">
                {filteredSearchItems.length ? filteredSearchItems.map((item) => (
                  <button
                    className="header-search-result"
                    key={item.name}
                    type="button"
                    onClick={() => openSearchResult(item.name)}
                  >
                    <span>{item.name}</span>
                    <small>{item.group}</small>
                  </button>
                )) : (
                  <p className="header-popover-empty">No matching pages. Try another search.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="header-action-wrap">
          <button
            className="notification-button"
            type="button"
            title="Notifications"
            aria-label="Notifications"
            aria-expanded={openPanel === "notifications"}
            onClick={() => setOpenPanel(openPanel === "notifications" ? "" : "notifications")}
          >
            <Bell size={19} />
          </button>
          {openPanel === "notifications" && (
            <div className="header-popover notification-popover" role="dialog" aria-label="Notifications">
              <div className="notification-popover-heading">
                <Bell size={18} />
                <strong>Notifications</strong>
              </div>
              <div className="notification-empty-state" role="status">
                <span>You're all caught up</span>
                <p>Farm alerts and updates will appear here when available.</p>
              </div>
            </div>
          )}
        </div>

        <div className="header-action-wrap">
          <button
            className="user-profile"
            type="button"
            aria-label={`Account menu for ${name}`}
            aria-expanded={openPanel === "account"}
            onClick={() => setOpenPanel(openPanel === "account" ? "" : "account")}
          >
            <span className="user-avatar">{name.charAt(0).toUpperCase()}</span>
            <span className="user-details">
              <strong>{name}</strong>
              <span>{user?.email || "Farm Owner"}</span>
            </span>
            <ChevronDown size={16} />
          </button>
          {openPanel === "account" && (
            <div className="header-popover header-account-popover" role="menu" aria-label="Account options">
              <button
                className="header-menu-item"
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpenPanel("");
                  onSwitchAccount();
                }}
              >
                <UsersRound size={17} />
                <span>Switch account</span>
              </button>
              <button
                className="header-menu-item"
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpenPanel("");
                  onLogout();
                }}
              >
                <LogOut size={17} />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

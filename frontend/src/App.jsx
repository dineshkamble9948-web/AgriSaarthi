
import { useState, useEffect } from "react";

import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";
import ModulePage from "./pages/ModulePage";
import AuthPage from "./pages/AuthPage";
import FarmSetup from "./pages/FarmSetup";
import FarmHistory from "./pages/FarmHistory";
import api from "./services/api";

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("agrisaarthi_token"));
  const [user, setUser] = useState(null);
  const [farm, setFarm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authInitialMode, setAuthInitialMode] = useState("register");
  const [activePage, setActivePage] = useState("Dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const [userResponse, farmResponse] = await Promise.all([
          api.get("/auth/me"),
          api.get("/farms/me")
        ]);

        setUser(userResponse.data.user);
        setFarm(farmResponse.data.farm || null);
      } catch (error) {
        localStorage.removeItem("agrisaarthi_token");
        setToken(null);
        setUser(null);
        setFarm(null);
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, [token]);

  const handleAuth = (newToken, newUser) => {
    localStorage.setItem("agrisaarthi_token", newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const handleFarmSaved = (savedFarm) => {
    setFarm(savedFarm);
    setActivePage("Dashboard");
  };

  const handleFarmUpdated = (updatedFarm) => {
    setFarm(updatedFarm);
  };

  const handleLogout = () => {
    localStorage.removeItem("agrisaarthi_token");
    setToken(null);
    setUser(null);
    setFarm(null);
    setActivePage("Dashboard");
    setAuthInitialMode("login");
  };

  if (loading) {
    return (
      <div className="app-loading">
        <h2>AgriSaarthi</h2>
        <p>Loading your farm...</p>
      </div>
    );
  }

  if (!token || !user) {
    return <AuthPage onAuth={handleAuth} initialMode={authInitialMode} />;
  }

  if (!farm) {
    return <FarmSetup onFarmSaved={handleFarmSaved} />;
  }

  return (
    <div className="app-layout">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <main className="main-content">
        <Header
          activePage={activePage}
          setActivePage={setActivePage}
          setMobileOpen={setMobileOpen}
          user={user}
          onLogout={handleLogout}
          onSwitchAccount={handleLogout}
        />

        {activePage === "Dashboard" ? (
          <Dashboard setActivePage={setActivePage} farm={farm} user={user} />
        ) : activePage === "Farm History" ? (
          <FarmHistory />
        ) : (
          <ModulePage
            page={activePage}
            setActivePage={setActivePage}
            farm={farm}
            onFarmUpdated={handleFarmUpdated}
          />
        )}

        <footer className="app-footer">
          © 2026 AgriSaarthi. Smart farming for a better tomorrow.
        </footer>
      </main>
    </div>
  );
}

export default App;

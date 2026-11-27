import { useState } from "react";
import {
  Sprout,
  Lock,
  Mail,
  User,
  ArrowRight,
  Globe,
  Eye,
  EyeOff,
  CheckCircle2,
  Circle,
  Database,
  CloudSun,
  Award,
  ShieldCheck
} from "lucide-react";
import api from "../services/api";
import { useLanguage } from "../utils/LanguageContext";

export default function AuthPage({ onAuth, initialMode = "login" }) {
  const { lang, toggleLanguage, t } = useLanguage();
  const [isRegister, setIsRegister] = useState(initialMode === "register");
  const [rememberMe, setRememberMe] = useState(true);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });

  const [showPassword, setShowPassword] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const passwordChecks = {
    length: form.password.length >= 8,
    upper: /[A-Z]/.test(form.password),
    lower: /[a-z]/.test(form.password),
    number: /[0-9]/.test(form.password),
    special: /[^A-Za-z0-9]/.test(form.password),
    notOnlyNumbersOrLetters:
      !/^[A-Za-z]+$/.test(form.password) &&
      !/^\d+$/.test(form.password) &&
      form.password.length > 0
  };

  const isPasswordValid =
    passwordChecks.length &&
    passwordChecks.upper &&
    passwordChecks.lower &&
    passwordChecks.number &&
    passwordChecks.special &&
    passwordChecks.notOnlyNumbersOrLetters;

  const fulfilledCount = [
    passwordChecks.length,
    passwordChecks.upper,
    passwordChecks.lower,
    passwordChecks.number,
    passwordChecks.special
  ].filter(Boolean).length;

  const strengthLabel =
    fulfilledCount <= 2 ? t("pwdWeak") : fulfilledCount <= 4 ? t("pwdModerate") : t("pwdStrong");
  const strengthColor =
    fulfilledCount <= 2 ? "#ef4444" : fulfilledCount <= 4 ? "#f59e0b" : "#16a34a";

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleQuickFill = () => {
    setForm({
      name: "Demo Farmer",
      email: "demo@agrisaarthi.local",
      password: "Password@123"
    });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (isRegister) {
      if (!isPasswordValid) {
        setError(t("pwdErrorDetails"));
        return;
      }
      if (!consentGiven) {
        setError(t("consentRequiredError"));
        return;
      }
    }

    setLoading(true);

    try {
      const endpoint = isRegister ? "/auth/register" : "/auth/login";
      const payload = isRegister
        ? form
        : { email: form.email, password: form.password };
      const response = await api.post(endpoint, payload);

      const { token, user } = response.data;
      onAuth(token, user);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        (err.response
          ? "Unable to complete your request. Please verify credentials."
          : "Can't reach the AgriSaarthi server. Please make sure the service is online.")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/demo-login");
      const { token, user } = response.data;
      onAuth(token, user);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        (err.response
          ? "Unable to open the demo account. Please try standard login or registration."
          : "Can't reach the AgriSaarthi server. Start the backend and try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left Visual Branding Panel */}
      <div className="auth-visual">
        <div className="auth-brand">
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(4px)"
            }}
          >
            <Sprout size={24} color="#a7e8b3" />
          </div>
          <span>AgriSaarthi 🌱</span>
        </div>

        <div className="auth-visual-content">
          <span>SMART FARMING • PRECISION AGRICULTURE</span>

          <h1>
            Grow smarter.
            <br />
            Farm better.
          </h1>

          <p>
            Your comprehensive agricultural intelligence platform powered by official
            Government of Karnataka & ICAR agricultural datasets.
          </p>

          <div className="auth-visual-highlights">
            <div className="auth-highlight-item">
              <Database size={18} />
              <span><strong>Government Data:</strong> Directorate of Economics & Statistics (DES) & Sujala-3 LRI</span>
            </div>
            <div className="auth-highlight-item">
              <CloudSun size={18} />
              <span><strong>Weather AI:</strong> Real-time agro-meteorological root-zone water balance</span>
            </div>
            <div className="auth-highlight-item">
              <Award size={18} />
              <span><strong>Agronomic POP:</strong> UAS Raichur & Dharwad Package of Practices</span>
            </div>
            <div className="auth-highlight-item">
              <ShieldCheck size={18} />
              <span><strong>Govt Schemes:</strong> PM-KISAN, Raitha Siri & Krishi Bhagya catalog</span>
            </div>
          </div>
        </div>

        <span className="auth-visual-footer">
          Empowering Farmers across Karnataka • From Data to Decisions
        </span>
      </div>

      {/* Right Authentication Form Panel */}
      <div className="auth-form-side">
        <div style={{ width: "100%", maxWidth: "440px" }}>
          {/* Top Language Toggle */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
            <button
              type="button"
              onClick={toggleLanguage}
              className="secondary-button"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                fontSize: "12px",
                fontWeight: "600",
                borderRadius: "20px",
                cursor: "pointer",
                backgroundColor: "#f0f7f1",
                border: "1px solid #c8dccb",
                color: "#1e713e"
              }}
            >
              <Globe size={14} />
              <span>{lang === "en" ? "ಕನ್ನಡಕ್ಕೆ ಬದಲಿಸಿ (Kannada)" : "Switch to English"}</span>
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {/* Mobile Brand */}
            <div className="auth-mobile-brand">
              <Sprout size={26} />
              <strong>AgriSaarthi 🌱</strong>
            </div>

            {/* Top Segmented Tabs: Sign In / Create Account */}
            <div className="auth-tabs" role="tablist">
              <button
                type="button"
                className={`auth-tab ${!isRegister ? "active" : ""}`}
                onClick={() => {
                  setIsRegister(false);
                  setError("");
                }}
              >
                <Lock size={15} />
                <span>{t("signInTab")}</span>
              </button>
              <button
                type="button"
                className={`auth-tab ${isRegister ? "active" : ""}`}
                onClick={() => {
                  setIsRegister(true);
                  setError("");
                }}
              >
                <User size={15} />
                <span>{t("signUpTab")}</span>
              </button>
            </div>

            <span className="welcome-label">{t("farmerPortal")}</span>

            <h2>
              {isRegister ? t("createAccount") : `${t("welcomeBack")} 👋`}
            </h2>

            <p className="auth-description">
              {isRegister ? t("joinAgriSaarthi") : t("loginSubtitle")}
            </p>

            {/* Registration: Name Field */}
            {isRegister && (
              <div className="auth-field">
                <label>{t("fullName")}</label>
                <div className="auth-input">
                  <User size={18} />
                  <input
                    type="text"
                    name="name"
                    placeholder={t("enterName")}
                    value={form.name}
                    onChange={handleChange}
                    autoComplete="name"
                    minLength={2}
                    maxLength={80}
                    required
                  />
                </div>
              </div>
            )}

            {/* Email Field */}
            <div className="auth-field">
              <label>{t("emailAddress")}</label>
              <div className="auth-input">
                <Mail size={18} />
                <input
                  type="email"
                  name="email"
                  placeholder={t("enterEmail")}
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="auth-field">
              <label>{t("password")}</label>
              <div className="auth-input">
                <Lock size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder={t("enterPassword")}
                  value={form.password}
                  onChange={handleChange}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "#6b7280",
                    padding: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Password Strength Indicator for Registration */}
              {isRegister && form.password.length > 0 && (
                <div style={{ marginTop: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", color: "#6b7280" }}>
                      {t("password")}: <strong style={{ color: strengthColor }}>{strengthLabel}</strong>
                    </span>
                    <span style={{ fontSize: "11px", color: "#6b7280" }}>{fulfilledCount} / 5</span>
                  </div>
                  <div style={{ width: "100%", height: "4px", backgroundColor: "#e5e7eb", borderRadius: "2px", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${(fulfilledCount / 5) * 100}%`,
                        backgroundColor: strengthColor,
                        transition: "width 0.3s ease, background-color 0.3s ease"
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Password Requirements Checklist for Registration */}
              {isRegister && (
                <div
                  style={{
                    marginTop: "10px",
                    padding: "10px 12px",
                    backgroundColor: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "12px"
                  }}
                >
                  <div style={{ fontWeight: 600, color: "#374151", marginBottom: "6px" }}>
                    {t("passwordMustInclude")}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: passwordChecks.length ? "#15803d" : "#6b7280" }}>
                      {passwordChecks.length ? <CheckCircle2 size={14} color="#15803d" /> : <Circle size={14} color="#9ca3af" />}
                      <span>{t("pwdLength")}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: passwordChecks.upper ? "#15803d" : "#6b7280" }}>
                      {passwordChecks.upper ? <CheckCircle2 size={14} color="#15803d" /> : <Circle size={14} color="#9ca3af" />}
                      <span>{t("pwdUpper")}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: passwordChecks.lower ? "#15803d" : "#6b7280" }}>
                      {passwordChecks.lower ? <CheckCircle2 size={14} color="#15803d" /> : <Circle size={14} color="#9ca3af" />}
                      <span>{t("pwdLower")}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: passwordChecks.number ? "#15803d" : "#6b7280" }}>
                      {passwordChecks.number ? <CheckCircle2 size={14} color="#15803d" /> : <Circle size={14} color="#9ca3af" />}
                      <span>{t("pwdNumber")}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: passwordChecks.special ? "#15803d" : "#6b7280" }}>
                      {passwordChecks.special ? <CheckCircle2 size={14} color="#15803d" /> : <Circle size={14} color="#9ca3af" />}
                      <span>{t("pwdSpecial")}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Login: Remember Me & Forgot Password Row */}
            {!isRegister && (
              <div className="auth-remember-row">
                <label>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ accentColor: "#27864b", width: "15px", height: "15px" }}
                  />
                  <span>{t("rememberMe")}</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    alert("For credential recovery, please reach out to your local RSK Agricultural Officer or Kisan Call Center at 1800-180-1551.")
                  }
                >
                  {t("forgotPassword")}
                </button>
              </div>
            )}

            {/* Registration: Consent Checkbox */}
            {isRegister && (
              <div
                className="auth-consent-field"
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                  margin: "14px 0",
                  fontSize: "12px",
                  color: "#4b5563",
                  lineHeight: "1.4"
                }}
              >
                <input
                  type="checkbox"
                  id="userConsent"
                  checked={consentGiven}
                  onChange={(e) => setConsentGiven(e.target.checked)}
                  style={{ marginTop: "2px", width: "16px", height: "16px", cursor: "pointer", accentColor: "#15803d" }}
                  required
                />
                <label htmlFor="userConsent" style={{ cursor: "pointer" }}>
                  {t("userConsentText")}
                </label>
              </div>
            )}

            {/* Error Banner */}
            {error && <div className="auth-error">{error}</div>}

            {/* Primary Submit Button */}
            <button className="auth-submit" type="submit" disabled={loading}>
              {loading
                ? "Please wait..."
                : isRegister
                  ? t("registerButton")
                  : t("loginButton")}
              <ArrowRight size={18} />
            </button>

            {/* Quick Demo Helper (In Login Mode) */}
            {!isRegister && (
              <div className="auth-quick-credentials">
                <span>💡 <strong>Test Farmer Account:</strong> demo@agrisaarthi.local</span>
                <button type="button" className="auth-quick-btn" onClick={handleQuickFill}>
                  Auto-Fill
                </button>
              </div>
            )}

            {/* Local dev demo button */}
            {import.meta.env.DEV && (
              <button
                className="auth-demo"
                type="button"
                onClick={handleDemoLogin}
                disabled={loading}
              >
                Continue with local demo account
              </button>
            )}

            {/* Bottom Switcher */}
            <div className="auth-switch">
              {isRegister ? t("alreadyHaveAccount") : t("dontHaveAccount")}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError("");
                }}
              >
                {isRegister ? t("loginLink") : t("registerLink")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}


import { useState } from "react";
import { Sprout, Lock, Mail, User, ArrowRight, Globe, Eye, EyeOff, CheckCircle2, Circle } from "lucide-react";
import api from "../services/api";
import { useLanguage } from "../utils/LanguageContext";

export default function AuthPage({ onAuth, initialMode = "register" }) {
  const { lang, toggleLanguage, t } = useLanguage();
  const [isRegister, setIsRegister] = useState(initialMode !== "login");

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
    notOnlyNumbersOrLetters: !/^[A-Za-z]+$/.test(form.password) && !/^\d+$/.test(form.password) && form.password.length > 0
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
      const endpoint = isRegister
        ? "/auth/register"
        : "/auth/login";

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
          ? "Unable to complete your request. Please try again."
          : "Can't reach the AgriSaarthi server. Start the backend and make sure its database is connected.")
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
          ? "Unable to open the demo account. Please try again."
          : "Can't reach the AgriSaarthi server. Start the backend and try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      <div className="auth-visual">
        <div className="auth-brand">
          <Sprout size={28} />
          <span>AgriSaarthi</span>
        </div>

        <div className="auth-visual-content">
          <span>SMART FARMING. SMARTER FUTURE.</span>

          <h1>
            Grow smarter.
            <br />
            Farm better.
          </h1>

          <p>
            Your personal agricultural intelligence platform.
            Make informed decisions with the power of data and AI.
          </p>
        </div>

        <span className="auth-visual-footer">
          From Data to Decisions – Personalized Intelligence for Every Farmer
        </span>
      </div>

      <div className="auth-form-side">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
          <button
            type="button"
            onClick={toggleLanguage}
            className="secondary-button"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "5px 12px",
              fontSize: "12px",
              fontWeight: "600",
              borderRadius: "20px",
              cursor: "pointer"
            }}
          >
            <Globe size={14} />
            <span>{lang === "en" ? "ಕನ್ನಡಕ್ಕೆ ಬದಲಿಸಿ (Kannada)" : "Switch to English"}</span>
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>

          <div className="auth-mobile-brand">
            <Sprout size={25} />
            <strong>AgriSaarthi</strong>
          </div>

          <span className="welcome-label">
            FARMER ACCOUNT
          </span>

          <h2>
            {isRegister ? t("createAccount") : t("welcomeBack")}
          </h2>

          <p className="auth-description">
            {isRegister
              ? t("joinAgriSaarthi")
              : t("loginSubtitle")}
          </p>

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
                  justifyContent: "center",
                  transition: "color 0.15s"
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

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

          {isRegister && (
            <div className="auth-consent-field" style={{ display: "flex", alignItems: "flex-start", gap: "10px", margin: "14px 0", fontSize: "13px", color: "var(--text-muted, #4b5563)", textAlign: "left" }}>
              <input
                type="checkbox"
                id="userConsent"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                style={{ marginTop: "3px", width: "16px", height: "16px", cursor: "pointer", accentColor: "#15803d" }}
                required
              />
              <label htmlFor="userConsent" style={{ cursor: "pointer", lineHeight: "1.4" }}>
                {t("userConsentText")}
              </label>
            </div>
          )}

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : isRegister
                ? t("registerButton")
                : t("loginButton")}

            <ArrowRight size={18} />
          </button>

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

          <div className="auth-switch">
            {isRegister
              ? t("alreadyHaveAccount")
              : t("dontHaveAccount")}

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
  );
}

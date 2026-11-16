
import { useState } from "react";
import { Sprout, Lock, Mail, User, ArrowRight, Globe } from "lucide-react";
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

  const [consentGiven, setConsentGiven] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (isRegister && !consentGiven) {
      setError(t("consentRequiredError"));
      return;
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
                type="password"
                name="password"
                placeholder={t("enterPassword")}
                value={form.password}
                onChange={handleChange}
                autoComplete={isRegister ? "new-password" : "current-password"}
                minLength={isRegister ? 8 : undefined}
                required
              />
            </div>
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

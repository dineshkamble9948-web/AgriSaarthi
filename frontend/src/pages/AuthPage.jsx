
import { useState } from "react";
import { Sprout, Lock, Mail, User, ArrowRight } from "lucide-react";
import api from "../services/api";

export default function AuthPage({ onAuth, initialMode = "register" }) {
  const [isRegister, setIsRegister] = useState(initialMode !== "login");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });

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

        <form className="auth-form" onSubmit={handleSubmit}>

          <div className="auth-mobile-brand">
            <Sprout size={25} />
            <strong>AgriSaarthi</strong>
          </div>

          <span className="welcome-label">
            FARMER ACCOUNT
          </span>

          <h2>
            {isRegister ? "Create your account" : "Welcome back"}
          </h2>

          <p className="auth-description">
            {isRegister
              ? "Join AgriSaarthi and manage your farm intelligently."
              : "Login to access your personal farming dashboard."}
          </p>

          {isRegister && (
            <div className="auth-field">
              <label>Full Name</label>
              <div className="auth-input">
                <User size={18} />
                <input
                  type="text"
                  name="name"
                  placeholder="Enter your name"
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
            <label>Email Address</label>
            <div className="auth-input">
              <Mail size={18} />
              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="auth-field">
            <label>Password</label>
            <div className="auth-input">
              <Lock size={18} />
              <input
                type="password"
                name="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
                autoComplete={isRegister ? "new-password" : "current-password"}
                minLength={isRegister ? 8 : undefined}
                required
              />
            </div>
          </div>

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
                ? "Create Account"
                : "Login to Dashboard"}

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
              ? "Already have an account?"
              : "Don't have an account?"}

            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError("");
              }}
            >
              {isRegister ? "Login" : "Register"}
            </button>
          </div>

        </form>

      </div>

    </div>
  );
}

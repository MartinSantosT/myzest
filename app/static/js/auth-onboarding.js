// ============================================
// AUTH-ONBOARDING.JS  (self-contained, no deps)
// Shared logic for welcome.html, login.html, register.html,
// register_closed.html.
//
// 1. Detect language (localStorage or browser) and apply i18n.
// 2. Fetch /api/instance-info to render conditional UI bits.
// 3. Handle form submission and store JWT on success.
// ============================================

(function () {
    "use strict";

    const I18N = {
        "onb.welcomeTitle": { en: "Welcome to Zest", es: "Bienvenido a Zest" },
        "onb.welcomeSubtitle": {
            en: "Set up your instance — you'll be the admin of this Zest install.",
            es: "Configura tu instancia — serás el administrador de esta instalación.",
        },
        "onb.welcomeFooter": {
            en: "After this, anyone who can reach this URL can register and start their own collection. To restrict signups, set ALLOW_PUBLIC_REGISTRATION=false in your .env after this admin is created.",
            es: "Después de esto, cualquiera que pueda llegar a esta URL puede registrarse y empezar su propia colección. Para restringir registros, pon ALLOW_PUBLIC_REGISTRATION=false en tu .env después de crear este administrador.",
        },
        "onb.welcomeSubmit": { en: "Create your admin account", es: "Crear tu cuenta de administrador" },

        "onb.loginTitle": { en: "Sign in to Zest", es: "Inicia sesión en Zest" },
        "onb.loginSubtitle": { en: "Welcome back.", es: "Bienvenido de vuelta." },
        "onb.loginSubmit": { en: "Sign in", es: "Iniciar sesión" },

        "onb.registerTitle": { en: "Create your Zest account", es: "Crea tu cuenta de Zest" },
        "onb.registerSubtitle": { en: "Join this Zest instance.", es: "Únete a esta instancia de Zest." },
        "onb.registerSubmit": { en: "Create account", es: "Crear cuenta" },

        "onb.name": { en: "Your name", es: "Tu nombre" },
        "onb.email": { en: "Email", es: "Correo electrónico" },
        "onb.password": { en: "Password", es: "Contraseña" },
        "onb.confirmPassword": { en: "Confirm password", es: "Confirmar contraseña" },
        "onb.rememberMe": { en: "Remember me", es: "Recordarme" },

        "onb.noAccount": { en: "Don't have an account?", es: "¿No tienes cuenta?" },
        "onb.haveAccount": { en: "Already have an account?", es: "¿Ya tienes cuenta?" },
        "onb.signUp": { en: "Sign up", es: "Regístrate" },
        "onb.signIn": { en: "Sign in", es: "Inicia sesión" },

        "onb.closedTitle": { en: "Registration is closed", es: "El registro está cerrado" },
        "onb.closedBody1": {
            en: "The administrator of this Zest instance has disabled public registration.",
            es: "El administrador de esta instancia de Zest ha desactivado el registro público.",
        },
        "onb.closedBody2": {
            en: "If you should have access, contact the administrator to be invited.",
            es: "Si deberías tener acceso, contacta al administrador para que te invite.",
        },
        "onb.backToLogin": { en: "Back to sign in", es: "Volver a iniciar sesión" },

        "onb.busyCreating": { en: "Creating account...", es: "Creando cuenta..." },
        "onb.busyLoggingIn": { en: "Signing in...", es: "Iniciando sesión..." },

        "onb.errCompleteFields": { en: "Complete all fields", es: "Completa todos los campos" },
        "onb.errPasswordShort": { en: "Password: minimum 4 characters", es: "Contraseña: mínimo 4 caracteres" },
        "onb.errPasswordsMismatch": { en: "Passwords do not match", es: "Las contraseñas no coinciden" },
        "onb.errWrongCredentials": { en: "Email or password incorrect", es: "Correo o contraseña incorrectos" },
        "onb.errConnection": { en: "Connection error. Please try again.", es: "Error de conexión. Inténtalo de nuevo." },
    };

    function detectLang() {
        const stored = localStorage.getItem("zest_lang");
        if (stored === "es" || stored === "en") return stored;
        const browser = (navigator.language || "en").toLowerCase();
        return browser.startsWith("es") ? "es" : "en";
    }

    function t(key) {
        const lang = detectLang();
        const entry = I18N[key];
        return (entry && entry[lang]) || key;
    }

    function applyI18n() {
        const lang = detectLang();
        document.documentElement.lang = lang;
        document.querySelectorAll("[data-i18n]").forEach(el => {
            const key = el.dataset.i18n;
            const v = t(key);
            if (v && v !== key) el.textContent = v;
        });
    }

    async function applyInstanceInfo() {
        try {
            const r = await fetch("/api/instance-info");
            if (!r.ok) return;
            const info = await r.json();
            const signupRow = document.getElementById("signupRow");
            if (signupRow && info.allow_public_registration) {
                signupRow.classList.remove("hidden");
            }
        } catch (e) { /* offline tolerated */ }
    }

    function showError(msg) {
        const el = document.getElementById("error");
        if (!el) return;
        el.textContent = msg;
        el.classList.remove("hidden");
    }
    function clearError() {
        const el = document.getElementById("error");
        if (!el) return;
        el.classList.add("hidden");
        el.textContent = "";
    }
    function setBusy(busy, busyKey) {
        const btn = document.getElementById("submitBtn");
        if (!btn) return;
        btn.disabled = busy;
        if (busy) {
            btn.textContent = t(busyKey);
        } else {
            const key = btn.dataset.i18n;
            btn.textContent = key ? t(key) : btn.textContent;
        }
    }

    function val(id) { const el = document.getElementById(id); return el ? el.value.trim() : ""; }

    async function postJson(url, payload) {
        const r = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        const data = await r.json().catch(() => ({}));
        return { ok: r.ok, status: r.status, data };
    }

    function persistTokenAndGo(data) {
        if (data && data.access_token) {
            localStorage.setItem("zest_token", data.access_token);
        }
        window.location.href = "/app";
    }

    window.doWelcome = async function () {
        clearError();
        const name = val("name"), email = val("email");
        const p1 = val("password"), p2 = val("password2");
        if (!name || !email || !p1 || !p2) return showError(t("onb.errCompleteFields"));
        if (p1.length < 4) return showError(t("onb.errPasswordShort"));
        if (p1 !== p2) return showError(t("onb.errPasswordsMismatch"));
        setBusy(true, "onb.busyCreating");
        const r = await postJson("/auth/register", { name, email, password: p1 });
        setBusy(false);
        if (r.ok) return persistTokenAndGo(r.data);
        return showError((r.data && r.data.detail) || t("onb.errConnection"));
    };

    window.doLogin = async function () {
        clearError();
        const email = val("email"), password = val("password");
        if (!email || !password) return showError(t("onb.errCompleteFields"));
        setBusy(true, "onb.busyLoggingIn");
        const r = await postJson("/auth/login", { email, password });
        setBusy(false);
        if (r.ok) return persistTokenAndGo(r.data);
        if (r.status === 401) return showError(t("onb.errWrongCredentials"));
        return showError((r.data && r.data.detail) || t("onb.errConnection"));
    };

    window.doRegister = async function () {
        clearError();
        const name = val("name"), email = val("email");
        const p1 = val("password"), p2 = val("password2");
        if (!name || !email || !p1 || !p2) return showError(t("onb.errCompleteFields"));
        if (p1.length < 4) return showError(t("onb.errPasswordShort"));
        if (p1 !== p2) return showError(t("onb.errPasswordsMismatch"));
        setBusy(true, "onb.busyCreating");
        const r = await postJson("/auth/register", { name, email, password: p1 });
        setBusy(false);
        if (r.ok) return persistTokenAndGo(r.data);
        return showError((r.data && r.data.detail) || t("onb.errConnection"));
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => { applyI18n(); applyInstanceInfo(); });
    } else {
        applyI18n(); applyInstanceInfo();
    }
})();

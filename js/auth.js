// ===== Authentication (Client-side password gate) =====
const Auth = {
    async hashPassword(pwd) {
        const encoder = new TextEncoder();
        const data = encoder.encode(pwd);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    async login() {
        const pwd = document.getElementById('login-password').value;
        if (!pwd) return;

        const hash = await this.hashPassword(pwd);
        // Check against stored hash, or allow if matches config
        const storedHash = localStorage.getItem('quote_pwd_hash') || CONFIG.PASSWORD_HASH;

        if (hash === storedHash || hash === CONFIG.PASSWORD_HASH) {
            sessionStorage.setItem('quote_auth', 'true');
            localStorage.setItem('quote_pwd_hash', storedHash);
            document.getElementById('login-screen').classList.remove('active');
            document.getElementById('app-screen').classList.add('active');
            document.getElementById('login-error').style.display = 'none';
            App.init();
        } else {
            document.getElementById('login-error').style.display = 'block';
            document.getElementById('login-password').value = '';
            document.getElementById('login-password').focus();
        }
    },

    logout() {
        sessionStorage.removeItem('quote_auth');
        document.getElementById('app-screen').classList.remove('active');
        document.getElementById('login-screen').classList.add('active');
        document.getElementById('login-password').value = '';
        document.getElementById('login-password').focus();
    },

    checkSession() {
        if (sessionStorage.getItem('quote_auth') === 'true') {
            document.getElementById('login-screen').classList.remove('active');
            document.getElementById('app-screen').classList.add('active');
            App.init();
        }
    }
};

// Auto-check session on load
document.addEventListener('DOMContentLoaded', () => {
    Auth.checkSession();
    // Enter key on password field
    document.getElementById('login-password').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') Auth.login();
    });
});

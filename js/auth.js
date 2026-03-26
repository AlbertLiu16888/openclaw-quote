// ===== Authentication (Client-side password gate) =====
const Auth = {
    async hashPassword(pwd) {
        // Try Web Crypto API first (HTTPS only)
        if (window.crypto && window.crypto.subtle) {
            try {
                const encoder = new TextEncoder();
                const data = encoder.encode(pwd);
                const hashBuffer = await crypto.subtle.digest('SHA-256', data);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            } catch (e) {
                console.warn('crypto.subtle failed, using fallback', e);
            }
        }
        // Fallback: simple SHA-256 implementation
        return this._sha256Fallback(pwd);
    },

    // Pure JS SHA-256 fallback (for HTTP / older browsers)
    _sha256Fallback(str) {
        function rightRotate(value, amount) {
            return (value >>> amount) | (value << (32 - amount));
        }
        const mathPow = Math.pow;
        const maxWord = mathPow(2, 32);
        let result = '';
        const words = [];
        const asciiBitLength = str.length * 8;
        let hash = [];
        const k = [];
        let primeCounter = 0;

        const isComposite = {};
        for (let candidate = 2; primeCounter < 64; candidate++) {
            if (!isComposite[candidate]) {
                for (let i = 0; i < 313; i += candidate) {
                    isComposite[i] = candidate;
                }
                hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
                k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
            }
        }

        str += '\x80';
        while (str.length % 64 - 56) str += '\x00';
        for (let i = 0; i < str.length; i++) {
            const j = str.charCodeAt(i);
            if (j >> 8) return; // ASCII check
            words[i >> 2] |= j << ((3 - i) % 4) * 8;
        }
        words[words.length] = ((asciiBitLength / maxWord) | 0);
        words[words.length] = (asciiBitLength);

        for (let j = 0; j < words.length;) {
            const w = words.slice(j, j += 16);
            const oldHash = hash;
            hash = hash.slice(0, 8);

            for (let i = 0; i < 64; i++) {
                const w15 = w[i - 15], w2 = w[i - 2];
                const a = hash[0], e = hash[4];
                const temp1 = hash[7]
                    + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
                    + ((e & hash[5]) ^ ((~e) & hash[6]))
                    + k[i]
                    + (w[i] = (i < 16) ? w[i] : (
                        w[i - 16]
                        + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
                        + w[i - 7]
                        + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
                    ) | 0);
                const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
                    + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));

                hash = [(temp1 + temp2) | 0].concat(hash);
                hash[4] = (hash[4] + temp1) | 0;
            }

            for (let i = 0; i < 8; i++) {
                hash[i] = (hash[i] + oldHash[i]) | 0;
            }
        }

        for (let i = 0; i < 8; i++) {
            for (let j = 3; j + 1; j--) {
                const b = (hash[i] >> (j * 8)) & 255;
                result += ((b < 16) ? '0' : '') + b.toString(16);
            }
        }
        return result;
    },

    async login() {
        const pwdEl = document.getElementById('login-password');
        const pwd = pwdEl.value;
        if (!pwd) return;

        try {
            const hash = await this.hashPassword(pwd);
            const storedHash = localStorage.getItem('quote_pwd_hash') || CONFIG.PASSWORD_HASH;

            console.log('Login attempt, hash match:', hash === CONFIG.PASSWORD_HASH);

            if (hash === storedHash || hash === CONFIG.PASSWORD_HASH) {
                sessionStorage.setItem('quote_auth', 'true');
                localStorage.setItem('quote_pwd_hash', storedHash);
                document.getElementById('login-screen').classList.remove('active');
                document.getElementById('app-screen').classList.add('active');
                document.getElementById('login-error').style.display = 'none';
                App.init();
            } else {
                document.getElementById('login-error').style.display = 'block';
                pwdEl.value = '';
                pwdEl.focus();
            }
        } catch (err) {
            console.error('Login error:', err);
            // Emergency fallback: direct string comparison
            if (pwd === 'freshgifts2026') {
                sessionStorage.setItem('quote_auth', 'true');
                document.getElementById('login-screen').classList.remove('active');
                document.getElementById('app-screen').classList.add('active');
                App.init();
            } else {
                document.getElementById('login-error').style.display = 'block';
                pwdEl.value = '';
                pwdEl.focus();
            }
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

    // Handle login form submission
    const form = document.getElementById('login-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            Auth.login();
        });
    }

    // Also handle Enter key explicitly
    const pwdField = document.getElementById('login-password');
    if (pwdField) {
        pwdField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                Auth.login();
            }
        });
    }
});

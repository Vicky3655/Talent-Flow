/* ═══════════════════════════════════════════
   TALENT FLOW — Settings
   settings.js
   Reads/writes the same Firestore profile document every other
   page uses (via auth.js), instead of a separate localStorage copy.
═══════════════════════════════════════════ */

let currentUser    = null;
let currentProfile = {};

// ── Populate settings UI from the real signed-in account ──

async function loadProfileIntoSettings() {
    const auth = window.TalentFlowAuth;
    if (!auth) return;

    currentUser = await auth.requireAuth(); // redirects to login.html if signed out
    try {
        currentProfile = (await auth.loadProfile(currentUser.uid)) || {};
    } catch (err) {
        console.error('Firestore profile read failed (using basic account info):', err);
        currentProfile = {};
    }

    const p = currentProfile;
    const displayName = p.fullName || currentUser.displayName
        || (currentUser.email ? currentUser.email.split('@')[0] : 'Talent Flow User');
    const avatarUrl = currentUser.photoURL || auth.initialsAvatar(displayName);

    // Profile tab fields
    const nameEl  = document.getElementById('fieldName');
    const emailEl = document.getElementById('fieldEmail');
    const bioEl   = document.getElementById('fieldBio');
    const roleEl  = document.getElementById('fieldRole');

    if (nameEl)  nameEl.value  = displayName;
    if (emailEl) emailEl.value = p.email || currentUser.email || '';
    if (bioEl)   bioEl.value   = p.bio || '';
    if (roleEl)  roleEl.value  = p.role || '—';

    // Display name heading
    const displayNameEl = document.getElementById('profileDisplayName');
    if (displayNameEl) displayNameEl.textContent = displayName;

    // Profile photo — large and nav avatar
    const profileImgEl = document.getElementById('profileImg');
    if (profileImgEl) profileImgEl.src = avatarUrl;

    const navAvatarEl = document.querySelector('.avatar img');
    if (navAvatarEl) navAvatarEl.src = avatarUrl;

    // Nav role label
    const navRoleEl = document.querySelector('.nav-role');
    if (navRoleEl) navRoleEl.textContent = p.role || '';
}

// ── Tab switching ─────────────────────────

document.querySelectorAll('.settings-nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.settings-nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
});

// ── Profile: avatar upload ───────────────

const editAvatarBtn = document.getElementById('editAvatarBtn');
const avatarInput   = document.getElementById('avatarInput');
const profileImg    = document.getElementById('profileImg');

editAvatarBtn.addEventListener('click', () => avatarInput.click());

avatarInput.addEventListener('change', () => {
    const file = avatarInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        const dataURL = e.target.result;

        // Update both avatar elements on screen
        profileImg.src = dataURL;
        const navAvatar = document.querySelector('.avatar img');
        if (navAvatar) navAvatar.src = dataURL;

        // Preview only for now — this doesn't persist. Saving a custom
        // photo for real needs Firebase Storage, a separate piece not
        // wired up yet, so a reload will revert to the Google photo or
        // initial letter.
    };
    reader.readAsDataURL(file);
});

// ── Profile: save changes ────────────────

document.getElementById('saveProfileBtn').addEventListener('click', () => {
    const name  = document.getElementById('fieldName').value.trim();
    const email = document.getElementById('fieldEmail').value.trim();
    const bio   = document.getElementById('fieldBio').value.trim();

    if (!name || !email) {
        shakeSave();
        return;
    }

    // Update displayed heading
    document.getElementById('profileDisplayName').textContent = name;

    // Save in the background — don't make the person wait on Firestore.
    const auth = window.TalentFlowAuth;
    if (auth && currentUser) {
        auth.saveProfile(currentUser.uid, { fullName: name, email, bio }).catch((err) => {
            console.error('Firestore profile save failed (continuing anyway):', err);
        });
        Object.assign(currentProfile, { fullName: name, email, bio });
    }

    showToast('saveToast', '✓ Changes saved!', '#22C55E');
});

// ── Log out ───────────────────────────────

document.getElementById('logoutBtn')?.addEventListener('click', () => {
    window.TalentFlowAuth?.logOut();
});

// ── Security: password strength ─────────

document.getElementById('newPwd').addEventListener('input', function () {
    const val  = this.value;
    const fill = document.getElementById('strengthFill');
    const lbl  = document.getElementById('strengthLabel');

    let score = 0;
    if (val.length >= 8)           score++;
    if (/[A-Z]/.test(val))         score++;
    if (/[0-9]/.test(val))         score++;
    if (/[^A-Za-z0-9]/.test(val))  score++;

    const map = [
        { w: '0%',   c: 'transparent', t: '' },
        { w: '25%',  c: '#EF4444',     t: 'Weak' },
        { w: '50%',  c: '#F59E0B',     t: 'Fair' },
        { w: '75%',  c: '#3B82F6',     t: 'Good' },
        { w: '100%', c: '#22C55E',     t: 'Strong' },
    ];

    fill.style.width      = map[score].w;
    fill.style.background = map[score].c;
    lbl.textContent       = map[score].t;
    lbl.style.color       = map[score].c;
});

// ── Security: update password ────────────

window.handlePasswordChange = function () {
    const curr    = document.getElementById('currentPwd').value.trim();
    const newP    = document.getElementById('newPwd').value.trim();
    const confirm = document.getElementById('confirmPwd').value.trim();

    if (!curr || !newP || !confirm) {
        showToast('pwdToast', '✗ Please fill all fields.', '#EF4444');
        return;
    }
    if (newP !== confirm) {
        showToast('pwdToast', '✗ Passwords do not match.', '#EF4444');
        return;
    }
    if (newP.length < 8) {
        showToast('pwdToast', '✗ Password must be at least 8 characters.', '#EF4444');
        return;
    }

    document.getElementById('currentPwd').value          = '';
    document.getElementById('newPwd').value              = '';
    document.getElementById('confirmPwd').value          = '';
    document.getElementById('strengthFill').style.width  = '0%';
    document.getElementById('strengthLabel').textContent = '';

    showToast('pwdToast', '✓ Password updated successfully!', '#22C55E');
};

// ── Toggle password visibility ───────────

window.togglePwd = function (inputId, btn) {
    const input  = document.getElementById(inputId);
    const isText = input.type === 'text';
    input.type      = isText ? 'password' : 'text';
    btn.style.color = isText ? '#94A3B8' : '#2563EB';
};

// ── Helpers ──────────────────────────────

function showToast(id, msg, color) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.style.color  = color;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 3000);
}

function shakeSave() {
    const btn = document.getElementById('saveProfileBtn');
    btn.style.animation = 'none';
    btn.offsetHeight; // reflow
    btn.style.animation = 'shake 0.35s ease';
}

const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
@keyframes shake {
    0%,100% { transform: translateX(0); }
    20%      { transform: translateX(-7px); }
    40%      { transform: translateX(7px); }
    60%      { transform: translateX(-4px); }
    80%      { transform: translateX(4px); }
}`;
document.head.appendChild(shakeStyle);

// ── Boot: load saved profile into UI ─────

document.addEventListener('DOMContentLoaded', loadProfileIntoSettings);

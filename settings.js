const auth = window.TalentFlowAuth;

/* ── Shared profile bridge ──────────────────────────────────
   instructor-profile.html is the detailed source for fields like
   title/expertise/education; this page only edits a subset (name,
   email, bio, avatar, username). Both pages read AND write the
   same localStorage key, merging rather than overwriting, so
   whichever was edited most recently — here or on the profile
   page — is what shows up everywhere, and saving on one page
   never silently discards a field only the other page manages.
   ────────────────────────────────────────────────────────── */
const INSTRUCTOR_BRIDGE_KEY = "tf_instructor_profile";

function readInstructorBridge() {
    try {
        const raw = localStorage.getItem(INSTRUCTOR_BRIDGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (err) {
        console.error("Could not read the shared profile bridge:", err);
        return null;
    }
}

function writeInstructorBridge(patch) {
    try {
        const merged = { ...(readInstructorBridge() || {}), ...patch };
        localStorage.setItem(INSTRUCTOR_BRIDGE_KEY, JSON.stringify(merged));
        window.dispatchEvent(new CustomEvent("tf-profile-updated", { detail: { key: INSTRUCTOR_BRIDGE_KEY } }));
    } catch (err) {
        console.error("Could not update the shared profile bridge:", err);
    }
}

const navAvatar = document.querySelector(".avatar img");
const navRole = document.getElementById("navRole");
const profileImg = document.getElementById("profileImg");
const editAvatarBtn = document.getElementById("editAvatarBtn");
const avatarInput = document.getElementById("avatarInput");
const profileDisplayName = document.getElementById("profileDisplayName");
const fieldName = document.getElementById("fieldName");
const fieldEmail = document.getElementById("fieldEmail");
const fieldBio = document.getElementById("fieldBio");
const fieldRole = document.getElementById("fieldRole");
const fieldUsername = document.getElementById("fieldUsername");
const fieldLanguage = document.getElementById("fieldLanguage");
const fieldTimezone = document.getElementById("fieldTimezone");
const notifyEmail = document.getElementById("notifyEmail");
const notifyAssignments = document.getElementById("notifyAssignments");
const notifyEnrollments = document.getElementById("notifyEnrollments");
const notifyPlatform = document.getElementById("notifyPlatform");
const twoFactorToggle = document.getElementById("twoFactorToggle");

// Mobile sidebar "mini profile" — present on any page using the shared sidebar.
const sbFooterAvatar = document.querySelector(".sb-footer-avatar");
const sbFooterName = document.querySelector(".sb-footer-name");
const sbFooterRole = document.querySelector(".sb-footer-role");

function currentProfile() {
    const bridged = readInstructorBridge();
    const stored = auth?.getStoredProfile();
    const base = { ...(stored || {}), ...(bridged || {}) };

    // Nothing entered anywhere yet — stay blank instead of showing a demo
    // identity that isn't actually the signed-in person.
    return {
        name: base.fullName || base.name || "",
        email: base.email || "",
        role: base.role || "",
        bio: base.bio || "",
        username: base.username || "",
        avatar: base.avatar || "",
    };
}

function updateSidebarMiniProfile(profile) {
    if (sbFooterAvatar && profile.avatar) sbFooterAvatar.src = profile.avatar;
    if (sbFooterName) sbFooterName.textContent = profile.name || "";
    if (sbFooterRole) sbFooterRole.textContent = profile.role || "";
}

function hydrateProfile() {
    const profile = currentProfile();

    profileDisplayName.textContent = profile.name;
    fieldName.value = profile.name;
    fieldEmail.value = profile.email;
    fieldBio.value = profile.bio || "";
    fieldRole.value = profile.role || "";
    fieldUsername.value = profile.username || profile.email?.split("@")[0] || "";

    // Only touch the <img> once there's an actual photo — until then the
    // CSS gives it a neutral circle instead of a broken-image icon.
    if (profile.avatar) {
        profileImg.src = profile.avatar;
        navAvatar.src = profile.avatar;
    }
    navRole.textContent = profile.role || "";

    updateSidebarMiniProfile(profile);
}

function hydrateSettings() {
    const settings = auth?.getSettings?.() || {};
    const notifications = settings.notifications || {};

    fieldLanguage.value = settings.language || "English";
    fieldTimezone.value = settings.timezone || "Africa/Lagos (WAT)";
    notifyEmail.checked = notifications.email ?? true;
    notifyAssignments.checked = notifications.assignments ?? true;
    notifyEnrollments.checked = notifications.enrollments ?? false;
    notifyPlatform.checked = notifications.platform ?? false;
    twoFactorToggle.checked = settings.twoFactor ?? false;
}

// Live-update if the instructor profile changes elsewhere — another tab
// (via "storage"), or right here via this page's own save handlers below
// (via the custom event, since "storage" never fires in the tab that
// actually made the change).
window.addEventListener("storage", (e) => {
    if (e.key === INSTRUCTOR_BRIDGE_KEY) hydrateProfile();
});
window.addEventListener("tf-profile-updated", (e) => {
    if (!e.detail || e.detail.key === INSTRUCTOR_BRIDGE_KEY) hydrateProfile();
});

document.querySelectorAll(".settings-nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".settings-nav-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
    });
});

editAvatarBtn.addEventListener("click", () => avatarInput.click());

avatarInput.addEventListener("change", () => {
    const file = avatarInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = e => {
        const avatar = e.target.result;
        auth?.saveUserProfile({ ...currentProfile(), avatar });
        writeInstructorBridge({ avatar });
        hydrateProfile();
    };
    reader.readAsDataURL(file);
});

document.getElementById("saveProfileBtn").addEventListener("click", () => {
    const name = fieldName.value.trim();
    const email = fieldEmail.value.trim();

    if (!name || !email) {
        shakeSave();
        showToast("saveToast", "Please enter your name and email.", "#EF4444");
        return;
    }

    const bio = fieldBio.value.trim();
    const role = fieldRole.value.trim();
    const username = fieldUsername.value.trim() || email.split("@")[0];
    const avatar = profileImg.src;

    auth?.saveUserProfile({ ...currentProfile(), name, email, bio, role, username, avatar });
    writeInstructorBridge({ fullName: name, email, bio, role, username, avatar, profileCompleted: true });

    hydrateProfile();
    showToast("saveToast", "Changes saved!", "#22C55E");
});

document.getElementById("saveAccountBtn").addEventListener("click", () => {
    const username = fieldUsername.value.trim();
    auth?.saveUserProfile({ ...currentProfile(), username });
    writeInstructorBridge({ username });
    auth?.saveSettings({
        language: fieldLanguage.value,
        timezone: fieldTimezone.value,
    });
    showToast("accountToast", "Account settings saved!", "#22C55E");
});

document.getElementById("saveNotificationsBtn").addEventListener("click", () => {
    auth?.saveSettings({
        notifications: {
            email: notifyEmail.checked,
            assignments: notifyAssignments.checked,
            enrollments: notifyEnrollments.checked,
            platform: notifyPlatform.checked,
        },
    });
    showToast("notificationsToast", "Preferences saved!", "#22C55E");
});

twoFactorToggle.addEventListener("change", () => {
    auth?.saveSettings({ twoFactor: twoFactorToggle.checked });
});

document.getElementById("signOutBtn").addEventListener("click", () => {
    auth?.signOutUser();
});

document.getElementById("deleteAccountBtn").addEventListener("click", () => {
    const confirmed = confirm("Delete this local Talent Flow account data?");
    if (!confirmed) return;

    localStorage.removeItem("talentFlowAuth");
    localStorage.removeItem("userProfile");
    localStorage.removeItem("talentFlowSettings");
    localStorage.removeItem(INSTRUCTOR_BRIDGE_KEY);
    window.location.href = "register.html";
});

document.getElementById("newPwd").addEventListener("input", function () {
    const val = this.value;
    const fill = document.getElementById("strengthFill");
    const lbl = document.getElementById("strengthLabel");

    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;

    const map = [
        { w: "0%", c: "transparent", t: "" },
        { w: "25%", c: "#EF4444", t: "Weak" },
        { w: "50%", c: "#F59E0B", t: "Fair" },
        { w: "75%", c: "#3B82F6", t: "Good" },
        { w: "100%", c: "#22C55E", t: "Strong" },
    ];

    fill.style.width = map[score].w;
    fill.style.background = map[score].c;
    lbl.textContent = map[score].t;
    lbl.style.color = map[score].c;
});

window.handlePasswordChange = function () {
    const curr = document.getElementById("currentPwd").value.trim();
    const newP = document.getElementById("newPwd").value.trim();
    const confirmPwd = document.getElementById("confirmPwd").value.trim();

    if (!curr || !newP || !confirmPwd) {
        showToast("pwdToast", "Please fill all fields.", "#EF4444");
        return;
    }
    if (newP !== confirmPwd) {
        showToast("pwdToast", "Passwords do not match.", "#EF4444");
        return;
    }
    if (newP.length < 8) {
        showToast("pwdToast", "Password must be at least 8 characters.", "#EF4444");
        return;
    }

    document.getElementById("currentPwd").value = "";
    document.getElementById("newPwd").value = "";
    document.getElementById("confirmPwd").value = "";
    document.getElementById("strengthFill").style.width = "0%";
    document.getElementById("strengthLabel").textContent = "";
    showToast("pwdToast", "Password updated successfully!", "#22C55E");
};

window.togglePwd = function (inputId, btn) {
    const input = document.getElementById(inputId);
    const isText = input.type === "text";
    input.type = isText ? "password" : "text";
    btn.style.color = isText ? "#94A3B8" : "#2563EB";
};

function showToast(id, msg, color) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.style.color = color;
    el.classList.add("show");
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove("show"), 3000);
}

function shakeSave() {
    const btn = document.getElementById("saveProfileBtn");
    btn.style.animation = "none";
    btn.offsetHeight;
    btn.style.animation = "shake 0.35s ease";
}

const shakeStyle = document.createElement("style");
shakeStyle.textContent = `
@keyframes shake {
    0%,100% { transform: translateX(0); }
    20% { transform: translateX(-7px); }
    40% { transform: translateX(7px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
}`;
document.head.appendChild(shakeStyle);

hydrateProfile();
hydrateSettings();

const auth = window.TalentFlowAuth;

const defaultAvatar = "https://i.pravatar.cc/160?img=47";
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

function currentProfile() {
    return auth?.getStoredProfile() || {
        name: "Ikekhuamen Favour",
        email: "ikekhuamenfavour@gmail.com",
        role: "Instructor",
        bio: "Product Designer & Creator",
        username: "favour.ikekhuamen",
        avatar: defaultAvatar,
    };
}

function hydrateProfile() {
    const profile = currentProfile();
    const avatar = profile.avatar || defaultAvatar;

    profileDisplayName.textContent = profile.name;
    fieldName.value = profile.name;
    fieldEmail.value = profile.email;
    fieldBio.value = profile.bio || "";
    fieldRole.value = profile.role || "Instructor";
    fieldUsername.value = profile.username || profile.email?.split("@")[0] || "";
    profileImg.src = avatar;
    navAvatar.src = avatar;
    navRole.textContent = profile.role || "Instructor";
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
        profileImg.src = avatar;
        navAvatar.src = avatar;
        auth?.saveUserProfile({ ...currentProfile(), avatar });
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

    const profile = auth?.saveUserProfile({
        ...currentProfile(),
        name,
        email,
        bio: fieldBio.value.trim(),
        role: fieldRole.value.trim() || "Instructor",
        username: fieldUsername.value.trim() || email.split("@")[0],
        avatar: profileImg.src,
    });

    profileDisplayName.textContent = profile?.name || name;
    navRole.textContent = profile?.role || fieldRole.value;
    showToast("saveToast", "Changes saved!", "#22C55E");
});

document.getElementById("saveAccountBtn").addEventListener("click", () => {
    auth?.saveUserProfile({
        ...currentProfile(),
        username: fieldUsername.value.trim(),
    });
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

function initMobileMenu() {
    const hamburger = document.getElementById("hamburger-btn");
    const overlay = document.getElementById("sidebar-overlay");
    const sidebar = document.getElementById("sidebar");
    if (!hamburger || !overlay || !sidebar) return;
    hamburger.addEventListener("click", () => {
        sidebar.classList.add("mobile-open");
        document.body.style.overflow = "hidden";
    });
    overlay.addEventListener("click", () => {
        sidebar.classList.remove("mobile-open");
        document.body.style.overflow = "";
    });
}

hydrateProfile();
hydrateSettings();
initMobileMenu();

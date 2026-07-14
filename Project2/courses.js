/* ============================================================
   TALENT FLOW  |  student-courses.js
   ------------------------------------------------------------
   The student-facing course catalog: every course an instructor
   has published, pulled live from Firestore via
   TalentFlowData.getPublishedCourses() (see data-store.js),
   which already joins in each instructor's public name/photo
   from the publicProfiles collection.
   ============================================================ */

let allCourses = [];
let myEnrollments = new Set(); // course ids the student is already in
let searchTerm = '';

document.addEventListener('DOMContentLoaded', async () => {
    const auth = window.TalentFlowAuth;
    if (!auth) return;

    const user = await auth.requireAuth(); // redirects to login.html if signed out

    initUserMenu(auth);          // wire up avatar dropdown + logout link
    renderUserMenu(auth, user);  // fill in real name/avatar/role (fire-and-forget)

    try {
        const [courses, enrollments] = await Promise.all([
            window.TalentFlowData.getPublishedCourses(),
            auth.listMyEnrollments().catch(() => []),
        ]);
        allCourses = courses;
        myEnrollments = new Set(enrollments.map(e => e.courseId));
    } catch (err) {
        console.error('Loading the course catalog failed:', err);
        showToast('Could not load courses', 'Check your connection and refresh.', 'error');
    }

    render();
    initSearch();
});

/* ── NAV: SIGNED-IN USER MENU ─────────────────────────────────
   auth.js's Firebase `user` object only carries displayName/email —
   avatar and role live in the Firestore profile doc instead, so
   that gets loaded here and used to replace the placeholder
   "Amara Okafor" markup in the nav avatar + profile popup. ────── */
async function renderUserMenu(auth, user) {
    let profile = null;
    try {
        profile = await auth.loadProfile(user.uid);
    } catch (err) {
        console.error('Loading profile for nav failed (continuing with fallback):', err);
    }

    const name = (profile && profile.fullName) || user.displayName || 'Student';
    const role = (profile && profile.role) || 'Student';
    const avatar = (profile && profile.avatar) || auth.initialsAvatar(name);

    document.querySelectorAll('.js-user-avatar').forEach((img) => {
        img.src = avatar;
        img.alt = name;
    });
    const nameEl = document.getElementById('popupName');
    const roleEl = document.getElementById('popupRole');
    if (nameEl) nameEl.textContent = name;
    if (roleEl) roleEl.textContent = role;
}

// Toggles the profile popup open/closed and wires the real sign-out
// action onto the "Log Out" link (it previously targeted a #logoutBtn
// id that doesn't exist anywhere in courses.html, so it never fired).
function initUserMenu(auth) {
    const avatarBtn = document.getElementById('avatarBtn');
    const profilePopup = document.getElementById('profilePopup');

    avatarBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        profilePopup?.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (profilePopup?.classList.contains('open')
            && !profilePopup.contains(e.target)
            && !avatarBtn?.contains(e.target)) {
            profilePopup.classList.remove('open');
        }
    });

    document.getElementById('navLogoutLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        auth.logOut();
    });
}

function initSearch() {
    const input = document.getElementById('courseSearch');
    input?.addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase().trim();
        render();
    });
}

function render() {
    const grid = document.getElementById('courseGrid');
    const empty = document.getElementById('emptyState');
    const emptyText = document.getElementById('emptyStateText');
    if (!grid) return;

    const list = allCourses.filter(c =>
        !searchTerm ||
        c.title.toLowerCase().includes(searchTerm) ||
        (c.instructorName || '').toLowerCase().includes(searchTerm)
    );

    if (!list.length) {
        grid.innerHTML = '';
        if (empty) empty.hidden = false;
        if (emptyText) {
            emptyText.textContent = allCourses.length
                ? 'No courses match your search.'
                : 'No published courses yet — check back soon.';
        }
        return;
    }
    if (empty) empty.hidden = true;

    grid.innerHTML = list.map((c, i) => {
        const enrolled = myEnrollments.has(c.id);
        const avatar = c.instructorAvatar || fallbackAvatar(c.instructorName);
        return `
        <div class="scourse-card" style="animation-delay:${i * 60}ms">
            <div class="scourse-thumb">
                <img src="${c.thumb}" alt="${c.alt || c.title}" onerror="this.src='https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&q=80'">
            </div>
            <div class="scourse-body">
                <p class="scourse-title">${c.title}</p>
                ${c.desc ? `<p class="scourse-desc">${c.desc}</p>` : ''}
                <div class="scourse-meta">${c.lessons} Lesson${c.lessons !== 1 ? 's' : ''}</div>
                <div class="scourse-instructor">
                    <img src="${avatar}" alt="${c.instructorName}">
                    <span>Taught by <strong>${c.instructorName}</strong></span>
                </div>
                <button class="scourse-btn ${enrolled ? 'is-enrolled' : ''}" data-id="${c.id}" ${enrolled ? 'disabled' : ''}>
                    ${enrolled ? '✓ Enrolled' : 'Enroll'}
                </button>
            </div>
        </div>`;
    }).join('');

    grid.querySelectorAll('.scourse-btn:not(.is-enrolled)').forEach(btn => {
        btn.addEventListener('click', () => enroll(btn.dataset.id, btn));
    });
}

function fallbackAvatar(name) {
    const auth = window.TalentFlowAuth;
    if (auth?.initialsAvatar) return auth.initialsAvatar(name || 'T');
    return '';
}

async function enroll(courseId, btn) {
    const course = allCourses.find(c => c.id === courseId);
    if (!course) return;
    const auth = window.TalentFlowAuth;

    btn.disabled = true;
    btn.textContent = 'Enrolling…';

    try {
        await auth.enrollInCourse(course);
        myEnrollments.add(courseId);
        btn.textContent = '✓ Enrolled';
        btn.classList.add('is-enrolled');
        showToast('Enrolled!', `You're in "${course.title}".`, 'success');
    } catch (err) {
        console.error('Enrolling failed:', err);
        btn.disabled = false;
        btn.textContent = 'Enroll';
        showToast('Could not enroll', 'Please try again.', 'error');
    }
}

/* ── TOAST ─────────────────────────────────────────────────── */
function showToast(title, msg, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const el = document.createElement('div');
    el.className = 'toast';
    const colors = { success: '#16A34A', error: '#DC2626', info: '#2563EB' };
    el.innerHTML = `
        <div class="toast-icon" style="background:${colors[type] || colors.info}"></div>
        <div>
            <div class="toast-title">${title}</div>
            <div class="toast-msg">${msg}</div>
        </div>`;
    container.appendChild(el);

    const dismiss = () => { el.classList.add('exit'); setTimeout(() => el.remove(), 300); };
    el.addEventListener('click', dismiss);
    setTimeout(dismiss, 3500);
}

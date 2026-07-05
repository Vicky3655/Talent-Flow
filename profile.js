/* ============================================================
   TALENT FLOW  |  profile.js
   ------------------------------------------------------------
   Shared by instructor-profile.html and student-profile.html.
   Which fields it reads/writes is driven entirely by the
   data-profile-page="instructor|student" attribute on <body>,
   so one file can serve both pages' different field sets.

   The instructor side also mirrors its data into a small
   localStorage bridge (tf_instructor_profile) the moment the
   form is saved. settings.js and nav-avatar.js both read that
   same key, so a name/photo entered here shows up on the
   settings page, the topbar, and the mobile sidebar's mini
   profile immediately — without waiting on a Firestore round
   trip. (Student pages are untouched: cfg.storageKey is only
   set below for the instructor config.)
   ============================================================ */

const CONFIG = {
  instructor: {
    tagClass: 'tag-chip',
    linkClass: '',
    coursesUrl: 'courses.html',
    storageKey: 'tf_instructor_profile',
    roleLabel: 'Instructor',
    fields: ['fullName', 'title', 'bio', 'expertise', 'experience', 'education', 'linkedin', 'website'],
    toView(p) {
      return {
        name: p.fullName || '',
        title: p.title || '',
        bio: p.bio || '',
        metaValue: p.experience ? `${p.experience} yr${String(p.experience) === '1' ? '' : 's'}` : '—',
        tags: p.expertise || '',
        educationText: p.education || '',
        links: [
          p.linkedin ? { label: 'LinkedIn', url: p.linkedin } : null,
          p.website  ? { label: 'Website',  url: p.website  } : null,
        ].filter(Boolean),
      };
    },
  },
  student: {
    tagClass: 'profile-tag',
    linkClass: 'profile-link',
    coursesUrl: '/project2/courses.html',
    fields: ['fullName', 'email', 'educationLevel', 'fieldOfStudy', 'bio', 'interests', 'goals', 'linkedin', 'github'],
    toView(p) {
      return {
        name: p.fullName || '',
        title: p.educationLevel || '',
        bio: p.bio || '',
        metaValue: p.fieldOfStudy || '—',
        tags: p.interests || '',
        educationText: p.goals || '',
        links: [
          p.linkedin ? { label: 'LinkedIn', url: p.linkedin } : null,
          p.github   ? { label: 'GitHub',   url: p.github   } : null,
        ].filter(Boolean),
      };
    },
  },
};

function renderTags(container, text, tagClass) {
  if (!container) return;
  container.innerHTML = '';
  (text || '').split(',').map((s) => s.trim()).filter(Boolean).forEach((tag) => {
    const span = document.createElement('span');
    span.className = tagClass;
    span.textContent = tag;
    container.appendChild(span);
  });
}

function renderLinks(container, links, linkClass) {
  if (!container) return;
  container.innerHTML = '';
  links.forEach(({ label, url }) => {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    if (linkClass) a.className = linkClass;
    a.textContent = label;
    container.appendChild(a);
  });
}

// ── Cross-page profile bridge ──────────────────────────────
// Small, dependency-free localStorage read/write pair. Writes are
// merged (not overwritten), so a field this page doesn't touch —
// e.g. "username", which only settings.js edits — never gets
// wiped out by a save made here.
function readProfileBridge(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('Could not read the shared profile bridge:', err);
    return null;
  }
}

function writeProfileBridge(key, patch) {
  try {
    const merged = { ...(readProfileBridge(key) || {}), ...patch };
    localStorage.setItem(key, JSON.stringify(merged));
    // "storage" events only fire in OTHER tabs — this lets anything
    // listening on THIS same page/tab react right away too.
    window.dispatchEvent(new CustomEvent('tf-profile-updated', { detail: { key } }));
  } catch (err) {
    console.error('Could not update the shared profile bridge:', err);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const pageType = document.body.dataset.profilePage; // 'instructor' | 'student'
  const cfg = CONFIG[pageType];
  const auth = window.TalentFlowAuth;
  if (!cfg || !auth) return;

  const user = await auth.requireAuth(); // redirects to login.html if signed out
  let profile = {};
  try {
    profile = (await auth.loadProfile(user.uid)) || {};
  } catch (err) {
    console.error('Firestore profile read failed — showing the blank form instead:', err);
  }

  // The photo lives only in the local bridge (see note below), so
  // Firestore won't have it — pull it back in if we have it on this device.
  if (cfg.storageKey) {
    const bridged = readProfileBridge(cfg.storageKey);
    if (bridged?.avatar && !profile.avatar) profile.avatar = bridged.avatar;
  }

  const viewSection   = document.getElementById('profileView');
  const formSection   = document.getElementById('profileFormSection');
  const form          = document.getElementById('profileForm');
  const avatarPreview = document.getElementById('avatarPreview');
  const avatarInput   = document.getElementById('avatarInput');
  const logoutBtn     = document.getElementById('logoutBtn');
  const editBtn       = document.getElementById('editProfileBtn');
  const topbarAvatar  = document.getElementById('nav-avatar-img');

  // Real photo upload/storage isn't wired up to Firestore yet (that needs
  // Firebase Storage, a separate piece) — this is just the fallback for
  // someone who hasn't picked a photo at all: their Google account photo,
  // or a generated initial.
  const fallbackAvatarUrl = user.photoURL || auth.initialsAvatar(profile.fullName || user.displayName || user.email);

  function fillForm(p) {
    cfg.fields.forEach((id) => {
      const el = document.getElementById(id);
      if (el && p[id] !== undefined) el.value = p[id];
    });
    const nameEl = document.getElementById('fullName');
    if (nameEl && !nameEl.value) nameEl.value = user.displayName || '';
    const emailEl = document.getElementById('email');
    if (emailEl && !emailEl.value) emailEl.value = user.email || '';
    if (avatarPreview) avatarPreview.src = p.avatar || fallbackAvatarUrl;
  }

  function showForm() {
    fillForm(profile);
    if (viewSection) viewSection.hidden = true;
    if (formSection) formSection.hidden = false;
  }

  function showView(p) {
    const v = cfg.toView(p);
    document.getElementById('viewAvatar').src = p.avatar || fallbackAvatarUrl;
    document.getElementById('viewName').textContent = v.name || user.displayName || 'Talent Flow User';
    document.getElementById('viewTitle').textContent = v.title;
    document.getElementById('viewBio').textContent = v.bio;
    document.getElementById('viewExperience').textContent = v.metaValue;
    document.getElementById('viewEmail').textContent = p.email || user.email || '';
    renderTags(document.getElementById('viewExpertise'), v.tags, cfg.tagClass);
    document.getElementById('viewEducation').textContent = v.educationText;
    renderLinks(document.getElementById('viewLinks'), v.links, cfg.linkClass);

    if (formSection) formSection.hidden = true;
    if (viewSection) viewSection.hidden = false;
  }

  // Reflect whatever we already know onto this page's own topbar right away.
  if (topbarAvatar && profile.avatar) topbarAvatar.src = profile.avatar;

  if (profile.profileCompleted) showView(profile);
  else showForm();

  editBtn?.addEventListener('click', showForm);

  // Local preview only — see note above on photo storage.
  avatarInput?.addEventListener('change', () => {
    const file = avatarInput.files && avatarInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { if (avatarPreview) avatarPreview.src = reader.result; };
    reader.readAsDataURL(file);
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const isFirstCompletion = !profile.profileCompleted;
    const data = { profileCompleted: true };
    cfg.fields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) data[id] = el.value.trim();
    });
    if (cfg.storageKey && avatarPreview?.src) data.avatar = avatarPreview.src;

    Object.assign(profile, data);

    // Firestore keeps everything except the photo — base64 images are too
    // large/costly for a document field until Storage is wired up.
    const firestoreData = { ...data };
    delete firestoreData.avatar;

    // Save in the background — don't make the person wait on Firestore
    // (or lose their filled-out form to a timeout) to move forward.
    auth.saveProfile(user.uid, firestoreData).catch((err) => {
      console.error('Firestore profile save failed (continuing anyway):', err);
    });

    // Mirror the full profile — photo included — into the shared bridge so
    // settings, the topbar, and the mobile menu update immediately on this
    // device, without waiting on a Firestore round trip.
    if (cfg.storageKey) {
      writeProfileBridge(cfg.storageKey, {
        ...data,
        email: profile.email || user.email || '',
        role: cfg.roleLabel || '',
      });
    }

    if (topbarAvatar && profile.avatar) topbarAvatar.src = profile.avatar;

    if (isFirstCompletion) {
      // Just finished onboarding — move straight on instead of making
      // them look at their own profile and click again.
      window.location.href = cfg.coursesUrl;
    } else {
      // Editing an already-complete profile — show what changed and
      // let them continue on their own terms.
      showView(profile);
    }
  });

  logoutBtn?.addEventListener('click', () => auth.logOut());
});

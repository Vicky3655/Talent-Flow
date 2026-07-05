/* ============================================================
   TALENT FLOW  |  nav-avatar.js
   ------------------------------------------------------------
   Keeps the signed-in instructor's name/photo/role in sync
   everywhere the nav chrome shows them: the topbar avatar, and —
   on any page using the shared mobile sidebar — the "mini
   profile" in the sidebar footer.

   Reads the small localStorage bridge (tf_instructor_profile)
   that profile.js writes the moment the instructor saves their
   form. That works even on pages like courses.html and
   instructor-assignments.html, which don't load auth.js at all —
   window.TalentFlowAuth is only used here as a secondary
   enrichment source (Google photo/display name), never a
   requirement.

   Until there's something in the bridge (or a signed-in user
   with a photo), every element here is left blank rather than
   showing placeholder content.

   Note: student-profile.html loads this same script but has its
   own separate profile bridge, so it's kept on the original,
   simpler behavior this file always had.
   ============================================================ */
(function () {
  'use strict';

  const BRIDGE_KEY = 'tf_instructor_profile';

  function readBridge() {
    try {
      const raw = localStorage.getItem(BRIDGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function apply(user) {
    const bridge = readBridge();
    const name = bridge?.fullName || user?.displayName || user?.email || '';
    const role = bridge?.role || '';
    let avatar = bridge?.avatar || user?.photoURL || '';
    if (!avatar && name && window.TalentFlowAuth?.initialsAvatar) {
      avatar = window.TalentFlowAuth.initialsAvatar(name);
    }

    const topbarImg = document.getElementById('nav-avatar-img');
    if (topbarImg && avatar) topbarImg.src = avatar;

    const footerAvatar = document.querySelector('.sb-footer-avatar');
    if (footerAvatar && avatar) footerAvatar.src = avatar;

    const footerName = document.querySelector('.sb-footer-name');
    if (footerName && name) footerName.textContent = name;

    const footerRole = document.querySelector('.sb-footer-role');
    if (footerRole && role) footerRole.textContent = role;
  }

  function initInstructorPages() {
    apply(); // works immediately from the bridge — no auth needed

    if (window.TalentFlowAuth) {
      window.TalentFlowAuth.requireAuth().then(apply);
    }

    // Live-update if the profile changes in another tab...
    window.addEventListener('storage', (e) => {
      if (e.key === BRIDGE_KEY) apply();
    });
    // ...or right here, the moment this page's own save handler fires.
    window.addEventListener('tf-profile-updated', (e) => {
      if (!e.detail || e.detail.key === BRIDGE_KEY) apply();
    });
  }

  function initStudentProfilePage() {
    // student-profile.html has its own separate profile bridge, so this
    // keeps the exact behavior nav-avatar.js always had before.
    const img = document.getElementById('nav-avatar-img');
    if (!img || !window.TalentFlowAuth) return;
    window.TalentFlowAuth.requireAuth().then((user) => {
      img.src = user.photoURL || window.TalentFlowAuth.initialsAvatar(user.displayName || user.email);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (document.body?.dataset?.profilePage === 'student') {
      initStudentProfilePage();
    } else {
      initInstructorPages();
    }
  });
})();

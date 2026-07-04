/* ============================================================
   TALENT FLOW  |  nav-avatar.js
   ------------------------------------------------------------
   Small, standalone: just fills in the topbar avatar photo once
   we know who's signed in. Kept separate from profile.js since
   both profile pages want this regardless of view/form state.
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const img = document.getElementById('nav-avatar-img');
  if (!img || !window.TalentFlowAuth) return;

  window.TalentFlowAuth.requireAuth().then((user) => {
    img.src = user.photoURL || window.TalentFlowAuth.initialsAvatar(user.displayName || user.email);
  });
});

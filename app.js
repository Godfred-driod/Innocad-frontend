// app.js — site UI helpers (hamburger menu, nav toggle)
(function(){
  'use strict';

  function initHamburger(){
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');
    if(!hamburger || !navMenu) return;

    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navMenu.classList.toggle('active');
    });

    // Close menu on link click (covers multiple nav structures)
    document.querySelectorAll('#navMenu a, .nav-center a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
      });
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initHamburger);
  } else {
    initHamburger();
  }

})();

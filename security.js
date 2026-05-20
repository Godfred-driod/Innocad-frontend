// security.js — client-side helpers: CSRF token, validation, secure submission
(function(){
  'use strict';

  // Generate a simple CSRF token (for demo only). In production, server should set this.
  function generateToken(){
    try{
      const arr = new Uint8Array(16);
      window.crypto.getRandomValues(arr);
      return Array.from(arr).map(b=>b.toString(16).padStart(2,'0')).join('');
    }catch(e){
      return Math.random().toString(36).slice(2);
    }
  }

  function setCsrfTokens(){
    const token = generateToken();
    document.querySelectorAll('input[name="csrf_token"]').forEach(i=>i.value = token);
    // store in sessionStorage for demo verification
    try{ sessionStorage.setItem('csrf_token', token); }catch(e){}
  }

  function verifyCsrf(form){
    try{
      const expected = sessionStorage.getItem('csrf_token');
      const provided = form.querySelector('input[name="csrf_token"]').value;
      return expected && provided && expected === provided;
    }catch(e){ return false; }
  }

  function preventUnsafeRedirect(url){
    try{
      const u = new URL(url, location.href);
      return u.origin === location.origin;
    }catch(e){ return false; }
  }

  function safeSubmit(form, onSuccess){
    if(!verifyCsrf(form)){
      alert('Security check failed. Please refresh the page.');
      return;
    }

    // basic client-side validation re-check
    if(!form.checkValidity()){
      form.reportValidity();
      return;
    }

    // replace default action with safe simulated behavior for static site
    const action = form.getAttribute('data-action') || form.getAttribute('action') || '#';
    if(action && action !== '#' && !preventUnsafeRedirect(action)){
      alert('Unsafe form action blocked.');
      return;
    }

    if(typeof onSuccess === 'function') onSuccess();
  }

  // Attach handlers for known forms
  function initForms(){
    const reg = document.getElementById('registrationForm');
    if(reg){
      reg.addEventListener('submit', function(e){
        e.preventDefault();
        safeSubmit(reg, function(){
          // sanitize and log safe data
          const name = reg.querySelector('#name') ? reg.querySelector('#name').value.replace(/[<>"'`]/g,'') : '';
          const email = reg.querySelector('#email') ? reg.querySelector('#email').value : '';
          console.log('Secure registration:', {name,email});
          alert('Thank you for registering!');
          // safe redirect
          window.location.href = 'Innocad - Copy.html';
        });
      });
    }

    const login = document.getElementById('loginForm');
    if(login){
      login.addEventListener('submit', function(e){
        e.preventDefault();
        safeSubmit(login, function(){
          console.log('Login attempt:', {email: login.querySelector('#login-email') ? login.querySelector('#login-email').value : ''});
          alert('Login processed.');
        });
      });
    }
  }

  // Run initialization on DOM ready
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ setCsrfTokens(); initForms(); });
  } else {
    setCsrfTokens(); initForms();
  }

})();

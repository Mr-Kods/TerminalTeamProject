document.addEventListener('DOMContentLoaded', () => {
  // ================= BACKEND ENDPOINTS =================
  const API_BASE_URL = (window.location.origin && window.location.origin !== 'null' && !window.location.origin.startsWith('file'))
    ? window.location.origin
    : 'http://127.0.0.1:5000';

  const ENDPOINTS = {
    register: `${API_BASE_URL}/register`,
    login: `${API_BASE_URL}/login`,
    logout: `${API_BASE_URL}/logout`,
    userMe: `${API_BASE_URL}/api/user/me`,
    userUpdate: `${API_BASE_URL}/api/user/update`,
    userDelete: `${API_BASE_URL}/api/user/delete`,
    recoveryRequest: `${API_BASE_URL}/api/recovery/request`,
    recoveryVerify: `${API_BASE_URL}/api/recovery/verify`,
    recoveryReset: `${API_BASE_URL}/api/recovery/reset`,
    recommend: `${API_BASE_URL}/api/recommend-profession`,
    chatFollowup: `${API_BASE_URL}/api/chat-followup`,
    chats: `${API_BASE_URL}/api/chats`,
    chatsSync: `${API_BASE_URL}/api/chats/sync`
  };

  // State
  let currentUser = null;
  let currentChatId = null;
  let currentLang = localStorage.getItem('lang') || 'ru';
  let isChatActive = false;
  let chatHistory = [];
  let recoveryEmail = '';
  let recoveryResetToken = '';

  // Screens
  const screenWelcome = document.getElementById('screen-welcome');
  const screenLogin = document.getElementById('screen-login');
  const screenRegister = document.getElementById('screen-register');
  const screenRecoveryStep1 = document.getElementById('screen-recovery-step1');
  const screenRecoveryStep2 = document.getElementById('screen-recovery-step2');
  const screenRecoveryStep3 = document.getElementById('screen-recovery-step3');
  const screenApp = document.getElementById('screen-app');

  const allScreens = [
    screenWelcome, 
    screenLogin, 
    screenRegister, 
    screenRecoveryStep1, 
    screenRecoveryStep2, 
    screenRecoveryStep3, 
    screenApp
  ];

  // Header Elements
  const headerBrandClick = document.getElementById('header-brand-click');
  const btnAccountHeader = document.getElementById('btn-account-header');
  const headerAccountLabel = document.getElementById('header-account-label');

  // Footer Elements
  const btnLangToggle = document.getElementById('btn-lang-toggle');
  const footerLangLabel = document.getElementById('footer-lang-label');
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const themeLabel = document.getElementById('theme-label');

  // Landing Buttons
  const btnToRegisterStart = document.getElementById('btn-to-register-start');
  const btnToApp = document.getElementById('btn-to-app');

  // Login Elements
  const loginForm = document.getElementById('login-form');
  const loginEmail = document.getElementById('login-email');
  const loginPassword = document.getElementById('login-password');
  const loginRemember = document.getElementById('login-remember');
  const btnLoginSubmit = document.getElementById('btn-login-submit');
  const loginErrorMsg = document.getElementById('login-error-msg');
  const btnToggleLoginPass = document.getElementById('btn-toggle-login-pass');

  // Register Elements
  const registerForm = document.getElementById('register-form');
  const regEmail = document.getElementById('reg-email');
  const regPassword = document.getElementById('reg-password');
  const regRemember = document.getElementById('reg-remember');
  const regTermsCheckbox = document.getElementById('reg-terms-checkbox');
  const btnRegisterSubmit = document.getElementById('btn-register-submit');
  const regPasswordError = document.getElementById('reg-password-error');
  const btnToggleRegPass = document.getElementById('btn-toggle-reg-pass');

  // Recovery Step 1
  const recoveryStep1Form = document.getElementById('recovery-step1-form');
  const recoveryEmailInput = document.getElementById('recovery-email-input');
  const btnSendRecoveryCode = document.getElementById('btn-send-recovery-code');
  const recoveryStep1Error = document.getElementById('recovery-step1-error');

  // Recovery Step 2 (OTP)
  const recoveryDisplayEmail = document.getElementById('recovery-display-email');
  const otpDigits = Array.from(document.querySelectorAll('.otp-cell'));
  const otpErrorMessage = document.getElementById('otp-error-message');
  const otpTimerMessage = document.getElementById('otp-timer-message');
  const resendTimerCount = document.getElementById('resend-timer-count');
  const otpResendReady = document.getElementById('otp-resend-ready');
  const btnResendCodeError = document.getElementById('btn-resend-code-error');
  const btnResendCodeReady = document.getElementById('btn-resend-code-ready');
  let resendTimerInterval = null;

  // Recovery Step 3
  const recoveryStep3Form = document.getElementById('recovery-step3-form');
  const newPasswordInput = document.getElementById('new-password-input');
  const btnSaveNewPassword = document.getElementById('btn-save-new-password');
  const newPasswordError = document.getElementById('new-password-error');
  const btnToggleNewPass = document.getElementById('btn-toggle-new-pass');

  // Workspace Actions & Inputs
  const btnNewChatTop = document.getElementById('btn-new-chat-top');
  const btnHistoryTop = document.getElementById('btn-history-top');
  const inputInterests = document.getElementById('input-interests');
  const inputConditions = document.getElementById('input-conditions');
  const resetAlert = document.getElementById('reset-alert');
  const btnResetChat = document.getElementById('btn-reset-chat');

  // Workspace Chat
  const chatMessages = document.getElementById('chat-messages');
  const startChatBar = document.getElementById('start-chat-bar');
  const btnStartChat = document.getElementById('btn-start-chat');
  const activeChatBar = document.getElementById('active-chat-bar');
  const chatUserInput = document.getElementById('chat-user-input');
  const btnSendMessage = document.getElementById('btn-send-message');

  // Saved Chats Element
  const historyChatsList = document.getElementById('history-chats-list');
  const btnClearAllChats = document.getElementById('btn-clear-all-chats');

  // Profile Drawer
  const profileDrawerOverlay = document.getElementById('profile-drawer-overlay');
  const btnCloseProfile = document.getElementById('btn-close-profile');
  const profileForm = document.getElementById('profile-form');
  const profFirstname = document.getElementById('prof-firstname');
  const profLastname = document.getElementById('prof-lastname');
  const profEmail = document.getElementById('prof-email');
  const btnSaveProfile = document.getElementById('btn-save-profile');
  const btnProfileLogout = document.getElementById('btn-profile-logout');
  const btnProfileDeleteOpen = document.getElementById('btn-profile-delete-open');
  const profileFormError = document.getElementById('profile-form-error');

  // Confirm Modal Elements
  const modalDeleteConfirm = document.getElementById('modal-delete-confirm');
  const confirmModalTitleText = document.getElementById('confirm-modal-title-text');
  const btnConfirmDeleteYes = document.getElementById('btn-confirm-delete-yes');
  const btnConfirmDeleteCancel = document.getElementById('btn-confirm-delete-cancel');

  // Terms Modal Elements
  const btnOpenTerms = document.getElementById('btn-open-terms');
  const modalTerms = document.getElementById('modal-terms');
  const btnCloseTerms = document.getElementById('btn-close-terms');
  const btnAcceptTerms = document.getElementById('btn-accept-terms');

  // Team / Info Modal Elements
  const footerTeamBtn = document.getElementById('footer-team-btn');
  const modalTeamOverlay = document.getElementById('modal-team-overlay');

  // Navigation Links
  const btnsGotoLogin = document.querySelectorAll('.btn-goto-login');
  const btnsGotoRegister = document.querySelectorAll('.btn-goto-register');
  const btnsGotoRecovery = document.querySelectorAll('.btn-goto-recovery');
  const btnsGotoRecovery1 = document.querySelectorAll('.btn-goto-recovery1');
  const btnsGotoWelcome = document.querySelectorAll('.btn-goto-welcome');

  // ================= UTILS: XSS SANITIZATION =================
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function sanitizeUrl(url) {
    if (!url) return '';
    const trimmed = String(url).trim();
    if (/^https?:\/\//i.test(trimmed)) {
      return encodeURI(trimmed);
    }
    if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(trimmed)) {
      return 'https://' + encodeURI(trimmed);
    }
    return '#';
  }

  function formatMarkdown(text) {
    if (!text) return '';
    const escaped = escapeHtml(text);

    // Bolding **text** and __text__
    let processed = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    processed = processed.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // URLs to links
    processed = processed.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="study-link">$1</a>');

    const lines = processed.split('\n');
    let output = '';
    let inList = false;
    let inCard = false;

    function closeList() {
      if (inList) {
        output += '</ul>';
        inList = false;
      }
    }

    function closeCard() {
      closeList();
      if (inCard) {
        output += '</div></div>';
        inCard = false;
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        closeList();
        continue;
      }

      // 1. Проверяем блок "Плюсы" (включая "2. Плюсы профессии:", "### Плюсы", "👍 Плюсы")
      const prosMatch = line.match(/^(?:#{1,4}\s*)?(?:\d+[\.\)]\s*)?(?:[✅👍+]\s*)?плюсы(?:\s*работы|\s*профессии|\s*специальности|\s*направления)?(?:\s*:)?/i);
      if (prosMatch) {
        closeCard();
        inCard = 'pros';
        output += '<div class="chat-block-card pros"><div class="chat-block-header"><span class="chat-block-icon">👍</span><span class="chat-block-title">Плюсы</span></div><div class="chat-block-body">';
        continue;
      }

      // 2. Проверяем блок "Минусы" (включая "3. Минусы:", "### Минусы", "👎 Минусы")
      const consMatch = line.match(/^(?:#{1,4}\s*)?(?:\d+[\.\)]\s*)?(?:[❌👎⚠️-]\s*)?минусы(?:\s*работы|\s*профессии|\s*специальности|\s*направления)?(?:\s*:)?/i);
      if (consMatch) {
        closeCard();
        inCard = 'cons';
        output += '<div class="chat-block-card cons"><div class="chat-block-header"><span class="chat-block-icon">👎</span><span class="chat-block-title">Минусы</span></div><div class="chat-block-body">';
        continue;
      }

      // 3. Проверяем заголовок секции: "### 1. Заголовок" / "### Заголовок"
      const sectionMatch = line.match(/^(?:#{1,4}\s*)(.+)$/);
      if (sectionMatch) {
        closeCard();
        const headerText = sectionMatch[1].trim().replace(/^[#\s]+/, '');
        inCard = 'section';
        output += `<div class="chat-section-block"><div class="chat-section-header"><span class="chat-section-icon">📌</span><h4 class="chat-section-title">${headerText}</h4></div><div class="chat-section-body">`;
        continue;
      }

      // 4. Элементы списков
      const bulletMatch = line.match(/^[-*•]\s+(.*)$/);
      const numMatch = line.match(/^(\d+)\.\s+(.*)$/);

      if (bulletMatch || numMatch) {
        if (!inList) {
          output += '<ul class="chat-markdown-list">';
          inList = true;
        }
        const itemContent = bulletMatch ? bulletMatch[1] : `<strong>${numMatch[1]}.</strong> ${numMatch[2]}`;
        output += `<li>${itemContent}</li>`;
        continue;
      }

      closeList();

      // 5. Финальный дружелюбный вопрос-призыв ("Хочешь узнать...?", "Хотите уточнить...?")
      const isLastPart = (i >= lines.length - 3);
      if (isLastPart && line.endsWith('?') && (line.includes('Хочешь') || line.includes('хотите') || line.includes('узнать') || line.includes('подсказать') || line.includes('рассказать') || line.includes('вопрос'))) {
        closeCard();
        output += `<div class="chat-question-card"><span class="question-icon">💬</span><p class="question-text">${line}</p></div>`;
        continue;
      }

      output += `<p class="chat-paragraph">${line}</p>`;
    }

    closeCard();
    return output;
  }

  // ================= 1. SCREEN SWITCHER =================
  function showScreen(targetScreen) {
    allScreens.forEach(s => s && s.classList.remove('active'));
    targetScreen.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'instant' });

    if (targetScreen === screenWelcome) {
      document.body.classList.add('welcome-active');
    } else {
      document.body.classList.remove('welcome-active');
    }
  }

  showScreen(screenWelcome);

  // ================= 2. USER AUTH STATE =================
  async function checkAuthSession() {
    try {
      const res = await fetch(ENDPOINTS.userMe, { credentials: 'include' });
      if (!res.ok) {
        currentUser = null;
        updateHeaderUserBadge(null);
        return;
      }
      const data = await res.json();
      if (data.authenticated && data.user) {
        currentUser = data.user;
        updateHeaderUserBadge(currentUser.username);
      } else {
        currentUser = null;
        updateHeaderUserBadge(null);
      }
    } catch (e) {
      currentUser = null;
      updateHeaderUserBadge(null);
    }
  }

  function updateHeaderUserBadge(username) {
    if (username) {
      headerAccountLabel.textContent = username;
    } else {
      headerAccountLabel.textContent = 'войти';
    }
  }

  checkAuthSession();

  headerBrandClick.addEventListener('click', () => showScreen(screenWelcome));

  btnAccountHeader.addEventListener('click', () => {
    if (currentUser) {
      openProfileDrawer();
    } else {
      showScreen(screenLogin);
    }
  });

  // ================= 3. PROFILE MODAL =================
  function openProfileDrawer() {
    if (!currentUser) return;
    if (profileFormError) profileFormError.classList.add('hidden');
    profFirstname.value = currentUser.first_name || '';
    profLastname.value = currentUser.last_name || '';
    profEmail.value = currentUser.email || '';
    btnSaveProfile.style.display = 'none';
    profileDrawerOverlay.classList.remove('hidden');
    loadAndRenderChats();
  }

  function closeProfileDrawer() {
    profileDrawerOverlay.classList.add('hidden');
  }

  btnCloseProfile.addEventListener('click', closeProfileDrawer);

  if (profileDrawerOverlay) {
    profileDrawerOverlay.addEventListener('click', (e) => {
      if (e.target === profileDrawerOverlay) {
        closeProfileDrawer();
      }
    });
  }

  [profFirstname, profLastname, profEmail].forEach(input => {
    input.addEventListener('input', () => {
      btnSaveProfile.style.display = 'block';
      if (profileFormError) profileFormError.classList.add('hidden');
    });
  });

  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (profileFormError) profileFormError.classList.add('hidden');
    try {
      const res = await fetch(ENDPOINTS.userUpdate, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          first_name: profFirstname.value.trim(),
          last_name: profLastname.value.trim(),
          email: profEmail.value.trim().toLowerCase()
        })
      });
      const data = await res.json();
      if (res.ok) {
        currentUser = data.user;
        updateHeaderUserBadge(currentUser.username);
        btnSaveProfile.style.display = 'none';
      } else {
        if (profileFormError) {
          profileFormError.textContent = data.error || 'Ошибка при обновлении профиля';
          profileFormError.classList.remove('hidden');
        }
      }
    } catch (err) {
      if (profileFormError) {
        profileFormError.textContent = 'Ошибка соединения с сервером';
        profileFormError.classList.remove('hidden');
      }
    }
  });

  btnProfileLogout.addEventListener('click', async () => {
    try {
      await fetch(ENDPOINTS.logout, { method: 'POST', credentials: 'include' });
    } catch (e) {}
    currentUser = null;
    updateHeaderUserBadge(null);
    closeProfileDrawer();
    showScreen(screenWelcome);
  });

  // ================= CONFIRMATION MODALS =================
  let confirmModalAction = null;
  let pendingTargetChatId = null;
  let pendingTargetChatTitle = '';

  function openConfirmModal(action, data = {}) {
    confirmModalAction = action;
    pendingTargetChatId = data.chatId || null;
    pendingTargetChatTitle = data.chatTitle || '';

    if (confirmModalTitleText) {
      if (action === 'delete_account') {
        confirmModalTitleText.innerHTML = currentLang === 'en' 
          ? 'Are you sure you want to<br>delete your account?' 
          : 'Вы уверены, что<br>хотите удалить<br>аккаунт?';
      } else if (action === 'delete_chat') {
        confirmModalTitleText.innerHTML = currentLang === 'en'
          ? `Delete chat<br>“${escapeHtml(pendingTargetChatTitle)}”?`
          : `Удалить чат<br>“${escapeHtml(pendingTargetChatTitle)}”?`;
      } else if (action === 'delete_all_chats') {
        confirmModalTitleText.innerHTML = currentLang === 'en'
          ? 'Delete all<br>saved chats?'
          : 'Удалить все<br>сохранённые чаты?';
      }
    }
    if (modalDeleteConfirm) modalDeleteConfirm.classList.remove('hidden');
  }

  function closeConfirmModal() {
    if (modalDeleteConfirm) modalDeleteConfirm.classList.add('hidden');
    confirmModalAction = null;
    pendingTargetChatId = null;
    pendingTargetChatTitle = '';
  }

  btnProfileDeleteOpen && btnProfileDeleteOpen.addEventListener('click', () => {
    openConfirmModal('delete_account');
  });

  btnConfirmDeleteCancel && btnConfirmDeleteCancel.addEventListener('click', closeConfirmModal);

  if (modalDeleteConfirm) {
    modalDeleteConfirm.addEventListener('click', (e) => {
      if (e.target === modalDeleteConfirm) closeConfirmModal();
    });
  }

  btnConfirmDeleteYes && btnConfirmDeleteYes.addEventListener('click', async () => {
    const action = confirmModalAction;
    const targetChatId = pendingTargetChatId;
    closeConfirmModal();

    if (action === 'delete_account') {
      try {
        const res = await fetch(ENDPOINTS.userDelete, {
          method: 'DELETE',
          credentials: 'include'
        });
        if (res.ok) {
          currentUser = null;
          updateHeaderUserBadge(null);
          closeProfileDrawer();
          showScreen(screenWelcome);
        } else {
          if (profileFormError) {
            profileFormError.textContent = 'Не удалось удалить аккаунт';
            profileFormError.classList.remove('hidden');
          }
        }
      } catch (e) {
        if (profileFormError) {
          profileFormError.textContent = 'Ошибка соединения с сервером';
          profileFormError.classList.remove('hidden');
        }
      }
    } else if (action === 'delete_chat') {
      if (targetChatId) {
        await executeDeleteChat(targetChatId);
      }
    } else if (action === 'delete_all_chats') {
      await executeClearAllChats();
    }
  });

  // ================= 4. NAVIGATION HANDLERS =================
  btnToRegisterStart && btnToRegisterStart.addEventListener('click', () => showScreen(screenRegister));
  btnToApp && btnToApp.addEventListener('click', () => showScreen(screenApp));
  btnsGotoLogin.forEach(b => b.addEventListener('click', () => {
    loginErrorMsg && loginErrorMsg.classList.add('hidden');
    showScreen(screenLogin);
  }));
  btnsGotoRegister.forEach(b => b.addEventListener('click', () => {
    regPasswordError && regPasswordError.classList.add('hidden');
    showScreen(screenRegister);
  }));
  btnsGotoWelcome.forEach(b => b.addEventListener('click', () => showScreen(screenWelcome)));
  btnsGotoRecovery.forEach(b => b.addEventListener('click', () => {
    if (recoveryStep1Error) recoveryStep1Error.classList.add('hidden');
    showScreen(screenRecoveryStep1);
  }));
  btnsGotoRecovery1.forEach(b => b.addEventListener('click', () => {
    if (recoveryStep1Error) recoveryStep1Error.classList.add('hidden');
    showScreen(screenRecoveryStep1);
  }));

  // Terms Modal Handlers
  if (btnOpenTerms && modalTerms) {
    btnOpenTerms.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      modalTerms.classList.remove('hidden');
    });
  }

  if (btnCloseTerms && modalTerms) {
    btnCloseTerms.addEventListener('click', () => {
      modalTerms.classList.add('hidden');
    });
  }

  if (btnAcceptTerms && modalTerms) {
    btnAcceptTerms.addEventListener('click', () => {
      if (regTermsCheckbox) {
        regTermsCheckbox.checked = true;
        updateRegState();
      }
      modalTerms.classList.add('hidden');
    });
  }

  if (modalTerms) {
    modalTerms.addEventListener('click', (e) => {
      if (e.target === modalTerms) {
        modalTerms.classList.add('hidden');
      }
    });
  }

  // Info / Team Modal Handlers
  if (footerTeamBtn && modalTeamOverlay) {
    footerTeamBtn.addEventListener('click', (e) => {
      if (e && e.stopPropagation) e.stopPropagation();
      modalTeamOverlay.classList.remove('hidden');
    });
  }

  if (modalTeamOverlay) {
    modalTeamOverlay.addEventListener('click', (e) => {
      if (e && e.target === modalTeamOverlay) {
        modalTeamOverlay.classList.add('hidden');
      }
    });
  }

  // ================= 5. LOGIN & REGISTER =================
  function updateLoginState() {
    const isReady = loginEmail.value.trim().length > 0 && loginPassword.value.trim().length > 0;
    btnLoginSubmit.disabled = !isReady;
    btnLoginSubmit.classList.toggle('active-black', isReady);
    btnLoginSubmit.classList.toggle('disabled', !isReady);
  }

  loginEmail && loginEmail.addEventListener('input', () => {
    loginErrorMsg.classList.add('hidden');
    updateLoginState();
  });
  loginPassword && loginPassword.addEventListener('input', () => {
    loginErrorMsg.classList.add('hidden');
    updateLoginState();
  });

  btnToggleLoginPass && btnToggleLoginPass.addEventListener('click', () => {
    loginPassword.type = loginPassword.type === 'password' ? 'text' : 'password';
  });

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      loginErrorMsg.classList.add('hidden');
      try {
        const res = await fetch(ENDPOINTS.login, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            email: loginEmail.value.trim().toLowerCase(),
            password: loginPassword.value.trim(),
            remember: loginRemember.checked
          })
        });
        const data = await res.json();
        if (res.ok) {
          currentUser = data.user;
          updateHeaderUserBadge(currentUser.username);
          try { await syncGuestChatsToServer(); } catch (e) {}
          showScreen(screenApp);
        } else {
          loginErrorMsg.textContent = data.error || 'Неверный email или пароль';
          loginErrorMsg.classList.remove('hidden');
        }
      } catch (err) {
        loginErrorMsg.textContent = 'Ошибка подключения к серверу';
        loginErrorMsg.classList.remove('hidden');
      }
    });
  }

  function updateRegState() {
    const isReady = regEmail.value.trim().length > 0 && 
                    regPassword.value.trim().length >= 6 && 
                    regTermsCheckbox.checked;
    btnRegisterSubmit.disabled = !isReady;
    btnRegisterSubmit.classList.toggle('active-black', isReady);
    btnRegisterSubmit.classList.toggle('disabled', !isReady);
  }

  regEmail && regEmail.addEventListener('input', () => {
    regPasswordError.classList.add('hidden');
    updateRegState();
  });
  regPassword && regPassword.addEventListener('input', () => {
    regPasswordError.classList.add('hidden');
    if (regPassword.value.trim().length > 0 && regPassword.value.trim().length < 6) {
      regPasswordError.textContent = 'Пароль должен быть не менее 6 символов';
      regPasswordError.classList.remove('hidden');
    }
    updateRegState();
  });
  regTermsCheckbox && regTermsCheckbox.addEventListener('change', updateRegState);

  btnToggleRegPass && btnToggleRegPass.addEventListener('click', () => {
    regPassword.type = regPassword.type === 'password' ? 'text' : 'password';
  });

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      regPasswordError.classList.add('hidden');
      try {
        const res = await fetch(ENDPOINTS.register, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            email: regEmail.value.trim().toLowerCase(),
            password: regPassword.value.trim()
          })
        });
        const data = await res.json();
        if (res.ok) {
          currentUser = data.user;
          updateHeaderUserBadge(currentUser.username);
          try { await syncGuestChatsToServer(); } catch (e) {}
          showScreen(screenApp);
        } else {
          regPasswordError.textContent = data.error || 'Ошибка при создании аккаунта';
          regPasswordError.classList.remove('hidden');
        }
      } catch (err) {
        regPasswordError.textContent = 'Ошибка подключения к серверу';
        regPasswordError.classList.remove('hidden');
      }
    });
  }

  // ================= 6. RECOVERY FLOW (OTP) =================
  recoveryEmailInput && recoveryEmailInput.addEventListener('input', () => {
    const ready = recoveryEmailInput.value.includes('@') && recoveryEmailInput.value.includes('.');
    btnSendRecoveryCode.disabled = !ready;
    btnSendRecoveryCode.classList.toggle('active-black', ready);
    btnSendRecoveryCode.classList.toggle('disabled', !ready);
    if (recoveryStep1Error) recoveryStep1Error.classList.add('hidden');
  });

  recoveryStep1Form && recoveryStep1Form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (recoveryStep1Error) recoveryStep1Error.classList.add('hidden');
    recoveryEmail = recoveryEmailInput.value.trim().toLowerCase();

    btnSendRecoveryCode.disabled = true;
    btnSendRecoveryCode.textContent = 'отправка...';

    try {
      const res = await fetch(ENDPOINTS.recoveryRequest, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail })
      });
      const data = await res.json();
      btnSendRecoveryCode.disabled = false;
      btnSendRecoveryCode.textContent = 'отправить код';

      if (res.ok) {
        recoveryDisplayEmail.textContent = recoveryEmail;
        showScreen(screenRecoveryStep2);
        initOtpTimer();
      } else {
        if (recoveryStep1Error) {
          recoveryStep1Error.textContent = data.error || 'Пользователь не найден';
          recoveryStep1Error.classList.remove('hidden');
        }
      }
    } catch (err) {
      btnSendRecoveryCode.disabled = false;
      btnSendRecoveryCode.textContent = 'отправить код';
      if (recoveryStep1Error) {
        recoveryStep1Error.textContent = 'Ошибка соединения с сервером';
        recoveryStep1Error.classList.remove('hidden');
      }
    }
  });

  async function requestResendCode() {
    if (!recoveryEmail) return;
    try {
      await fetch(ENDPOINTS.recoveryRequest, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail })
      });
    } catch (e) {}
    initOtpTimer();
  }

  function initOtpTimer() {
    otpDigits.forEach(d => { d.value = ''; d.className = 'otp-cell'; });
    otpErrorMessage.classList.add('hidden');
    otpTimerMessage.classList.remove('hidden');
    otpResendReady.classList.add('hidden');
    clearInterval(resendTimerInterval);

    let sec = 58;
    resendTimerCount.textContent = '00:58';
    resendTimerInterval = setInterval(() => {
      sec--;
      resendTimerCount.textContent = `00:${sec < 10 ? '0' + sec : sec}`;
      if (sec <= 0) {
        clearInterval(resendTimerInterval);
        otpTimerMessage.classList.add('hidden');
        otpResendReady.classList.remove('hidden');
      }
    }, 1000);
    setTimeout(() => otpDigits[0]?.focus(), 100);
  }

  otpDigits.forEach((box, i) => {
    box.addEventListener('input', async (e) => {
      box.classList.remove('error-state', 'success-state');
      if (e.target.value.length >= 1) {
        box.value = e.target.value.slice(-1);
        if (i < 5) otpDigits[i + 1].focus();
      }
      const code = otpDigits.map(d => d.value).join('');
      if (code.length === 6) {
        otpErrorMessage.classList.add('hidden');
        try {
          const res = await fetch(ENDPOINTS.recoveryVerify, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: recoveryEmail, code: code })
          });
          const data = await res.json();
          if (res.ok) {
            recoveryResetToken = data.reset_token;
            otpDigits.forEach(d => d.classList.add('success-state'));
            setTimeout(() => showScreen(screenRecoveryStep3), 400);
          } else {
            otpDigits.forEach(d => d.classList.add('error-state'));
            otpErrorMessage.classList.remove('hidden');
          }
        } catch (err) {
          otpDigits.forEach(d => d.classList.add('error-state'));
          otpErrorMessage.classList.remove('hidden');
        }
      }
    });

    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && i > 0) {
        otpDigits[i - 1].focus();
      }
    });
  });

  btnResendCodeError && btnResendCodeError.addEventListener('click', requestResendCode);
  btnResendCodeReady && btnResendCodeReady.addEventListener('click', requestResendCode);

  newPasswordInput && newPasswordInput.addEventListener('input', () => {
    const ready = newPasswordInput.value.length >= 6;
    btnSaveNewPassword.disabled = !ready;
    btnSaveNewPassword.classList.toggle('active-black', ready);
    btnSaveNewPassword.classList.toggle('disabled', !ready);
    newPasswordError && newPasswordError.classList.add('hidden');
  });

  btnToggleNewPass && btnToggleNewPass.addEventListener('click', () => {
    newPasswordInput.type = newPasswordInput.type === 'password' ? 'text' : 'password';
  });

  recoveryStep3Form && recoveryStep3Form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (newPasswordError) newPasswordError.classList.add('hidden');
    const newPass = newPasswordInput.value.trim();
    if (newPass.length < 6) {
      if (newPasswordError) {
        newPasswordError.textContent = 'Пароль должен быть не менее 6 символов';
        newPasswordError.classList.remove('hidden');
      }
      return;
    }

    try {
      const res = await fetch(ENDPOINTS.recoveryReset, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: recoveryEmail,
          reset_token: recoveryResetToken,
          new_password: newPass
        })
      });
      const data = await res.json();
      if (res.ok) {
        currentUser = data.user;
        updateHeaderUserBadge(currentUser.username);
        showScreen(screenApp);
      } else {
        if (newPasswordError) {
          newPasswordError.textContent = data.error || 'Ошибка сброса пароля';
          newPasswordError.classList.remove('hidden');
        }
      }
    } catch (err) {
      if (newPasswordError) {
        newPasswordError.textContent = 'Ошибка подключения к серверу';
        newPasswordError.classList.remove('hidden');
      }
    }
  });

  // ================= 7. APP CHAT & AI RESPONSE RENDERING =================
  function handleWorkspaceInput() {
    const hasInterests = inputInterests.value.trim().length > 0;
    const hasConditions = inputConditions.value.trim().length > 0;
    const isReady = hasInterests || hasConditions;

    if (!isChatActive) {
      btnStartChat.disabled = !isReady;
      btnStartChat.classList.toggle('active-red', isReady);
      btnStartChat.classList.toggle('disabled', !isReady);
    }
  }

  inputInterests.addEventListener('input', handleWorkspaceInput);
  inputConditions.addEventListener('input', handleWorkspaceInput);

  function renderFigmaAiResponse(data) {
    let html = '';
    
    if (data.intro_summary) {
      html += `<div class="ai-intro-summary">${escapeHtml(data.intro_summary)}</div>`;
    }

    if (data.professions && Array.isArray(data.professions)) {
      html += `<div class="profession-cards-list">`;
      
      data.professions.forEach((p, idx) => {
        const siteUrl = sanitizeUrl(p.website);
        const displaySite = escapeHtml(p.website || '');

        html += `
          <div class="profession-card">
            <!-- ВЕРХ КАРТОЧКИ: НАЗВАНИЕ И ЗЕЛЕНАЯ ПЛАШКА ЗАРПЛАТЫ -->
            <div class="profession-card-header">
              <div class="profession-card-title">${idx + 1}. ${escapeHtml(p.title)}</div>
              ${p.salary ? `<div class="profession-salary-badge">${escapeHtml(p.salary)}</div>` : ''}
            </div>

            <!-- КРАТКОЕ ОПИСАНИЕ -->
            <div class="profession-description">${escapeHtml(p.short_description)}</div>

            <!-- ПОЧЕМУ НУЖНА В РЕГИОНЕ -->
            ${p.viability_reason ? `
              <div class="profession-viability">
                <strong>Перспектива в регионе:</strong> ${escapeHtml(p.viability_reason)}
              </div>
            ` : ''}

            <!-- ПЛАШКА УЧЕБНОГО ЗАВЕДЕНИЯ -->
            <div class="study-box">
              <div class="study-institution-row">
                <span class="study-icon">🏛</span>
                <span>${escapeHtml(p.institution)}</span>
              </div>

              <div class="study-chips-grid">
                ${p.duration ? `<span class="study-chip">⏱ ${escapeHtml(p.duration)}</span>` : ''}
                ${p.budget_places ? `<span class="study-chip budget">🎓 Бюджет: ${escapeHtml(p.budget_places)}</span>` : ''}
                ${p.tuition_cost ? `<span class="study-chip tuition">💰 ${escapeHtml(p.tuition_cost)}</span>` : ''}
              </div>

              <div class="study-contacts-list">
                ${p.address ? `<div class="study-contact-item">📍 ${escapeHtml(p.address)}</div>` : ''}
                ${p.phone ? `<div class="study-contact-item">📞 ${escapeHtml(p.phone)}</div>` : ''}
                ${displaySite ? `<div class="study-contact-item">🌐 <a href="${siteUrl}" target="_blank" rel="noopener noreferrer" class="study-link">${displaySite}</a></div>` : ''}
              </div>
            </div>
          </div>
        `;
      });

      html += `</div>`;
    }

    return html;
  }

  btnStartChat.addEventListener('click', async () => {
    if (btnStartChat.disabled) return;
    const interests = inputInterests.value.trim();
    const conditions = inputConditions.value.trim();
    if (!interests) return;

    isChatActive = true;
    startChatBar.classList.add('hidden');
    activeChatBar.classList.remove('hidden');

    chatHistory = [
      { role: 'user', content: `Интересы пользователя: ${interests}\nУсловия: ${conditions}` }
    ];

    chatMessages.innerHTML = `
      <div class="chat-bubble-ai loading">
        <p>Анализирую профессии и учебные заведения Калининградской области...</p>
      </div>
    `;

    try {
      const res = await fetch(ENDPOINTS.recommend, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ interests, conditions, chat_id: currentChatId, lang: currentLang })
      });
      const data = await res.json();
      if (res.ok) {
        currentChatId = data.chat_id || currentChatId;
        chatHistory.push({ role: 'assistant', content: JSON.stringify(data) });
        chatMessages.innerHTML = `<div class="chat-bubble-ai">${renderFigmaAiResponse(data)}</div>`;

        // Сохраняем локально для гостей
        if (!currentUser) {
          const guestChatId = currentChatId || Date.now();
          currentChatId = guestChatId;
          saveGuestChat({
            id: guestChatId,
            title: interests.slice(0, 45) + (interests.length > 45 ? '...' : '') || (currentLang === 'en' ? 'Career Search' : 'Подбор профессий'),
            interests: interests,
            conditions: conditions,
            messages: [
              { role: 'user', content: `Интересы: ${interests}\nУсловия: ${conditions}`.trim() },
              { role: 'assistant', type: 'recommendations', data: data }
            ],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      } else {
        chatMessages.innerHTML = `<div class="chat-bubble-ai error"><p>${escapeHtml(data.error || 'Ошибка получения рекомендаций')}</p></div>`;
      }
    } catch (err) {
      chatMessages.innerHTML = `<div class="chat-bubble-ai error"><p>Ошибка соединения с сервером Flask.</p></div>`;
    }
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });

  async function sendFollowup() {
    const text = chatUserInput.value.trim();
    if (!text) return;

    chatHistory.push({ role: 'user', content: text });

    const userBubble = document.createElement('div');
    userBubble.className = 'chat-bubble-user';
    userBubble.textContent = text;
    chatMessages.appendChild(userBubble);
    chatUserInput.value = '';
    chatMessages.scrollTop = chatMessages.scrollHeight;

    const aiBubble = document.createElement('div');
    aiBubble.className = 'chat-bubble-ai loading';
    aiBubble.textContent = currentLang === 'en' ? 'AI is typing...' : 'ИИ отвечает...';
    chatMessages.appendChild(aiBubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
      const res = await fetch(ENDPOINTS.chatFollowup, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messages: chatHistory, chat_id: currentChatId, lang: currentLang })
      });
      const data = await res.json();
      aiBubble.classList.remove('loading');

      if (data.chat_id) {
        currentChatId = data.chat_id;
      }

      if (data.professions && data.professions.length > 0) {
        aiBubble.innerHTML = renderFigmaAiResponse(data);
        chatHistory.push({ role: 'assistant', content: JSON.stringify(data) });
      } else if (data.reply) {
        aiBubble.innerHTML = formatMarkdown(data.reply);
        chatHistory.push({ role: 'assistant', content: data.reply });
      } else {
        aiBubble.textContent = 'Информация по вашему запросу обновлена.';
      }

      // Сохраняем локально для гостей
      if (!currentUser && currentChatId) {
        const localChats = getGuestChats();
        const chatObj = localChats.find(c => String(c.id) === String(currentChatId));
        if (chatObj) {
          chatObj.messages.push({ role: 'user', content: text });
          if (data.professions && data.professions.length > 0) {
            chatObj.messages.push({ role: 'assistant', type: 'recommendations', data: data });
          } else {
            chatObj.messages.push({ role: 'assistant', type: 'text', reply: data.reply || '' });
          }
          chatObj.updated_at = new Date().toISOString();
          saveGuestChat(chatObj);
        }
      }
    } catch (e) {
      aiBubble.className = 'chat-bubble-ai error';
      aiBubble.textContent = 'Для уточнения деталей свяжитесь с приемной комиссией учебного заведения.';
    }
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  btnSendMessage.addEventListener('click', sendFollowup);
  chatUserInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendFollowup();
  });

  btnResetChat.addEventListener('click', () => {
    startNewChat();
  });

  // ================= 7. CHAT HISTORY & AUTO-SAVING =================
  const LOCAL_STORAGE_CHATS_KEY = 'guest_chats_v1';

  function getGuestChats() {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_CHATS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  function saveGuestChat(chatObj) {
    try {
      let chats = getGuestChats();
      const existingIdx = chats.findIndex(c => String(c.id) === String(chatObj.id));
      if (existingIdx >= 0) {
        chats[existingIdx] = chatObj;
      } else {
        chats.unshift(chatObj);
      }
      localStorage.setItem(LOCAL_STORAGE_CHATS_KEY, JSON.stringify(chats));
    } catch (e) {}
  }

  function deleteGuestChat(chatId) {
    try {
      let chats = getGuestChats();
      chats = chats.filter(c => String(c.id) !== String(chatId));
      localStorage.setItem(LOCAL_STORAGE_CHATS_KEY, JSON.stringify(chats));
    } catch (e) {}
  }

  function clearGuestChats() {
    try {
      localStorage.removeItem(LOCAL_STORAGE_CHATS_KEY);
    } catch (e) {}
  }

  async function syncGuestChatsToServer() {
    const localChats = getGuestChats();
    if (!localChats || localChats.length === 0) return;
    try {
      const res = await fetch(ENDPOINTS.chatsSync, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ chats: localChats })
      });
      if (res.ok) {
        clearGuestChats();
      }
    } catch (e) {}
  }

  function formatSavedChatDate(isoString) {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      const monthsRu = ['янв.', 'февр.', 'марта', 'апр.', 'мая', 'июня', 'июля', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'];
      const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = date.getDate();
      const month = (currentLang === 'en' ? monthsEn : monthsRu)[date.getMonth()];
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const mins = String(date.getMinutes()).padStart(2, '0');
      return `${day} ${month} ${year}, ${hours}:${mins}`;
    } catch (e) {
      return '';
    }
  }

  function getMsgCountText(count) {
    if (currentLang === 'en') {
      return count === 1 ? '1 message' : `${count} messages`;
    }
    const lastDigit = count % 10;
    const lastTwo = count % 100;
    if (lastTwo >= 11 && lastTwo <= 19) return `${count} сообщений`;
    if (lastDigit === 1) return `${count} сообщение`;
    if (lastDigit >= 2 && lastDigit <= 4) return `${count} сообщения`;
    return `${count} сообщений`;
  }

  async function loadAndRenderChats() {
    if (!historyChatsList) return;
    historyChatsList.innerHTML = `<div class="saved-chats-empty-box"><p class="empty-description">${currentLang === 'en' ? 'Loading chats...' : 'Загрузка диалогов...'}</p></div>`;
    
    if (currentUser) {
      try {
        const res = await fetch(ENDPOINTS.chats, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          renderChatsList(data.chats || []);
        } else {
          renderChatsList([]);
        }
      } catch (e) {
        historyChatsList.innerHTML = `<div class="saved-chats-empty-box"><p class="empty-description" style="color:#ef4444;">${currentLang === 'en' ? 'Failed to load saved chats.' : 'Ошибка загрузки диалогов.'}</p></div>`;
      }
    } else {
      const localChats = getGuestChats();
      renderChatsList(localChats);
    }
  }

  let editingChatId = null;

  function renderChatsList(chats) {
    if (!historyChatsList) return;
    if (!chats || chats.length === 0) {
      if (btnClearAllChats) btnClearAllChats.classList.add('hidden');
      historyChatsList.innerHTML = `
        <div class="saved-chats-empty-box">
          <h4 class="empty-heading">${currentLang === 'en' ? 'No saved chats yet.' : 'Нет сохранённых переписок.'}</h4>
          <p class="empty-description">${currentLang === 'en' ? 'Start chatting with AI, your conversation history will automatically appear here. You can open, edit, or clear it at any time.' : 'Начните общение с ботом, история чата автоматически отобразится здесь, её всегда можно открыть, редактировать, либо очистить'}</p>
        </div>
      `;
      return;
    }

    if (btnClearAllChats) btnClearAllChats.classList.remove('hidden');

    // Сортировка по возрастанию даты: сверху старые, снизу новее
    const sortedChats = [...chats].sort((a, b) => {
      const tA = new Date(a.created_at || a.updated_at || 0).getTime();
      const tB = new Date(b.created_at || b.updated_at || 0).getTime();
      return tA - tB;
    });

    historyChatsList.innerHTML = '';
    sortedChats.forEach(chat => {
      const item = document.createElement('div');
      item.className = 'saved-chat-card-item';
      if (currentChatId && String(currentChatId) === String(chat.id)) {
        item.classList.add('active-chat');
      }

      const titleText = chat.title || chat.interests || (currentLang === 'en' ? 'Career Dialogue' : 'Диалог с ИИ');
      const dateText = formatSavedChatDate(chat.updated_at || chat.created_at);
      const msgCount = chat.message_count || (chat.messages ? chat.messages.length : 1);
      const msgCountLabel = getMsgCountText(msgCount);
      const isEditing = String(editingChatId) === String(chat.id);

      if (isEditing) {
        item.innerHTML = `
          <div class="saved-chat-row-top">
            <div class="chat-rename-box">
              <input type="text" class="chat-rename-input" value="${escapeHtml(titleText)}" maxlength="80" />
              <button type="button" class="btn-save-inline-rename" title="${currentLang === 'en' ? 'Save' : 'Сохранить'}">
                <svg class="rename-check-svg" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </button>
            </div>
            <button type="button" class="btn-delete-saved-chat" data-chat-id="${chat.id}" title="${currentLang === 'en' ? 'Delete' : 'Удалить'}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
          <div class="saved-chat-row-bottom">
            <span class="saved-chat-msg-count">${msgCountLabel}</span>
            <span class="saved-chat-date-text">${escapeHtml(dateText)}</span>
          </div>
        `;

        const inputEl = item.querySelector('.chat-rename-input');
        const btnSave = item.querySelector('.btn-save-inline-rename');

        setTimeout(() => {
          if (inputEl) {
            inputEl.focus();
            inputEl.select();
          }
        }, 30);

        const doSave = async () => {
          const newTitle = inputEl ? inputEl.value.trim() : '';
          if (newTitle && newTitle !== titleText) {
            await saveChatTitle(chat.id, newTitle);
          }
          editingChatId = null;
          renderChatsList(chats);
        };

        btnSave && btnSave.addEventListener('click', (e) => {
          e.stopPropagation();
          doSave();
        });

        inputEl && inputEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            doSave();
          } else if (e.key === 'Escape') {
            editingChatId = null;
            renderChatsList(chats);
          }
        });

        inputEl && inputEl.addEventListener('click', (e) => e.stopPropagation());

        const btnDel = item.querySelector('.btn-delete-saved-chat');
        btnDel && btnDel.addEventListener('click', (e) => {
          e.stopPropagation();
          openConfirmModal('delete_chat', { chatId: chat.id, chatTitle: titleText });
        });

      } else {
        item.innerHTML = `
          <div class="saved-chat-row-top">
            <div class="saved-chat-title-wrap">
              <span class="saved-chat-title-text" title="${escapeHtml(titleText)}">${escapeHtml(titleText)}</span>
              <button type="button" class="btn-rename-chat" data-chat-id="${chat.id}" title="${currentLang === 'en' ? 'Edit title' : 'Редактировать название'}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
              </button>
            </div>
            <button type="button" class="btn-delete-saved-chat" data-chat-id="${chat.id}" title="${currentLang === 'en' ? 'Delete' : 'Удалить'}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
          <div class="saved-chat-row-bottom">
            <span class="saved-chat-msg-count">${msgCountLabel}</span>
            <span class="saved-chat-date-text">${escapeHtml(dateText)}</span>
          </div>
        `;

        item.addEventListener('click', (e) => {
          if (e.target.closest('.btn-delete-saved-chat') || e.target.closest('.btn-rename-chat')) return;
          resumeChat(chat.id);
        });

        const btnDel = item.querySelector('.btn-delete-saved-chat');
        btnDel && btnDel.addEventListener('click', (e) => {
          e.stopPropagation();
          openConfirmModal('delete_chat', { chatId: chat.id, chatTitle: titleText });
        });

        const btnRename = item.querySelector('.btn-rename-chat');
        btnRename && btnRename.addEventListener('click', (e) => {
          e.stopPropagation();
          editingChatId = chat.id;
          renderChatsList(chats);
        });
      }

      historyChatsList.appendChild(item);
    });
  }

  btnClearAllChats && btnClearAllChats.addEventListener('click', () => {
    openConfirmModal('delete_all_chats');
  });

  async function saveChatTitle(chatId, cleanTitle) {
    if (currentUser) {
      try {
        await fetch(`${ENDPOINTS.chats}/${chatId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ title: cleanTitle })
        });
      } catch (e) {}
    } else {
      const localChats = getGuestChats();
      const c = localChats.find(x => String(x.id) === String(chatId));
      if (c) {
        c.title = cleanTitle;
        c.updated_at = new Date().toISOString();
        saveGuestChat(c);
      }
    }
    await loadAndRenderChats();
  }

  async function executeDeleteChat(chatId) {
    if (currentUser) {
      try {
        await fetch(`${ENDPOINTS.chats}/${chatId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
      } catch (e) {}
    } else {
      deleteGuestChat(chatId);
    }

    if (String(currentChatId) === String(chatId)) {
      startNewChat();
    }
    await loadAndRenderChats();
  }

  async function executeClearAllChats() {
    if (currentUser) {
      try {
        await fetch(ENDPOINTS.chats, {
          method: 'DELETE',
          credentials: 'include'
        });
      } catch (e) {}
    } else {
      clearGuestChats();
    }

    startNewChat();
    await loadAndRenderChats();
  }

  async function resumeChat(chatId) {
    let chatData = null;

    if (currentUser) {
      try {
        const res = await fetch(`${ENDPOINTS.chats}/${chatId}`, { credentials: 'include' });
        if (res.ok) {
          chatData = await res.json();
        }
      } catch (e) {}
    } else {
      const localChats = getGuestChats();
      chatData = localChats.find(c => String(c.id) === String(chatId));
    }

    if (!chatData) return;

    currentChatId = chatData.id;
    inputInterests.value = chatData.interests || '';
    inputConditions.value = chatData.conditions || '';

    chatHistory = [];
    chatMessages.innerHTML = '';

    const messages = chatData.messages || [];

    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (m.role === 'user') {
        chatHistory.push({ role: 'user', content: m.content });
        if (i > 0) {
          const userBubble = document.createElement('div');
          userBubble.className = 'chat-bubble-user';
          userBubble.textContent = m.content;
          chatMessages.appendChild(userBubble);
        }
      } else if (m.role === 'assistant') {
        let contentToPush = m.content;
        let bubble = document.createElement('div');
        bubble.className = 'chat-bubble-ai';

        if (m.type === 'recommendations' || m.data) {
          const payload = m.data || (typeof m.content === 'string' ? JSON.parse(m.content) : m.content);
          bubble.innerHTML = renderFigmaAiResponse(payload);
          contentToPush = JSON.stringify(payload);
        } else if (m.reply) {
          bubble.innerHTML = formatMarkdown(m.reply);
          contentToPush = m.reply;
        } else if (m.content) {
          try {
            const parsed = JSON.parse(m.content);
            if (parsed.professions) {
              bubble.innerHTML = renderFigmaAiResponse(parsed);
            } else {
              bubble.innerHTML = formatMarkdown(m.content);
            }
          } catch (e) {
            bubble.innerHTML = formatMarkdown(m.content);
          }
        }

        chatHistory.push({ role: 'assistant', content: contentToPush });
        chatMessages.appendChild(bubble);
      }
    }

    isChatActive = true;
    startChatBar.classList.add('hidden');
    activeChatBar.classList.remove('hidden');
    resetAlert.classList.add('hidden');

    closeProfileDrawer();
    showScreen(screenApp);
    setTimeout(() => {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 60);
  }

  async function deleteChat(chatId) {
    if (currentUser) {
      try {
        await fetch(`${ENDPOINTS.chats}/${chatId}`, {
          method: 'DELETE',
          credentials: 'include'
        });
      } catch (e) {}
    } else {
      deleteGuestChat(chatId);
    }

    if (String(currentChatId) === String(chatId)) {
      startNewChat();
    }
    await loadAndRenderChats();
  }

  function startNewChat() {
    currentChatId = null;
    isChatActive = false;
    chatHistory = [];
    inputInterests.value = '';
    inputConditions.value = '';
    chatMessages.innerHTML = '';
    startChatBar.classList.remove('hidden');
    activeChatBar.classList.add('hidden');
    resetAlert.classList.add('hidden');
    handleWorkspaceInput();
    closeProfileDrawer();
    showScreen(screenApp);
  }

  // ================= 8. MULTILINGUAL (RU / EN) =================
  const I18N = {
    ru: {
      brand_title: "Найди профессию",
      brand_sub: "по интересам в <mark class=\"brand-highlight\">Калининградской области</mark>",
      header_history: "история",
      header_login: "войти",
      header_lang: "EN",
      footer_lang: "русский",
      landing_desc: "Выбери себе профессию по интересам в Калининградской области с развёрнутым ответом про профессию с предложениями мест обучения с ИИ",
      login_title: "войти в аккаунт",
      field_email: "email*",
      field_password: "пароль*",
      remember_me: "запомнить меня",
      forgot_password: "Забыли пароль?",
      action_recovery: "Восстановить",
      btn_login: "войти",
      no_account_text: "Нет аккаунта?",
      action_register: "Регистрация",
      register_title: "создать аккаунт",
      agree_text: "я соглашаюсь с",
      terms_link: "условиями",
      btn_register: "создать профиль",
      have_account_text: "Уже есть аккаунт?",
      action_login: "Войти",
      recov1_title: "восстановление доступа",
      recov1_sub: "введи email, который ты использовал при создании аккаунта, чтобы восстановить доступ",
      btn_get_code: "получить код",
      recov2_title: "введи код",
      recov2_sub: "мы отправили 6-значный код на",
      resend_text: "запросить код повторно",
      recov3_title: "придумай новый пароль",
      btn_save_new_pass: "сохранить и войти",
      new_chat_btn: "новый диалог",
      my_chats_btn: "мои диалоги",
      interests_label: "введи свои интересы",
      interests_ph: "Люблю рисовать, делаю скетчи к фанфикам...",
      conditions_label: "твои условия обучения",
      conditions_ph: "Гусев, либо Калининград, после 9 класса...",
      reset_alert_changed: "Данные изменены,",
      reset_alert_link: "сбросить диалог?",
      ai_header: "предложения ии",
      btn_start_chat: "начать общение",
      chat_input_ph: "продолжить общение с чат-ботом",
      history_title: "История диалогов",
      new_chat_drawer: "+ Начать новый диалог",
      history_empty: "У вас пока нет сохранённых диалогов.",
      history_empty_sub: "Все ваши диалоги и подобранные профессии будут автоматически сохраняться здесь.",
      msg_suffix: "сообщ.",
      profile_title: "Профиль",
      field_firstname: "имя",
      field_lastname: "фамилия",
      field_req_note: "*обязательно для заполнения",
      btn_save_profile: "сохранить изменения",
      btn_logout: "выйти из аккаунта",
      btn_delete_account: "удалить аккаунт",
      delete_confirm_title: "Вы уверены, что хотите удалить аккаунт?",
      btn_yes: "да",
      btn_cancel: "отмена",
      terms_title: "Пользовательское соглашение и условия",
      btn_accept_terms: "Принять и закрыть"
    },
    en: {
      brand_title: "Career Finder",
      brand_sub: "by interests in <mark class=\"brand-highlight\">Kaliningrad Region</mark>",
      header_history: "history",
      header_login: "sign in",
      header_lang: "RU",
      footer_lang: "English",
      landing_desc: "Choose a career path based on your interests in the Kaliningrad Region with in-depth AI insights and local education opportunities.",
      login_title: "sign in to account",
      field_email: "email*",
      field_password: "password*",
      remember_me: "remember me",
      forgot_password: "Forgot password?",
      action_recovery: "Restore",
      btn_login: "sign in",
      no_account_text: "No account?",
      action_register: "Register",
      register_title: "create account",
      agree_text: "I agree to the",
      terms_link: "terms and conditions",
      btn_register: "create profile",
      have_account_text: "Already have an account?",
      action_login: "Sign in",
      recov1_title: "account recovery",
      recov1_sub: "enter the email you used when creating your account to restore access",
      btn_get_code: "get code",
      recov2_title: "enter code",
      recov2_sub: "we have sent a 6-digit code to",
      resend_text: "resend code",
      recov3_title: "create new password",
      btn_save_new_pass: "save and sign in",
      new_chat_btn: "new chat",
      my_chats_btn: "my chats",
      interests_label: "enter your interests",
      interests_ph: "I love drawing, coding web apps, designing games...",
      conditions_label: "your education preferences",
      conditions_ph: "Kaliningrad or Gusev, after 9th grade, budget places...",
      reset_alert_changed: "Inputs changed,",
      reset_alert_link: "reset chat?",
      ai_header: "AI suggestions",
      btn_start_chat: "start chat",
      chat_input_ph: "continue chatting with AI...",
      history_title: "Chat History",
      new_chat_drawer: "+ Start new chat",
      history_empty: "You have no saved chats yet.",
      history_empty_sub: "All your dialogues and recommended careers will be automatically saved here.",
      msg_suffix: "msgs",
      profile_title: "Profile",
      field_firstname: "first name",
      field_lastname: "last name",
      field_req_note: "*required fields",
      btn_save_profile: "save changes",
      btn_logout: "sign out",
      btn_delete_account: "delete account",
      delete_confirm_title: "Are you sure you want to delete your account?",
      btn_yes: "yes",
      btn_cancel: "cancel",
      terms_title: "Terms and Conditions",
      btn_accept_terms: "Accept & Close"
    }
  };

  function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    const t = I18N[lang] || I18N.ru;

    // Header
    const brandTitle = document.querySelector('.brand-title');
    if (brandTitle) brandTitle.textContent = t.brand_title;
    const brandSub = document.querySelector('.brand-subtitle');
    if (brandSub) brandSub.innerHTML = t.brand_sub;
    if (footerLangLabel) footerLangLabel.textContent = t.footer_lang;
    if (!currentUser && headerAccountLabel) headerAccountLabel.textContent = t.header_login;

    // Theme label sync with current language
    if (themeLabel) {
      const isDark = document.body.classList.contains('dark-theme');
      themeLabel.textContent = isDark ? (lang === 'en' ? 'Dark theme' : 'тёмная тема') : (lang === 'en' ? 'Light theme' : 'светлая тема');
    }

    // Landing
    const landingDesc = document.querySelector('.landing-description');
    if (landingDesc) landingDesc.textContent = t.landing_desc;

    // Login screen
    const loginTitle = document.querySelector('#screen-login .auth-card-title');
    if (loginTitle) loginTitle.textContent = t.login_title;
    const loginEmailLabel = document.querySelector('#screen-login .field-box:nth-child(1) .field-label');
    if (loginEmailLabel) loginEmailLabel.textContent = t.field_email;
    const loginPassLabel = document.querySelector('#screen-login .field-box:nth-child(2) .field-label');
    if (loginPassLabel) loginPassLabel.textContent = t.field_password;
    const loginRememberLabel = document.querySelector('#screen-login .check-text');
    if (loginRememberLabel) loginRememberLabel.textContent = t.remember_me;
    if (btnLoginSubmit) btnLoginSubmit.textContent = t.btn_login;

    const loginForgotRow = document.getElementById('login-forgot-row');
    if (loginForgotRow && loginForgotRow.childNodes.length > 0) loginForgotRow.childNodes[0].textContent = t.forgot_password + ' ';
    const btnForgot = document.querySelector('#login-forgot-row .btn-goto-recovery');
    if (btnForgot) btnForgot.textContent = t.action_recovery;

    const loginRegisterRow = document.getElementById('login-register-row');
    if (loginRegisterRow && loginRegisterRow.childNodes.length > 0) loginRegisterRow.childNodes[0].textContent = t.no_account_text + ' ';
    const btnReg = document.querySelector('#login-register-row .btn-goto-register');
    if (btnReg) btnReg.textContent = t.action_register;

    // Register screen
    const regTitle = document.querySelector('#screen-register .auth-card-title');
    if (regTitle) regTitle.textContent = t.register_title;
    const regEmailLabel = document.querySelector('#screen-register .field-box:nth-child(1) .field-label');
    if (regEmailLabel) regEmailLabel.textContent = t.field_email;
    const regPassLabel = document.querySelector('#screen-register .field-box:nth-child(2) .field-label');
    if (regPassLabel) regPassLabel.textContent = t.field_password;
    const regRememberLabel = document.querySelector('#screen-register .checkbox-field-row:nth-of-type(1) .check-text');
    if (regRememberLabel) regRememberLabel.textContent = t.remember_me;
    const regTermsLabel = document.querySelector('#screen-register .checkbox-field-row:nth-of-type(2) .check-text');
    if (regTermsLabel && regTermsLabel.childNodes.length > 0) regTermsLabel.childNodes[0].textContent = t.agree_text + ' ';
    if (btnOpenTerms) btnOpenTerms.textContent = t.terms_link;
    if (btnRegisterSubmit) btnRegisterSubmit.textContent = t.btn_register;
    const regHaveAccText = document.querySelector('#screen-register .sub-link-row');
    if (regHaveAccText && regHaveAccText.childNodes.length > 0) regHaveAccText.childNodes[0].textContent = t.have_account_text + ' ';

    // Recovery screens
    const recov1Title = document.querySelector('#screen-recovery-step1 .auth-card-title');
    if (recov1Title) recov1Title.textContent = t.recov1_title;
    const recov1Sub = document.querySelector('.recovery-email-sub');
    if (recov1Sub) recov1Sub.textContent = t.recov1_sub;
    if (btnSendRecoveryCode) btnSendRecoveryCode.textContent = t.btn_get_code;

    const recov2Title = document.querySelector('#screen-recovery-step2 .auth-card-title');
    if (recov2Title) recov2Title.textContent = t.recov2_title;
    const recov3Title = document.querySelector('#screen-recovery-step3 .auth-card-title');
    if (recov3Title) recov3Title.textContent = t.recov3_title;
    if (btnSaveNewPassword) btnSaveNewPassword.textContent = t.btn_save_new_pass;

    // Workspace
    const cardInterestsLabel = document.querySelector('#card-interests .workspace-card-label');
    if (cardInterestsLabel) cardInterestsLabel.textContent = t.interests_label;
    if (inputInterests) inputInterests.placeholder = t.interests_ph;
    const cardConditionsLabel = document.querySelector('#card-conditions .workspace-card-label');
    if (cardConditionsLabel) cardConditionsLabel.textContent = t.conditions_label;
    if (inputConditions) inputConditions.placeholder = t.conditions_ph;
    const resetAlertSpan = document.querySelector('#reset-alert span');
    if (resetAlertSpan && resetAlertSpan.childNodes.length > 0) resetAlertSpan.childNodes[0].textContent = t.reset_alert_changed + ' ';
    if (btnResetChat) btnResetChat.textContent = t.reset_alert_link;

    const chatHeaderTitle = document.querySelector('.chat-header-title');
    if (chatHeaderTitle) chatHeaderTitle.textContent = t.ai_header;
    const btnStartChatSpan = document.querySelector('#btn-start-chat span');
    if (btnStartChatSpan) btnStartChatSpan.textContent = t.btn_start_chat;
    if (chatUserInput) chatUserInput.placeholder = t.chat_input_ph;

    // Combined Profile & Saved Chats Modal
    const profileTitle = document.getElementById('profile-title-text');
    if (profileTitle) profileTitle.textContent = t.profile_title;
    const savedChatsTitle = document.getElementById('saved-chats-title-text');
    if (savedChatsTitle) savedChatsTitle.textContent = lang === 'en' ? 'Saved chats' : 'Сохранённые чаты';

    const profFnameLabel = document.querySelector('#profile-form .profile-field-box:nth-child(1) .field-label');
    if (profFnameLabel) profFnameLabel.textContent = t.field_firstname;
    const profLnameLabel = document.querySelector('#profile-form .profile-field-box:nth-child(2) .field-label');
    if (profLnameLabel) profLnameLabel.textContent = t.field_lastname;
    const profReqNote = document.querySelector('.field-req-note');
    if (profReqNote) profReqNote.textContent = t.field_req_note;
    if (btnSaveProfile) btnSaveProfile.textContent = t.btn_save_profile;
    
    const logoutBtnText = document.getElementById('logout-btn-text');
    if (logoutBtnText) logoutBtnText.textContent = t.btn_logout;
    const deleteBtnText = document.getElementById('delete-btn-text');
    if (deleteBtnText) deleteBtnText.textContent = t.btn_delete_account;
    if (btnClearAllChats) btnClearAllChats.textContent = lang === 'en' ? 'delete all chats' : 'удалить все чаты';

    // Confirm Delete Modal
    const deleteModalTitle = document.querySelector('.confirm-modal-title');
    if (deleteModalTitle) deleteModalTitle.textContent = t.delete_confirm_title;
    if (btnConfirmDeleteYes) btnConfirmDeleteYes.textContent = t.btn_yes;
    if (btnConfirmDeleteCancel) btnConfirmDeleteCancel.textContent = t.btn_cancel;

    // Terms Modal
    const termsTitle = document.querySelector('.terms-modal-title');
    if (termsTitle) termsTitle.textContent = t.terms_title;
    if (btnAcceptTerms) btnAcceptTerms.textContent = t.btn_accept_terms;
  }

  function toggleLanguage() {
    const nextLang = currentLang === 'ru' ? 'en' : 'ru';
    applyLanguage(nextLang);
  }

  btnLangToggle && btnLangToggle.addEventListener('click', toggleLanguage);

  // Initialize Language
  applyLanguage(currentLang);

  // ================= 9. DARK THEME SWITCHER =================
  function applyTheme(isDark) {
    const isEn = currentLang === 'en';
    if (isDark) {
      document.body.classList.add('dark-theme');
      if (themeLabel) themeLabel.textContent = isEn ? 'Dark theme' : 'тёмная тема';
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      if (themeLabel) themeLabel.textContent = isEn ? 'Light theme' : 'светлая тема';
      localStorage.setItem('theme', 'light');
    }
  }

  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    applyTheme(true);
  } else {
    applyTheme(false);
  }

  if (btnThemeToggle) {
    btnThemeToggle.addEventListener('click', () => {
      const isCurrentlyDark = document.body.classList.contains('dark-theme');
      applyTheme(!isCurrentlyDark);
    });
  }
});
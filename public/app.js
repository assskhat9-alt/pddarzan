// PDD Quiz Platform Client Application
const app = {
  token: localStorage.getItem('pdd_token') || null,
  currentUser: null,
  deviceId: localStorage.getItem('pdd_device_id') || null,
  adminWhatsapp: '77770000000',
  adminUsersList: [],

  // SEPARATED LANGUAGES
  // 1. Platform UI Language: controls website interface (labels, buttons, headers)
  uiLang: localStorage.getItem('pdd_ui_lang') || 'kk',

  // 2. Question / Test Language: controls questions, options, and explanations
  questionLang: localStorage.getItem('pdd_question_lang') || 'kk',

  // Time Mode: true = 40 min countdown, false = untimed stopwatch
  isTimed: localStorage.getItem('pdd_is_timed') !== 'false',
  
  // Test State
  currentTest: null,
  timerInterval: null,
  isPaused: false,
  lastResult: null,
  reviewFilter: 'all',

  // Study & Memorization State
  studyMode: 'list', // 'list' or 'trainer'
  studyPage: 1,
  studyLimit: 20,
  studySearch: '',
  studyFilter: 'all',
  showCorrectAnswers: true,
  studySearchTimeout: null,
  trainerCurrentId: 1,
  trainerData: null,
  trainerAnswered: false,

  // i18n Dictionary for Platform Interface
  i18n: {
    kk: {
      authBadge: '🚦 ЖОЛ ЕРЕЖЕСІ ЕМТИХАНЫ',
      authTitle: 'Платформаға қош келдіңіз!',
      authDesc: 'ҚР Жол жүрісі қағидалары бойынша дайындық тесті (40 сұрақ)',
      tabLogin: 'Кіру',
      tabRegister: 'Тіркелу',
      loginUsernameLabel: 'Логин немесе Email',
      loginPasswordLabel: 'Құпия сөз',
      loginSubmitText: 'Жүйеге кіру',
      regFullNameLabel: 'Аты-жөніңіз (Толық аты)',
      regUsernameLabel: 'Логин (жүйедегі атау)',
      regPasswordLabel: 'Құпия сөз (кемінде 4 таңба)',
      regPasswordConfirmLabel: 'Құпия сөзді қайталаңыз',
      regSubmitText: 'Тіркелу және бастау',
      authFooterText: '🛡️ Сіздің деректеріңіз және барлық өткен тест нәтижелері сенімді сақталады',
      passwordsDoNotMatch: 'Құпия сөздер сәйкес келмейді! Қайта тексеріңіз.',
      usernameTooShort: 'Логин кемінде 3 таңбадан тұруы керек.',
      usernameHasSpace: 'Логинде бос орын (пробел) болмауы керек.',
      nameTooShort: 'Аты-жөніңіз кемінде 2 таңбадан тұруы керек.',
      passwordTooShort: 'Құпия сөз кемінде 4 таңбадан тұруы керек.',
      loginPrompt: 'Логин мен құпия сөзді енгізіңіз.',

      navDash: 'Жеке кабинет',
      navStudy: 'Сұрақтарды жаттау',
      navExam: 'Емтихан (40 сұрақ)',
      welcome: 'Сәлеметсіз бе',
      startBtn: 'Жаңа тестті бастау (40 сұрақ)',
      testLangPickerLabel: 'Тест тапсыру тілі:',
      timeModePickerLabel: 'Уақыт режимі:',
      btnTimed: '⏱️ Уақытпен (40 мин)',
      btnUntimed: '♾️ Уақытсыз (Шектеусіз)',
      qLangLabel: 'Сұрақ тілі:',
      testModeBadgeTimed: 'РЕСМИ ЕМТИХАН (40 МИН)',
      testModeBadgeUntimed: 'ЕРКІН РЕЖИМ (УАҚЫТСЫЗ)',
      questionWord: 'Сұрақ',
      bookmark: 'Белгілеу',
      bookmarked: 'Белгіленді ⭐',
      unanswered: 'Жауап берілмеді',
      answered: 'Жауап таңдалды',
      prevQ: 'Алдыңғы сұрақ',
      nextQ: 'Келесі сұрақ',
      finishBtn: 'Тестті аяқтау',
      submitBtn: 'Нәтижені тапсыру',
      confirmFinish: 'Тестті аяқтағыңыз келе ме? Барлық белгіленген жауаптар тексеріледі.',
      timeOut: 'Уақыт аяқталды! Тест автоматты түрде тапсырылады.',
      passedTitle: 'ЕМТИХАН ТАПСЫРЫЛДЫ 🎉',
      failedTitle: 'ЕМТИХАН ТАПСЫРЫЛМАДЫ ❌',
      passedMsg: 'Құттықтаймыз! Сіз ҚР Жол ережесі емтиханынан сәтті өттіңіз.',
      failedMsg: 'Өкінішке орай, өту шегіне (32 балл) жетпедіңіз. Қателермен танысып, қайта тапсырып көріңіз.',
      statusPassed: 'Өтті',
      statusFailed: 'Өтпеді',
      actionReview: 'Қателерді көру',
      yourAnswer: 'Сіздің жауабыңыз',
      correctAnswer: 'Дұрыс жауап',
      showAnswersToggle: 'Дұрыс жауапты көрсету',
      reviewTitle: 'Барлық 40 сұрақ пен қателерді талдау',
      reviewSub: 'Сіздің таңдаған жауабыңыз бен ресми дұрыс нұсқалар',
      filterAll: 'Барлығы (40)',
      filterWrong: 'Тек қателер',
      filterCorrect: 'Тек дұрыстар'
    },
    ru: {
      authBadge: '🚦 ЭКЗАМЕН ПДД КАЗАХСТАНА',
      authTitle: 'Добро пожаловать на платформу!',
      authDesc: 'Подготовительное тестирование по ПДД РК (40 вопросов)',
      tabLogin: 'Вход',
      tabRegister: 'Регистрация',
      loginUsernameLabel: 'Логин или Email',
      loginPasswordLabel: 'Пароль',
      loginSubmitText: 'Войти в систему',
      regFullNameLabel: 'Ваше имя и фамилия',
      regUsernameLabel: 'Логин (имя в системе)',
      regPasswordLabel: 'Пароль (не менее 4 символов)',
      regPasswordConfirmLabel: 'Повторите пароль',
      regSubmitText: 'Зарегистрироваться и начать',
      authFooterText: '🛡️ Ваши данные и результаты всех пройденных тестов надёжно сохраняются',
      passwordsDoNotMatch: 'Пароли не совпадают! Проверьте правильность.',
      usernameTooShort: 'Логин должен содержать не менее 3 символов.',
      usernameHasSpace: 'Логин не должен содержать пробелов.',
      nameTooShort: 'Имя должно содержать не менее 2 символов.',
      passwordTooShort: 'Пароль должен содержать не менее 4 символов.',
      loginPrompt: 'Введите логин и пароль.',

      navDash: 'Личный кабинет',
      navStudy: 'База вопросов',
      navExam: 'Экзамен (40 вопросов)',
      welcome: 'Здравствуйте',
      startBtn: 'Начать новый тест (40 вопросов)',
      testLangPickerLabel: 'Язык вопросов теста:',
      timeModePickerLabel: 'Режим времени:',
      btnTimed: '⏱️ По времени (40 мин)',
      btnUntimed: '♾️ Без времени (Свободный)',
      qLangLabel: 'Язык вопроса:',
      testModeBadgeTimed: 'ОФИЦИАЛЬНЫЙ ЭКЗАМЕН (40 МИН)',
      testModeBadgeUntimed: 'СВОБОДНЫЙ РЕЖИМ (БЕЗ ВРЕМЕНИ)',
      questionWord: 'Вопрос',
      bookmark: 'Отметить',
      bookmarked: 'Отмечено ⭐',
      unanswered: 'Нет ответа',
      answered: 'Ответ выбран',
      prevQ: 'Предыдущий вопрос',
      nextQ: 'Следующий вопрос',
      finishBtn: 'Завершить тест',
      submitBtn: 'Сдать экзамен',
      confirmFinish: 'Вы действительно хотите завершить тест? Все ответы будут проверены.',
      timeOut: 'Время вышло! Тест завершается автоматически.',
      passedTitle: 'ЭКЗАМЕН СДАН 🎉',
      failedTitle: 'ЭКЗАМЕН НЕ СДАН ❌',
      passedMsg: 'Поздравляем! Вы успешно сдали экзамен по правилам дорожного движения.',
      failedMsg: 'К сожалению, вы не набрали проходной балл (32 из 40). Изучите ошибки и попробуйте снова.',
      statusPassed: 'Сдан',
      statusFailed: 'Не сдан',
      actionReview: 'Просмотр ошибок',
      yourAnswer: 'Ваш ответ',
      correctAnswer: 'Правильный ответ',
      showAnswersToggle: 'Показать правильный ответ',
      reviewTitle: 'Анализ всех 40 вопросов и ошибок',
      reviewSub: 'Ваш выбранный ответ и официальные правильные варианты',
      filterAll: 'Все (40)',
      filterWrong: 'Только ошибки',
      filterCorrect: 'Только верные'
    },
    en: {
      authBadge: '🚦 KAZAKHSTAN TRAFFIC RULES',
      authTitle: 'Welcome to the platform!',
      authDesc: 'Preparation test for Kazakhstan traffic rules (40 questions)',
      tabLogin: 'Login',
      tabRegister: 'Register',
      loginUsernameLabel: 'Username or Email',
      loginPasswordLabel: 'Password',
      loginSubmitText: 'Sign In',
      regFullNameLabel: 'Full Name',
      regUsernameLabel: 'Username',
      regPasswordLabel: 'Password (at least 4 characters)',
      regPasswordConfirmLabel: 'Confirm Password',
      regSubmitText: 'Register and Start',
      authFooterText: '🛡️ Your data and all test history are securely saved',
      passwordsDoNotMatch: 'Passwords do not match! Please check.',
      usernameTooShort: 'Username must be at least 3 characters long.',
      usernameHasSpace: 'Username cannot contain spaces.',
      nameTooShort: 'Name must be at least 2 characters long.',
      passwordTooShort: 'Password must be at least 4 characters long.',
      loginPrompt: 'Please enter username and password.',

      navDash: 'Dashboard',
      navStudy: 'Study Questions',
      navExam: 'Take Exam (40 questions)',
      welcome: 'Hello',
      startBtn: 'Start New Test (40 questions)',
      testLangPickerLabel: 'Test questions language:',
      timeModePickerLabel: 'Time mode:',
      btnTimed: '⏱️ Timed (40 min)',
      btnUntimed: '♾️ Untimed (No limit)',
      qLangLabel: 'Question language:',
      testModeBadgeTimed: 'OFFICIAL EXAM (40 MIN)',
      testModeBadgeUntimed: 'PRACTICE MODE (UNTIMED)',
      questionWord: 'Question',
      bookmark: 'Bookmark',
      bookmarked: 'Bookmarked ⭐',
      unanswered: 'Unanswered',
      answered: 'Answered',
      prevQ: 'Previous question',
      nextQ: 'Next question',
      finishBtn: 'Finish test',
      submitBtn: 'Submit results',
      confirmFinish: 'Are you sure you want to finish the test? Your answers will be submitted.',
      timeOut: 'Time is up! The test is automatically submitted.',
      passedTitle: 'EXAM PASSED 🎉',
      failedTitle: 'EXAM FAILED ❌',
      passedMsg: 'Congratulations! You successfully passed the traffic rules exam.',
      failedMsg: 'Unfortunately, you did not reach the passing score (32 out of 40). Review your mistakes and try again.',
      statusPassed: 'Passed',
      statusFailed: 'Failed',
      actionReview: 'Review Mistakes',
      yourAnswer: 'Your answer',
      correctAnswer: 'Correct answer',
      showAnswersToggle: 'Show correct answer',
      reviewTitle: 'Analysis of all 40 questions and mistakes',
      reviewSub: 'Your selected answers and official correct options',
      filterAll: 'All (40)',
      filterWrong: 'Mistakes only',
      filterCorrect: 'Correct only'
    }
  },

  t(key) {
    const dict = this.i18n[this.uiLang] || this.i18n.kk;
    return dict[key] || key;
  },

  // Initialize
  async init() {
    // Single Device ID setup
    if (!this.deviceId) {
      this.deviceId = 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem('pdd_device_id', this.deviceId);
    }

    this.updateLanguageButtons();
    this.updateTimeModeButtons();
    this.applyUiTranslations();

    // Fetch public platform config
    try {
      const cRes = await fetch('/api/public/config');
      if (cRes.ok) {
        const cData = await cRes.json();
        if (cData.adminWhatsapp) this.adminWhatsapp = cData.adminWhatsapp;
      }
    } catch (e) {}

    // Prevent accidental page close while taking test and save progress
    window.addEventListener('beforeunload', (e) => {
      if (this.currentTest && this.token) {
        this.saveActiveTestState();
        e.preventDefault();
        e.returnValue = 'Сізде аяқталмаған тест бар. Шықсаңыз, тест сақталып тұрады.';
      }
    });

    if (this.token) {
      await this.checkAuth();
    } else {
      this.navigate('auth');
    }
  },

  // Centralized API Fetcher with Single Device Conflict Interceptor
  async apiFetch(url, options = {}) {
    options.headers = options.headers || {};
    if (this.token) {
      options.headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const res = await fetch(url, options);
      const data = await res.json().catch(() => ({}));

      // Intercept Single Device Overridden signal
      if (res.status === 403 && data.code === 'DEVICE_OVERRIDDEN') {
        this.handleDeviceConflict();
        return { ok: false, status: 403, data };
      }

      // Intercept Paywall Locked signal
      if (res.status === 403 && data.code === 'ACCESS_LOCKED') {
        this.openPaywallModal();
        return { ok: false, status: 403, data };
      }

      return { ok: res.ok, status: res.status, data };
    } catch (err) {
      return { ok: false, status: 0, data: { error: err.message } };
    }
  },

  // Single Device Conflict Handling
  handleDeviceConflict() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.clearActiveTestState();
    this.currentTest = null;
    this.token = null;
    this.currentUser = null;
    localStorage.removeItem('pdd_token');

    const modal = document.getElementById('deviceConflictModal');
    if (modal) modal.classList.remove('hidden');
  },

  handleDeviceConflictAcknowledge() {
    const modal = document.getElementById('deviceConflictModal');
    if (modal) modal.classList.add('hidden');
    this.navigate('auth');
  },

  // Paywall Modal Controls
  openPaywallModal() {
    const uname = this.currentUser ? this.currentUser.username : '';
    const spanUname = document.getElementById('paywallUsername');
    if (spanUname) spanUname.textContent = uname || '(тіркелмеген)';
    const modal = document.getElementById('paywallModal');
    if (modal) modal.classList.remove('hidden');
  },

  closePaywallModal() {
    const modal = document.getElementById('paywallModal');
    if (modal) modal.classList.add('hidden');
  },

  openWhatsAppPurchase() {
    const wa = this.adminWhatsapp || '77770000000';
    const uname = this.currentUser ? this.currentUser.username : '';
    const text = encodeURIComponent(`Сәлеметсіз бе! ПДД тест платформасына толық доступ (қолжетімділік) сатып алғым келеді. Логинім: ${uname}`);
    window.open(`https://wa.me/${wa}?text=${text}`, '_blank');
  },

  // 1. SET PLATFORM UI LANGUAGE (Интерфейс тілі)
  setUiLanguage(lang) {
    this.uiLang = lang;
    localStorage.setItem('pdd_ui_lang', lang);
    this.updateLanguageButtons();
    this.updateTimeModeButtons();
    this.applyUiTranslations();
    this.updateUserUI();

    if (this.currentTest) {
      document.getElementById('testProgressIndicator').textContent = `${this.t('questionWord')}: ${this.currentTest.currentIndex + 1} / 40`;
      document.getElementById('qNumberDisplay').textContent = `${this.t('questionWord')} № ${this.currentTest.currentIndex + 1}`;
      const badgeTestMode = document.getElementById('badgeTestModeText');
      if (badgeTestMode) {
        badgeTestMode.textContent = this.currentTest.isTimed ? this.t('testModeBadgeTimed') : this.t('testModeBadgeUntimed');
      }
    }
  },

  // 2. SET QUESTION / TEST CONTENT LANGUAGE (Сұрақтардың тілі)
  setTestLanguage(lang) {
    this.questionLang = lang;
    localStorage.setItem('pdd_question_lang', lang);
    this.updateLanguageButtons();
  },

  setTimeMode(isTimed) {
    this.isTimed = !!isTimed;
    localStorage.setItem('pdd_is_timed', this.isTimed);
    this.updateTimeModeButtons();
  },

  updateTimeModeButtons() {
    const btnTimed = document.getElementById('btnTimeModeTimed');
    const btnUntimed = document.getElementById('btnTimeModeUntimed');
    if (btnTimed) btnTimed.classList.toggle('active', this.isTimed);
    if (btnUntimed) btnUntimed.classList.toggle('active', !this.isTimed);
  },

  setExamQuestionLanguage(lang) {
    this.questionLang = lang;
    localStorage.setItem('pdd_question_lang', lang);
    this.updateLanguageButtons();
    if (this.currentTest) {
      this.renderQuestion(this.currentTest.currentIndex);
      this.saveActiveTestState();
    }
  },

  setStudyQuestionLanguage(lang) {
    this.questionLang = lang;
    localStorage.setItem('pdd_question_lang', lang);
    this.updateLanguageButtons();
    if (this.studyMode === 'list') {
      this.loadStudyQuestions();
    } else {
      this.loadTrainerQuestion(this.trainerCurrentId);
    }
  },

  setReviewQuestionLanguage(lang) {
    this.questionLang = lang;
    localStorage.setItem('pdd_question_lang', lang);
    this.updateLanguageButtons();
    this.renderReviewList();
  },

  updateLanguageButtons() {
    // Platform UI Language buttons in navbar
    ['kk', 'ru', 'en'].forEach(l => {
      const btn = document.getElementById(`btnUiLang_${l}`);
      if (btn) btn.classList.toggle('active', l === this.uiLang);
    });

    // Test start question language buttons on Dashboard
    ['kk', 'ru', 'en'].forEach(l => {
      const btn = document.getElementById(`btnTlang_${l}`);
      if (btn) btn.classList.toggle('active', l === this.questionLang);
    });

    // In-exam question language buttons
    ['kk', 'ru', 'en'].forEach(l => {
      const btn = document.getElementById(`btnExamQLang_${l}`);
      if (btn) btn.classList.toggle('active', l === this.questionLang);
    });

    // Study mode question language buttons
    ['kk', 'ru', 'en'].forEach(l => {
      const btn = document.getElementById(`btnStudyLang_${l}`);
      if (btn) btn.classList.toggle('active', l === this.questionLang);
    });

    // Review mode question language buttons
    ['kk', 'ru', 'en'].forEach(l => {
      const btn = document.getElementById(`btnReviewQLang_${l}`);
      if (btn) btn.classList.toggle('active', l === this.questionLang);
    });
  },

  applyUiTranslations() {
    const t = (k) => this.t(k);

    // Auth Screen Translations
    const authBadgeText = document.getElementById('authBadgeText');
    if (authBadgeText) authBadgeText.textContent = t('authBadge');
    const authTitleText = document.getElementById('authTitleText');
    if (authTitleText) authTitleText.textContent = t('authTitle');
    const authDescText = document.getElementById('authDescText');
    if (authDescText) authDescText.textContent = t('authDesc');
    const tabLoginBtn = document.getElementById('tabLoginBtn');
    if (tabLoginBtn) tabLoginBtn.textContent = t('tabLogin');
    const tabRegisterBtn = document.getElementById('tabRegisterBtn');
    if (tabRegisterBtn) tabRegisterBtn.textContent = t('tabRegister');
    const lblLoginUsername = document.getElementById('lblLoginUsername');
    if (lblLoginUsername) lblLoginUsername.textContent = t('loginUsernameLabel');
    const lblLoginPassword = document.getElementById('lblLoginPassword');
    if (lblLoginPassword) lblLoginPassword.textContent = t('loginPasswordLabel');
    const loginSubmitText = document.getElementById('loginSubmitText');
    if (loginSubmitText) loginSubmitText.textContent = t('loginSubmitText');
    const lblRegFullName = document.getElementById('lblRegFullName');
    if (lblRegFullName) lblRegFullName.textContent = t('regFullNameLabel');
    const lblRegUsername = document.getElementById('lblRegUsername');
    if (lblRegUsername) lblRegUsername.textContent = t('regUsernameLabel');
    const lblRegPassword = document.getElementById('lblRegPassword');
    if (lblRegPassword) lblRegPassword.textContent = t('regPasswordLabel');
    const lblRegPasswordConfirm = document.getElementById('lblRegPasswordConfirm');
    if (lblRegPasswordConfirm) lblRegPasswordConfirm.textContent = t('regPasswordConfirmLabel');
    const registerSubmitText = document.getElementById('registerSubmitText');
    if (registerSubmitText) registerSubmitText.textContent = t('regSubmitText');
    const authFooterText = document.getElementById('authFooterText');
    if (authFooterText) authFooterText.textContent = t('authFooterText');
    
    // Top Nav Links
    const navDash = document.querySelector('#navLinkDash span');
    if (navDash) navDash.textContent = t('navDash');
    const navStudy = document.querySelector('#navLinkStudy span');
    if (navStudy) navStudy.textContent = t('navStudy');
    const navExam = document.querySelector('.nav-link-exam span');
    if (navExam) navExam.textContent = t('navExam');

    // Dashboard
    const btnStartExamText = document.getElementById('btnStartExamText');
    if (btnStartExamText) btnStartExamText.textContent = t('startBtn');
    const lblTestLangPicker = document.getElementById('lblTestLangPicker');
    if (lblTestLangPicker) lblTestLangPicker.textContent = t('testLangPickerLabel');
    const lblTimeModePicker = document.getElementById('lblTimeModePicker');
    if (lblTimeModePicker) lblTimeModePicker.textContent = t('timeModePickerLabel');
    const btnTimeModeTimed = document.getElementById('btnTimeModeTimed');
    if (btnTimeModeTimed) btnTimeModeTimed.innerHTML = `<span>${t('btnTimed')}</span>`;
    const btnTimeModeUntimed = document.getElementById('btnTimeModeUntimed');
    if (btnTimeModeUntimed) btnTimeModeUntimed.innerHTML = `<span>${t('btnUntimed')}</span>`;

    // Exam Screen
    const badgeTestModeText = document.getElementById('badgeTestModeText');
    if (badgeTestModeText) {
      if (this.currentTest) {
        badgeTestModeText.textContent = this.currentTest.isTimed ? t('testModeBadgeTimed') : t('testModeBadgeUntimed');
      } else {
        badgeTestModeText.textContent = this.isTimed ? t('testModeBadgeTimed') : t('testModeBadgeUntimed');
      }
    }
    const lblTestInQLang = document.getElementById('lblTestInQLang');
    if (lblTestInQLang) lblTestInQLang.textContent = t('qLangLabel');

    // Review Screen
    const lblReviewTitle = document.getElementById('lblReviewTitle');
    if (lblReviewTitle) lblReviewTitle.textContent = t('reviewTitle');
    const lblReviewSub = document.getElementById('lblReviewSub');
    if (lblReviewSub) lblReviewSub.textContent = t('reviewSub');
    const lblReviewQLang = document.getElementById('lblReviewQLang');
    if (lblReviewQLang) lblReviewQLang.textContent = t('qLangLabel');
    const btnFilterAll = document.getElementById('btnFilterAll');
    if (btnFilterAll) btnFilterAll.textContent = t('filterAll');
    const btnFilterWrong = document.getElementById('btnFilterWrong');
    if (btnFilterWrong) btnFilterWrong.textContent = t('filterWrong');
    const btnFilterCorrect = document.getElementById('btnFilterCorrect');
    if (btnFilterCorrect) btnFilterCorrect.textContent = t('filterCorrect');

    // Study Screen
    const lblStudyQLang = document.getElementById('lblStudyQLang');
    if (lblStudyQLang) lblStudyQLang.textContent = t('qLangLabel');
    const lblToggleAnswers = document.getElementById('lblToggleAnswers');
    if (lblToggleAnswers) lblToggleAnswers.textContent = t('showAnswersToggle');
  },

  // Navigation
  navigate(viewName) {
    // Gating for unapproved users
    if ((viewName === 'study' || viewName === 'test') && this.currentUser && this.currentUser.role !== 'admin' && !this.currentUser.hasAccess) {
      this.openPaywallModal();
      return;
    }

    if (viewName === 'admin' && (!this.currentUser || this.currentUser.role !== 'admin')) {
      viewName = 'dashboard';
    }

    // If navigating away from test while test is active, pause timer and save state
    if (this.currentTest && viewName !== 'test') {
      this.pauseTest(false);
    }

    const views = ['auth', 'dashboard', 'test', 'result', 'study', 'admin'];
    views.forEach(v => {
      const el = document.getElementById(`${v}View`);
      if (el) el.classList.toggle('hidden', v !== viewName);
    });

    // Update navbar user section and main links visibility
    const navUser = document.getElementById('navUserSection');
    const navMainLinks = document.getElementById('navMainLinks');
    const isAuthed = !!this.currentUser && viewName !== 'auth';

    if (navUser) navUser.classList.toggle('hidden', !isAuthed);
    if (navMainLinks) navMainLinks.classList.toggle('hidden', !isAuthed);

    // Manage in-exam class for mobile layout
    document.body.classList.toggle('in-exam', viewName === 'test');

    // Update active nav button (Desktop & Mobile)
    const navDash = document.getElementById('navLinkDash');
    const navStudy = document.getElementById('navLinkStudy');
    const navAdmin = document.getElementById('navLinkAdmin');
    if (navDash) navDash.classList.toggle('active', viewName === 'dashboard');
    if (navStudy) navStudy.classList.toggle('active', viewName === 'study');
    if (navAdmin) navAdmin.classList.toggle('active', viewName === 'admin');

    // Mobile Bottom Navigation
    const mobNav = document.getElementById('mobileBottomNav');
    if (mobNav) {
      const showMobNav = isAuthed && viewName !== 'test';
      mobNav.classList.toggle('hidden', !showMobNav);
    }
    const mobDash = document.getElementById('mobTabDash');
    const mobStudy = document.getElementById('mobTabStudy');
    const mobAdmin = document.getElementById('mobTabAdmin');
    if (mobDash) mobDash.classList.toggle('active', viewName === 'dashboard');
    if (mobStudy) mobStudy.classList.toggle('active', viewName === 'study');
    if (mobAdmin) mobAdmin.classList.toggle('active', viewName === 'admin');

    if (viewName === 'dashboard') {
      this.loadDashboard();
    } else if (viewName === 'study') {
      this.loadStudy();
    } else if (viewName === 'admin') {
      this.loadAdminUsers();
    }
  },

  // Auth Methods
  switchAuthTab(tab) {
    const isLogin = tab === 'login';
    document.getElementById('tabLoginBtn').classList.toggle('active', isLogin);
    document.getElementById('tabRegisterBtn').classList.toggle('active', !isLogin);
    document.getElementById('loginForm').classList.toggle('hidden', !isLogin);
    document.getElementById('registerForm').classList.toggle('hidden', isLogin);
    this.showAuthAlert('', '');
  },

  togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
      input.type = 'text';
      btn.textContent = '🙈';
    } else {
      input.type = 'password';
      btn.textContent = '👁️';
    }
  },

  showAuthAlert(message, type = 'error') {
    const alertBox = document.getElementById('authAlert');
    if (!message) {
      alertBox.className = 'alert-box hidden';
      alertBox.textContent = '';
      return;
    }
    alertBox.className = `alert-box ${type}`;
    alertBox.textContent = message;
  },

  async handleLogin(e) {
    e.preventDefault();
    const usernameInput = document.getElementById('loginUsername');
    const passwordInput = document.getElementById('loginPassword');
    const username = usernameInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const btn = document.getElementById('loginSubmitBtn');

    if (!username || !password) {
      this.showAuthAlert(this.t('loginPrompt'), 'error');
      return;
    }

    try {
      btn.disabled = true;
      btn.textContent = '...';
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, deviceId: this.deviceId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || this.t('loginFailed'));

      this.token = data.token;
      this.currentUser = data.user;
      if (data.adminWhatsapp) this.adminWhatsapp = data.adminWhatsapp;
      localStorage.setItem('pdd_token', this.token);
      this.showAuthAlert('', '');
      passwordInput.value = '';
      this.updateUserUI();

      if (this.currentUser.role === 'admin') {
        this.navigate('admin');
      } else {
        this.navigate('dashboard');
      }
    } catch (err) {
      this.showAuthAlert(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<span id="loginSubmitText">${this.t('loginSubmitText')}</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const fullNameInput = document.getElementById('regFullName');
    const usernameInput = document.getElementById('regUsername');
    const passwordInput = document.getElementById('regPassword');
    const passwordConfirmInput = document.getElementById('regPasswordConfirm');

    const full_name = fullNameInput.value.trim();
    const username = usernameInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const passwordConfirm = passwordConfirmInput.value;
    const btn = document.getElementById('registerSubmitBtn');

    // Client-side validations
    if (!full_name || full_name.length < 2) {
      this.showAuthAlert(this.t('nameTooShort'), 'error');
      return;
    }
    if (!username || username.length < 3) {
      this.showAuthAlert(this.t('usernameTooShort'), 'error');
      return;
    }
    if (/\s/.test(username)) {
      this.showAuthAlert(this.t('usernameHasSpace'), 'error');
      return;
    }
    if (!password || password.trim().length < 4) {
      this.showAuthAlert(this.t('passwordTooShort'), 'error');
      return;
    }
    if (password !== passwordConfirm) {
      this.showAuthAlert(this.t('passwordsDoNotMatch'), 'error');
      return;
    }

    try {
      btn.disabled = true;
      btn.textContent = '...';
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name, username, password, deviceId: this.deviceId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Тіркелу қатесі');

      this.token = data.token;
      this.currentUser = data.user;
      if (data.adminWhatsapp) this.adminWhatsapp = data.adminWhatsapp;
      localStorage.setItem('pdd_token', this.token);
      this.showAuthAlert('', '');
      passwordInput.value = '';
      passwordConfirmInput.value = '';
      this.updateUserUI();
      this.navigate('dashboard');
    } catch (err) {
      this.showAuthAlert(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<span id="registerSubmitText">${this.t('regSubmitText')}</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
    }
  },

  async checkAuth() {
    try {
      const { ok, status, data } = await this.apiFetch('/api/auth/me');
      if (!ok || !data.user) {
        if (status !== 403) this.logout();
        return;
      }
      this.currentUser = data.user;
      if (data.adminWhatsapp) this.adminWhatsapp = data.adminWhatsapp;
      this.updateUserUI();

      if (this.currentUser.role === 'admin') {
        this.navigate('admin');
      } else {
        this.navigate('dashboard');
      }
    } catch (e) {
      this.logout();
    }
  },

  updateUserUI() {
    if (!this.currentUser) return;
    const navFullName = document.getElementById('navFullName');
    const navAvatar = document.getElementById('navAvatar');
    const dashGreeting = document.getElementById('dashUserGreeting');
    const navLinkAdmin = document.getElementById('navLinkAdmin');

    const isAdmin = this.currentUser.role === 'admin';
    const roleBadge = isAdmin ? ' 👑 (Әкімші)' : '';

    if (navFullName) navFullName.textContent = (this.currentUser.fullName || this.currentUser.username) + roleBadge;
    if (navAvatar) navAvatar.textContent = (this.currentUser.fullName || this.currentUser.username)[0].toUpperCase();
    if (dashGreeting) dashGreeting.textContent = `${this.t('welcome')}, ${this.currentUser.fullName || this.currentUser.username}!`;

    if (navLinkAdmin) {
      navLinkAdmin.classList.toggle('hidden', !isAdmin);
    }
    const mobTabAdmin = document.getElementById('mobTabAdmin');
    if (mobTabAdmin) {
      mobTabAdmin.classList.toggle('hidden', !isAdmin);
    }
  },

  async logout() {
    if (this.currentTest) {
      this.pauseTest(false);
    }
    if (this.token) {
      try {
        await this.apiFetch('/api/auth/logout', { method: 'POST' });
      } catch (e) {}
    }
    this.token = null;
    this.currentUser = null;
    localStorage.removeItem('pdd_token');
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.navigate('auth');
  },

  // Dashboard & History
  async loadDashboard() {
    this.updateUserUI();
    this.updateTimeModeButtons();
    this.applyUiTranslations();

    // Toggle Locked Paywall Banner
    const isLocked = this.currentUser && this.currentUser.role !== 'admin' && !this.currentUser.hasAccess;
    const lockedBanner = document.getElementById('lockedAccountBanner');
    if (lockedBanner) lockedBanner.classList.toggle('hidden', !isLocked);

    this.checkAndPromptActiveTest();
    await this.loadHistory();
  },

  async loadHistory() {
    try {
      const { ok, data } = await this.apiFetch('/api/history');
      if (!ok || !data) return;
      const { history, stats } = data;

      // Render stats
      document.getElementById('statTotalTests').textContent = stats.totalTests;
      document.getElementById('statPassedTests').textContent = stats.passedTests;
      document.getElementById('statBestScore').innerHTML = `${stats.bestScore} <span class="stat-unit">/ 40</span>`;
      document.getElementById('statAvgScore').innerHTML = `${stats.avgScore} <span class="stat-unit">/ 40</span>`;

      // Render history table
      const tbody = document.getElementById('historyTableBody');
      if (!history || history.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Әзірге тесттер тапсырылмаған. Алғашқы тестті бастаңыз!</td></tr>`;
        return;
      }

      tbody.innerHTML = history.map((h, i) => {
        const dateStr = new Date(h.created_at).toLocaleString('kk-KZ', {
          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        const mins = Math.floor(h.time_spent_seconds / 60);
        const secs = h.time_spent_seconds % 60;
        const timeStr = `${mins} мин ${secs} сек`;
        const percentage = Math.round((h.score / h.total_questions) * 100);
        const langTag = h.language === 'kk' ? '🇰🇿 ҚАЗ' : (h.language === 'ru' ? '🇷🇺 РУС' : '🇬🇧 ENG');
        const isPassed = h.passed === 1;

        return `
          <tr>
            <td><strong>#${history.length - i}</strong></td>
            <td>${dateStr}</td>
            <td>${langTag}</td>
            <td><strong>${h.score} / ${h.total_questions}</strong></td>
            <td>${percentage}%</td>
            <td>${timeStr}</td>
            <td>
              <span class="status-badge ${isPassed ? 'status-passed' : 'status-failed'}">
                ${isPassed ? 'ӨТТІ ✅' : 'ӨТПЕДІ ❌'}
              </span>
            </td>
            <td>
              <button class="btn btn-secondary btn-sm" onclick="app.viewPastAttempt(${h.id})">
                ${app.t('actionReview')}
              </button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      console.error('History load error:', e);
    }
  },

  // ================= ACTIVE TEST PERSISTENCE & PAUSE / RESUME =================

  saveActiveTestState() {
    if (!this.currentTest || !this.currentUser) return;
    const userId = this.currentUser.id || this.currentUser.userId;
    const state = {
      userId,
      sessionId: this.currentTest.sessionId,
      questions: this.currentTest.questions,
      currentIndex: this.currentTest.currentIndex,
      userAnswers: this.currentTest.userAnswers,
      bookmarks: Array.from(this.currentTest.bookmarks),
      isTimed: this.currentTest.isTimed,
      timeRemaining: this.currentTest.timeRemaining,
      elapsedSeconds: this.currentTest.elapsedSeconds || 0,
      startTime: this.currentTest.startTime,
      questionLang: this.questionLang,
      savedAt: Date.now()
    };
    localStorage.setItem(`pdd_saved_test_${userId}`, JSON.stringify(state));
  },

  loadActiveTestState() {
    if (!this.currentUser) return null;
    const userId = this.currentUser.id || this.currentUser.userId;
    const raw = localStorage.getItem(`pdd_saved_test_${userId}`);
    if (!raw) return null;
    try {
      const state = JSON.parse(raw);
      return state;
    } catch (e) {
      return null;
    }
  },

  clearActiveTestState() {
    if (!this.currentUser) return;
    const userId = this.currentUser.id || this.currentUser.userId;
    localStorage.removeItem(`pdd_saved_test_${userId}`);
  },

  checkAndPromptActiveTest() {
    const banner = document.getElementById('activeTestAlertBanner');
    if (!banner) return;

    let test = this.currentTest;
    if (!test) {
      const saved = this.loadActiveTestState();
      if (saved) {
        test = saved;
      }
    }

    if (test && test.questions && test.questions.length > 0) {
      const answeredCount = Object.keys(test.userAnswers || {}).length;
      let timeStr = '';
      if (test.isTimed) {
        const mins = Math.floor(test.timeRemaining / 60);
        const secs = test.timeRemaining % 60;
        timeStr = `Қалған уақыт: ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} (⏱️ 40 мин)`;
      } else {
        const mins = Math.floor((test.elapsedSeconds || 0) / 60);
        const secs = (test.elapsedSeconds || 0) % 60;
        timeStr = `Жұмсалған уақыт: ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} (♾️ Шектеусіз)`;
      }

      const metaText = document.getElementById('activeTestMetaText');
      if (metaText) {
        metaText.textContent = `${timeStr} | Жауап берілгені: ${answeredCount} / 40 сұрақ`;
      }
      banner.classList.remove('hidden');
    } else {
      banner.classList.add('hidden');
    }
  },

  pauseTest(showModal = true) {
    if (!this.currentTest) return;
    this.isPaused = true;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.saveActiveTestState();

    if (showModal) {
      const answeredCount = Object.keys(this.currentTest.userAnswers || {}).length;
      let timeInfo = '';
      if (this.currentTest.isTimed) {
        const mins = Math.floor(this.currentTest.timeRemaining / 60);
        const secs = this.currentTest.timeRemaining % 60;
        timeInfo = `Қалған уақыт: ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      } else {
        const mins = Math.floor((this.currentTest.elapsedSeconds || 0) / 60);
        const secs = (this.currentTest.elapsedSeconds || 0) % 60;
        timeInfo = `Жұмсалған уақыт: ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} (Шектеусіз)`;
      }

      const statsInfo = document.getElementById('pauseStatsInfo');
      if (statsInfo) {
        statsInfo.textContent = `${timeInfo} | Жауап берілгені: ${answeredCount} / 40`;
      }
      const pauseModal = document.getElementById('pauseModal');
      if (pauseModal) pauseModal.classList.remove('hidden');
    }
  },

  resumeTest() {
    // If not loaded in memory, restore from localStorage
    if (!this.currentTest) {
      const saved = this.loadActiveTestState();
      if (!saved) {
        alert('Сақталған тест табылмады.');
        return;
      }
      this.currentTest = {
        sessionId: saved.sessionId,
        questions: saved.questions,
        currentIndex: saved.currentIndex || 0,
        userAnswers: saved.userAnswers || {},
        bookmarks: new Set(saved.bookmarks || []),
        isTimed: saved.isTimed !== false,
        timeRemaining: saved.timeRemaining,
        elapsedSeconds: saved.elapsedSeconds || 0,
        startTime: saved.startTime || Date.now()
      };
      if (saved.questionLang) {
        this.questionLang = saved.questionLang;
      }
    }

    this.isPaused = false;
    const pauseModal = document.getElementById('pauseModal');
    if (pauseModal) pauseModal.classList.add('hidden');
    const banner = document.getElementById('activeTestAlertBanner');
    if (banner) banner.classList.add('hidden');

    this.navigate('test');
    this.initPalette();
    this.renderQuestion(this.currentTest.currentIndex);
    this.startTimer();
    this.updateLanguageButtons();
  },

  leaveTestToDashboard() {
    this.pauseTest(false);
    const pauseModal = document.getElementById('pauseModal');
    if (pauseModal) pauseModal.classList.add('hidden');
    this.navigate('dashboard');
  },

  discardActiveTest() {
    if (!confirm('Бұл аяқталмаған тестті толығымен жойғыңыз келе ме? Барлық белгіленген жауаптар өшіріледі.')) {
      return;
    }
    this.clearActiveTestState();
    this.currentTest = null;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    const banner = document.getElementById('activeTestAlertBanner');
    if (banner) banner.classList.add('hidden');
    const pauseModal = document.getElementById('pauseModal');
    if (pauseModal) pauseModal.classList.add('hidden');
  },

  confirmFinishActiveTest() {
    if (!this.currentTest) {
      const saved = this.loadActiveTestState();
      if (saved) {
        this.currentTest = {
          sessionId: saved.sessionId,
          questions: saved.questions,
          currentIndex: saved.currentIndex || 0,
          userAnswers: saved.userAnswers || {},
          bookmarks: new Set(saved.bookmarks || []),
          isTimed: saved.isTimed !== false,
          timeRemaining: saved.timeRemaining,
          elapsedSeconds: saved.elapsedSeconds || 0,
          startTime: saved.startTime || Date.now()
        };
        if (saved.questionLang) {
          this.questionLang = saved.questionLang;
        }
      }
    }
    if (this.currentTest) {
      this.confirmFinishTest();
    }
  },

  // ================= TEST MODE =================

  async startNewTest() {
    // Paywall check
    if (this.currentUser && this.currentUser.role !== 'admin' && !this.currentUser.hasAccess) {
      this.openPaywallModal();
      return;
    }

    // Check if there is already an unfinished test
    if (this.currentTest || this.loadActiveTestState()) {
      if (!confirm('Сізде аяқталмаған тест бар. Оны өшіріп, жаңадан бастағыңыз келе ме?')) {
        this.resumeTest();
        return;
      }
      this.clearActiveTestState();
      this.currentTest = null;
    }

    try {
      const { ok, data } = await this.apiFetch(`/api/test/start?lang=${this.questionLang}&timed=${this.isTimed}`);
      if (!ok) {
        if (data.error) alert(data.error);
        return;
      }

      this.currentTest = {
        sessionId: data.testSessionId,
        questions: data.questions,
        currentIndex: 0,
        userAnswers: {},
        bookmarks: new Set(),
        isTimed: data.timed,
        timeRemaining: data.timed ? 40 * 60 : 0,
        elapsedSeconds: 0,
        startTime: Date.now()
      };
      this.isPaused = false;

      this.saveActiveTestState();
      this.navigate('test');
      this.initPalette();
      this.renderQuestion(0);
      this.startTimer();
      this.updateLanguageButtons();
    } catch (err) {
      alert(err.message);
    }
  },

  startTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    const timerDigits = document.getElementById('testTimer');
    const timerBadge = document.getElementById('timerBadge');
    const timerIcon = document.getElementById('timerIcon');
    const badgeTestMode = document.getElementById('badgeTestModeText');

    if (this.currentTest.isTimed) {
      if (timerIcon) timerIcon.textContent = '⏳';
      if (badgeTestMode) badgeTestMode.textContent = this.t('testModeBadgeTimed');
    } else {
      if (timerIcon) timerIcon.textContent = '⏱️';
      if (badgeTestMode) badgeTestMode.textContent = this.t('testModeBadgeUntimed');
      if (timerBadge) timerBadge.classList.remove('timer-danger');
    }

    this.timerInterval = setInterval(() => {
      if (!this.currentTest || this.isPaused) {
        clearInterval(this.timerInterval);
        return;
      }

      if (this.currentTest.isTimed) {
        this.currentTest.timeRemaining--;

        const mins = Math.floor(Math.max(0, this.currentTest.timeRemaining) / 60);
        const secs = Math.max(0, this.currentTest.timeRemaining) % 60;
        if (timerDigits) {
          timerDigits.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }

        if (this.currentTest.timeRemaining <= 300) {
          if (timerBadge) timerBadge.classList.add('timer-danger');
        } else {
          if (timerBadge) timerBadge.classList.remove('timer-danger');
        }

        if (this.currentTest.timeRemaining % 5 === 0) {
          this.saveActiveTestState();
        }

        if (this.currentTest.timeRemaining <= 0) {
          clearInterval(this.timerInterval);
          alert(this.t('timeOut'));
          this.submitTest();
        }
      } else {
        this.currentTest.elapsedSeconds = (this.currentTest.elapsedSeconds || 0) + 1;
        const mins = Math.floor(this.currentTest.elapsedSeconds / 60);
        const secs = this.currentTest.elapsedSeconds % 60;
        if (timerDigits) {
          timerDigits.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }

        if (this.currentTest.elapsedSeconds % 5 === 0) {
          this.saveActiveTestState();
        }
      }
    }, 1000);
  },

  initPalette() {
    const grid = document.getElementById('paletteGrid');
    grid.innerHTML = '';
    for (let i = 0; i < 40; i++) {
      const btn = document.createElement('button');
      btn.className = 'pal-btn';
      btn.id = `palBtn_${i}`;
      btn.textContent = i + 1;
      btn.onclick = () => this.renderQuestion(i);
      grid.appendChild(btn);
    }
  },

  updatePalette() {
    if (!this.currentTest) return;
    for (let i = 0; i < 40; i++) {
      const btn = document.getElementById(`palBtn_${i}`);
      if (!btn) continue;

      btn.classList.toggle('active', i === this.currentTest.currentIndex);
      btn.classList.toggle('answered', this.currentTest.userAnswers[i] !== undefined);
      btn.classList.toggle('flagged', this.currentTest.bookmarks.has(i));
    }

    // Auto-scroll active button into view on mobile ribbon
    const activeBtn = document.getElementById(`palBtn_${this.currentTest.currentIndex}`);
    if (activeBtn && activeBtn.scrollIntoView) {
      activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  },

  renderQuestion(index) {
    if (!this.currentTest || !this.currentTest.questions[index]) return;
    this.currentTest.currentIndex = index;
    const q = this.currentTest.questions[index];

    const langData = q[this.questionLang] || q.kk || q.ru || q;

    document.getElementById('testProgressIndicator').textContent = `${this.t('questionWord')}: ${index + 1} / 40`;
    document.getElementById('qNumberDisplay').textContent = `${this.t('questionWord')} № ${index + 1}`;

    const isBookmarked = this.currentTest.bookmarks.has(index);
    const bookmarkBtn = document.getElementById('bookmarkBtn');
    bookmarkBtn.classList.toggle('flagged', isBookmarked);
    document.getElementById('bookmarkText').textContent = isBookmarked ? this.t('bookmarked') : this.t('bookmark');

    const imgContainer = document.getElementById('qImageContainer');
    const qImg = document.getElementById('qImage');
    if (q.hasImage && q.imageUrl) {
      qImg.src = q.imageUrl;
      imgContainer.classList.remove('hidden');
    } else {
      imgContainer.classList.add('hidden');
    }

    document.getElementById('qText').textContent = langData.question;

    const optionsList = document.getElementById('qOptionsList');
    optionsList.innerHTML = '';
    const selectedOpt = this.currentTest.userAnswers[index];
    const currentOptions = langData.options || q.options;

    currentOptions.forEach((optText, optIdx) => {
      const isSelected = selectedOpt === optIdx;
      const optEl = document.createElement('div');
      optEl.className = `option-item ${isSelected ? 'selected' : ''}`;
      optEl.onclick = () => this.selectOption(optIdx);

      optEl.innerHTML = `
        <div class="opt-index">${optIdx + 1}</div>
        <div class="opt-text">${optText}</div>
      `;
      optionsList.appendChild(optEl);
    });

    const ansStatus = document.getElementById('qAnswerStatus');
    if (selectedOpt !== undefined) {
      ansStatus.textContent = `${this.t('answered')} (${selectedOpt + 1})`;
      ansStatus.style.color = '#34d399';
    } else {
      ansStatus.textContent = this.t('unanswered');
      ansStatus.style.color = '#94a3b8';
    }

    document.getElementById('btnPrevQuestion').disabled = (index === 0);
    document.getElementById('btnNextQuestion').disabled = (index === 39);

    this.updatePalette();
    this.updateLanguageButtons();
  },

  selectOption(optionIndex) {
    if (!this.currentTest) return;
    const curIdx = this.currentTest.currentIndex;
    this.currentTest.userAnswers[curIdx] = optionIndex;
    this.renderQuestion(curIdx);
    this.saveActiveTestState();
  },

  toggleBookmark() {
    if (!this.currentTest) return;
    const curIdx = this.currentTest.currentIndex;
    if (this.currentTest.bookmarks.has(curIdx)) {
      this.currentTest.bookmarks.delete(curIdx);
    } else {
      this.currentTest.bookmarks.add(curIdx);
    }
    this.renderQuestion(curIdx);
    this.saveActiveTestState();
  },

  prevQuestion() {
    if (!this.currentTest || this.currentTest.currentIndex <= 0) return;
    this.renderQuestion(this.currentTest.currentIndex - 1);
    this.saveActiveTestState();
  },

  nextQuestion() {
    if (!this.currentTest || this.currentTest.currentIndex >= 39) return;
    this.renderQuestion(this.currentTest.currentIndex + 1);
    this.saveActiveTestState();
  },

  confirmFinishTest() {
    const answeredCount = Object.keys(this.currentTest.userAnswers).length;
    let message = this.t('confirmFinish');
    if (answeredCount < 40) {
      message = `Сіз 40 сұрақтың тек ${answeredCount}-не жауап бердіңіз. Қалған ${40 - answeredCount} сұрақ қате деп есептеледі.\n\nТестті аяқтауды растайсыз ба?`;
    }
    if (confirm(message)) {
      this.submitTest();
    }
  },

  async submitTest() {
    if (!this.currentTest) return;
    if (this.timerInterval) clearInterval(this.timerInterval);

    const timeSpentSeconds = this.currentTest.isTimed
      ? Math.max(1, (40 * 60) - this.currentTest.timeRemaining)
      : Math.max(1, this.currentTest.elapsedSeconds || Math.round((Date.now() - this.currentTest.startTime) / 1000));

    const answersPayload = this.currentTest.questions.map((q, idx) => ({
      questionId: q.id,
      selectedIndex: this.currentTest.userAnswers[idx] !== undefined ? this.currentTest.userAnswers[idx] : -1
    }));

    try {
      const { ok, data } = await this.apiFetch('/api/test/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testSessionId: this.currentTest.sessionId,
          timeSpentSeconds,
          language: this.questionLang,
          timed: this.currentTest.isTimed,
          answers: answersPayload
        })
      });

      if (!ok) {
        if (data.error) alert(data.error);
        return;
      }

      this.clearActiveTestState();
      this.currentTest = null;
      this.isPaused = false;

      const pauseModal = document.getElementById('pauseModal');
      if (pauseModal) pauseModal.classList.add('hidden');
      const banner = document.getElementById('activeTestAlertBanner');
      if (banner) banner.classList.add('hidden');

      this.lastResult = data;
      this.renderResult(data);
    } catch (err) {
      alert('Қате: ' + err.message);
    }
  },

  // ================= RESULTS & REVIEW =================

  renderResult(data) {
    this.navigate('result');
    this.lastResult = data;
    this.reviewFilter = 'all';

    const isPassed = data.passed;
    const scoreEl = document.getElementById('resultScore');
    const badgeEl = document.getElementById('resultStatusBadge');
    const iconEl = document.getElementById('resultStatusIcon');
    const msgEl = document.getElementById('resultMessage');

    scoreEl.textContent = data.score;
    scoreEl.className = `result-score ${isPassed ? 'passed' : 'failed'}`;

    badgeEl.textContent = isPassed ? this.t('passedTitle') : this.t('failedTitle');
    badgeEl.className = `result-badge ${isPassed ? 'passed' : 'failed'}`;

    iconEl.textContent = isPassed ? '🎉' : '❌';
    msgEl.textContent = isPassed ? this.t('passedMsg') : this.t('failedMsg');

    document.getElementById('resultPercentage').textContent = `${data.percentage}%`;
    document.getElementById('resultCorrectCount').textContent = data.score;
    document.getElementById('resultWrongCount').textContent = data.totalQuestions - data.score;

    const mins = Math.floor(data.timeSpentSeconds / 60);
    const secs = data.timeSpentSeconds % 60;
    const modeNote = (data.timed === false) ? ' (Уақытсыз режим)' : ' (40 мин)';
    document.getElementById('resultTimeSpent').textContent = `${mins} мин ${secs} сек${modeNote}`;

    this.renderReviewList();
    this.updateLanguageButtons();
  },

  filterReview(filter) {
    this.reviewFilter = filter;
    document.querySelectorAll('.review-filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    this.renderReviewList();
  },

  renderReviewList() {
    if (!this.lastResult || !this.lastResult.answers) return;
    const container = document.getElementById('reviewQuestionsList');
    container.innerHTML = '';

    let items = this.lastResult.answers;
    if (this.reviewFilter === 'wrong') {
      items = items.filter(a => !a.isCorrect);
    } else if (this.reviewFilter === 'correct') {
      items = items.filter(a => a.isCorrect);
    }

    if (items.length === 0) {
      container.innerHTML = `<div class="text-center py-4 text-muted">Бұл санатта сұрақтар жоқ.</div>`;
      return;
    }

    items.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = `review-item ${item.isCorrect ? 'is-correct' : 'is-wrong'}`;

      let imgHtml = '';
      if (item.hasImage && item.imageUrl) {
        imgHtml = `<img src="${item.imageUrl}" class="review-img" onclick="app.openImageModal(this.src)" alt="Жол ситуациясы">`;
      }

      const langData = item[this.questionLang] || item.kk || item.ru || item;
      const questionText = langData.question;
      const currentOptions = langData.options || item.options;

      const optionsHtml = currentOptions.map((optText, optIdx) => {
        const isSelected = item.userSelected === optIdx;
        const isCorrect = item.correctIndex === optIdx;
        let optClass = 'review-opt';
        let tagHtml = '';

        if (isCorrect) {
          optClass += ' opt-correct';
          tagHtml = `<span class="review-opt-tag">${app.t('correctAnswer')} ✓</span>`;
        } else if (isSelected) {
          optClass += ' opt-user-wrong';
          tagHtml = `<span class="review-opt-tag">${app.t('yourAnswer')} ✗</span>`;
        }

        return `
          <div class="${optClass}">
            <span class="opt-index">${optIdx + 1}</span>
            <span class="opt-text">${optText}</span>
            ${tagHtml}
          </div>
        `;
      }).join('');

      card.innerHTML = `
        <div class="review-item-header">
          <span class="q-number-pill">${app.t('questionWord')} № ${item.number || (idx + 1)}</span>
          <span class="review-badge ${item.isCorrect ? 'correct' : 'wrong'}">
            ${item.isCorrect ? 'ДҰРЫС ✓' : 'ҚАТЕ ✗'}
          </span>
        </div>
        ${imgHtml}
        <div class="review-q-text">${questionText}</div>
        <div class="review-options">
          ${optionsHtml}
        </div>
      `;

      container.appendChild(card);
    });
  },

  async viewPastAttempt(attemptId) {
    try {
      const { ok, data } = await this.apiFetch(`/api/history/${attemptId}`);
      if (!ok) throw new Error(data.error || 'Нәтиже жүктелмеді');
      this.renderResult({
        score: data.score,
        totalQuestions: data.total_questions,
        percentage: Math.round((data.score / data.total_questions) * 100),
        passed: data.passed === 1,
        timeSpentSeconds: data.time_spent_seconds,
        answers: data.answers
      });
    } catch (err) {
      alert('Қате: ' + err.message);
    }
  },

  // ================= STUDY & MEMORIZATION =================

  loadStudy() {
    if (this.currentUser && this.currentUser.role !== 'admin' && !this.currentUser.hasAccess) {
      this.openPaywallModal();
      return;
    }

    this.updateLanguageButtons();
    if (this.studyMode === 'list') {
      this.loadStudyQuestions();
    } else {
      this.loadTrainerQuestion(this.trainerCurrentId || 1);
    }
  },

  setStudyMode(mode) {
    this.studyMode = mode;
    document.getElementById('btnModeList').classList.toggle('active', mode === 'list');
    document.getElementById('btnModeTrainer').classList.toggle('active', mode === 'trainer');
    document.getElementById('studyListView').classList.toggle('hidden', mode !== 'list');
    document.getElementById('studyTrainerView').classList.toggle('hidden', mode !== 'trainer');

    if (mode === 'list') {
      this.loadStudyQuestions();
    } else {
      this.loadTrainerQuestion(this.trainerCurrentId || 1);
    }
  },

  async loadStudyQuestions() {
    const container = document.getElementById('studyCardsContainer');
    const info = document.getElementById('studyCountInfo');
    container.innerHTML = '<div class="text-center py-4 text-muted">Сұрақтар жүктелуде...</div>';

    try {
      const query = new URLSearchParams({
        lang: this.questionLang,
        page: this.studyPage,
        limit: this.studyLimit,
        search: this.studySearch,
        filter: this.studyFilter
      });

      const { ok, data } = await this.apiFetch(`/api/study/questions?${query.toString()}`);
      if (!ok) {
        container.innerHTML = `<div class="text-center py-4 text-danger">${data.error || 'Сұрақтарды жүктеу сәтсіз аяқталды'}</div>`;
        return;
      }

      info.textContent = `Табылды: ${data.total} сұрақ (Бет ${data.page} / ${data.totalPages})`;
      this.renderStudyCards(data.questions);
      this.renderStudyPagination(data.totalPages, data.page);
    } catch (err) {
      container.innerHTML = `<div class="text-center py-4 text-danger">Қате: ${err.message}</div>`;
    }
  },

  renderStudyCards(items) {
    const container = document.getElementById('studyCardsContainer');
    container.innerHTML = '';

    if (!items || items.length === 0) {
      container.innerHTML = '<div class="text-center py-4 text-muted">Сұрақтар табылмады.</div>';
      return;
    }

    items.forEach(q => {
      const card = document.createElement('div');
      card.className = 'study-card';

      let imgHtml = '';
      if (q.hasImage && q.imageUrl) {
        imgHtml = `
          <div class="q-image-box" style="margin-bottom: 1rem; max-width: 420px;">
            <img src="${q.imageUrl}" alt="Жол ситуациясы" onclick="app.openImageModal(this.src)">
            <div class="q-image-hint">🔍 Үлкейтіп көру үшін суретті басыңыз</div>
          </div>
        `;
      }

      const langData = q[this.questionLang] || q.kk || q.ru || q;
      const questionText = langData.question;
      const questionOptions = langData.options || q.options;

      const optionsHtml = questionOptions.map((optText, optIdx) => {
        const isCorrect = optIdx === q.correct_index;
        const showCorrect = this.showCorrectAnswers && isCorrect;

        return `
          <div class="study-opt ${showCorrect ? 'is-correct' : ''}">
            <span class="opt-index">${optIdx + 1}</span>
            <span class="opt-text">${optText}</span>
            ${showCorrect ? `<span class="study-correct-tag">${this.t('correctAnswer')} ✓</span>` : ''}
          </div>
        `;
      }).join('');

      card.innerHTML = `
        <div class="study-card-header">
          <span class="study-card-badge">${this.t('questionWord')} № ${q.number}</span>
          <button class="btn btn-outline btn-sm" onclick="app.openTrainerForQuestion(${q.id})">
            <span>Тренажерде ашу 🎯</span>
          </button>
        </div>
        ${imgHtml}
        <div class="study-card-q">${questionText}</div>
        <div class="study-options">
          ${optionsHtml}
        </div>
      `;

      container.appendChild(card);
    });
  },

  renderStudyPagination(totalPages, currentPage) {
    const pag = document.getElementById('studyPagination');
    pag.innerHTML = '';

    if (totalPages <= 1) return;

    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.innerHTML = '&laquo;';
    prevBtn.disabled = (currentPage === 1);
    prevBtn.onclick = () => {
      this.studyPage = currentPage - 1;
      this.loadStudyQuestions();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    pag.appendChild(prevBtn);

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);

    if (startPage > 1) {
      const firstBtn = document.createElement('button');
      firstBtn.className = 'page-btn';
      firstBtn.textContent = '1';
      firstBtn.onclick = () => {
        this.studyPage = 1;
        this.loadStudyQuestions();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };
      pag.appendChild(firstBtn);
      if (startPage > 2) {
        const dots = document.createElement('span');
        dots.textContent = '...';
        dots.className = 'text-muted px-1';
        pag.appendChild(dots);
      }
    }

    for (let p = startPage; p <= endPage; p++) {
      const btn = document.createElement('button');
      btn.className = `page-btn ${p === currentPage ? 'active' : ''}`;
      btn.textContent = p;
      btn.onclick = () => {
        this.studyPage = p;
        this.loadStudyQuestions();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };
      pag.appendChild(btn);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const dots = document.createElement('span');
        dots.textContent = '...';
        dots.className = 'text-muted px-1';
        pag.appendChild(dots);
      }
      const lastBtn = document.createElement('button');
      lastBtn.className = 'page-btn';
      lastBtn.textContent = totalPages;
      lastBtn.onclick = () => {
        this.studyPage = totalPages;
        this.loadStudyQuestions();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };
      pag.appendChild(lastBtn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.innerHTML = '&raquo;';
    nextBtn.disabled = (currentPage === totalPages);
    nextBtn.onclick = () => {
      this.studyPage = currentPage + 1;
      this.loadStudyQuestions();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    pag.appendChild(nextBtn);
  },

  handleStudySearch(val) {
    clearTimeout(this.studySearchTimeout);
    const clearBtn = document.getElementById('studySearchClear');
    if (clearBtn) clearBtn.classList.toggle('hidden', !val);

    this.studySearchTimeout = setTimeout(() => {
      this.studySearch = val.trim();
      this.studyPage = 1;
      this.loadStudyQuestions();
    }, 350);
  },

  clearStudySearch() {
    const input = document.getElementById('studySearchInput');
    if (input) input.value = '';
    document.getElementById('studySearchClear').classList.add('hidden');
    this.studySearch = '';
    this.studyPage = 1;
    this.loadStudyQuestions();
  },

  handleStudyFilter(val) {
    this.studyFilter = val;
    this.studyPage = 1;
    this.loadStudyQuestions();
  },

  toggleShowAnswers(checked) {
    this.showCorrectAnswers = checked;
    this.loadStudyQuestions();
  },

  jumpToQuestion() {
    const input = document.getElementById('quickJumpInput');
    const num = parseInt(input.value);
    if (isNaN(num) || num < 1 || num > 1103) {
      alert('1 мен 1103 аралығындағы сұрақ нөмірін енгізіңіз');
      return;
    }
    this.studySearch = num.toString();
    document.getElementById('studySearchInput').value = num.toString();
    document.getElementById('studySearchClear').classList.remove('hidden');
    this.studyPage = 1;
    this.loadStudyQuestions();
  },

  openTrainerForQuestion(qId) {
    this.setStudyMode('trainer');
    this.loadTrainerQuestion(qId);
  },

  // Trainer Methods
  async loadTrainerQuestion(qId) {
    if (qId < 1) qId = 1;
    if (qId > 1103) qId = 1103;
    this.trainerCurrentId = qId;
    this.trainerAnswered = false;

    const feedbackBox = document.getElementById('trainerFeedback');
    feedbackBox.className = 'trainer-feedback hidden';
    feedbackBox.textContent = '';

    document.getElementById('trainerJumpInput').value = qId;
    document.getElementById('trainerQNumber').textContent = `${this.t('questionWord')} № ${qId}`;

    try {
      const { ok, data } = await this.apiFetch(`/api/study/question/${qId}?lang=${this.questionLang}`);
      if (!ok) {
        document.getElementById('trainerQText').textContent = data.error || 'Сұрақ табылмады';
        return;
      }
      const q = data;
      this.trainerData = q;

      const imgBox = document.getElementById('trainerImgBox');
      const img = document.getElementById('trainerImg');
      if (q.hasImage && q.imageUrl) {
        img.src = q.imageUrl;
        imgBox.classList.remove('hidden');
      } else {
        imgBox.classList.add('hidden');
      }

      const langData = q[this.questionLang] || q.kk || q.ru || q;
      document.getElementById('trainerQText').textContent = langData.question;

      const list = document.getElementById('trainerOptionsList');
      list.innerHTML = '';
      const currentOptions = langData.options || q.options;

      currentOptions.forEach((optText, optIdx) => {
        const item = document.createElement('div');
        item.className = 'trainer-opt';
        item.id = `trainerOpt_${optIdx}`;
        item.onclick = () => this.selectTrainerOption(optIdx);

        item.innerHTML = `
          <div class="opt-index">${optIdx + 1}</div>
          <div class="opt-text">${optText}</div>
        `;
        list.appendChild(item);
      });
    } catch (err) {
      document.getElementById('trainerQText').textContent = 'Қате: ' + err.message;
    }
  },

  selectTrainerOption(selectedIndex) {
    if (!this.trainerData || this.trainerAnswered) return;
    this.trainerAnswered = true;

    const correctIndex = this.trainerData.correct_index;
    const isCorrect = (selectedIndex === correctIndex);
    const langData = this.trainerData[this.questionLang] || this.trainerData.kk || this.trainerData.ru || this.trainerData;
    const currentOptions = langData.options || this.trainerData.options;

    currentOptions.forEach((_, idx) => {
      const optEl = document.getElementById(`trainerOpt_${idx}`);
      if (!optEl) return;
      optEl.classList.add('revealed');
      if (idx === correctIndex) {
        optEl.classList.add('correct-choice');
      } else if (idx === selectedIndex) {
        optEl.classList.add('wrong-choice');
      }
    });

    const feedbackBox = document.getElementById('trainerFeedback');
    feedbackBox.classList.remove('hidden');
    if (isCorrect) {
      feedbackBox.className = 'trainer-feedback correct';
      feedbackBox.innerHTML = '🎉 <strong>Дұрыс!</strong> Сіз сұрақтың дұрыс жауабын таптыңыз.';
    } else {
      feedbackBox.className = 'trainer-feedback wrong';
      feedbackBox.innerHTML = `❌ <strong>Қате!</strong> Дұрыс жауап: <strong>№ ${correctIndex + 1}</strong> (${currentOptions[correctIndex]}).`;
    }
  },

  prevTrainerQuestion() {
    if (this.trainerCurrentId > 1) {
      this.loadTrainerQuestion(this.trainerCurrentId - 1);
    }
  },

  nextTrainerQuestion() {
    if (this.trainerCurrentId < 1103) {
      this.loadTrainerQuestion(this.trainerCurrentId + 1);
    }
  },

  randomTrainerQuestion() {
    const randomId = Math.floor(Math.random() * 1103) + 1;
    this.loadTrainerQuestion(randomId);
  },

  // ================= ADMIN PANEL METHODS =================

  async loadAdminUsers() {
    try {
      const { ok, data } = await this.apiFetch('/api/admin/users');
      if (!ok) {
        alert(data.error || 'Әкімші деректерін жүктеу мүмкін болмады');
        return;
      }

      this.adminUsersList = data.users || [];
      if (data.adminWhatsapp) {
        this.adminWhatsapp = data.adminWhatsapp;
        const waInput = document.getElementById('adminSettingsWhatsapp');
        if (waInput) waInput.value = data.adminWhatsapp;
      }

      // Update Stats
      if (data.stats) {
        document.getElementById('adminStatTotal').textContent = data.stats.totalUsers;
        document.getElementById('adminStatActive').textContent = data.stats.activeUsers;
        document.getElementById('adminStatLocked').textContent = data.stats.lockedUsers;
        document.getElementById('adminStatDevices').textContent = data.stats.devicesBound;
      }

      this.renderAdminUsersTable(this.adminUsersList);
    } catch (err) {
      alert('Қате: ' + err.message);
    }
  },

  renderAdminUsersTable(users) {
    const tbody = document.getElementById('adminUsersTableBody');
    if (!tbody) return;

    if (!users || users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-muted">Пайдаланушылар табылмады</td></tr>`;
      return;
    }

    tbody.innerHTML = users.map(u => {
      const isSelf = this.currentUser && this.currentUser.userId === u.id;
      const isAdmin = u.role === 'admin';
      const hasAccess = u.has_access === 1 || isAdmin;
      const hasDevice = !!u.device_id;
      const dateStr = new Date(u.created_at).toLocaleDateString('kk-KZ', { day: '2-digit', month: '2-digit', year: 'numeric' });

      let statusBadge = hasAccess 
        ? `<span class="badge-access-yes">🟢 Рұқсат бар</span>` 
        : `<span class="badge-access-no">🔒 Құлыпталған</span>`;
      if (isAdmin) statusBadge += ` <small style="color:#fbbf24;font-weight:700;">(Әкімші)</small>`;

      let deviceBadge = hasDevice 
        ? `<span class="badge-device">📱 Байланысқан</span>` 
        : `<span class="text-muted" style="font-size:0.75rem;">— Бос —</span>`;

      return `
        <tr>
          <td>#${u.id}</td>
          <td><strong>${u.full_name}</strong></td>
          <td><code>${u.username}</code></td>
          <td>${u.phone || '<span class="text-muted">—</span>'}</td>
          <td>${statusBadge}</td>
          <td>${deviceBadge}</td>
          <td>${dateStr}</td>
          <td>
            <div style="display:flex;gap:4px;flex-wrap:wrap;">
              ${!isAdmin ? `
                <button class="btn ${hasAccess ? 'btn-secondary' : 'btn-emerald'} btn-sm" onclick="app.toggleUserAccess(${u.id}, ${hasAccess ? 0 : 1})" title="${hasAccess ? 'Доступты жабу' : 'Доступ беру'}">
                  <span>${hasAccess ? '🔒 Жабу' : '🔓 Ашу'}</span>
                </button>
              ` : ''}
              ${hasDevice ? `
                <button class="btn btn-outline btn-sm" onclick="app.resetUserDevice(${u.id})" title="Құрылғы байланысын өшіру">
                  <span>📱 Босату</span>
                </button>
              ` : ''}
              ${!isAdmin && !isSelf ? `
                <button class="btn btn-outline-danger btn-sm" onclick="app.deleteUser(${u.id})" title="Пайдаланушыны өшіру">
                  <span>🗑️</span>
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  filterAdminUsersTable() {
    const q = (document.getElementById('adminUserSearchInput').value || '').trim().toLowerCase();
    if (!q) {
      this.renderAdminUsersTable(this.adminUsersList);
      return;
    }
    const filtered = this.adminUsersList.filter(u => 
      (u.username || '').toLowerCase().includes(q) ||
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.phone || '').toLowerCase().includes(q)
    );
    this.renderAdminUsersTable(filtered);
  },

  async handleAdminCreateUser(e) {
    e.preventDefault();
    const full_name = document.getElementById('adminNewFullName').value.trim();
    const username = document.getElementById('adminNewUsername').value.trim().toLowerCase();
    const password = document.getElementById('adminNewPassword').value;
    const phone = document.getElementById('adminNewPhone').value.trim();
    const has_access = document.getElementById('adminNewHasAccess').checked;
    const alertBox = document.getElementById('adminCreateAlert');

    try {
      const { ok, data } = await this.apiFetch('/api/admin/user/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name, username, password, phone, has_access })
      });

      if (!ok) {
        alertBox.className = 'alert-box error';
        alertBox.textContent = data.error || 'Қосу қатесі';
        alertBox.classList.remove('hidden');
        return;
      }

      alertBox.className = 'alert-box success';
      alertBox.textContent = `Пайдаланушы «${username}» сәтті қосылды! ${has_access ? 'Толық доступ берілді.' : ''}`;
      alertBox.classList.remove('hidden');

      document.getElementById('adminCreateUserForm').reset();
      document.getElementById('adminNewHasAccess').checked = true;
      this.loadAdminUsers();

      setTimeout(() => alertBox.classList.add('hidden'), 4000);
    } catch (err) {
      alertBox.className = 'alert-box error';
      alertBox.textContent = 'Қате: ' + err.message;
      alertBox.classList.remove('hidden');
    }
  },

  async toggleUserAccess(userId, hasAccess) {
    try {
      const { ok, data } = await this.apiFetch('/api/admin/user/toggle-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, hasAccess })
      });
      if (!ok) {
        alert(data.error || 'Доступты өзгерту қатесі');
        return;
      }
      this.loadAdminUsers();
    } catch (err) {
      alert('Қате: ' + err.message);
    }
  },

  async resetUserDevice(userId) {
    if (!confirm('Бұл пайдаланушының құрылғы байланысын босатқыңыз келе ме? Ол жаңа құрылғыдан кіре алады.')) {
      return;
    }
    try {
      const { ok, data } = await this.apiFetch('/api/admin/user/reset-device', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (!ok) {
        alert(data.error || 'Құрылғыны босату қатесі');
        return;
      }
      alert('Құрылғы сәтті босатылды!');
      this.loadAdminUsers();
    } catch (err) {
      alert('Қате: ' + err.message);
    }
  },

  async deleteUser(userId) {
    if (!confirm('Бұл пайдаланушыны және оның барлық нәтижелерін толық өшіруді растайсыз ба?')) {
      return;
    }
    try {
      const { ok, data } = await this.apiFetch(`/api/admin/user/${userId}`, { method: 'DELETE' });
      if (!ok) {
        alert(data.error || 'Өшіру қатесі');
        return;
      }
      this.loadAdminUsers();
    } catch (err) {
      alert('Қате: ' + err.message);
    }
  },

  async handleAdminSaveSettings(e) {
    e.preventDefault();
    const adminWhatsapp = document.getElementById('adminSettingsWhatsapp').value.trim();
    try {
      const { ok, data } = await this.apiFetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminWhatsapp })
      });
      if (!ok) {
        alert(data.error || 'Баптауды сақтау қатесі');
        return;
      }
      this.adminWhatsapp = data.adminWhatsapp;
      alert('WhatsApp нөмірі сәтті жаңартылды: +' + data.adminWhatsapp);
    } catch (err) {
      alert('Қате: ' + err.message);
    }
  },

  // Modal Image Zoom
  openImageModal(src) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImg');
    modalImg.src = src;
    modal.classList.remove('hidden');
  },

  closeImageModal() {
    const modal = document.getElementById('imageModal');
    modal.classList.add('hidden');
  }
};

// Start application on page load
window.addEventListener('DOMContentLoaded', () => {
  app.init();
});

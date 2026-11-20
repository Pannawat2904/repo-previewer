/**
 * Repo Previewer - Frontend JavaScript Logic
 */

// Application State (สามารถเพิ่มหรือแก้ไขรายวิชา/งานย่อยได้ที่ courses ด้านล่างนี้โดยตรง)
const state = {
  courses: [
    {
      id: 'course-web-1',
      subject: 'การพัฒนาเว็บไซต์ (Web)',
      assignment: 'งานที่ 1',
      students: [],
      currentIndex: -1,
      bulkLinksText: '',
    },
    {
      id: 'course-python-oop-1',
      subject: '21910-2011 การเขียนโปรแกรมเชิงวัตถุเบื้องต้น (Python OOP)',
      assignment: 'งานที่ 4 โปรแกรมจัดการข้อมูลสินค้า',
      students: [],
      currentIndex: -1,
      bulkLinksText: '',
    },
  ],
  activeCourseId: 'course-web-1',
  students: [],
  currentIndex: -1,
  activeTab: 'preview',
  deviceMode: 'desktop',
  filter: 'all',
  searchQuery: '',
  fileTree: [],
  activeFilePath: null,
  inspectData: null,
  noteDebounceTimer: null,
  importMode: 'github',
  pendingUploadFiles: [],
  activePyFile: null,
  pyOriginalCodeMap: {},
  courseAssignments: {},
  promptDescExpanded: false,
  scoresFilter: 'all',
  scoresSearchQuery: '',
};

let pyodideReadyPromise = null;

// DOM Elements
const elements = {
  courseSelect: document.getElementById('courseSelect'),
  modalActiveCourseLabel: document.getElementById('modalActiveCourseLabel'),
  courseHubGrid: document.getElementById('courseHubGrid'),
  btnOpenCourseHub: document.getElementById('btnOpenCourseHub'),

  studentsList: document.getElementById('studentsList'),
  mainSidebar: document.getElementById('mainSidebar'),
  sidebarDropArea: document.getElementById('sidebarDropArea'),
  sidebarFileInput: document.getElementById('sidebarFileInput'),
  sidebarDragBadge: document.getElementById('sidebarDragBadge'),
  totalStudentsCount: document.getElementById('totalStudentsCount'),
  studentFilterSelect: document.getElementById('studentFilterSelect'),
  searchInput: document.getElementById('searchInput'),
  viewedStatsText: document.getElementById('viewedStatsText'),
  viewedProgressFill: document.getElementById('viewedProgressFill'),
  
  blankState: document.getElementById('blankState'),
  studentWorkspace: document.getElementById('studentWorkspace'),
  topWorkspaceBar: document.getElementById('topWorkspaceBar'),
  sidebarActiveMeta: document.getElementById('sidebarActiveMeta'),
  
  activeStudentName: document.getElementById('activeStudentName'),
  activeRepoLink: document.getElementById('activeRepoLink'),
  activeRepoText: document.getElementById('activeRepoText'),
  commitBadge: document.getElementById('commitBadge'),
  hasWebBadge: document.getElementById('hasWebBadge'),
  aiRiskBadge: document.getElementById('aiRiskBadge'),
  assignmentGradeBadge: document.getElementById('assignmentGradeBadge'),
  btnGradeStudentInStudio: document.getElementById('btnGradeStudentInStudio'),
  
  btnPrevStudent: document.getElementById('btnPrevStudent'),
  btnNextStudent: document.getElementById('btnNextStudent'),
  navCounterText: document.getElementById('navCounterText'),
  checkViewed: document.getElementById('checkViewed'),
  btnReloadCurrentRepo: document.getElementById('btnReloadCurrentRepo'),
  studentNoteInput: document.getElementById('studentNoteInput'),
  noteSaveIndicator: document.getElementById('noteSaveIndicator'),
  
  // Mobile Drawer elements
  btnToggleMobileSidebar: document.getElementById('btnToggleMobileSidebar'),
  btnCloseMobileSidebar: document.getElementById('btnCloseMobileSidebar'),
  sidebarBackdrop: document.getElementById('sidebarBackdrop'),
  mainSidebar: document.getElementById('mainSidebar'),
  
  tabButtons: document.querySelectorAll('.tab-btn'),
  tabPanes: {
    preview: document.getElementById('tabPreview'),
    code: document.getElementById('tabCode'),
    inspect: document.getElementById('tabInspect'),
    scores: document.getElementById('tabScores'),
  },
  inspectBadgeCount: document.getElementById('inspectBadgeCount'),
  scoresBadgeCount: document.getElementById('scoresBadgeCount'),
  scoresMenuContainer: document.getElementById('scoresMenuContainer'),
  btnOpenScoresMenu: document.getElementById('btnOpenScoresMenu'),
  
  previewToolbar: document.getElementById('previewToolbar'),
  deviceButtons: document.querySelectorAll('.device-btn'),
  iframeContainer: document.getElementById('iframeContainer'),
  previewIframe: document.getElementById('previewIframe'),
  btnOpenExternal: document.getElementById('btnOpenExternal'),
  noWebNotice: document.getElementById('noWebNotice'),
  btnSwitchToCode: document.getElementById('btnSwitchToCode'),

  // Python & OOP Studio elements
  pythonPreviewStudio: document.getElementById('pythonPreviewStudio'),
  pyEntryFileSelect: document.getElementById('pyEntryFileSelect'),
  btnRunPython: document.getElementById('btnRunPython'),
  btnResetPythonCode: document.getElementById('btnResetPythonCode'),
  pyExecStatus: document.getElementById('pyExecStatus'),
  pyOopChipsBar: document.getElementById('pyOopChipsBar'),
  pyEditorStats: document.getElementById('pyEditorStats'),
  pyEditorLineNumbers: document.getElementById('pyEditorLineNumbers'),
  pyCodeHighlight: document.getElementById('pyCodeHighlight'),
  pyCodeHighlightCode: document.getElementById('pyCodeHighlightCode'),
  pyCodeEditor: document.getElementById('pyCodeEditor'),
  btnToggleStdin: document.getElementById('btnToggleStdin'),
  pyStdinBox: document.getElementById('pyStdinBox'),
  pyStdinInput: document.getElementById('pyStdinInput'),
  pyInputDetectedBadge: document.getElementById('pyInputDetectedBadge'),
  btnClearPyOutput: document.getElementById('btnClearPyOutput'),
  pyOutputConsole: document.getElementById('pyOutputConsole'),
  
  fileTreeContent: document.getElementById('fileTreeContent'),
  btnCollapseAllTree: document.getElementById('btnCollapseAllTree'),
  activeFileIcon: document.getElementById('activeFileIcon'),
  activeFilePath: document.getElementById('activeFilePath'),
  activeFileStats: document.getElementById('activeFileStats'),
  codeContentWrap: document.getElementById('codeContentWrap'),
  btnCopyCode: document.getElementById('btnCopyCode'),
  
  inspectContainer: document.getElementById('inspectContainer'),
  
  inputModal: document.getElementById('inputModal'),
  btnOpenInputModal: document.getElementById('btnOpenInputModal'),
  btnCloseModal: document.getElementById('btnCloseModal'),
  btnCancelModal: document.getElementById('btnCancelModal'),

  // Assignment & AI Rubric Elements
  btnOpenAssignmentModal: document.getElementById('btnOpenAssignmentModal'),
  assignmentModal: document.getElementById('assignmentModal'),
  btnCloseAssignmentModal: document.getElementById('btnCloseAssignmentModal'),
  btnCancelAssignmentModal: document.getElementById('btnCancelAssignmentModal'),
  btnSaveAssignment: document.getElementById('btnSaveAssignment'),
  modalAssignmentCourseLabel: document.getElementById('modalAssignmentCourseLabel'),
  assignmentTitleInput: document.getElementById('assignmentTitleInput'),
  assignmentPromptTextarea: document.getElementById('assignmentPromptTextarea'),
  btnLoadExam5Prompt: document.getElementById('btnLoadExam5Prompt'),
  btnLoadExamplePrompt: document.getElementById('btnLoadExamplePrompt'),
  btnClearPrompt: document.getElementById('btnClearPrompt'),
  geminiApiKeyInput: document.getElementById('geminiApiKeyInput'),
  btnSaveGeminiKey: document.getElementById('btnSaveGeminiKey'),
  btnClearGeminiKey: document.getElementById('btnClearGeminiKey'),
  geminiKeyStatusBadge: document.getElementById('geminiKeyStatusBadge'),
  hubGeminiKeyStatusBadge: document.getElementById('hubGeminiKeyStatusBadge'),
  aiModalKeyStatusBadge: document.getElementById('aiModalKeyStatusBadge'),
  geminiKeyMessage: document.getElementById('geminiKeyMessage'),
  btnOpenAiSettings: document.getElementById('btnOpenAiSettings'),
  headerAiKeyDot: document.getElementById('headerAiKeyDot'),
  btnHubAiSettings: document.getElementById('btnHubAiSettings'),
  btnOpenAiSettingsFromAssignment: document.getElementById('btnOpenAiSettingsFromAssignment'),
  aiSettingsModal: document.getElementById('aiSettingsModal'),
  btnCloseAiSettingsModal: document.getElementById('btnCloseAiSettingsModal'),
  btnDoneAiSettingsModal: document.getElementById('btnDoneAiSettingsModal'),
  examSetConfirmModal: document.getElementById('examSetConfirmModal'),
  examConfirmStudentLabel: document.getElementById('examConfirmStudentLabel'),
  examConfirmSuggestBanner: document.getElementById('examConfirmSuggestBanner'),
  examConfirmCardsGrid: document.getElementById('examConfirmCardsGrid'),
  btnCloseExamConfirmModal: document.getElementById('btnCloseExamConfirmModal'),
  btnCancelExamConfirmModal: document.getElementById('btnCancelExamConfirmModal'),
  classScoreSummaryModal: document.getElementById('classScoreSummaryModal'),
  classSummaryCourseLabel: document.getElementById('classSummaryCourseLabel'),
  classSummaryModalBody: document.getElementById('classSummaryModalBody'),
  btnCloseClassSummaryModal: document.getElementById('btnCloseClassSummaryModal'),
  btnDoneClassSummaryModal: document.getElementById('btnDoneClassSummaryModal'),
  btnExportCsvFromSummary: document.getElementById('btnExportCsvFromSummary'),
  btnExportRawCsvFromSummary: document.getElementById('btnExportRawCsvFromSummary'),
  modalAssignmentTaskSelect: document.getElementById('modalAssignmentTaskSelect'),
  btnAddNewAssignment: document.getElementById('btnAddNewAssignment'),
  btnDeleteAssignment: document.getElementById('btnDeleteAssignment'),
  modalSlotModeHint: document.getElementById('modalSlotModeHint'),
  modalImportAssignmentPanel: document.getElementById('modalImportAssignmentPanel'),
  modalImportAssignmentSelect: document.getElementById('modalImportAssignmentSelect'),
  btnModalAddAssignment: document.getElementById('btnModalAddAssignment'),
  btnModalEditAssignment: document.getElementById('btnModalEditAssignment'),
  btnModalDeleteAssignment: document.getElementById('btnModalDeleteAssignment'),
  modalPromptPreviewBox: document.getElementById('modalPromptPreviewBox'),
  modalPromptPreviewTaskTitle: document.getElementById('modalPromptPreviewTaskTitle'),
  modalPromptPreviewSnippet: document.getElementById('modalPromptPreviewSnippet'),
  assignmentPickerGroup: document.getElementById('assignmentPickerGroup'),
  assignmentPickerSelect: document.getElementById('assignmentPickerSelect'),
  btnQuickEditAssignment: document.getElementById('btnQuickEditAssignment'),
  btnTogglePromptPane: document.getElementById('btnTogglePromptPane'),
  studioRubricBadge: document.getElementById('studioRubricBadge'),
  pyStudioSplit: document.getElementById('pyStudioSplit'),
  pyPromptPane: document.getElementById('pyPromptPane'),
  pyPromptBody: document.getElementById('pyPromptBody'),
  btnStudioEditPrompt: document.getElementById('btnStudioEditPrompt'),
  btnClosePromptPane: document.getElementById('btnClosePromptPane'),
  btnCollapseSidebarDesktop: document.getElementById('btnCollapseSidebarDesktop'),
  btnToggleSidebarBar: document.getElementById('btnToggleSidebarBar'),
  sidebarToggleText: document.getElementById('sidebarToggleText'),
  btnToggleZenMode: document.getElementById('btnToggleZenMode'),
  importModeTabs: document.querySelectorAll('.import-mode-tab'),
  importPaneGithub: document.getElementById('importPaneGithub'),
  importPaneUpload: document.getElementById('importPaneUpload'),
  bulkLinksTextarea: document.getElementById('bulkLinksTextarea'),
  parsedStatsLabel: document.getElementById('parsedStatsLabel'),
  uploadDropZone: document.getElementById('uploadDropZone'),
  studentFilesInput: document.getElementById('studentFilesInput'),
  checkGroupSingleStudent: document.getElementById('checkGroupSingleStudent'),
  singleStudentNameInput: document.getElementById('singleStudentNameInput'),
  selectedFilesList: document.getElementById('selectedFilesList'),
  uploadStatsBar: document.getElementById('uploadStatsBar'),
  uploadStatsCount: document.getElementById('uploadStatsCount'),
  uploadStatsSize: document.getElementById('uploadStatsSize'),
  btnClearSelectedFiles: document.getElementById('btnClearSelectedFiles'),
  windowDragOverlay: document.getElementById('windowDragOverlay'),
  windowDragCourseLabel: document.getElementById('windowDragCourseLabel'),
  toastContainer: document.getElementById('toastContainer'),
  btnStartFetch: document.getElementById('btnStartFetch'),
  btnClearAllCache: document.getElementById('btnClearAllCache'),
  btnExportCsv: document.getElementById('btnExportCsv'),
};

// -------------------------------------------------------------
// Initialization
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initCoursesState();
  setupEventListeners();
  setupIframeMessageListener();
  setupKeyboardShortcuts();
  setupMobileSwipeGestures();
  setupCursorEffects();
});

// -------------------------------------------------------------
// Multi-Course / Subject & Assignment Management
// -------------------------------------------------------------
function getAssignmentSortTuple(task) {
  const title = String((task && task.title) || '').trim();
  const taskId = String((task && task.id) || '').trim();

  const kwMatch = title.match(/(?:งานที่|ใบงานที่|งาน|ใบงาน|ข้อที่|ข้อ|แบบฝึกหัดที่|แบบฝึกหัด|สัปดาห์ที่|สัปดาห์|บทที่|lab|assignment|task|hw|week|project|work)\s*[:#.-]?\s*(\d+)/i);
  if (kwMatch) {
    return [0, parseInt(kwMatch[1], 10), title.toLowerCase(), taskId.toLowerCase()];
  }

  const leadMatch = title.match(/^\s*#?(\d+)(?:[\s.):\-]|$)/);
  if (leadMatch) {
    return [0, parseInt(leadMatch[1], 10), title.toLowerCase(), taskId.toLowerCase()];
  }

  const anyTitleMatch = title.match(/(\d+)/);
  if (anyTitleMatch) {
    return [1, parseInt(anyTitleMatch[1], 10), title.toLowerCase(), taskId.toLowerCase()];
  }

  const idMatch = taskId.match(/(\d+)/);
  if (idMatch) {
    return [2, parseInt(idMatch[1], 10), title.toLowerCase(), taskId.toLowerCase()];
  }

  return [3, Number.MAX_SAFE_INTEGER, title.toLowerCase(), taskId.toLowerCase()];
}

function sortAssignmentsList(list) {
  if (!Array.isArray(list)) return [];
  return [...list].sort((a, b) => {
    const ka = getAssignmentSortTuple(a);
    const kb = getAssignmentSortTuple(b);
    if (ka[0] !== kb[0]) return ka[0] - kb[0];
    if (ka[1] !== kb[1]) return ka[1] - kb[1];
    if (ka[2] !== kb[2]) return ka[2].localeCompare(kb[2], 'th');
    return ka[3].localeCompare(kb[3]);
  });
}

function normalizeCourseAssignmentsData(courseId, data) {
  if (!data || typeof data !== 'object') return data;
  const normalized = { ...data };
  if (Array.isArray(normalized.assignments)) {
    normalized.assignments = sortAssignmentsList(normalized.assignments);
  }
  return normalized;
}

function formatPromptSnippet(promptText, maxLines = 4) {
  if (!promptText || typeof promptText !== 'string' || !promptText.trim()) {
    return 'ยังไม่มีข้อกำหนดโจทย์ (คลิก "+ เพิ่มงาน" หรือ "✏️ แก้โจทย์" เพื่อระบุคำสั่ง)';
  }
  const lines = promptText
    .trim()
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && l !== '---' && l !== '***');
  return lines.slice(0, maxLines).join('\n');
}

async function initCoursesState() {
  // กู้คืนวิชาล่าสุดที่เลือกไว้ถ้าเคยเลือกไว้
  try {
    const savedActiveId = localStorage.getItem('repo_previewer_active_course');
    if (savedActiveId && state.courses.some(c => c.id === savedActiveId)) {
      state.activeCourseId = savedActiveId;
    }
  } catch (e) {}

  // โหลดแคชของโจทย์แต่ละวิชาจาก localStorage เพื่อแสดงผลทันทีแบบไม่มีแล็ก (เรียงตามเลขงาน)
  state.courses.forEach(c => {
    try {
      const cached = localStorage.getItem('repo_previewer_assignments_' + c.id);
      if (cached) {
        const parsed = normalizeCourseAssignmentsData(c.id, JSON.parse(cached));
        state.courseAssignments = state.courseAssignments || {};
        state.courseAssignments[c.id] = parsed;
        if (parsed.title) {
          c.assignment = parsed.title;
        }
      }
    } catch (e) {}
  });

  renderCourseSelect();
  renderCourseHub();
  renderAssignmentPickers();

  // ดึงโจทย์และเกณฑ์ตรวจล่าสุดของทุกวิชาจากเซิร์ฟเวอร์แบบเบื้องหลัง
  for (const c of state.courses) {
    await fetchCourseAssignments(c.id);
  }

  // อัปเกรด/เพิ่ม "งานที่ 5 สอบปฏิบัติ (ข้อสอบชุด A, B, C, D — Rubric 20 คะแนน)" ให้วิชา Python OOP อัตโนมัติโดยไม่กระทบงาน 1-4
  await ensureWork5PracticalExamRubric();

  // ตรวจสอบ/ซิงก์ Gemini API Key กลางทั้งระบบตั้งแต่เปิดหน้าแรก
  checkGeminiKeyStatus();
}

function getActiveCourse() {
  return state.courses.find(c => c.id === state.activeCourseId) || state.courses[0];
}

function syncActiveCourseState() {
  const course = getActiveCourse();
  if (!course) return;
  course.students = state.students;
  course.currentIndex = state.currentIndex;
  if (elements.bulkLinksTextarea) {
    course.bulkLinksText = elements.bulkLinksTextarea.value;
  }
}

function detectCourseTheme(subject) {
  const s = (subject || '').toLowerCase();
  if (s.includes('python') || s.includes('oop') || s.includes('วัตถุ') || s.includes('ไพทอน')) {
    return {
      type: 'python',
      svgIcon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>`,
      badge: 'Python · OOP',
      defaultImport: 'upload',
      accentClass: 'theme-python',
    };
  }
  if (s.includes('เว็บ') || s.includes('web') || s.includes('html') || s.includes('frontend')) {
    return {
      type: 'web',
      svgIcon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>`,
      badge: 'Web · HTML/CSS/JS',
      defaultImport: 'github',
      accentClass: 'theme-web',
    };
  }
  return {
    type: 'general',
    svgIcon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`,
    badge: 'Code Project',
    defaultImport: 'github',
    accentClass: 'theme-general',
  };
}

function setHubSidebarMode(isHubScreen) {
  const sidebar = elements.mainSidebar || document.getElementById('mainSidebar');
  if (!sidebar) return;
  if (isHubScreen) {
    sidebar.classList.add('hub-auto-hidden');
  } else {
    sidebar.classList.remove('hub-auto-hidden');
  }
}

function renderCourseSelect() {
  if (elements.courseSelect) {
    elements.courseSelect.innerHTML = '';
    state.courses.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      const count = c.id === state.activeCourseId ? state.students.length : (c.students ? c.students.length : 0);
      opt.textContent = `${c.subject} — ${c.assignment} (${count})`;
      if (c.id === state.activeCourseId) opt.selected = true;
      elements.courseSelect.appendChild(opt);
    });
  }

  const active = getActiveCourse();
  if (elements.modalActiveCourseLabel && active) {
    elements.modalActiveCourseLabel.textContent = `กำลังนำเข้าสู่วิชา: ${active.subject} (${active.assignment})`;
  }

  renderCourseHub();
}

function renderCourseHub() {
  const grid = elements.courseHubGrid || document.getElementById('courseHubGrid');
  if (!grid) return;

  // ซ่อน Sidebar อัตโนมัติเมื่อแสดงหน้า Home Hub และยังไม่ได้เปิดหน้าตรวจงานนักเรียน
  if (elements.blankState && elements.blankState.style.display !== 'none') {
    setHubSidebarMode(true);
  }

  grid.innerHTML = '';

  state.courses.forEach(course => {
    const isActive = course.id === state.activeCourseId;
    const studentsList = isActive ? state.students : (course.students || []);
    const total = studentsList.length;
    const viewed = studentsList.filter(s => s.viewed).length;
    const pct = total > 0 ? Math.round((viewed / total) * 100) : 0;
    const theme = detectCourseTheme(course.subject);

    const courseData = (state.courseAssignments && state.courseAssignments[course.id]) || null;
    const rawTaskList = (courseData && Array.isArray(courseData.assignments))
      ? courseData.assignments
      : [
          {
            id: 'work-1',
            title: course.assignment || 'ชิ้นงานที่ 1',
            prompt: course.id.includes('python') || course.id.includes('oop') ? DEFAULT_PRODUCT_PROMPT : '',
            max_score: 10,
          }
        ];
    const taskList = sortAssignmentsList(rawTaskList);
    const activeTaskId = (courseData && courseData.active_assignment_id) || (taskList[0] ? taskList[0].id : '');

    const card = document.createElement('div');
    card.className = `course-hub-card ${theme.accentClass} ${isActive ? 'active' : ''}`;
    card.innerHTML = `
      <div class="course-hub-card-top">
        <div class="course-hub-icon-wrap">
          <span class="course-hub-icon">${theme.svgIcon}</span>
          <span class="course-hub-type-badge">${escapeHtml(theme.badge)}</span>
        </div>
        <div class="course-hub-top-right">
          ${isActive ? '<span class="hub-active-pill"><span class="hub-active-dot"></span>กำลังเลือก</span>' : ''}
        </div>
      </div>

      <div class="course-hub-card-body">
        <h3 class="course-hub-title">${escapeHtml(course.subject)}</h3>

        <div class="hub-assignment-section">
          <div class="hub-assignment-label-row">
            <span class="hub-section-label">งานที่ตรวจ</span>
            <div class="hub-inline-tools">
              ${taskList.length > 0 ? `
              <button type="button" class="btn-hub-link btn-hub-edit-task" data-course-id="${escapeHtml(course.id)}" title="ดูหรือแก้ไขโจทย์ของงานนี้">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                <span>แก้โจทย์</span>
              </button>
              ` : ''}
              <button type="button" class="btn-hub-link accent btn-hub-add-task" data-course-id="${escapeHtml(course.id)}" title="เพิ่มงานและโจทย์ใหม่">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                <span>เพิ่มงาน</span>
              </button>
              ${taskList.length > 0 ? `
              <button type="button" class="btn-hub-link danger btn-hub-delete-task" data-course-id="${escapeHtml(course.id)}" title="ลบงานที่เลือกอยู่นี้">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                <span>ลบงาน</span>
              </button>
              ` : ''}
            </div>
          </div>
          <div class="hub-select-wrapper">
            <select class="hub-assignment-select" data-course-id="${escapeHtml(course.id)}" title="เลือกงานที่ต้องการตรวจ">
              ${
                taskList.length > 0
                  ? taskList.map(t => `<option value="${escapeHtml(t.id)}"${t.id === activeTaskId ? ' selected' : ''}>${escapeHtml(t.title)}</option>`).join('')
                  : '<option value="" disabled selected>ยังไม่มีงานในรายวิชา</option>'
              }
              <option value="__add_slot__">➕ เพิ่มงานใหม่ / ใส่ย้อนหลัง (งาน 1–40)...</option>
            </select>
            <svg class="hub-select-chevron" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
        </div>
      </div>

      <div class="course-hub-card-footer">
        <div class="course-hub-meta">
          <div class="course-hub-stats-row">
            <span>นักเรียน <strong>${total}</strong> คน ${total > 0 ? `(ตรวจแล้ว <strong>${viewed}/${total}</strong>)` : ''}</span>
            ${total > 0 ? `<span class="hub-pct-badge">${pct}%</span>` : '<span class="meta-muted">ยังไม่มีงานนำเข้า</span>'}
          </div>
          <div class="course-hub-progress-track">
            <div class="course-hub-progress-fill" style="width: ${pct}%;"></div>
          </div>
        </div>

        <div class="course-hub-actions">
          ${
            total > 0
              ? `
                <button type="button" class="btn-hub-action primary btn-hub-open" data-course-id="${escapeHtml(course.id)}">
                  <span>เข้าตรวจงาน (${total} คน)</span>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
                <button type="button" class="btn-hub-action subtle btn-hub-import" data-course-id="${escapeHtml(course.id)}" data-import-mode="${theme.defaultImport}" title="นำเข้างานเพิ่มเติม">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>
                  <span>เพิ่ม</span>
                </button>
              `
              : `
                <button type="button" class="btn-hub-action primary btn-hub-import" data-course-id="${escapeHtml(course.id)}" data-import-mode="${theme.defaultImport}">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                  <span>${theme.type === 'python' ? 'อัปโหลดไฟล์งาน / นำเข้า' : 'นำเข้าลิงก์ GitHub / อัปโหลดไฟล์'}</span>
                </button>
              `
          }
        </div>
      </div>
    `;

    // ผูก Event Selector & Buttons ใน Hub Card
    const hubSelect = card.querySelector('.hub-assignment-select');
    if (hubSelect) {
      hubSelect.addEventListener('click', (e) => e.stopPropagation());
      hubSelect.addEventListener('change', async (e) => {
        e.stopPropagation();
        const chosen = e.target.value;
        if (course.id !== state.activeCourseId) {
          switchCourse(course.id);
        }
        if (chosen === '__add_slot__') {
          e.target.value = activeTaskId || '';
          await openAssignmentModal('__first_empty__');
          return;
        }
        await handleSwitchAssignmentTask(chosen);
        renderCourseHub();
      });
    }

    const btnHubAdd = card.querySelector('.btn-hub-add-task');
    if (btnHubAdd) {
      btnHubAdd.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (course.id !== state.activeCourseId) {
          switchCourse(course.id);
        }
        await openAssignmentModal('__first_empty__');
      });
    }

    const btnHubEdit = card.querySelector('.btn-hub-edit-task');
    if (btnHubEdit) {
      btnHubEdit.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (course.id !== state.activeCourseId) {
          switchCourse(course.id);
        }
        await openAssignmentModal();
      });
    }

    const btnHubDelete = card.querySelector('.btn-hub-delete-task');
    if (btnHubDelete) {
      btnHubDelete.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (course.id !== state.activeCourseId) {
          switchCourse(course.id);
        }
        await handleDeleteAssignmentTask(activeTaskId, course.id, false);
      });
    }

    // คลิกที่ตัวการ์ดเพื่อเลือกวิชานี้ทันที
    card.addEventListener('click', (e) => {
      if (e.target.closest('button') || e.target.closest('select')) return;
      switchCourse(course.id);
    });

    const btnOpen = card.querySelector('.btn-hub-open');
    if (btnOpen) {
      btnOpen.addEventListener('click', (e) => {
        e.stopPropagation();
        if (course.id !== state.activeCourseId) {
          switchCourse(course.id);
        } else if (state.students.length > 0) {
          const idx = state.currentIndex >= 0 && state.currentIndex < state.students.length ? state.currentIndex : 0;
          selectStudent(idx);
        }
      });
    }

    const btnImport = card.querySelector('.btn-hub-import');
    if (btnImport) {
      btnImport.addEventListener('click', (e) => {
        e.stopPropagation();
        if (course.id !== state.activeCourseId) {
          switchCourse(course.id);
        }
        switchImportMode(btnImport.dataset.importMode || theme.defaultImport);
        openModal();
      });
    }

    // Drag-and-drop files directly onto this course card
    card.addEventListener('dragover', (e) => {
      const dt = e.dataTransfer;
      if (!dt || !dt.types || !Array.from(dt.types).includes('Files')) return;
      e.preventDefault();
      e.stopPropagation();
      card.classList.add('card-drop-active');
      dt.dropEffect = 'copy';
    });

    card.addEventListener('dragleave', (e) => {
      e.preventDefault();
      card.classList.remove('card-drop-active');
    });

    card.addEventListener('drop', async (e) => {
      const dt = e.dataTransfer;
      if (!dt || !dt.types || !Array.from(dt.types).includes('Files')) return;
      e.preventDefault();
      e.stopPropagation();
      card.classList.remove('card-drop-active');

      if (course.id !== state.activeCourseId) {
        switchCourse(course.id);
      }

      const files = await extractFilesFromDataTransfer(dt);
      if (files && files.length > 0) {
        switchImportMode('upload');
        addPendingUploadFiles(files);
        openModal();
      }
    });

    grid.appendChild(card);
  });
}

function openCourseHub() {
  syncActiveCourseState();
  elements.studentWorkspace.style.display = 'none';
  if (elements.topWorkspaceBar) elements.topWorkspaceBar.style.display = 'none';
  if (elements.sidebarActiveMeta) elements.sidebarActiveMeta.style.display = 'none';
  elements.blankState.style.display = 'flex';
  renderCourseHub();
}

function switchCourse(courseId) {
  if (courseId === state.activeCourseId) {
    renderCourseSelect();
    renderAssignmentPickers();
    return;
  }
  syncActiveCourseState();

  const target = state.courses.find(c => c.id === courseId);
  if (!target) return;

  state.activeCourseId = target.id;
  try {
    localStorage.setItem('repo_previewer_active_course', target.id);
  } catch (e) {}

  state.students = target.students || [];
  state.currentIndex = typeof target.currentIndex === 'number' ? target.currentIndex : -1;
  if (elements.bulkLinksTextarea) {
    elements.bulkLinksTextarea.value = target.bulkLinksText || '';
    updateParsedStats();
  }

  // สลับแท็บเริ่มต้นใน Modal ตามประเภทวิชาอัตโนมัติ (Python -> อัปโหลดไฟล์, Web -> GitHub)
  const theme = detectCourseTheme(target.subject);
  switchImportMode(theme.defaultImport);

  renderCourseSelect();
  renderAssignmentPickers();
  renderStudentsList();
  updateViewedStats();
  fetchCourseAssignments(target.id);

  if (state.students.length > 0 && state.currentIndex >= 0 && state.currentIndex < state.students.length) {
    selectStudent(state.currentIndex);
  } else if (state.students.length > 0) {
    selectStudent(0);
  } else {
    state.currentIndex = -1;
    elements.studentWorkspace.style.display = 'none';
    if (elements.topWorkspaceBar) elements.topWorkspaceBar.style.display = 'none';
    if (elements.sidebarActiveMeta) elements.sidebarActiveMeta.style.display = 'none';
    elements.blankState.style.display = 'flex';
    if (elements.previewIframe) elements.previewIframe.src = 'about:blank';
    renderCourseHub();
  }
}

function setupEventListeners() {
  // ปุ่มเปิดหน้าเมนูเลือกวิชา (Course Hub)
  if (elements.btnOpenCourseHub) {
    elements.btnOpenCourseHub.addEventListener('click', openCourseHub);
  }
  if (elements.aiRiskBadge) {
    elements.aiRiskBadge.addEventListener('click', () => switchTab('inspect'));
  }
  const brandTitle = document.querySelector('.brand-text');
  if (brandTitle) {
    brandTitle.style.cursor = 'pointer';
    brandTitle.title = 'กลับไปหน้าเลือกรายวิชา';
    brandTitle.addEventListener('click', openCourseHub);
  }

  // Course switcher
  if (elements.courseSelect) {
    elements.courseSelect.addEventListener('change', (e) => {
      switchCourse(e.target.value);
    });
  }

  // Modal toggling
  elements.btnOpenInputModal.addEventListener('click', openModal);
  elements.btnCloseModal.addEventListener('click', closeModal);
  elements.btnCancelModal.addEventListener('click', closeModal);
  elements.inputModal.addEventListener('click', (e) => {
    if (e.target === elements.inputModal) closeModal();
  });

  // Assignment & AI Rubric Modal toggling
  if (elements.btnOpenAssignmentModal) {
    elements.btnOpenAssignmentModal.addEventListener('click', openAssignmentModal);
  }
  if (elements.btnCloseAssignmentModal) {
    elements.btnCloseAssignmentModal.addEventListener('click', closeAssignmentModal);
  }
  if (elements.btnCancelAssignmentModal) {
    elements.btnCancelAssignmentModal.addEventListener('click', closeAssignmentModal);
  }
  if (elements.assignmentModal) {
    elements.assignmentModal.addEventListener('click', (e) => {
      if (e.target === elements.assignmentModal) closeAssignmentModal();
    });
  }
  if (elements.btnSaveAssignment) {
    elements.btnSaveAssignment.addEventListener('click', handleSaveAssignment);
  }
  if (elements.btnLoadExam5Prompt) {
    elements.btnLoadExam5Prompt.addEventListener('click', loadExam5PracticalRubricPrompt);
  }
  if (elements.btnLoadExamplePrompt) {
    elements.btnLoadExamplePrompt.addEventListener('click', loadExampleProductPrompt);
  }
  if (elements.btnClearPrompt) {
    elements.btnClearPrompt.addEventListener('click', () => {
      if (elements.assignmentPromptTextarea) elements.assignmentPromptTextarea.value = '';
    });
  }
  if (elements.btnSaveGeminiKey) {
    elements.btnSaveGeminiKey.addEventListener('click', handleSaveGeminiKey);
  }
  if (elements.btnClearGeminiKey) {
    elements.btnClearGeminiKey.addEventListener('click', handleClearGeminiKey);
  }
  if (elements.geminiApiKeyInput) {
    elements.geminiApiKeyInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSaveGeminiKey();
      }
    });
  }
  [
    elements.btnOpenAiSettings,
    elements.btnHubAiSettings,
    elements.btnOpenAiSettingsFromAssignment,
  ].forEach(btn => {
    if (btn) btn.addEventListener('click', openAiSettingsModal);
  });
  [elements.btnCloseAiSettingsModal, elements.btnDoneAiSettingsModal].forEach(btn => {
    if (btn) btn.addEventListener('click', closeAiSettingsModal);
  });
  if (elements.aiSettingsModal) {
    elements.aiSettingsModal.addEventListener('click', (e) => {
      if (e.target === elements.aiSettingsModal) closeAiSettingsModal();
    });
  }
  [elements.btnCloseExamConfirmModal, elements.btnCancelExamConfirmModal].forEach(btn => {
    if (btn) btn.addEventListener('click', closeExamSetConfirmModal);
  });
  if (elements.examSetConfirmModal) {
    elements.examSetConfirmModal.addEventListener('click', (e) => {
      if (e.target === elements.examSetConfirmModal) closeExamSetConfirmModal();
    });
  }
  [elements.btnCloseClassSummaryModal, elements.btnDoneClassSummaryModal].forEach(btn => {
    if (btn) btn.addEventListener('click', closeClassScoreSummaryModal);
  });
  if (elements.classScoreSummaryModal) {
    elements.classScoreSummaryModal.addEventListener('click', (e) => {
      if (e.target === elements.classScoreSummaryModal) closeClassScoreSummaryModal();
    });
  }
  if (elements.btnExportCsvFromSummary) {
    elements.btnExportCsvFromSummary.addEventListener('click', exportResultsToExcelXlsx);
  }
  if (elements.btnExportRawCsvFromSummary) {
    elements.btnExportRawCsvFromSummary.addEventListener('click', exportResultsToCsv);
  }
  if (elements.btnOpenScoresMenu) {
    elements.btnOpenScoresMenu.addEventListener('click', openScoresMenuView);
  }
  if (elements.assignmentGradeBadge) {
    elements.assignmentGradeBadge.addEventListener('click', handleGradeBadgeClick);
  }
  if (elements.btnGradeStudentInStudio) {
    elements.btnGradeStudentInStudio.addEventListener('click', handleGradeBadgeClick);
  }
  if (elements.assignmentPickerSelect) {
    elements.assignmentPickerSelect.addEventListener('change', (e) => {
      if (e.target.value === '__add_slot__') {
        renderAssignmentPickers();
        openAssignmentModal('__first_empty__');
        return;
      }
      handleSwitchAssignmentTask(e.target.value);
    });
  }
  if (elements.btnQuickEditAssignment) {
    elements.btnQuickEditAssignment.addEventListener('click', openAssignmentModal);
  }
  if (elements.btnStudioEditPrompt) {
    elements.btnStudioEditPrompt.addEventListener('click', openAssignmentModal);
  }
  if (elements.btnTogglePromptPane) {
    elements.btnTogglePromptPane.addEventListener('click', toggleStudioPromptPane);
  }
  if (elements.btnClosePromptPane) {
    elements.btnClosePromptPane.addEventListener('click', toggleStudioPromptPane);
  }
  if (elements.modalAssignmentTaskSelect) {
    elements.modalAssignmentTaskSelect.addEventListener('change', (e) => {
      handleModalTaskSelectChange(e.target.value);
    });
  }
  if (elements.btnAddNewAssignment) {
    elements.btnAddNewAssignment.addEventListener('click', handleAddNewAssignmentTask);
  }
  if (elements.btnDeleteAssignment) {
    elements.btnDeleteAssignment.addEventListener('click', () => handleDeleteAssignmentTask(null, null, true));
  }
  if (elements.modalImportAssignmentSelect) {
    elements.modalImportAssignmentSelect.addEventListener('change', (e) => {
      if (e.target.value === '__add_slot__') {
        renderAssignmentPickers();
        openAssignmentModal('__first_empty__');
        return;
      }
      handleSwitchAssignmentTask(e.target.value);
    });
  }
  if (elements.btnModalAddAssignment) {
    elements.btnModalAddAssignment.addEventListener('click', () => {
      openAssignmentModal('__first_empty__');
    });
  }
  if (elements.btnModalEditAssignment) {
    elements.btnModalEditAssignment.addEventListener('click', openAssignmentModal);
  }
  if (elements.btnModalDeleteAssignment) {
    elements.btnModalDeleteAssignment.addEventListener('click', () => handleDeleteAssignmentTask(null, null, false));
  }
  if (elements.btnCollapseSidebarDesktop) {
    elements.btnCollapseSidebarDesktop.addEventListener('click', toggleDesktopSidebar);
  }
  if (elements.btnToggleSidebarBar) {
    elements.btnToggleSidebarBar.addEventListener('click', toggleDesktopSidebar);
  }
  if (elements.btnToggleZenMode) {
    elements.btnToggleZenMode.addEventListener('click', toggleZenMode);
  }

  // Import Mode Tabs (GitHub Links vs Upload Files)
  if (elements.importModeTabs) {
    elements.importModeTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        switchImportMode(tab.dataset.importMode);
      });
    });
  }

  // Global & In-Modal Drag-and-Drop + File Pickers
  setupDragAndDropHandlers();
  if (elements.checkGroupSingleStudent) {
    elements.checkGroupSingleStudent.addEventListener('change', (e) => {
      if (elements.singleStudentNameInput) {
        elements.singleStudentNameInput.style.display = e.target.checked ? 'block' : 'none';
      }
    });
  }

  // Textarea input monitoring
  elements.bulkLinksTextarea.addEventListener('input', updateParsedStats);

  // Start fetch
  elements.btnStartFetch.addEventListener('click', handleStartFetch);

  // Python Studio listeners
  if (elements.pyEntryFileSelect) {
    elements.pyEntryFileSelect.addEventListener('change', (e) => {
      const cur = getCurrentStudent();
      if (cur && cur.python_info) {
        selectPythonStudioFile(cur, e.target.value, false);
      }
    });
  }
  if (elements.btnRunPython) {
    elements.btnRunPython.addEventListener('click', () => {
      runPythonCodeInStudio(true);
    });
  }
  if (elements.btnResetPythonCode) {
    elements.btnResetPythonCode.addEventListener('click', () => {
      resetCurrentPythonFileCode();
    });
  }
  if (elements.pyCodeEditor) {
    elements.pyCodeEditor.addEventListener('input', () => {
      updatePyEditorLineNumbers();
      if (elements.btnResetPythonCode) elements.btnResetPythonCode.style.display = 'inline-flex';
    });
    elements.pyCodeEditor.addEventListener('scroll', () => {
      syncPyEditorScroll();
    });
    elements.pyCodeEditor.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runPythonCodeInStudio(true);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        const start = elements.pyCodeEditor.selectionStart;
        const end = elements.pyCodeEditor.selectionEnd;
        const val = elements.pyCodeEditor.value;
        elements.pyCodeEditor.value = val.substring(0, start) + '    ' + val.substring(end);
        elements.pyCodeEditor.selectionStart = elements.pyCodeEditor.selectionEnd = start + 4;
        updatePyEditorLineNumbers();
        if (elements.btnResetPythonCode) elements.btnResetPythonCode.style.display = 'inline-flex';
      }
    });
  }
  if (elements.btnToggleStdin) {
    elements.btnToggleStdin.addEventListener('click', () => {
      if (!elements.pyStdinBox) return;
      const isVisible = elements.pyStdinBox.style.display !== 'none';
      elements.pyStdinBox.style.display = isVisible ? 'none' : 'flex';
      elements.btnToggleStdin.classList.toggle('active', !isVisible);
      if (!isVisible && elements.pyStdinInput) {
        elements.pyStdinInput.focus();
      }
    });
  }
  if (elements.btnClearPyOutput) {
    elements.btnClearPyOutput.addEventListener('click', () => {
      if (elements.pyOutputConsole) {
        elements.pyOutputConsole.innerHTML = `<div class="py-output-placeholder">ล้างหน้าจอแล้ว — กดปุ่ม "▶ รันโค้ด" เพื่อรันใหม่</div>`;
      }
    });
  }

  // Clear cache
  elements.btnClearAllCache.addEventListener('click', handleClearAllCache);

  // Export Excel (.xlsx)
  if (elements.btnExportCsv) {
    elements.btnExportCsv.addEventListener('click', exportResultsToExcelXlsx);
  }

  // Mobile Drawer toggles
  if (elements.btnToggleMobileSidebar) {
    elements.btnToggleMobileSidebar.addEventListener('click', toggleMobileSidebar);
  }
  if (elements.btnCloseMobileSidebar) {
    elements.btnCloseMobileSidebar.addEventListener('click', closeMobileSidebar);
  }
  if (elements.sidebarBackdrop) {
    elements.sidebarBackdrop.addEventListener('click', closeMobileSidebar);
  }

  // Filter & Search
  elements.studentFilterSelect.addEventListener('change', (e) => {
    state.filter = e.target.value;
    renderStudentsList();
  });
  elements.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value.toLowerCase().trim();
    renderStudentsList();
  });

  // Prev / Next Navigation
  elements.btnPrevStudent.addEventListener('click', navigatePrev);
  elements.btnNextStudent.addEventListener('click', navigateNext);

  // Viewed Checkbox
  elements.checkViewed.addEventListener('change', (e) => {
    handleViewedToggle(state.currentIndex, e.target.checked);
  });

  // Note Input with debounce
  elements.studentNoteInput.addEventListener('input', (e) => {
    const note = e.target.value;
    if (state.currentIndex >= 0 && state.currentIndex < state.students.length) {
      const student = state.students[state.currentIndex];
      student.note = note;
      persistLocalStudentReview(student);
      clearTimeout(state.noteDebounceTimer);
      state.noteDebounceTimer = setTimeout(() => {
        saveStudentReview(student.owner, student.repo, null, note);
      }, 500);
    }
  });

  // Reload current repo & preview
  elements.btnReloadCurrentRepo.addEventListener('click', handleReloadCurrentRepo);

  // Tabs switching
  elements.tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      switchTab(tabName);
    });
  });

  // Device switcher
  elements.deviceButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const device = btn.dataset.device;
      setDeviceMode(device);
    });
  });

  // ตั้งค่าโหมดเริ่มต้นเป็น Desktop ทันทีเมื่อเปิดระบบ เพื่อให้ Iframe ขยายเต็มจอ 100% ตั้งแต่แรก
  setDeviceMode(state.deviceMode || 'desktop');

  // Open preview in external tab
  elements.btnOpenExternal.addEventListener('click', () => {
    const cur = getCurrentStudent();
    if (cur && cur.preview_url) {
      window.open(cur.preview_url, '_blank');
    }
  });

  elements.btnSwitchToCode.addEventListener('click', () => {
    switchTab('code');
  });

  // Code Copy
  elements.btnCopyCode.addEventListener('click', () => {
    const codeEl = document.querySelector('.code-text-cell');
    if (codeEl) {
      navigator.clipboard.writeText(codeEl.innerText).then(() => {
        elements.btnCopyCode.innerText = 'คัดลอกแล้ว ✓';
        setTimeout(() => elements.btnCopyCode.innerText = 'คัดลอก', 2000);
      });
    }
  });
}

// -------------------------------------------------------------
// Assignment Prompt & AI Rubric Evaluator Logic
// -------------------------------------------------------------
const DEFAULT_PRODUCT_PROMPT = `คำชี้แจง ให้นักเรียนพัฒนาโปรแกรมภาษา Python สำหรับจัดการข้อมูลสินค้า โดยใช้ Class เป็นแม่แบบในการสร้าง Object และใช้ Method สำหรับแสดงข้อมูลและคำนวณราคารวม

งานนี้เป็นการต่อยอดจากใบงานที่ 3 ซึ่งใช้ตัวแปรและฟังก์ชัน มาเป็นการจัดเก็บข้อมูลและพฤติกรรมไว้ภายในคลาส

ข้อกำหนดของโปรแกรม
• สร้างคลาสชื่อ Product
• กำหนด Property ได้แก่ name, price และ quantity
• สร้าง Method ชื่อ show_info() สำหรับแสดงรายละเอียดสินค้า
• คำนวณราคารวมด้วยสูตร ราคาต่อชิ้น x จำนวนสินค้า
• สร้าง Object อย่างน้อย 2 รายการ โดยให้มีข้อมูลสินค้าแตกต่างกัน
• เรียกใช้ Method เพื่อแสดงข้อมูลของ Object แต่ละรายการ
• จัด Indentation ของ Class และ Method ให้ถูกต้อง
• ตรวจสอบว่าโปรแกรมสามารถทำงานและแสดงผลลัพธ์ได้ถูกต้อง

สิ่งที่ต้องส่ง
• ไฟล์โปรแกรม Python ชื่อ work4_product_class.py
• ภาพหน้าจอผลลัพธ์หลังจากรันโปรแกรมสำเร็จ

** นักเรียนสามารถเลือกชื่อสินค้าและกำหนดราคาเองได้ โดยต้องสร้าง Object อย่างน้อย 2 รายการ และคำนวณผลลัพธ์ได้ถูกต้อง`;

const MAX_ASSIGNMENT_SLOTS = 40;

function isCourseAssignmentsDirty(courseId) {
  try {
    return localStorage.getItem('repo_previewer_assignments_dirty_' + courseId) === '1';
  } catch (e) {
    return false;
  }
}

function persistCourseAssignmentsState(courseId, data, markDirty = false) {
  const normalized = normalizeCourseAssignmentsData(courseId, data);
  state.courseAssignments = state.courseAssignments || {};
  state.courseAssignments[courseId] = normalized;
  try {
    localStorage.setItem('repo_previewer_assignments_' + courseId, JSON.stringify(normalized));
    if (markDirty) {
      localStorage.setItem('repo_previewer_assignments_dirty_' + courseId, '1');
    }
  } catch (e) {}
  return normalized;
}

function findFirstEmptySlotNumber(taskList, afterNum = 0) {
  const usedNums = new Set();
  (taskList || []).forEach(t => {
    const tup = getAssignmentSortTuple(t);
    if (tup[0] <= 2 && Number.isFinite(tup[1])) {
      usedNums.add(tup[1]);
    }
  });
  for (let n = afterNum + 1; n <= MAX_ASSIGNMENT_SLOTS; n++) {
    if (!usedNums.has(n)) return n;
  }
  for (let n = 1; n <= afterNum; n++) {
    if (!usedNums.has(n)) return n;
  }
  let extra = MAX_ASSIGNMENT_SLOTS + 1;
  while (usedNums.has(extra)) extra++;
  return extra;
}

function populateAssignmentSelect(selectEl, taskList, activeId, includeAddAction = false) {
  if (!selectEl) return;
  selectEl.innerHTML = '';
  if (!taskList || taskList.length === 0) {
    const emptyOpt = document.createElement('option');
    emptyOpt.value = '';
    emptyOpt.disabled = true;
    emptyOpt.selected = !includeAddAction;
    emptyOpt.textContent = 'ยังไม่มีงานในรายวิชา';
    selectEl.appendChild(emptyOpt);
    if (!includeAddAction) {
      selectEl.disabled = true;
      return;
    }
  }
  selectEl.disabled = false;
  (taskList || []).forEach(task => {
    const opt = document.createElement('option');
    opt.value = task.id;
    opt.textContent = task.title;
    if (task.id === activeId) opt.selected = true;
    selectEl.appendChild(opt);
  });
  if (includeAddAction) {
    const addOpt = document.createElement('option');
    addOpt.value = '__add_slot__';
    addOpt.textContent = '➕ เพิ่มงานใหม่ / ใส่ย้อนหลัง (งาน 1–40)...';
    selectEl.appendChild(addOpt);
  }
}

function formatEmptySlotLabel(slotNum) {
  return `➕ งานที่ ${slotNum} (ยังไม่มีงาน — เลือกเพื่อเพิ่ม)`;
}

function populateModalSlotsSelect(selectEl, taskList, selectedVal) {
  if (!selectEl) return;
  selectEl.innerHTML = '';
  selectEl.disabled = false;

  const bySlot = new Map();
  const extraTasks = [];
  (taskList || []).forEach(task => {
    const tup = getAssignmentSortTuple(task);
    if (tup[0] <= 2 && Number.isFinite(tup[1]) && tup[1] >= 1 && tup[1] <= MAX_ASSIGNMENT_SLOTS) {
      if (!bySlot.has(tup[1])) bySlot.set(tup[1], []);
      bySlot.get(tup[1]).push(task);
    } else {
      extraTasks.push(task);
    }
  });

  for (let n = 1; n <= MAX_ASSIGNMENT_SLOTS; n++) {
    const matched = bySlot.get(n);
    if (matched && matched.length > 0) {
      matched.forEach(task => {
        const opt = document.createElement('option');
        opt.value = task.id;
        opt.textContent = task.title;
        if (opt.value === selectedVal) opt.selected = true;
        selectEl.appendChild(opt);
      });
    } else {
      const opt = document.createElement('option');
      opt.value = `slot:${n}`;
      opt.textContent = formatEmptySlotLabel(n);
      if (opt.value === selectedVal) opt.selected = true;
      selectEl.appendChild(opt);
    }
  }

  extraTasks.forEach(task => {
    const opt = document.createElement('option');
    opt.value = task.id;
    opt.textContent = task.title;
    if (opt.value === selectedVal) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

function updateModalSlotHint(selectedVal, isExistingTask) {
  if (!elements.modalSlotModeHint) return;
  if (selectedVal && selectedVal.startsWith('slot:')) {
    const slotNum = selectedVal.slice(5);
    elements.modalSlotModeHint.className = 'modal-slot-hint is-new';
    elements.modalSlotModeHint.textContent = `✨ เพิ่มงานที่ ${slotNum} ย้อนหลัง/ใหม่ — วางโจทย์แล้วกดบันทึก (ระบบจะเรียงลำดับ 1–40 อัตโนมัติ)`;
  } else if (isExistingTask) {
    elements.modalSlotModeHint.className = 'modal-slot-hint';
    elements.modalSlotModeHint.textContent = 'กำลังแก้ไขงานที่มีอยู่แล้ว (สามารถเลือกเปลี่ยนงาน 1–40 ได้จากรายการด้านบน)';
  } else {
    elements.modalSlotModeHint.className = 'modal-slot-hint';
    elements.modalSlotModeHint.textContent = '';
  }
}

async function fetchCourseAssignments(courseId) {
  if (!courseId) return;
  try {
    const res = await fetch(`/api/assignment/${encodeURIComponent(courseId)}`);
    if (res.ok) {
      const rawData = await res.json();
      const isDirtyLocal = isCourseAssignmentsDirty(courseId);

      // ป้องกันกรณี Vercel Cold Start แล้วไฟล์ Seed ทับงาน 1-40 ที่ครูเพิ่ม/แก้ไข/ลบไว้
      if (rawData.is_seed && isDirtyLocal && state.courseAssignments && state.courseAssignments[courseId]) {
        return;
      }

      const data = persistCourseAssignmentsState(courseId, rawData, false);
      const course = state.courses.find(c => c.id === courseId);
      if (course && data.title) {
        course.assignment = data.title;
        renderCourseSelect();
      }
      renderCourseHub();
      renderAssignmentPickers();
      if (courseId === state.activeCourseId) {
        renderStudioPromptPane(getCurrentStudent());
      }
    }
  } catch (e) {
    console.warn('Could not fetch course assignments:', e);
  }
}

function getActiveAssignmentData() {
  const course = getActiveCourse();
  if (!course) return null;
  const courseData = (state.courseAssignments && state.courseAssignments[course.id]) || null;
  const taskList = (courseData && Array.isArray(courseData.assignments))
    ? sortAssignmentsList(courseData.assignments)
    : [];

  if (courseData && Array.isArray(courseData.assignments) && taskList.length === 0) {
    return {
      id: '',
      title: 'ยังไม่มีชิ้นงาน',
      prompt: '',
      max_score: 10,
    };
  }

  const activeId = (courseData && courseData.active_assignment_id) || (taskList[0] && taskList[0].id) || 'work-4';
  const activeTask = taskList.find(t => t.id === activeId) || taskList[0] || courseData;

  if (activeTask && activeTask.prompt) {
    return activeTask;
  }

  // Fallback defaults for Python OOP
  if (course.id.includes('python') || course.id.includes('oop')) {
    return {
      id: 'work-4',
      title: 'งานที่ 4 โปรแกรมจัดการข้อมูลสินค้า (Product Class)',
      prompt: DEFAULT_PRODUCT_PROMPT,
      max_score: 10,
    };
  }

  return {
    id: 'work-1',
    title: course.assignment || 'โจทย์ประจำงาน',
    prompt: '',
    max_score: 10,
  };
}

function renderAssignmentPickers() {
  const course = getActiveCourse();
  if (!course) return;
  const courseData = (state.courseAssignments && state.courseAssignments[course.id]) || null;
  const rawTaskList = (courseData && Array.isArray(courseData.assignments))
    ? courseData.assignments
    : [
        {
          id: 'work-1',
          title: course.assignment || 'ชิ้นงานที่ 1',
          prompt: course.id.includes('python') || course.id.includes('oop') ? DEFAULT_PRODUCT_PROMPT : '',
          max_score: 10,
        }
      ];
  const taskList = sortAssignmentsList(rawTaskList);
  const activeId = (courseData && courseData.active_assignment_id) || (taskList[0] && taskList[0].id) || '';
  const activeTask = taskList.find(t => t.id === activeId) || taskList[0] || null;

  const isPythonOrHasTasks = taskList.length > 0 || course.id.includes('python') || course.id.includes('oop');

  if (elements.assignmentPickerGroup) {
    elements.assignmentPickerGroup.style.display = isPythonOrHasTasks ? 'inline-flex' : 'none';
  }

  populateAssignmentSelect(elements.assignmentPickerSelect, taskList, activeId, true);
  populateModalSlotsSelect(elements.modalAssignmentTaskSelect, taskList, activeId || `slot:${findFirstEmptySlotNumber(taskList)}`);
  populateAssignmentSelect(elements.modalImportAssignmentSelect, taskList, activeId, true);

  if (elements.btnModalDeleteAssignment) {
    elements.btnModalDeleteAssignment.disabled = taskList.length === 0;
  }
  if (elements.btnModalEditAssignment) {
    elements.btnModalEditAssignment.disabled = taskList.length === 0;
  }
  if (elements.btnDeleteAssignment) {
    const modalVal = elements.modalAssignmentTaskSelect ? elements.modalAssignmentTaskSelect.value : activeId;
    elements.btnDeleteAssignment.disabled = !modalVal || modalVal.startsWith('slot:');
  }

  if (elements.modalPromptPreviewTaskTitle) {
    elements.modalPromptPreviewTaskTitle.textContent = activeTask ? activeTask.title : 'ยังไม่มีชิ้นงาน';
  }
  if (elements.modalPromptPreviewSnippet) {
    elements.modalPromptPreviewSnippet.textContent = activeTask
      ? formatPromptSnippet(activeTask.prompt, 4)
      : 'กด "+ เพิ่มงาน" เพื่อสร้างชิ้นงานและระบุโจทย์ใหม่';
  }
}

async function handleSwitchAssignmentTask(taskId) {
  const course = getActiveCourse();
  if (!course) return;
  const courseData = state.courseAssignments && state.courseAssignments[course.id];
  if (!courseData) return;
  const targetTask = (courseData.assignments || []).find(t => t.id === taskId);
  if (!targetTask) return;

  courseData.active_assignment_id = taskId;
  courseData.id = taskId;
  courseData.title = targetTask.title;
  courseData.prompt = targetTask.prompt;
  courseData.max_score = targetTask.max_score || 10;
  course.assignment = targetTask.title;

  persistCourseAssignmentsState(course.id, courseData, true);

  // Reset student assignment evaluation if for a previous task
  state.students.forEach(s => {
    if (s.assignment_evaluation && s.assignment_evaluation.assignment_id !== taskId) {
      delete s.assignment_evaluation;
    }
  });

  renderCourseSelect();
  renderCourseHub();
  renderAssignmentPickers();
  updateAssignmentGradeBadge(getCurrentStudent());
  renderStudioPromptPane(getCurrentStudent());

  showToast(`สลับโจทย์เป็น: ${targetTask.title}`, 'info');

  try {
    const isDirtyLocal = isCourseAssignmentsDirty(course.id);
    await fetch(`/api/assignment/${encodeURIComponent(course.id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: taskId,
        title: targetTask.title,
        prompt: targetTask.prompt,
        max_score: targetTask.max_score || 10,
        client_assignments: isDirtyLocal ? (courseData.assignments || []) : undefined,
      }),
    });
  } catch (e) {
    console.warn('Could not sync active task to server:', e);
  }
}

async function openAssignmentModal(preselectMode = null) {
  const course = getActiveCourse();
  if (elements.modalAssignmentCourseLabel && course) {
    elements.modalAssignmentCourseLabel.textContent = `วิชา: ${course.subject}`;
  }
  if (elements.assignmentModal) {
    elements.assignmentModal.style.display = 'flex';
  }

  // โหลดข้อมูลล่าสุด
  await fetchCourseAssignments(course.id);
  renderAssignmentPickers();

  const courseData = state.courseAssignments && state.courseAssignments[course.id];
  const taskList = (courseData && Array.isArray(courseData.assignments)) ? sortAssignmentsList(courseData.assignments) : [];
  let targetVal = (courseData && courseData.active_assignment_id) || (taskList[0] && taskList[0].id) || '';

  if (preselectMode === '__first_empty__') {
    targetVal = `slot:${findFirstEmptySlotNumber(taskList)}`;
  } else if (typeof preselectMode === 'number') {
    targetVal = `slot:${preselectMode}`;
  } else if (!targetVal) {
    targetVal = `slot:${findFirstEmptySlotNumber(taskList)}`;
  }

  if (elements.modalAssignmentTaskSelect) {
    elements.modalAssignmentTaskSelect.value = targetVal;
  }
  handleModalTaskSelectChange(targetVal);

  if (preselectMode === '__first_empty__' || typeof preselectMode === 'number') {
    if (elements.assignmentTitleInput) {
      elements.assignmentTitleInput.focus();
      elements.assignmentTitleInput.setSelectionRange(
        elements.assignmentTitleInput.value.length,
        elements.assignmentTitleInput.value.length
      );
    }
  }

  // ตรวจสอบสถานะ API Key
  checkGeminiKeyStatus();
}

function handleModalTaskSelectChange(selectedVal) {
  const course = getActiveCourse();
  if (!course) return;

  if (selectedVal && selectedVal.startsWith('slot:')) {
    const slotNum = parseInt(selectedVal.slice(5), 10) || 1;
    if (elements.assignmentTitleInput) elements.assignmentTitleInput.value = `งานที่ ${slotNum} `;
    if (elements.assignmentPromptTextarea) elements.assignmentPromptTextarea.value = '';
    if (elements.btnDeleteAssignment) elements.btnDeleteAssignment.disabled = true;
    updateModalSlotHint(selectedVal, false);
    return;
  }

  const courseData = state.courseAssignments && state.courseAssignments[course.id];
  const targetTask = (courseData && courseData.assignments ? courseData.assignments : []).find(t => t.id === selectedVal);
  if (targetTask) {
    if (elements.assignmentTitleInput) elements.assignmentTitleInput.value = targetTask.title || '';
    if (elements.assignmentPromptTextarea) elements.assignmentPromptTextarea.value = targetTask.prompt || '';
    if (elements.btnDeleteAssignment) elements.btnDeleteAssignment.disabled = false;
    updateModalSlotHint(selectedVal, true);
  } else {
    if (elements.btnDeleteAssignment) elements.btnDeleteAssignment.disabled = true;
    updateModalSlotHint(selectedVal, false);
  }
}

function handleAddNewAssignmentTask() {
  const course = getActiveCourse();
  if (!course) return;
  const courseData = state.courseAssignments && state.courseAssignments[course.id];
  const existingList = (courseData && Array.isArray(courseData.assignments)) ? sortAssignmentsList(courseData.assignments) : [];

  const curVal = elements.modalAssignmentTaskSelect ? elements.modalAssignmentTaskSelect.value : '';
  const afterNum = (curVal && curVal.startsWith('slot:')) ? (parseInt(curVal.slice(5), 10) || 0) : 0;
  const nextNum = findFirstEmptySlotNumber(existingList, afterNum);
  const slotVal = `slot:${nextNum}`;

  if (elements.modalAssignmentTaskSelect) {
    let opt = Array.from(elements.modalAssignmentTaskSelect.options).find(o => o.value === slotVal);
    if (!opt) {
      opt = document.createElement('option');
      opt.value = slotVal;
      opt.textContent = formatEmptySlotLabel(nextNum);
      elements.modalAssignmentTaskSelect.appendChild(opt);
    }
    elements.modalAssignmentTaskSelect.value = slotVal;
  }

  handleModalTaskSelectChange(slotVal);

  if (elements.assignmentTitleInput) {
    elements.assignmentTitleInput.focus();
    elements.assignmentTitleInput.setSelectionRange(
      elements.assignmentTitleInput.value.length,
      elements.assignmentTitleInput.value.length
    );
  }

  showToast(`เลือกงานที่ ${nextNum} แล้ว — ตั้งชื่องานและวางโจทย์ได้เลย`, 'info');
}

async function handleDeleteAssignmentTask(taskId = null, targetCourseId = null, keepModalOpen = false) {
  const course = targetCourseId
    ? state.courses.find(c => c.id === targetCourseId)
    : getActiveCourse();
  if (!course) return;

  const courseData = state.courseAssignments && state.courseAssignments[course.id];
  const existingList = (courseData && Array.isArray(courseData.assignments))
    ? sortAssignmentsList(courseData.assignments)
    : [];

  let targetId = taskId;
  if (!targetId) {
    if (keepModalOpen && elements.modalAssignmentTaskSelect) {
      targetId = elements.modalAssignmentTaskSelect.value;
    } else {
      targetId = (courseData && courseData.active_assignment_id) || (existingList[0] && existingList[0].id);
    }
  }

  if (!targetId || targetId.startsWith('slot:')) {
    showToast('งานนี้ยังไม่ได้บันทึกไว้ (ไม่มีข้อมูลให้ลบ)', 'info');
    return;
  }

  const targetTask = existingList.find(t => t.id === targetId);
  if (!targetTask) {
    renderAssignmentPickers();
    return;
  }

  const confirmed = window.confirm(`ต้องการลบ "${targetTask.title}" ออกจากรายวิชา ${course.subject} ใช่หรือไม่?`);
  if (!confirmed) return;

  try {
    const res = await fetch(`/api/assignment/${encodeURIComponent(course.id)}/${encodeURIComponent(targetId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      showToast('ไม่สามารถลบงานได้', 'error');
      return;
    }

    const updated = persistCourseAssignmentsState(course.id, await res.json(), true);
    course.assignment = updated.title || 'ยังไม่มีชิ้นงาน';

    state.students.forEach(s => {
      if (s.assignment_evaluation && s.assignment_evaluation.assignment_id === targetId) {
        delete s.assignment_evaluation;
      }
    });

    renderCourseSelect();
    renderCourseHub();
    renderAssignmentPickers();
    updateAssignmentGradeBadge(getCurrentStudent());
    renderStudioPromptPane(getCurrentStudent());

    if (keepModalOpen) {
      const nextList = updated.assignments || [];
      const nextVal = updated.active_assignment_id || (nextList[0] && nextList[0].id) || `slot:${findFirstEmptySlotNumber(nextList)}`;
      if (elements.modalAssignmentTaskSelect) {
        elements.modalAssignmentTaskSelect.value = nextVal;
      }
      handleModalTaskSelectChange(nextVal);
    }

    showToast(`🗑️ ลบ "${targetTask.title}" เรียบร้อยแล้ว`, 'info');
  } catch (e) {
    showToast(`เกิดข้อผิดพลาดในการลบงาน: ${e.message}`, 'error');
  }
}

function closeAssignmentModal() {
  if (elements.assignmentModal) {
    elements.assignmentModal.style.display = 'none';
  }
}

const WORK5_PRACTICAL_EXAM_TITLE = 'งานที่ 5 สอบปฏิบัติ (ข้อสอบชุด A, B, C, D · Rubric 20 คะแนน)';

const WORK5_PRACTICAL_EXAM_PROMPT = `งานที่ 5 การสอบปฏิบัติ (ข้อสอบชุด A, B, C, D) · แบบประเมินผลการสอบปฏิบัติ (Rubric Score)
รายวิชา การเขียนโปรแกรมเชิงวัตถุเบื้องต้น · รหัสวิชา 21910-2011 · คะแนนเต็ม 20 คะแนน

ข้อสอบปฏิบัติมี 4 ชุด (ระบบตรวจวิเคราะห์ชุดข้อสอบให้อัตโนมัติ หรือครูสามารถคลิกเลือกชุด A / B / C / D ได้ทันที):

• [ชุด A] โปรแกรมคำนวณราคาสินค้า (คะแนนเต็ม 20 คะแนน)
  1. การรับข้อมูลและกำหนดตัวแปร (3 คะแนน): รับข้อมูลชื่อสินค้า ราคา และจำนวนสินค้าได้ครบถ้วน กำหนดตัวแปรและแปลงชนิดข้อมูลถูกต้อง
  2. การสร้าง Class และ Attributes (3 คะแนน): สร้าง Class Product และกำหนด Attributes ได้ครบทั้ง 3 รายการ (name, price, quantity)
  3. การสร้าง Object และ Method (3 คะแนน): สร้าง Object และเรียกใช้ Method แสดงรายละเอียดสินค้าได้ถูกต้อง
  4. การสร้าง Function และ Parameter (3 คะแนน): สร้าง Function รับ Parameter และส่งค่าผลการประเมินกลับได้ถูกต้อง
  5. การใช้คำสั่งวนซ้ำและเงื่อนไข (4 คะแนน): ใช้ for, range() และ if-else ได้ถูกต้อง วนรับข้อมูลครบ 3 รายการ
  6. การคำนวณและแสดงผลลัพธ์ (4 คะแนน): คำนวณราคาสินค้า สะสมยอดรวม และแสดงผลสรุปได้ถูกต้องครบถ้วน

• [ชุด B] โปรแกรมบันทึกยอดขายประจำวัน (คะแนนเต็ม 20 คะแนน)
  1. การรับข้อมูลและกำหนดตัวแปร (3 คะแนน): รับข้อมูลยอดขายและกำหนดตัวแปรได้ถูกต้องครบถ้วน
  2. การสร้าง Class และ Attributes (3 คะแนน): สร้าง Class DailySales และกำหนด Attributes ได้แก่ day และ sales ได้ถูกต้อง
  3. การสร้าง Object และ Method (3 คะแนน): สร้าง Object และเรียกใช้ Method แสดงข้อมูลยอดขายได้ถูกต้อง
  4. การสร้าง Function และ Parameter (3 คะแนน): สร้าง Function รับยอดขายผ่าน Parameter และส่งผลการประเมินกลับได้ถูกต้อง
  5. การใช้คำสั่งวนซ้ำและเงื่อนไข (4 คะแนน): ใช้ while และ if-else ได้ถูกต้อง วนรับข้อมูลครบ 3 วันและสิ้นสุดการทำงานได้
  6. การสะสมยอดขายและแสดงผลลัพธ์ (4 คะแนน): สะสมยอดขายทั้ง 3 วันและแสดงยอดขายรวมได้ถูกต้อง

• [ชุด C] โปรแกรมตรวจสอบสินค้าคงเหลือ (คะแนนเต็ม 20 คะแนน)
  1. การรับข้อมูลและกำหนดตัวแปร (3 คะแนน): รับข้อมูลชื่อสินค้าและจำนวนสินค้าคงเหลือได้ครบถ้วน กำหนดตัวแปรและชนิดข้อมูลถูกต้อง
  2. การสร้าง Class และ Attributes (3 คะแนน): สร้าง Class StockProduct และกำหนด Attributes ได้แก่ name และ quantity ได้ถูกต้อง
  3. การสร้าง Object และ Method (3 คะแนน): สร้าง Object และเรียกใช้ Method แสดงรายละเอียดสินค้าได้ถูกต้อง
  4. การสร้าง Function และ Parameter (3 คะแนน): สร้าง Function รับจำนวนสินค้าผ่าน Parameter และส่งสถานะสินค้ากลับได้ถูกต้อง
  5. การใช้คำสั่งวนซ้ำและเงื่อนไข (4 คะแนน): ใช้ for, range() และ if-else ได้ถูกต้อง วนตรวจสอบสินค้าครบ 3 รายการ
  6. การตรวจสอบสถานะและแสดงผลลัพธ์ (4 คะแนน): ตรวจสอบสถานะสินค้า สะสมจำนวนสินค้าคงเหลือ และแสดงผลรวมได้ถูกต้อง

• [ชุด D] โปรแกรมคำนวณหน่วยไฟฟ้า (คะแนนเต็ม 20 คะแนน)
  1. การรับข้อมูลและกำหนดตัวแปร (3 คะแนน): รับข้อมูลชื่อบ้านและเลขมิเตอร์ทั้งสองค่าได้ครบถ้วน กำหนดตัวแปรและแปลงชนิดข้อมูลถูกต้อง
  2. การสร้าง Class และ Attributes (3 คะแนน): สร้าง Class ElectricityRecord และกำหนด Attributes ครบทั้ง 3 รายการ
  3. การสร้าง Object และ Method (3 คะแนน): สร้าง Object และเรียกใช้ Method แสดงข้อมูลมิเตอร์ได้ถูกต้อง
  4. การสร้าง Function และ Parameter (3 คะแนน): สร้าง Function รับจำนวนหน่วยไฟฟ้าผ่าน Parameter และส่งผลการประเมินกลับได้ถูกต้อง
  5. การใช้คำสั่งวนซ้ำและเงื่อนไข (4 คะแนน): ใช้ while และ if-else ได้ถูกต้อง วนรับข้อมูลบ้านครบ 3 หลังและสิ้นสุดการทำงานได้
  6. การคำนวณหน่วยไฟฟ้าและแสดงผลลัพธ์ (4 คะแนน): คำนวณหน่วยไฟฟ้าทั้ง 3 หลัง สะสมหน่วยไฟฟ้า และแสดงผลรวมได้ถูกต้อง

เกณฑ์การแปลผลคะแนนรวม (ใช้ร่วมกันทุกชุดข้อสอบ A–D · คะแนนเต็ม 20 คะแนน):
• 17 – 20 คะแนน = ดีมาก
• 13 – 16 คะแนน = ดี
• 9 – 12 คะแนน = พอใช้
• 0 – 8 คะแนน = ปรับปรุง`;

const PRACTICAL_EXAM_SETS_META = {
  A: {
    code: 'A',
    title: 'โปรแกรมคำนวณราคาสินค้า',
    fullTitle: 'ชุด A · โปรแกรมคำนวณราคาสินค้า',
    className: 'Product',
    attrs: 'name, price, quantity (3 รายการ)',
    loop: 'for, range() และ if-else (ครบ 3 รายการ)',
    criteria: [
      { id: 1, title: '1. การรับข้อมูลและกำหนดตัวแปร', max_score: 3, desc: 'รับชื่อสินค้า ราคา และจำนวนสินค้า กำหนดตัวแปรและแปลงชนิดข้อมูลถูกต้อง' },
      { id: 2, title: '2. การสร้าง Class และ Attributes', max_score: 3, desc: 'สร้าง Class Product และกำหนด Attributes ครบทั้ง 3 รายการ' },
      { id: 3, title: '3. การสร้าง Object และ Method', max_score: 3, desc: 'สร้าง Object และเรียกใช้ Method แสดงรายละเอียดสินค้าได้ถูกต้อง' },
      { id: 4, title: '4. การสร้าง Function และ Parameter', max_score: 3, desc: 'สร้าง Function รับ Parameter และส่งค่าผลการประเมินกลับได้ถูกต้อง' },
      { id: 5, title: '5. การใช้คำสั่งวนซ้ำและเงื่อนไข', max_score: 4, desc: 'ใช้ for, range() และ if-else ได้ถูกต้อง วนรับข้อมูลครบ 3 รายการ' },
      { id: 6, title: '6. การคำนวณและแสดงผลลัพธ์', max_score: 4, desc: 'คำนวณราคาสินค้า สะสมยอดรวม และแสดงผลสรุปได้ถูกต้องครบถ้วน' },
    ],
  },
  B: {
    code: 'B',
    title: 'โปรแกรมบันทึกยอดขายประจำวัน',
    fullTitle: 'ชุด B · โปรแกรมบันทึกยอดขายประจำวัน',
    className: 'DailySales',
    attrs: 'day, sales (2 รายการ)',
    loop: 'while และ if-else (ครบ 3 วัน)',
    criteria: [
      { id: 1, title: '1. การรับข้อมูลและกำหนดตัวแปร', max_score: 3, desc: 'รับข้อมูลยอดขายและกำหนดตัวแปรได้ถูกต้องครบถ้วน' },
      { id: 2, title: '2. การสร้าง Class และ Attributes', max_score: 3, desc: 'สร้าง Class DailySales และกำหนด Attributes ได้แก่ day และ sales ได้ถูกต้อง' },
      { id: 3, title: '3. การสร้าง Object และ Method', max_score: 3, desc: 'สร้าง Object และเรียกใช้ Method แสดงข้อมูลยอดขายได้ถูกต้อง' },
      { id: 4, title: '4. การสร้าง Function และ Parameter', max_score: 3, desc: 'สร้าง Function รับยอดขายผ่าน Parameter และส่งผลการประเมินกลับได้ถูกต้อง' },
      { id: 5, title: '5. การใช้คำสั่งวนซ้ำและเงื่อนไข', max_score: 4, desc: 'ใช้ while และ if-else ได้ถูกต้อง วนรับข้อมูลครบ 3 วันและสิ้นสุดการทำงานได้' },
      { id: 6, title: '6. การสะสมยอดขายและแสดงผลลัพธ์', max_score: 4, desc: 'สะสมยอดขายทั้ง 3 วันและแสดงยอดขายรวมได้ถูกต้อง' },
    ],
  },
  C: {
    code: 'C',
    title: 'โปรแกรมตรวจสอบสินค้าคงเหลือ',
    fullTitle: 'ชุด C · โปรแกรมตรวจสอบสินค้าคงเหลือ',
    className: 'StockProduct',
    attrs: 'name, quantity (2 รายการ)',
    loop: 'for, range() และ if-else (ครบ 3 รายการ)',
    criteria: [
      { id: 1, title: '1. การรับข้อมูลและกำหนดตัวแปร', max_score: 3, desc: 'รับชื่อสินค้าและจำนวนสินค้าคงเหลือ กำหนดตัวแปรและชนิดข้อมูลถูกต้อง' },
      { id: 2, title: '2. การสร้าง Class และ Attributes', max_score: 3, desc: 'สร้าง Class StockProduct และกำหนด Attributes ได้แก่ name และ quantity ได้ถูกต้อง' },
      { id: 3, title: '3. การสร้าง Object และ Method', max_score: 3, desc: 'สร้าง Object และเรียกใช้ Method แสดงรายละเอียดสินค้าได้ถูกต้อง' },
      { id: 4, title: '4. การสร้าง Function และ Parameter', max_score: 3, desc: 'สร้าง Function รับจำนวนสินค้าผ่าน Parameter และส่งสถานะสินค้ากลับได้ถูกต้อง' },
      { id: 5, title: '5. การใช้คำสั่งวนซ้ำและเงื่อนไข', max_score: 4, desc: 'ใช้ for, range() และ if-else ได้ถูกต้อง วนตรวจสอบสินค้าครบ 3 รายการ' },
      { id: 6, title: '6. การตรวจสอบสถานะและแสดงผลลัพธ์', max_score: 4, desc: 'ตรวจสอบสถานะสินค้า สะสมจำนวนสินค้าคงเหลือ และแสดงผลรวมได้ถูกต้อง' },
    ],
  },
  D: {
    code: 'D',
    title: 'โปรแกรมคำนวณหน่วยไฟฟ้า',
    fullTitle: 'ชุด D · โปรแกรมคำนวณหน่วยไฟฟ้า',
    className: 'ElectricityRecord',
    attrs: 'ชื่อบ้านและเลขมิเตอร์ (ครบ 3 รายการ)',
    loop: 'while และ if-else (ครบ 3 หลัง)',
    criteria: [
      { id: 1, title: '1. การรับข้อมูลและกำหนดตัวแปร', max_score: 3, desc: 'รับข้อมูลชื่อบ้านและเลขมิเตอร์ทั้งสองค่า กำหนดตัวแปรและแปลงชนิดข้อมูลถูกต้อง' },
      { id: 2, title: '2. การสร้าง Class และ Attributes', max_score: 3, desc: 'สร้าง Class ElectricityRecord และกำหนด Attributes ครบทั้ง 3 รายการ' },
      { id: 3, title: '3. การสร้าง Object และ Method', max_score: 3, desc: 'สร้าง Object และเรียกใช้ Method แสดงข้อมูลมิเตอร์ได้ถูกต้อง' },
      { id: 4, title: '4. การสร้าง Function และ Parameter', max_score: 3, desc: 'สร้าง Function รับจำนวนหน่วยไฟฟ้าผ่าน Parameter และส่งผลการประเมินกลับได้ถูกต้อง' },
      { id: 5, title: '5. การใช้คำสั่งวนซ้ำและเงื่อนไข', max_score: 4, desc: 'ใช้ while และ if-else ได้ถูกต้อง วนรับข้อมูลบ้านครบ 3 หลังและสิ้นสุดการทำงานได้' },
      { id: 6, title: '6. การคำนวณหน่วยไฟฟ้าและแสดงผลลัพธ์', max_score: 4, desc: 'คำนวณหน่วยไฟฟ้าทั้ง 3 หลัง สะสมหน่วยไฟฟ้า และแสดงผลรวมได้ถูกต้อง' },
    ],
  },
};

function isPracticalExamAssignment(asg) {
  if (!asg) return false;
  const id = String(asg.id || '').toLowerCase();
  const title = String(asg.title || '').toLowerCase();
  const prompt = String(asg.prompt || '').toLowerCase();
  if (id === 'work-5' || /^งานที่\s*5\b/.test(title) || title.includes('สอบปฏิบัติ')) return true;
  if (Number(asg.max_score) === 20) return true;
  const signals = ['ชุด a', 'ชุด b', 'ชุด c', 'ชุด d', 'สอบปฏิบัติ', 'rubric score', 'dailysales', 'stockproduct', 'electricityrecord'];
  return signals.filter(s => prompt.includes(s)).length >= 2;
}

function detectClientPracticalExamSet(code, filename = '', studentName = '', preferredSet = null) {
  if (preferredSet && PRACTICAL_EXAM_SETS_META[preferredSet.toUpperCase()]) {
    return preferredSet.toUpperCase();
  }
  const combined = `${filename}\n${studentName}\n${code || ''}`.toLowerCase();
  const explicit = combined.match(/(?:ชุดข้อสอบ|ชุดที่|ข้อสอบชุด|ชุด|set)\s*[:#\-_]?\s*([abcd])\b/i);
  if (explicit) return explicit[1].toUpperCase();

  const scores = { A: 0, B: 0, C: 0, D: 0 };
  [['dailysales', 6], ['daily_sales', 5], ['check_sales', 4], ['ยอดขาย', 4], ['sales', 2], ['จำนวน3วัน', 3]].forEach(([k, w]) => {
    if (combined.includes(k)) scores.B += w;
  });
  [['stockproduct', 6], ['stock_product', 5], ['check_stock', 4], ['คงเหลือ', 4], ['สถานะสินค้า', 4], ['stock', 3]].forEach(([k, w]) => {
    if (combined.includes(k)) scores.C += w;
  });
  [['electricityrecord', 6], ['electricity', 5], ['meter', 3], ['มิเตอร์', 4], ['หน่วยไฟฟ้า', 5], ['ไฟฟ้า', 3], ['ชื่อบ้าน', 4]].forEach(([k, w]) => {
    if (combined.includes(k)) scores.D += w;
  });
  [['class product', 6], ['ราคาสินค้า', 4], ['total_price', 3], ['price', 2], ['คำนวณราคา', 4]].forEach(([k, w]) => {
    if (combined.includes(k)) scores.A += w;
  });

  let best = 'A';
  ['A', 'B', 'C', 'D'].forEach(k => {
    if (scores[k] > scores[best]) best = k;
  });
  return best;
}

function getExamQualityLevelInfo(totalScore) {
  const s = Math.max(0, Math.min(20, Math.round(Number(totalScore) || 0)));
  if (s >= 17) return { level: 'ดีมาก', status: 'passed', badgeClass: 'lvl-excellent' };
  if (s >= 13) return { level: 'ดี', status: 'passed', badgeClass: 'lvl-good' };
  if (s >= 9) return { level: 'พอใช้', status: 'partial', badgeClass: 'lvl-fair' };
  return { level: 'ปรับปรุง', status: 'failed', badgeClass: 'lvl-poor' };
}

function getCriterionLevelInfo(score, maxScore) {
  const s = Number(score) || 0;
  if (maxScore === 3) {
    if (s >= 3) return { label: 'ดีมาก', cls: 'lvl-excellent', cardCls: 'score-high' };
    if (s === 2) return { label: 'ดี', cls: 'lvl-good', cardCls: 'score-mid' };
    if (s === 1) return { label: 'พอใช้', cls: 'lvl-fair', cardCls: 'score-low' };
    return { label: 'ปรับปรุง', cls: 'lvl-poor', cardCls: 'score-zero' };
  }
  if (s >= 4) return { label: 'ดีมาก', cls: 'lvl-excellent', cardCls: 'score-high' };
  if (s === 3) return { label: 'ดี', cls: 'lvl-good', cardCls: 'score-mid' };
  if (s === 2) return { label: 'พอใช้', cls: 'lvl-fair', cardCls: 'score-low' };
  return { label: 'ปรับปรุง', cls: 'lvl-poor', cardCls: 'score-zero' };
}

async function ensureWork5PracticalExamRubric() {
  const oopCourseId = 'course-python-oop-1';
  const migrationKey = 'repo_previewer_work5_rubric_v1';
  try {
    if (localStorage.getItem(migrationKey) === '1') return;
  } catch (e) {}

  const courseData = state.courseAssignments && state.courseAssignments[oopCourseId];
  const existingList = (courseData && Array.isArray(courseData.assignments)) ? [...courseData.assignments] : [];

  const work5Idx = existingList.findIndex(t => {
    const tup = getAssignmentSortTuple(t);
    return t.id === 'work-5' || (tup[0] <= 2 && tup[1] === 5);
  });

  if (work5Idx >= 0) {
    const cur5 = existingList[work5Idx];
    const has4Sets = (cur5.prompt || '').includes('ชุด A') && (cur5.prompt || '').includes('ชุด D');
    if (has4Sets && Number(cur5.max_score) === 20) {
      try { localStorage.setItem(migrationKey, '1'); } catch (e) {}
      return;
    }
  }

  const targetId = work5Idx >= 0 ? existingList[work5Idx].id : 'work-5';
  const targetTitle = (work5Idx >= 0 && existingList[work5Idx].title && existingList[work5Idx].title.includes('ชุด'))
    ? existingList[work5Idx].title
    : WORK5_PRACTICAL_EXAM_TITLE;

  try {
    const res = await fetch(`/api/assignment/${encodeURIComponent(oopCourseId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: targetId,
        title: targetTitle,
        prompt: WORK5_PRACTICAL_EXAM_PROMPT,
        max_score: 20,
        client_assignments: existingList.length > 0 ? existingList : undefined,
      }),
    });
    if (res.ok) {
      const updated = persistCourseAssignmentsState(oopCourseId, await res.json(), true);
      const oopCourse = state.courses.find(c => c.id === oopCourseId);
      if (oopCourse && updated.title) {
        oopCourse.assignment = updated.title;
      }
      try { localStorage.setItem(migrationKey, '1'); } catch (e) {}
      renderCourseSelect();
      renderCourseHub();
      renderAssignmentPickers();
      if (state.activeCourseId === oopCourseId) {
        renderStudioPromptPane(getCurrentStudent());
      }
    }
  } catch (e) {
    console.warn('Could not auto-sync Work 5 rubric:', e);
  }
}

function loadExam5PracticalRubricPrompt() {
  if (elements.modalAssignmentTaskSelect) {
    const opts = Array.from(elements.modalAssignmentTaskSelect.options);
    const work5Opt = opts.find(o => o.value === 'work-5' || o.value === 'slot:5' || /^งานที่\s*5\b/.test(o.textContent.trim()));
    if (work5Opt) {
      elements.modalAssignmentTaskSelect.value = work5Opt.value;
      handleModalTaskSelectChange(work5Opt.value);
    }
  }
  if (elements.assignmentTitleInput) {
    elements.assignmentTitleInput.value = WORK5_PRACTICAL_EXAM_TITLE;
  }
  if (elements.assignmentPromptTextarea) {
    elements.assignmentPromptTextarea.value = WORK5_PRACTICAL_EXAM_PROMPT;
  }
  showToast('โหลดโจทย์และตาราง Rubric งานที่ 5 (ข้อสอบปฏิบัติ 4 ชุด A–D · 20 คะแนน) แล้ว', 'success');
}

function loadExampleProductPrompt() {
  if (elements.assignmentTitleInput) {
    elements.assignmentTitleInput.value = 'งานที่ 4 โปรแกรมจัดการข้อมูลสินค้า (Product Class)';
  }
  if (elements.assignmentPromptTextarea) {
    elements.assignmentPromptTextarea.value = DEFAULT_PRODUCT_PROMPT;
  }
  showToast('โหลดโจทย์ตัวอย่าง: งานที่ 4 โปรแกรมจัดการข้อมูลสินค้า แล้ว', 'success');
}

const GLOBAL_GEMINI_KEY_STORAGE = 'repo_previewer_gemini_api_key';
const DEFAULT_BUILTIN_GEMINI_KEYS_B64 = [
  'QVEuQWI4Uk42S0lkX3d2ZnQxT001aEJ6VF9lZXJ5dFlwc243TVJyVnhJRVB3UlZtSFNvX2c=',
  'QVEuQWI4Uk42STBuYUtCMmNMNl96WGlJY1BNXzBtZDM0MGJwQUUzTUhGOTNSMkZzUGI4NFE=',
];
const DEFAULT_BUILTIN_GEMINI_KEY_B64 = DEFAULT_BUILTIN_GEMINI_KEYS_B64[0];

function parseGeminiApiKeysList(raw) {
  if (!raw || !String(raw).trim()) return [];
  const tokens = String(raw).trim().split(/[,;\s]+/);
  const result = [];
  tokens.forEach(tok => {
    const clean = tok.trim();
    if (clean && !result.includes(clean)) {
      result.push(clean);
    }
  });
  return result;
}

function getBuiltinGeminiKeys() {
  const keys = [];
  DEFAULT_BUILTIN_GEMINI_KEYS_B64.forEach(b64 => {
    try {
      const decoded = atob(b64).trim();
      if (decoded && !keys.includes(decoded)) {
        keys.push(decoded);
      }
    } catch (e) {}
  });
  return keys;
}

function getBuiltinGeminiKey() {
  return getBuiltinGeminiKeys().join(',');
}

function getSavedGlobalGeminiKey() {
  const builtinKeys = getBuiltinGeminiKeys();
  try {
    const raw = localStorage.getItem(GLOBAL_GEMINI_KEY_STORAGE);
    if (raw !== null) {
      const savedList = parseGeminiApiKeysList(raw);
      if (savedList.length === 0) {
        return '';
      }
      // อัปเกรดอัตโนมัติให้รวมคีย์สำรองของระบบทั้งหมดเข้าใน Pool เสมอ
      let changed = false;
      builtinKeys.forEach(bk => {
        if (!savedList.includes(bk)) {
          savedList.push(bk);
          changed = true;
        }
      });
      const joined = savedList.join(',');
      if (changed) {
        localStorage.setItem(GLOBAL_GEMINI_KEY_STORAGE, joined);
      }
      return joined;
    }
    const builtinJoined = builtinKeys.join(',');
    if (builtinJoined) {
      localStorage.setItem(GLOBAL_GEMINI_KEY_STORAGE, builtinJoined);
    }
    return builtinJoined;
  } catch (e) {
    return builtinKeys.join(',');
  }
}

function saveGlobalGeminiKeyLocal(apiKey) {
  try {
    const parsed = parseGeminiApiKeysList(apiKey);
    if (parsed.length > 0) {
      // รวมคีย์ที่ผู้ใช้กรอกไว้หน้าสุด ตามด้วยคีย์สำรองในระบบเพื่อใช้สลับเมื่อเต็ม
      getBuiltinGeminiKeys().forEach(bk => {
        if (!parsed.includes(bk)) {
          parsed.push(bk);
        }
      });
      localStorage.setItem(GLOBAL_GEMINI_KEY_STORAGE, parsed.join(','));
    } else {
      localStorage.removeItem(GLOBAL_GEMINI_KEY_STORAGE);
    }
  } catch (e) {}
}

function maskGeminiApiKey(key) {
  const keys = parseGeminiApiKeysList(key);
  if (keys.length === 0) return '';
  const first = keys[0];
  const firstMasked = first.length >= 12 ? `${first.slice(0, 6)}...${first.slice(-4)}` : 'AIza...****';
  return keys.length > 1 ? `${firstMasked} (+สำรองอีก ${keys.length - 1} คีย์)` : firstMasked;
}

function maskSingleGeminiKey(key) {
  const clean = String(key || '').trim();
  if (!clean) return '';
  return clean.length >= 12 ? `${clean.slice(0, 6)}...${clean.slice(-4)}` : 'AIza...****';
}

function renderGeminiKeyPoolUI(maskedKeysList = []) {
  const poolEl = document.getElementById('geminiKeyPoolList');
  if (!poolEl) return;
  let keysToShow = Array.isArray(maskedKeysList) && maskedKeysList.length > 0
    ? maskedKeysList
    : parseGeminiApiKeysList(getSavedGlobalGeminiKey()).map(maskSingleGeminiKey);

  if (keysToShow.length === 0) {
    poolEl.innerHTML = `<div style="font-size: 0.8rem; color: var(--text-secondary);">ยังไม่มี API Key ที่เปิดใช้งาน (ระบบจะใช้ AST ตรวจโครงสร้างแทน)</div>`;
    return;
  }

  poolEl.innerHTML = `
    <div style="font-size: 0.78rem; font-weight: 700; color: #38bdf8; display: flex; align-items: center; justify-content: space-between;">
      <span>🔄 รายการ API Key ในระบบสลับอัตโนมัติ (${keysToShow.length} คีย์)</span>
      <span style="font-weight: 500; color: #94a3b8;">สลับคีย์สำรองทันทีเมื่อคีย์หลักเต็ม</span>
    </div>
    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 2px;">
      ${keysToShow.map((mk, idx) => `
        <div style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; background: ${idx === 0 ? 'rgba(16, 185, 129, 0.14)' : 'rgba(59, 130, 246, 0.14)'}; border: 1px solid ${idx === 0 ? 'rgba(16, 185, 129, 0.35)' : 'rgba(59, 130, 246, 0.35)'}; font-size: 0.78rem; color: #e2e8f0;">
          <span style="font-weight: 700; color: ${idx === 0 ? '#34d399' : '#60a5fa'};">${idx === 0 ? 'คีย์หลัก #1' : `คีย์สำรอง #${idx + 1}`}</span>
          <code style="font-family: var(--font-mono); font-size: 0.76rem; color: #f8fafc;">${escapeHtml(mk)}</code>
        </div>
      `).join('')}
    </div>
  `;
}

function applyGeminiKeyStatusUI({ configured, masked, source, keys_count, masked_keys }) {
  const badges = [
    elements.geminiKeyStatusBadge,
    elements.hubGeminiKeyStatusBadge,
    elements.aiModalKeyStatusBadge,
  ];
  const localKeys = parseGeminiApiKeysList(getSavedGlobalGeminiKey());
  const effectiveMaskedKeys = (Array.isArray(masked_keys) && masked_keys.length > 0)
    ? masked_keys
    : localKeys.map(maskSingleGeminiKey);
  const count = keys_count || effectiveMaskedKeys.length || (configured ? 1 : 0);

  const label = configured
    ? (count > 1
      ? `✓ เชื่อมต่อแล้ว (${count} คีย์สลับอัตโนมัติ · ${effectiveMaskedKeys.join(', ')})`
      : (source === 'env'
        ? `✓ เชื่อมต่อแล้ว (${masked} · คีย์หลักระบบ)`
        : `✓ เชื่อมต่อแล้ว (${masked} · ใช้ร่วมกันทั้งระบบ)`))
    : 'ยังไม่ได้ตั้งค่า (ใช้ AST ตรวจโครงสร้างแทน)';

  renderGeminiKeyPoolUI(configured ? effectiveMaskedKeys : []);

  badges.forEach(badge => {
    if (!badge) return;
    badge.className = configured ? 'badge badge-success' : 'badge badge-subtle';
    badge.textContent = label;
  });

  if (elements.headerAiKeyDot) {
    elements.headerAiKeyDot.classList.toggle('is-connected', Boolean(configured));
  }

  if (elements.btnClearGeminiKey) {
    const hasClientOrConfigKey = Boolean(getSavedGlobalGeminiKey()) || source === 'config';
    elements.btnClearGeminiKey.disabled = !hasClientOrConfigKey;
  }
}

function openAiSettingsModal() {
  if (elements.geminiKeyMessage) {
    elements.geminiKeyMessage.className = 'key-status-msg';
    elements.geminiKeyMessage.textContent = '';
  }
  if (elements.aiSettingsModal) {
    elements.aiSettingsModal.style.display = 'flex';
  }
  checkGeminiKeyStatus();
  if (elements.geminiApiKeyInput) {
    setTimeout(() => elements.geminiApiKeyInput.focus(), 60);
  }
}

function closeAiSettingsModal() {
  if (elements.aiSettingsModal) {
    elements.aiSettingsModal.style.display = 'none';
  }
}

async function checkGeminiKeyStatus() {
  const localKey = getSavedGlobalGeminiKey();
  if (localKey) {
    applyGeminiKeyStatusUI({
      configured: true,
      masked: maskGeminiApiKey(localKey),
      source: 'local',
    });
  }
  try {
    const res = await fetch('/api/settings/gemini-key');
    if (res.ok) {
      const data = await res.json();
      if (localKey) {
        // ซิงก์คีย์กลางจากเบราว์เซอร์ไปยังเซิร์ฟเวอร์อัตโนมัติหากเซิร์ฟเวอร์เริ่มใหม่ (เช่น Vercel Cold Start)
        if (!data.configured) {
          fetch('/api/settings/gemini-key', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_key: localKey, skip_test: true }),
          }).catch(() => {});
        }
        applyGeminiKeyStatusUI({
          configured: true,
          masked: maskGeminiApiKey(localKey),
          source: 'local',
        });
      } else {
        applyGeminiKeyStatusUI(data);
      }
    } else if (!localKey) {
      applyGeminiKeyStatusUI({ configured: false, masked: '', source: '' });
    }
  } catch (e) {
    if (!localKey) {
      [elements.geminiKeyStatusBadge, elements.hubGeminiKeyStatusBadge, elements.aiModalKeyStatusBadge]
        .forEach(badge => {
          if (badge) badge.textContent = 'ไม่สามารถตรวจสอบได้';
        });
    }
  }
}

async function handleSaveGeminiKey() {
  const key = elements.geminiApiKeyInput ? elements.geminiApiKeyInput.value.trim() : '';
  if (!key) {
    showToast('กรุณาระบุ Gemini API Key', 'warning');
    if (elements.geminiApiKeyInput) elements.geminiApiKeyInput.focus();
    return;
  }
  saveGlobalGeminiKeyLocal(key);
  applyGeminiKeyStatusUI({
    configured: true,
    masked: maskGeminiApiKey(key),
    source: 'local',
  });

  if (elements.geminiKeyMessage) {
    elements.geminiKeyMessage.className = 'key-status-msg';
    elements.geminiKeyMessage.textContent = 'กำลังบันทึกและทดสอบ API Key กลาง...';
  }
  try {
    const res = await fetch('/api/settings/gemini-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: key }),
    });
    const data = await res.json();
    if (res.ok && (data.status === 'ok' || data.status === 'saved_with_warning')) {
      showToast(data.message || 'บันทึก API Key กลางทั้งระบบเรียบร้อยแล้ว', data.status === 'ok' ? 'success' : 'warning');
      if (elements.geminiKeyMessage) {
        elements.geminiKeyMessage.className = data.status === 'ok' ? 'key-status-msg success' : 'key-status-msg';
        elements.geminiKeyMessage.textContent = `✓ บันทึกคีย์กลางทั้งระบบแล้ว (${data.masked}) — ใช้ได้ทุกวิชาและทุกงาน`;
      }
      if (elements.geminiApiKeyInput) elements.geminiApiKeyInput.value = '';
      checkGeminiKeyStatus();
    } else {
      const errMsg = data.detail || data.message || 'API Key ไม่ถูกต้อง';
      showToast(`เกิดข้อผิดพลาด: ${errMsg}`, 'error');
      if (elements.geminiKeyMessage) {
        elements.geminiKeyMessage.className = 'key-status-msg error';
        elements.geminiKeyMessage.textContent = `✗ ${errMsg}`;
      }
    }
  } catch (e) {
    showToast(`เชื่อมต่อเซิร์ฟเวอร์ไม่ได้: ${e.message}`, 'error');
  }
}

async function handleClearGeminiKey() {
  saveGlobalGeminiKeyLocal('');
  if (elements.geminiApiKeyInput) elements.geminiApiKeyInput.value = '';
  try {
    const res = await fetch('/api/settings/gemini-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: '', skip_test: true }),
    });
    const data = res.ok ? await res.json() : {};
    showToast(data.message || 'ล้าง Gemini API Key ที่บันทึกไว้แล้ว', 'info');
    if (elements.geminiKeyMessage) {
      elements.geminiKeyMessage.className = 'key-status-msg';
      elements.geminiKeyMessage.textContent = data.message || 'ล้างคีย์ที่บันทึกไว้แล้ว';
    }
  } catch (e) {
    showToast('ล้างคีย์ในเบราว์เซอร์เรียบร้อยแล้ว', 'info');
  }
  checkGeminiKeyStatus();
}

async function handleSaveAssignment() {
  const course = getActiveCourse();
  const rawSelectedVal = elements.modalAssignmentTaskSelect ? elements.modalAssignmentTaskSelect.value : null;
  const courseData = state.courseAssignments && state.courseAssignments[course.id];
  const existingList = (courseData && Array.isArray(courseData.assignments)) ? courseData.assignments : [];

  let selectedTaskId = rawSelectedVal;
  let fallbackNum = null;
  if (rawSelectedVal && rawSelectedVal.startsWith('slot:')) {
    fallbackNum = parseInt(rawSelectedVal.slice(5), 10) || 1;
    const existingIds = new Set(existingList.map(t => t.id));
    let candidateId = `work-${fallbackNum}`;
    let suffix = 1;
    while (existingIds.has(candidateId)) {
      candidateId = `work-${fallbackNum}-${suffix++}`;
    }
    selectedTaskId = candidateId;
  }

  let title = elements.assignmentTitleInput ? elements.assignmentTitleInput.value.trim() : '';
  if (!title) {
    title = fallbackNum ? `งานที่ ${fallbackNum}` : 'โจทย์ประจำงาน';
  }
  const prompt = elements.assignmentPromptTextarea ? elements.assignmentPromptTextarea.value.trim() : '';
  const isDirtyLocal = isCourseAssignmentsDirty(course.id);
  const resolvedMaxScore = isPracticalExamAssignment({ id: selectedTaskId, title, prompt }) ? 20 : 10;

  try {
    const res = await fetch(`/api/assignment/${encodeURIComponent(course.id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selectedTaskId || undefined,
        title: title,
        prompt: prompt,
        max_score: resolvedMaxScore,
        client_assignments: isDirtyLocal ? existingList : undefined,
      }),
    });
    if (res.ok) {
      const updated = persistCourseAssignmentsState(course.id, await res.json(), true);
      course.assignment = updated.title || title;
      renderCourseSelect();
      renderCourseHub();
      renderAssignmentPickers();
      renderStudioPromptPane(getCurrentStudent());
      closeAssignmentModal();
      showToast(`✓ บันทึก "${title}" เรียบร้อยแล้ว`, 'success');
    } else {
      showToast('ไม่สามารถบันทึกโจทย์ได้', 'error');
    }
  } catch (e) {
    showToast(`เกิดข้อผิดพลาด: ${e.message}`, 'error');
  }
}

// -------------------------------------------------------------
// Side-by-Side Studio Prompt & Live Comparison Pane
// -------------------------------------------------------------
function toggleStudioPromptPane() {
  if (!elements.pyStudioSplit) return;
  const isCurrentlyShown = elements.pyStudioSplit.classList.contains('has-prompt');
  if (isCurrentlyShown) {
    elements.pyStudioSplit.classList.remove('has-prompt');
    if (elements.pyPromptPane) elements.pyPromptPane.style.display = 'none';
    if (elements.btnTogglePromptPane) elements.btnTogglePromptPane.classList.remove('active');
  } else {
    elements.pyStudioSplit.classList.add('has-prompt');
    if (elements.pyPromptPane) elements.pyPromptPane.style.display = 'flex';
    if (elements.btnTogglePromptPane) elements.btnTogglePromptPane.classList.add('active');
    renderStudioPromptPane(getCurrentStudent());
  }
}

function resolveStudentCodeAndFilename(student) {
  let code = '';
  let filename = (student && student.raw_input ? student.raw_input.replace(/^\[ไฟล์(?:อัปโหลด)?\]\s*/i, '').trim() : '') || 'main.py';

  if (student && state.pyCurrentStudentKey === student.key && elements.pyCodeEditor && elements.pyCodeEditor.value.trim()) {
    code = elements.pyCodeEditor.value;
    if (elements.pyEntryFileSelect && elements.pyEntryFileSelect.value) {
      filename = elements.pyEntryFileSelect.value;
    }
    return { code, filename };
  }

  const pyFiles = getStudentPythonFilesList(student);
  if (pyFiles.length > 0) {
    const selectedPath = (student && student.inspect_selected_file && pyFiles.some(f => f.path === student.inspect_selected_file))
      ? student.inspect_selected_file
      : pyFiles[0].path;
    const targetFile = pyFiles.find(f => f.path === selectedPath) || pyFiles[0];
    code = targetFile.content || '';
    filename = targetFile.path || targetFile.name || filename;
  }

  return { code, filename };
}

function openExamSetConfirmModal(student) {
  if (!student) student = getCurrentStudent();
  if (!student || !elements.examSetConfirmModal) return;

  const resolved = resolveStudentCodeAndFilename(student);
  const currentCode = resolved.code || '';
  const currentFile = resolved.filename || student.raw_input || '';
  const suggestedSet = detectClientPracticalExamSet(currentCode, currentFile, student.student_name || '', null);
  const suggestedMeta = PRACTICAL_EXAM_SETS_META[suggestedSet] || PRACTICAL_EXAM_SETS_META.A;
  const currentConfirmed = student.confirmed_exam_set || null;

  if (elements.examConfirmStudentLabel) {
    elements.examConfirmStudentLabel.textContent = `นักเรียน: ${student.student_name || student.repo} (${currentFile.replace(/^\[ไฟล์(?:อัปโหลด)?\]\s*/i, '')})`;
  }
  if (elements.examConfirmSuggestBanner) {
    elements.examConfirmSuggestBanner.innerHTML = `
      💡 ระบบวิเคราะห์คำสำคัญในโค้ดเบื้องต้นพบว่าใกล้เคียงกับ <strong>"${escapeHtml(suggestedMeta.fullTitle)}"</strong><br>
      กรุณาคลิกยืนยันว่านักเรียนคนนี้ได้ข้อสอบชุดใด (A, B, C หรือ D) เพื่อให้ระบบตรวจตามตาราง Rubric 20 คะแนนได้ตรงชุด:
    `;
  }

  if (elements.examConfirmCardsGrid) {
    elements.examConfirmCardsGrid.innerHTML = ['A', 'B', 'C', 'D'].map(code => {
      const m = PRACTICAL_EXAM_SETS_META[code];
      const isSuggested = code === suggestedSet;
      const isConfirmed = code === currentConfirmed;
      let tagHtml = '';
      if (isConfirmed) {
        tagHtml = `<span class="exam-confirm-hint-tag confirmed">✓ ชุดที่เลือกไว้ปัจจุบัน</span>`;
      } else if (isSuggested) {
        tagHtml = `<span class="exam-confirm-hint-tag">✨ แนะนำจากโค้ด</span>`;
      }
      return `
        <button type="button" class="exam-confirm-card ${isConfirmed ? 'is-confirmed' : (isSuggested ? 'is-suggested' : '')}" data-confirm-set="${code}">
          <div class="exam-confirm-card-top">
            <span class="exam-confirm-set-pill">ชุด ${code}</span>
            ${tagHtml}
          </div>
          <div class="exam-confirm-card-title">${escapeHtml(m.title)}</div>
          <div class="exam-confirm-card-meta">
            <div>📦 Class: <code>${escapeHtml(m.className)}</code></div>
            <div>🏷️ Attributes: ${escapeHtml(m.attrs)}</div>
            <div>🔄 คำสั่ง: ${escapeHtml(m.loop)}</div>
          </div>
          <div class="exam-confirm-card-cta">✓ ยืนยันตรวจด้วยข้อสอบชุด ${code} (20 คะแนน)</div>
        </button>
      `;
    }).join('');

    elements.examConfirmCardsGrid.querySelectorAll('.exam-confirm-card').forEach(card => {
      card.addEventListener('click', () => {
        const chosenSet = card.dataset.confirmSet;
        confirmStudentExamSetAndGrade(student, chosenSet);
      });
    });
  }

  elements.examSetConfirmModal.style.display = 'flex';
}

function closeExamSetConfirmModal() {
  if (elements.examSetConfirmModal) {
    elements.examSetConfirmModal.style.display = 'none';
  }
}

function confirmStudentExamSetAndGrade(student, chosenSet) {
  if (!student || !PRACTICAL_EXAM_SETS_META[chosenSet]) return;
  student.confirmed_exam_set = chosenSet;
  student.preferred_exam_set = chosenSet;
  persistLocalStudentReview(student);
  closeExamSetConfirmModal();
  gradeCurrentStudentAgainstAssignment(student, chosenSet, true);
}

function updateStudentRubricCriterionScore(student, setCode, criterionId, newScore) {
  if (!student) return;
  const setMeta = PRACTICAL_EXAM_SETS_META[setCode] || PRACTICAL_EXAM_SETS_META.A;
  student.confirmed_exam_set = setMeta.code;
  student.preferred_exam_set = setMeta.code;
  persistLocalStudentReview(student);
  const asg = getActiveAssignmentData();
  const activeId = asg ? asg.id : 'work-5';

  if (!student.assignment_evaluation || !Array.isArray(student.assignment_evaluation.rubric_scores) || student.assignment_evaluation.exam_set !== setMeta.code) {
    student.assignment_evaluation = {
      mode: 'manual_rubric',
      assignment_id: activeId,
      is_practical_exam: true,
      exam_set: setMeta.code,
      exam_set_title: setMeta.fullTitle,
      max_score: 20,
      score: 0,
      rubric_scores: setMeta.criteria.map(c => ({
        id: c.id,
        title: c.title,
        score: 0,
        max_score: c.max_score,
        level_label: 'ปรับปรุง',
        evidence: 'ครูให้คะแนนตามตาราง Rubric',
        feedback: c.desc,
      })),
      checklist: [],
      strengths: [],
      suggestions: [],
    };
  }

  const ev = student.assignment_evaluation;
  ev.exam_set = setMeta.code;
  ev.exam_set_title = setMeta.fullTitle;
  ev.is_practical_exam = true;
  ev.max_score = 20;

  ev.rubric_scores = ev.rubric_scores.map(item => {
    if (Number(item.id) === Number(criterionId)) {
      const clamped = Math.max(0, Math.min(item.max_score, Number(newScore) || 0));
      const lvl = getCriterionLevelInfo(clamped, item.max_score);
      return {
        ...item,
        score: clamped,
        level_label: lvl.label,
      };
    }
    return item;
  });

  const total = ev.rubric_scores.reduce((acc, r) => acc + (Number(r.score) || 0), 0);
  const q = getExamQualityLevelInfo(total);
  ev.score = total;
  ev.quality_level = q.level;
  ev.status = q.status;
  ev.status_label = q.level;
  ev.checklist = ev.rubric_scores.map(r => ({
    criterion: `${r.title} (${r.score}/${r.max_score} คะแนน · ${r.level_label})`,
    passed: r.score >= r.max_score - 1,
    score: r.score,
    max_score: r.max_score,
    level_label: r.level_label,
    evidence: r.evidence,
    feedback: r.feedback,
  }));
  const shortBreakdown = ev.rubric_scores.map(r => `ข้อ${r.id}:${r.score}/${r.max_score}`).join(', ');
  ev.suggested_teacher_note = `[ชุด ${setMeta.code}] ${total}/20 คะแนน (${q.level}) | ${shortBreakdown}`;
  ev.summary = `ได้คะแนนรวม ${total}/20 คะแนน (ระดับคุณภาพ: ${q.level})`;

  updateAssignmentGradeBadge(student);
  renderStudioPromptPane(student);
  if (state.activeTab === 'inspect') {
    renderInspectTab(student);
  }
}

function renderStudioPromptPane(student) {
  if (!elements.pyPromptBody) return;
  if (!student) student = getCurrentStudent();

  const asg = getActiveAssignmentData();
  if (!asg) {
    elements.pyPromptBody.innerHTML = '<div style="color:var(--text-secondary); padding:16px;">ไม่พบข้อมูลโจทย์</div>';
    return;
  }

  const promptText = asg.prompt || '';
  const titleText = asg.title || 'โจทย์ประจำงาน';
  const ev = student ? student.assignment_evaluation : null;
  const isExam = isPracticalExamAssignment(asg) || Boolean(ev && ev.is_practical_exam);

  // Update studio rubric badge in toolbar
  if (elements.studioRubricBadge) {
    if (ev) {
      elements.studioRubricBadge.style.display = 'inline-flex';
      elements.studioRubricBadge.textContent = `${ev.score}/${ev.max_score}`;
      elements.studioRubricBadge.title = `ผลตรวจ: ${ev.score}/${ev.max_score} (${ev.status_label})`;
      elements.studioRubricBadge.className = `rubric-mini-pill ${ev.status || 'passed'}`;
    } else {
      elements.studioRubricBadge.style.display = 'inline-flex';
      elements.studioRubricBadge.textContent = isExam ? 'รอตรวจ (/20)' : 'รอตรวจ';
      elements.studioRubricBadge.title = 'ยังไม่ได้ตรวจเทียบกับโจทย์';
      elements.studioRubricBadge.className = 'rubric-mini-pill';
    }
  }

  let tagsHtml = '';
  let examSetSwitcherHtml = '';
  let activeSetCode = 'A';

  if (isExam) {
    const currentCode = (elements.pyCodeEditor && elements.pyCodeEditor.value) || state.pyOriginalCode || '';
    const currentFile = (elements.pyEntryFileSelect && elements.pyEntryFileSelect.value) || (student && student.raw_input) || '';
    const confirmedSet = (student && student.confirmed_exam_set && PRACTICAL_EXAM_SETS_META[student.confirmed_exam_set])
      ? student.confirmed_exam_set
      : null;
    const suggestedSet = detectClientPracticalExamSet(currentCode, currentFile, student ? student.student_name : '', null);
    activeSetCode = confirmedSet
      || ((ev && ev.exam_set && PRACTICAL_EXAM_SETS_META[ev.exam_set]) ? ev.exam_set : suggestedSet);
    const setMeta = PRACTICAL_EXAM_SETS_META[activeSetCode] || PRACTICAL_EXAM_SETS_META.A;

    examSetSwitcherHtml = `
      <div class="exam-set-switcher-box">
        <div class="exam-set-header-row">
          <span class="exam-set-label">🧪 เลือกยืนยันชุดข้อสอบของนักเรียน</span>
          <span class="exam-set-active-badge">${confirmedSet ? `✓ ยืนยันแล้ว: ชุด ${escapeHtml(confirmedSet)}` : `แนะนำ: ชุด ${escapeHtml(suggestedSet)}`}</span>
        </div>
        <div class="exam-set-pills-row">
          <button type="button" class="exam-set-pill ${confirmedSet === 'A' ? 'active' : ''}" data-exam-set="A" title="คลิกเพื่อยืนยันข้อสอบชุด A: โปรแกรมคำนวณราคาสินค้า (Class Product)">ชุด A</button>
          <button type="button" class="exam-set-pill ${confirmedSet === 'B' ? 'active' : ''}" data-exam-set="B" title="คลิกเพื่อยืนยันข้อสอบชุด B: โปรแกรมบันทึกยอดขายประจำวัน (Class DailySales)">ชุด B</button>
          <button type="button" class="exam-set-pill ${confirmedSet === 'C' ? 'active' : ''}" data-exam-set="C" title="คลิกเพื่อยืนยันข้อสอบชุด C: โปรแกรมตรวจสอบสินค้าคงเหลือ (Class StockProduct)">ชุด C</button>
          <button type="button" class="exam-set-pill ${confirmedSet === 'D' ? 'active' : ''}" data-exam-set="D" title="คลิกเพื่อยืนยันข้อสอบชุด D: โปรแกรมคำนวณหน่วยไฟฟ้า (Class ElectricityRecord)">ชุด D</button>
        </div>
        <div class="exam-set-sub-title">📌 <strong>${escapeHtml(setMeta.fullTitle)}</strong> · Class <code>${escapeHtml(setMeta.className)}</code></div>
      </div>
    `;
    tagsHtml = `
      <span class="spec-tag" title="คลาสประจำชุด ${escapeHtml(setMeta.code)}">📦 Class: ${escapeHtml(setMeta.className)}</span>
      <span class="spec-tag" title="Attributes ประจำชุด">🏷️ ${escapeHtml(setMeta.attrs)}</span>
      <span class="spec-tag" title="การวนซ้ำและเงื่อนไข">🔄 ${escapeHtml(setMeta.loop)}</span>
    `;
  } else {
    const mCls = promptText.match(/(?:สร้างคลาสชื่อ|class|คลาสชื่อ|คลาส)\s*[`'"]?([A-Za-z_]\w*)[`'"]?/i);
    const targetClass = mCls ? mCls[1] : null;
    const mAttr = promptText.match(/(?:Property\s*ได้แก่|attribute\s*[:ได้แก่]*|แอตทริบิวต์\s*[:ได้แก่]*|คุณสมบัติ\s*[:ได้แก่]*)\s*([^\n\r]+)/i);
    let attrs = [];
    if (mAttr) {
      attrs = mAttr[1].replace(/[\(\)\[\]`'"และ,]/g, ' ').split(/\s+/).filter(w => /^[a-zA-Z_]\w*$/.test(w));
    }
    const mMethods = Array.from(promptText.matchAll(/(?:Method\s*(?:ชื่อ)?|เมธอด\s*(?:ชื่อ)?|ฟังก์ชันในคลาส\s*)\s*[`'"]?([A-Za-z_]\w*)\s*(?:\(\))?[`'"]?/gi)).map(m => m[1]);
    const methods = Array.from(new Set(mMethods));
    const mObjs = promptText.match(/(?:สร้าง\s*Object|สร้าง\s*วัตถุ|สร้าง\s*อ็อบเจกต์).*?(\d+)/i);
    const minObjs = mObjs ? mObjs[1] : 2;

    if (targetClass) tagsHtml += `<span class="spec-tag" title="คลาสที่ต้องสร้าง">📦 Class: ${escapeHtml(targetClass)}</span>`;
    if (attrs.length > 0) tagsHtml += `<span class="spec-tag" title="Property/แอตทริบิวต์ที่ต้องมี">🏷️ Props: ${escapeHtml(attrs.join(', '))}</span>`;
    if (methods.length > 0) tagsHtml += `<span class="spec-tag" title="Method ที่ต้องมี">⚙️ Method: ${escapeHtml(methods.map(m => m + '()').join(', '))}</span>`;
    if (minObjs) tagsHtml += `<span class="spec-tag" title="จำนวน Object ขั้นต่ำ">🔢 Min Obj: ${escapeHtml(minObjs)}</span>`;
  }

  let evalStatusHtml = '';
  let checklistHtml = '';

  if (ev) {
    const isPassed = ev.status === 'passed';
    const isPartial = ev.status === 'partial';
    const scoreClass = isPassed ? 'passed' : (isPartial ? 'partial' : 'failed');
    const badgeMode = ev.mode === 'gemini_ai' ? '🤖 ตรวจด้วย Gemini AI' : (ev.mode === 'manual_rubric' ? '✍️ ครูให้คะแนนตาม Rubric' : '⚡ ตรวจด้วย AST Heuristic');

    evalStatusHtml = `
      <div class="prompt-score-bar-compact">
        <div class="prompt-score-left">
          <span class="prompt-score-pill ${scoreClass}">${ev.score}<small style="font-size:0.68rem; opacity:0.8;">/${ev.max_score}</small></span>
          <span class="prompt-score-status-text" title="${escapeHtml(badgeMode)}">${escapeHtml(ev.status_label)}</span>
        </div>
        <div class="prompt-actions-inline">
          <button type="button" class="btn btn-secondary btn-xs" id="btnStudioApplyNote" title="นำข้อสรุปและคะแนนลงบันทึกในช่องตรวจ">
            📝 บันทึก
          </button>
          <button type="button" class="btn btn-secondary btn-xs" id="btnStudioReGrade" title="เลือกชุดข้อสอบใหม่หรือตรวจโค้ดซ้ำอีกครั้ง">
            ${isExam ? '🔀 เปลี่ยนชุด / ตรวจซ้ำ' : '⚡ ตรวจซ้ำ'}
          </button>
        </div>
      </div>
    `;
  } else {
    evalStatusHtml = `
      <div style="padding:4px 6px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:6px; text-align:center;">
        <button type="button" class="btn btn-primary btn-sm btn-block" id="btnStudioGradeNow" style="width:100%; justify-content:center; height:28px; font-size:0.75rem;">
          ⚡ ${isExam ? 'เลือกยืนยันชุดข้อสอบ (A–D) และเริ่มตรวจ' : 'ตรวจโค้ดตามโจทย์ทันที'}
        </button>
      </div>
    `;
  }

  if (isExam) {
    const setMeta = PRACTICAL_EXAM_SETS_META[activeSetCode] || PRACTICAL_EXAM_SETS_META.A;
    const rubricRows = (ev && Array.isArray(ev.rubric_scores) && ev.rubric_scores.length === 6)
      ? ev.rubric_scores
      : setMeta.criteria.map(c => ({
          id: c.id,
          title: c.title,
          score: null,
          max_score: c.max_score,
          level_label: 'รอประเมิน',
          evidence: '',
          feedback: c.desc,
        }));

    checklistHtml = `
      <div class="rubric-scorecard-list">
        ${rubricRows.map(r => {
          const hasScore = r.score !== null && r.score !== undefined;
          const lvl = hasScore ? getCriterionLevelInfo(r.score, r.max_score) : { label: `เต็ม ${r.max_score}`, cls: 'lvl-good', cardCls: '' };
          const ptBtns = [];
          for (let p = 0; p <= r.max_score; p++) {
            const pLvl = getCriterionLevelInfo(p, r.max_score);
            const shortLbl = (r.max_score === 4 && p === 0) ? 'ไม่มี' : pLvl.label;
            ptBtns.push(`
              <button type="button" class="rubric-seg-btn ${hasScore && Number(r.score) === p ? `active ${pLvl.cls}` : ''}" data-crit-id="${r.id}" data-crit-pt="${p}" title="ให้ ${p}/${r.max_score} คะแนน (${shortLbl})">
                <span class="seg-pt">${p}</span>
                <span class="seg-lbl">${shortLbl}</span>
              </button>
            `);
          }
          const cleanTitle = String(r.title || '').replace(/^\d+\.\s*/, '');
          return `
            <div class="rubric-score-card ${lvl.cardCls}">
              <div class="rubric-score-top">
                <div class="rubric-score-title">${r.id}. ${escapeHtml(cleanTitle)}</div>
                <span class="rubric-score-badge ${lvl.cls}">${hasScore ? `${r.score}/${r.max_score} · ${escapeHtml(lvl.label)}` : `0/${r.max_score}`}</span>
              </div>
              <div class="rubric-seg-group">
                ${ptBtns.join('')}
              </div>
              ${r.evidence ? `<div class="rubric-crit-evidence">${escapeHtml(r.evidence)}</div>` : ''}
            </div>
          `;
        }).join('')}
      </div>
      <div class="rubric-scale-legend">
        <span><strong>เกณฑ์ 20 คะแนน:</strong></span>
        <span style="color:#6ee7b7;">17–20 ดีมาก</span>
        <span style="color:#7dd3fc;">13–16 ดี</span>
        <span style="color:#fcd34d;">9–12 พอใช้</span>
        <span style="color:#fca5a5;">0–8 ปรับปรุง</span>
      </div>
    `;
  } else if (ev) {
    const items = ev.checklist || [];
    checklistHtml = `
      <div class="rubric-mini-list">
        ${items.map(item => `
          <div class="rubric-mini-item ${item.passed ? 'passed' : 'failed'}">
            <span class="rubric-mini-icon">${item.passed ? '✅' : '❌'}</span>
            <div class="rubric-mini-text">
              <div class="rubric-mini-title">${escapeHtml(item.criterion)}</div>
              ${item.evidence ? `<div class="rubric-mini-evidence">${escapeHtml(item.evidence)}</div>` : ''}
              ${item.feedback ? `<div class="rubric-mini-feedback">${escapeHtml(item.feedback)}</div>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    checklistHtml = `
      <div class="rubric-mini-list">
        <div class="rubric-mini-item">
          <span class="rubric-mini-icon">🔍</span>
          <div class="rubric-mini-text">
            <div class="rubric-mini-title">ตรวจโครงสร้างโค้ดตามโจทย์</div>
            <div class="rubric-mini-feedback">กดปุ่ม "ตรวจโค้ดตามโจทย์ทันที" ด้านบนเพื่อประเมินผล</div>
          </div>
        </div>
      </div>
    `;
  }

  const isDescExpanded = !!state.promptDescExpanded;
  const toggleDescText = isDescExpanded ? '▴ ย่อโจทย์' : '▾ ดูโจทย์';

  elements.pyPromptBody.innerHTML = `
    <div class="prompt-mini-header">
      <div class="prompt-mini-title">
        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">📋 ${escapeHtml(titleText)}</span>
        <div style="display:inline-flex; align-items:center; gap:6px; flex-shrink:0;">
          <button type="button" class="btn-text-sm" id="btnTogglePromptDesc" title="ย่อ/ขยายคำอธิบายโจทย์" style="font-size:0.7rem; color:#93c5fd; background:none; border:none; cursor:pointer;">${toggleDescText}</button>
          <button type="button" class="btn-text-sm" id="btnMiniEditPrompt" title="แก้ไขโจทย์นี้" style="font-size:0.7rem; color:#93c5fd; background:none; border:none; cursor:pointer;">✏️ แก้</button>
        </div>
      </div>
      <div class="prompt-mini-desc ${isDescExpanded ? 'expanded' : ''}">${escapeHtml(promptText || 'ยังไม่ได้ระบุรายละเอียดโจทย์')}</div>
      ${tagsHtml ? `<div class="prompt-specs-tags">${tagsHtml}</div>` : ''}
    </div>

    ${examSetSwitcherHtml}
    ${evalStatusHtml}

    <div style="font-size:0.72rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px; margin-top:1px;">
      ${isExam ? `ตารางประเมิน Rubric Score (ชุด ${activeSetCode} · 6 รายการ · 20 คะแนน)` : 'เกณฑ์ตรวจเทียบกับโค้ด'}
    </div>
    ${checklistHtml}
  `;

  // Attach internal buttons
  const btnToggleDesc = elements.pyPromptBody.querySelector('#btnTogglePromptDesc');
  if (btnToggleDesc) {
    btnToggleDesc.addEventListener('click', () => {
      state.promptDescExpanded = !state.promptDescExpanded;
      renderStudioPromptPane(student);
    });
  }

  const btnMiniEdit = elements.pyPromptBody.querySelector('#btnMiniEditPrompt');
  if (btnMiniEdit) btnMiniEdit.addEventListener('click', openAssignmentModal);

  const btnGradeNow = elements.pyPromptBody.querySelector('#btnStudioGradeNow');
  if (btnGradeNow) {
    btnGradeNow.addEventListener('click', () => {
      gradeCurrentStudentAgainstAssignment(student);
    });
  }

  const btnReGrade = elements.pyPromptBody.querySelector('#btnStudioReGrade');
  if (btnReGrade) {
    btnReGrade.addEventListener('click', () => {
      gradeCurrentStudentAgainstAssignment(student);
    });
  }

  const btnApplyNote = elements.pyPromptBody.querySelector('#btnStudioApplyNote');
  if (btnApplyNote) {
    btnApplyNote.addEventListener('click', () => {
      applyEvaluationNote(student);
    });
  }

  // Exam set switcher buttons (A / B / C / D) — คลิกเพื่อยืนยันชุดข้อสอบและตรวจทันที
  elements.pyPromptBody.querySelectorAll('.exam-set-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const chosen = pill.dataset.examSet;
      if (chosen && PRACTICAL_EXAM_SETS_META[chosen]) {
        confirmStudentExamSetAndGrade(student, chosen);
      } else {
        openExamSetConfirmModal(student);
      }
    });
  });

  // Interactive rubric point buttons (0..3 / 0..4)
  elements.pyPromptBody.querySelectorAll('.rubric-pt-btn, .rubric-seg-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const critId = parseInt(btn.dataset.critId, 10);
      const pt = parseInt(btn.dataset.critPt, 10);
      updateStudentRubricCriterionScore(student, activeSetCode, critId, pt);
    });
  });
}

function buildAnalyzingShowcaseHtml(student, asg, examSetCode = null, isCompact = false) {
  const stuName = (student && (student.student_name || student.repo)) || 'นักเรียน';
  const isExam = isPracticalExamAssignment(asg) || Boolean(examSetCode);
  const setMeta = (examSetCode && PRACTICAL_EXAM_SETS_META[examSetCode]) ? PRACTICAL_EXAM_SETS_META[examSetCode] : null;
  const setBadgeHtml = setMeta
    ? `<span class="ai-meta-pill set-pill">🧪 ${escapeHtml(setMeta.fullTitle)} (20 คะแนน)</span>`
    : (asg && asg.title ? `<span class="ai-meta-pill">📋 ${escapeHtml(asg.title)}</span>` : '');

  return `
    <div class="ai-analyzing-showcase ${isCompact ? 'compact' : ''}">
      <div class="ai-analyzing-orb-wrap">
        <div class="ai-orb-ring-outer"></div>
        <div class="ai-orb-ring-inner"></div>
        <div class="ai-orb-core">🤖</div>
      </div>
      <div class="ai-analyzing-title">กำลังวิเคราะห์โค้ดและประเมินผลตามเกณฑ์ Rubric...</div>
      <div class="ai-analyzing-meta-badges">
        <span class="ai-meta-pill">👤 ${escapeHtml(stuName)}</span>
        ${setBadgeHtml}
      </div>
      <div class="ai-shimmer-progress-track">
        <div class="ai-shimmer-progress-bar"></div>
      </div>
      <div class="ai-analyzing-steps">
        <div class="ai-step-chip"><span class="ai-step-dot"></span><span>1. ตรวจโครงสร้าง AST & การรับข้อมูลตัวแปร</span></div>
        <div class="ai-step-chip"><span class="ai-step-dot"></span><span>2. ตรวจ Class, Attributes, Object & Method</span></div>
        <div class="ai-step-chip"><span class="ai-step-dot"></span><span>3. ตรวจ Function, Parameter & การส่งค่ากลับ</span></div>
        <div class="ai-step-chip"><span class="ai-step-dot"></span><span>4. ตรวจคำสั่งวนซ้ำ, เงื่อนไข & ${isExam ? 'รวมคะแนน 20 คะแนน' : 'สรุปผลคะแนน'}</span></div>
      </div>
    </div>
  `;
}

async function gradeCurrentStudentAgainstAssignment(student, preferredExamSet = undefined, isConfirmedNow = false) {
  if (!student) student = getCurrentStudent();
  if (!student) return;

  const course = getActiveCourse();
  const asg = getActiveAssignmentData();
  const activeId = asg ? asg.id : 'work-4';
  const promptToUse = asg ? asg.prompt : DEFAULT_PRODUCT_PROMPT;

  // สำหรับงานสอบปฏิบัติ 4 ชุด (A, B, C, D) ให้ครูยืนยันชุดข้อสอบของนักเรียนก่อนเสมอ
  if (isPracticalExamAssignment(asg) && !isConfirmedNow) {
    openExamSetConfirmModal(student);
    return;
  }

  if (preferredExamSet !== undefined) {
    student.preferred_exam_set = preferredExamSet;
    student.confirmed_exam_set = preferredExamSet;
    persistLocalStudentReview(student);
  }

  const examSetToSend = student.confirmed_exam_set || student.preferred_exam_set || undefined;
  state.isGradingStudentKey = student.key;
  state.isGradingExamSet = examSetToSend || null;

  // กำหนดสถานะปุ่มและแสดงการ์ดกำลังวิเคราะห์ผลลัพธ์แบบสวยงามทันที
  if (elements.assignmentGradeBadge) {
    elements.assignmentGradeBadge.className = 'badge badge-subtle';
    elements.assignmentGradeBadge.textContent = '⏳ กำลังวิเคราะห์...';
  }
  if (elements.btnGradeStudentInStudio) {
    elements.btnGradeStudentInStudio.disabled = true;
    elements.btnGradeStudentInStudio.textContent = '⏳ กำลังวิเคราะห์...';
  }
  if (elements.pyPromptBody) {
    elements.pyPromptBody.innerHTML = buildAnalyzingShowcaseHtml(student, asg, examSetToSend, true);
  }
  if (state.activeTab === 'inspect') {
    renderInspectTab(student);
  }

  try {
    const resolved = resolveStudentCodeAndFilename(student);
    const codeToGrade = (resolved.code && resolved.code.trim()) ? resolved.code : '# นักเรียนส่งไฟล์ว่างหรือไม่มีโค้ด Python\n';
    const filename = resolved.filename || 'work5_exam.py';

    const globalApiKey = getSavedGlobalGeminiKey();
    const payload = {
      course_id: course.id,
      assignment_id: activeId,
      owner: student.owner,
      repo: student.repo,
      code: codeToGrade,
      filename: filename,
      prompt: promptToUse,
      api_key: globalApiKey || undefined,
      student_name: student.student_name || `${student.owner}/${student.repo}`,
      exam_set: examSetToSend,
    };

    const res = await fetch('/api/assignment/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const evalResult = await res.json();
      evalResult.assignment_id = activeId;
      student.assignment_evaluation = evalResult;
      if (!student.teacher_comment) {
        student.teacher_comment = buildAutoExplanationFromEvaluation(student);
      }
      persistLocalStudentReview(student);
      updateStudentItemCard(student);
      updateAssignmentGradeBadge(student);
      renderStudioPromptPane(student);
      showToast(`ตรวจเสร็จสิ้น! ได้คะแนน ${evalResult.score}/${evalResult.max_score} (${evalResult.status_label})`, 'success');

      if (state.activeTab === 'inspect') {
        renderInspectTab(student);
      }
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(`ตรวจไม่สำเร็จ: ${err.detail || 'เกิดข้อผิดพลาด'}`, 'error');
      if (elements.assignmentGradeBadge) {
        elements.assignmentGradeBadge.textContent = '🎯 ตรวจโจทย์: ผิดพลาด';
      }
    }
  } catch (e) {
    showToast(`เกิดข้อผิดพลาดในการตรวจ: ${e.message}`, 'error');
  } finally {
    state.isGradingStudentKey = null;
    state.isGradingExamSet = null;
    if (elements.btnGradeStudentInStudio) {
      elements.btnGradeStudentInStudio.disabled = false;
      elements.btnGradeStudentInStudio.textContent = '⚡ ตรวจตามโจทย์';
    }
    renderStudioPromptPane(student);
    if (state.activeTab === 'inspect') {
      renderInspectTab(student);
    }
  }
}

function updateAssignmentGradeBadge(student) {
  if (!elements.assignmentGradeBadge) return;
  if (!student) {
    elements.assignmentGradeBadge.style.display = 'none';
    return;
  }
  elements.assignmentGradeBadge.style.display = 'inline-flex';
  const ev = student.assignment_evaluation;
  if (ev) {
    const isPassed = ev.status === 'passed';
    const isPartial = ev.status === 'partial';
    elements.assignmentGradeBadge.className = `badge ${isPassed ? 'badge-success' : (isPartial ? 'badge-warning' : 'badge-danger')}`;
    elements.assignmentGradeBadge.textContent = `🎯 ${ev.score}/${ev.max_score}`;
    elements.assignmentGradeBadge.title = `ผลตรวจตามโจทย์: ${ev.score}/${ev.max_score} (${ev.status_label}) - คลิกเพื่อดูรายละเอียด: ${ev.summary}`;
  } else {
    elements.assignmentGradeBadge.className = 'badge badge-subtle';
    elements.assignmentGradeBadge.textContent = '🎯 ตรวจโจทย์';
    elements.assignmentGradeBadge.title = 'คลิกเพื่อตรวจงานนักเรียนคนนี้ตามโจทย์ด้วย AI';
  }
}

function handleGradeBadgeClick() {
  const student = getCurrentStudent();
  if (!student) return;
  if (!student.assignment_evaluation) {
    gradeCurrentStudentAgainstAssignment(student).then(() => {
      switchTab('inspect');
    });
  } else {
    switchTab('inspect');
  }
}

function buildAutoExplanationFromEvaluation(student) {
  if (!student || !student.assignment_evaluation) return '';
  const ev = student.assignment_evaluation;
  if (ev.is_practical_exam && Array.isArray(ev.rubric_scores)) {
    const lines = ev.rubric_scores.map(r => {
      const cleanTitle = String(r.title || '').replace(/^\d+\.\s*/, '');
      const reason = r.evidence || r.feedback || '';
      return `${r.id}. ${cleanTitle} (${r.score}/${r.max_score} · ${r.level_label}): ${reason}`;
    });
    return lines.join('\n');
  }
  if (Array.isArray(ev.checklist) && ev.checklist.length > 0) {
    return ev.checklist.map((c, idx) => `${idx + 1}. ${c.criterion}: ${c.evidence || c.feedback || (c.passed ? 'ผ่าน' : 'ควรปรับปรุง')}`).join('\n');
  }
  return ev.summary || '';
}

function buildFullStudentExplanationReport(student) {
  if (!student) return '';
  const ev = student.assignment_evaluation;
  const stuName = student.student_name || student.repo || 'นักเรียน';
  const fileLabel = (student.raw_input || student.repo || '').replace(/^\[ไฟล์(?:อัปโหลด)?\]\s*/i, '');
  const commentText = (student.teacher_comment || buildAutoExplanationFromEvaluation(student) || '').trim();

  if (ev && ev.is_practical_exam) {
    const setCode = ev.exam_set || student.confirmed_exam_set || 'A';
    const setMeta = PRACTICAL_EXAM_SETS_META[setCode] || PRACTICAL_EXAM_SETS_META.A;
    const qInfo = getExamQualityLevelInfo(ev.score);
    return [
      `📋 ใบชี้แจงคะแนนการสอบปฏิบัติ`,
      `👤 นักเรียน: ${stuName}${fileLabel ? ` (${fileLabel})` : ''}`,
      `🧪 ชุดข้อสอบ: ${setMeta.fullTitle} (Class ${setMeta.className})`,
      `🏆 คะแนนที่ได้: ${ev.score} / ${ev.max_score || 20} คะแนน (ระดับคุณภาพ: ${qInfo.level})`,
      `----------------------------------------`,
      `รายละเอียดคะแนนและการชี้แจงรายข้อ:`,
      commentText || buildAutoExplanationFromEvaluation(student),
    ].join('\n');
  }

  const scoreLine = ev ? `${ev.score}/${ev.max_score || 10} คะแนน (${ev.status_label || ''})` : (student.note || 'ยังไม่ได้ให้คะแนน');
  return [
    `📋 ใบชี้แจงผลการตรวจงาน`,
    `👤 นักเรียน: ${stuName}${fileLabel ? ` (${fileLabel})` : ''}`,
    `🏆 ผลการประเมิน: ${scoreLine}`,
    commentText ? `----------------------------------------\n💬 คำชี้แจงจากครูผู้สอน:\n${commentText}` : '',
  ].filter(Boolean).join('\n');
}

async function copyStudentScoreExplanationReport(student) {
  if (!student) student = getCurrentStudent();
  if (!student) return;
  const reportText = buildFullStudentExplanationReport(student);
  try {
    await navigator.clipboard.writeText(reportText);
    showToast('📋 คัดลอกใบชี้แจงคะแนนและคอมเมนต์แล้ว นำไปวางส่งให้นักเรียนได้ทันที', 'success');
  } catch (e) {
    showToast('ไม่สามารถคัดลอกอัตโนมัติได้ กรุณาคัดลอกจากช่องข้อความ', 'warning');
  }
}

function openClassScoreSummaryModal() {
  if (!elements.classScoreSummaryModal || !elements.classSummaryModalBody) return;
  const course = getActiveCourse();
  if (elements.classSummaryCourseLabel && course) {
    elements.classSummaryCourseLabel.textContent = `${course.subject} · ${course.assignment || ''}`;
  }

  const students = state.students || [];
  if (students.length === 0) {
    elements.classSummaryModalBody.innerHTML = `<div style="padding:24px; text-align:center; color:#94a3b8;">ยังไม่มีรายชื่อนักเรียนในวิชานี้</div>`;
  } else {
    const rowsHtml = students.map((s, idx) => {
      const ev = s.assignment_evaluation;
      const setCode = (ev && ev.exam_set) || s.confirmed_exam_set || '-';
      const scoreText = ev ? `${ev.score} / ${ev.max_score || 20}` : (s.note || 'ยังไม่ตรวจ');
      const levelText = ev ? String(ev.quality_level || ev.status_label || '').replace(/\s*\(\d+\/\d+\)/g, '') : '-';
      const commentText = s.teacher_comment || (ev ? buildAutoExplanationFromEvaluation(s) : (s.note || '-'));
      return `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${escapeHtml(s.student_name || s.repo)}</strong><br><small style="color:#94a3b8;">${escapeHtml((s.raw_input || '').replace(/^\[ไฟล์(?:อัปโหลด)?\]\s*/i, ''))}</small></td>
          <td>${setCode !== '-' ? `<span class="rubric-score-badge lvl-good">ชุด ${escapeHtml(setCode)}</span>` : '-'}</td>
          <td><strong style="color:#fff;">${escapeHtml(scoreText)}</strong>${levelText !== '-' ? `<br><small style="color:#93c5fd;">${escapeHtml(levelText)}</small>` : ''}</td>
          <td style="white-space:pre-wrap; font-size:0.76rem; color:#cbd5e1; max-width:440px;">${escapeHtml(commentText)}</td>
          <td>
            <button type="button" class="btn btn-secondary btn-xs btn-copy-row-explain" data-stu-idx="${idx}">📋 คัดลอกคำชี้แจง</button>
          </td>
        </tr>
      `;
    }).join('');

    elements.classSummaryModalBody.innerHTML = `
      <table class="score-summary-table">
        <thead>
          <tr>
            <th>#</th>
            <th>ชื่อ / รหัสนักเรียน</th>
            <th>ชุดข้อสอบ</th>
            <th>คะแนนรวม</th>
            <th>คอมเมนต์ / รายละเอียดชี้แจงคะแนนรายข้อ</th>
            <th>ส่งให้นักเรียน</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    `;

    elements.classSummaryModalBody.querySelectorAll('.btn-copy-row-explain').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.stuIdx, 10);
        if (students[idx]) copyStudentScoreExplanationReport(students[idx]);
      });
    });
  }

  elements.classScoreSummaryModal.style.display = 'flex';
}

function closeClassScoreSummaryModal() {
  if (elements.classScoreSummaryModal) {
    elements.classScoreSummaryModal.style.display = 'none';
  }
}

function applyEvaluationNote(student, customCommentText = undefined) {
  if (!student || !student.assignment_evaluation) return;
  const ev = student.assignment_evaluation;
  if (customCommentText !== undefined) {
    student.teacher_comment = String(customCommentText).trim();
  } else if (!student.teacher_comment) {
    student.teacher_comment = buildAutoExplanationFromEvaluation(student);
  }
  const baseNote = ev.suggested_teacher_note || `คะแนน ${ev.score}/${ev.max_score} (${ev.status_label})`;
  const note = baseNote;

  if (elements.studentNoteInput) {
    elements.studentNoteInput.value = note;
  }
  if (elements.checkViewed) {
    elements.checkViewed.checked = true;
  }
  student.viewed = true;
  student.note = note;
  student.saved_score_at = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

  persistLocalStudentReview(student);
  syncActiveCourseState();
  renderCourseSelect();
  updateStudentItemCard(student);
  updateViewedStats();
  saveStudentReview(student.owner, student.repo, true, note, student.teacher_comment, student.assignment_evaluation);
  updateScoresMenuBadge();
  if (state.activeTab === 'inspect') {
    renderInspectTab(student);
  } else if (state.activeTab === 'scores') {
    renderScoresMenuTab();
  }
  showToast('💾 บันทึกคะแนนและคอมเมนต์ชี้แจงของนักเรียนคนนี้เก็บไว้เรียบร้อย!', 'success');
}


// -------------------------------------------------------------
// Keyboard Navigation (← / → / Space / 1-3 / R)
// -------------------------------------------------------------
function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // ข้ามเมื่อผู้ใช้กำลังพิมพ์ในช่อง input, textarea หรือเปิด modal
    const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || (elements.inputModal && elements.inputModal.style.display !== 'none')) {
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navigatePrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      navigateNext();
    } else if (e.key === ' ' || e.key === 'v' || e.key === 'V') {
      e.preventDefault();
      const current = getCurrentStudent();
      if (current) {
        handleViewedToggle(state.currentIndex, !current.viewed);
      }
    } else if (e.key === '1') {
      e.preventDefault();
      switchTab('preview');
    } else if (e.key === '2') {
      e.preventDefault();
      switchTab('code');
    } else if (e.key === '3') {
      e.preventDefault();
      switchTab('inspect');
    } else if (e.key === '4') {
      e.preventDefault();
      switchTab('scores');
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      handleReloadCurrentRepo();
    } else if (e.key === 'f' || e.key === 'F' || e.key === '[' || e.key === ']') {
      e.preventDefault();
      if (window.innerWidth <= 860) {
        toggleMobileSidebar();
      } else {
        toggleDesktopSidebar();
      }
    } else if (e.key === 'z' || e.key === 'Z') {
      e.preventDefault();
      toggleZenMode();
    } else if (e.key === 'Escape') {
      if (elements.classScoreSummaryModal && elements.classScoreSummaryModal.style.display !== 'none') {
        e.preventDefault();
        closeClassScoreSummaryModal();
        return;
      }
      if (elements.examSetConfirmModal && elements.examSetConfirmModal.style.display !== 'none') {
        e.preventDefault();
        closeExamSetConfirmModal();
        return;
      }
      if (elements.aiSettingsModal && elements.aiSettingsModal.style.display !== 'none') {
        e.preventDefault();
        closeAiSettingsModal();
        return;
      }
      if (elements.assignmentModal && elements.assignmentModal.style.display !== 'none') {
        e.preventDefault();
        closeAssignmentModal();
        return;
      }
      if (elements.inputModal && elements.inputModal.style.display !== 'none') {
        e.preventDefault();
        closeModal();
        return;
      }
      const layout = document.querySelector('.app-layout');
      if (layout && layout.classList.contains('zen-mode')) {
        e.preventDefault();
        toggleZenMode();
      }
    }
  });
}

// -------------------------------------------------------------
// Dedicated Scores & Comments Menu (#tabScores) & Native Excel (.xlsx) Export
// -------------------------------------------------------------
function extractStudentIdAndCleanName(student) {
  if (!student) return { studentId: '', displayName: 'นักเรียน', fileName: '' };
  const rawName = String(student.student_name || student.repo || 'นักเรียน').trim();
  const rawFile = String(student.raw_input || student.repo || '').replace(/^\[ไฟล์(?:อัปโหลด)?\]\s*/i, '').trim();
  const baseFile = rawFile.replace(/\.(py|ipynb|zip|html|htm)$/i, '');

  // สกัดรหัส/เลขที่นักเรียน เช่น kanwara_004 -> 004, Bua024 -> 024, DailySalese_010 -> 010
  const idMatch = baseFile.match(/(?:[_-]|^)(\d{2,12})$/) || rawName.match(/(?:[_-]|^|\D)(\d{2,12})$/);
  const studentId = idMatch ? idMatch[1] : '';

  return {
    studentId,
    displayName: rawName,
    fileName: rawFile || `${rawName}.py`,
  };
}

function updateScoresMenuBadge() {
  const badge = elements.scoresBadgeCount || document.getElementById('scoresBadgeCount');
  if (!badge) return;
  const students = state.students || [];
  if (students.length === 0) {
    badge.style.display = 'none';
    return;
  }
  const scoredCount = students.filter(s => Boolean(s.assignment_evaluation || s.teacher_comment || s.note || s.viewed)).length;
  badge.style.display = 'inline-block';
  badge.textContent = `${scoredCount}/${students.length}`;
}

function openScoresMenuView() {
  const students = state.students || [];
  if (students.length > 0) {
    if (state.currentIndex < 0) {
      selectStudent(0);
    } else {
      setHubSidebarMode(false);
      if (elements.blankState) elements.blankState.style.display = 'none';
      if (elements.studentWorkspace) elements.studentWorkspace.style.display = 'flex';
      if (elements.topWorkspaceBar) elements.topWorkspaceBar.style.display = 'flex';
    }
    switchTab('scores');
  } else {
    openClassScoreSummaryModal();
  }
}

function getStudentRubricScoreByIndex(ev, idx1to6) {
  if (!ev || !Array.isArray(ev.rubric_scores)) return null;
  const found = ev.rubric_scores.find(r => Number(r.id) === idx1to6) || ev.rubric_scores[idx1to6 - 1];
  return found || null;
}

function renderScoresMenuTab() {
  const container = elements.scoresMenuContainer || document.getElementById('scoresMenuContainer');
  if (!container) return;

  updateScoresMenuBadge();
  const course = getActiveCourse();
  const asg = getActiveAssignmentData();
  const courseLabel = course ? course.subject : 'รายวิชาปัจจุบัน';
  const assignLabel = (asg && asg.title) || (course && course.assignment) || 'งานปัจจุบัน';
  const students = state.students || [];

  if (students.length === 0) {
    container.innerHTML = `
      <div class="scores-hero-banner">
        <div>
          <div class="scores-hero-title">📊 เมนูตารางสรุปคะแนนและคอมเมนต์ชี้แจงนักเรียน</div>
          <div class="scores-hero-sub">${escapeHtml(courseLabel)} · ${escapeHtml(assignLabel)}</div>
        </div>
      </div>
      <div class="scores-master-card" style="padding: 40px 24px; text-align: center; color: #94a3b8;">
        <div style="font-size: 2rem; margin-bottom: 10px;">📂</div>
        <div style="font-size: 1rem; font-weight: 700; color: #e2e8f0;">ยังไม่มีรายชื่อนักเรียนในวิชานี้</div>
        <div style="font-size: 0.85rem; margin-top: 6px;">กรุณากดปุ่ม "+ นำเข้างานตรวจ" ด้านบนเพื่ออัปโหลดไฟล์งานนักเรียนก่อน</div>
      </div>
    `;
    return;
  }

  // คำนวณสถิติ KPI ทั้งห้อง
  const totalStudents = students.length;
  const evaluatedList = students.filter(s => s.assignment_evaluation && typeof s.assignment_evaluation.score === 'number');
  const gradedOrViewedCount = students.filter(s => Boolean(s.assignment_evaluation || s.viewed || s.note || s.teacher_comment)).length;
  const maxScoreDefault = (asg && Number(asg.max_score)) || 20;

  let avgScoreText = '-';
  let minMaxText = 'ยังไม่มีคะแนนที่ตรวจ';
  if (evaluatedList.length > 0) {
    const scores = evaluatedList.map(s => Number(s.assignment_evaluation.score) || 0);
    const sum = scores.reduce((a, b) => a + b, 0);
    const avg = (sum / scores.length).toFixed(1);
    const maxS = Math.max(...scores);
    const minS = Math.min(...scores);
    avgScoreText = `${avg} / ${maxScoreDefault}`;
    minMaxText = `สูงสุด ${maxS} · ต่ำสุด ${minS} คะแนน`;
  }

  const setCounts = { A: 0, B: 0, C: 0, D: 0 };
  const qualityCounts = { 'ดีมาก': 0, 'ดี': 0, 'พอใช้': 0, 'ปรับปรุง': 0 };
  students.forEach(s => {
    const ev = s.assignment_evaluation;
    const sc = (ev && ev.exam_set) || s.confirmed_exam_set || '';
    if (sc && setCounts[sc] !== undefined) setCounts[sc]++;
    if (ev && typeof ev.score === 'number') {
      const q = getExamQualityLevelInfo(ev.score);
      if (qualityCounts[q.level] !== undefined) qualityCounts[q.level]++;
    }
  });

  // กรองรายชื่อตาม scoresFilter และ scoresSearchQuery
  const activeFilter = state.scoresFilter || 'all';
  const query = (state.scoresSearchQuery || '').trim().toLowerCase();

  const filteredRows = students
    .map((s, idx) => ({ student: s, index: idx }))
    .filter(({ student: s }) => {
      const ev = s.assignment_evaluation;
      const setCode = ((ev && ev.exam_set) || s.confirmed_exam_set || '').toUpperCase();
      const isScored = Boolean(ev || s.viewed || s.note || s.teacher_comment);

      if (activeFilter === 'scored' && !isScored) return false;
      if (activeFilter === 'unscored' && isScored) return false;
      if (['A', 'B', 'C', 'D'].includes(activeFilter) && setCode !== activeFilter) return false;

      if (query) {
        const info = extractStudentIdAndCleanName(s);
        const commentText = (s.teacher_comment || (ev ? buildAutoExplanationFromEvaluation(s) : '') || s.note || '').toLowerCase();
        const hay = `${info.studentId} ${info.displayName} ${info.fileName} ชุด ${setCode} ${commentText}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });

  const rowsHtml = filteredRows.map(({ student: s, index: idx }) => {
    const info = extractStudentIdAndCleanName(s);
    const ev = s.assignment_evaluation;
    const setCode = ((ev && ev.exam_set) || s.confirmed_exam_set || '-').toUpperCase();
    const setMeta = PRACTICAL_EXAM_SETS_META[setCode] || null;
    const hasScore = Boolean(ev && typeof ev.score === 'number');
    const scoreVal = hasScore ? ev.score : null;
    const maxVal = (ev && ev.max_score) || maxScoreDefault;
    const qInfo = hasScore ? getExamQualityLevelInfo(scoreVal) : null;
    const commentVal = s.teacher_comment !== undefined && s.teacher_comment !== ''
      ? s.teacher_comment
      : (ev ? buildAutoExplanationFromEvaluation(s) : (s.note || ''));

    // ชิปคะแนนรายข้อ 1–6
    let rubricChipsHtml = '<span style="color:#64748b; font-size:0.76rem;">ยังไม่ได้ตรวจรายข้อ (กด "⚡ ตรวจงานนี้" เพื่อประเมิน)</span>';
    if (ev && Array.isArray(ev.rubric_scores) && ev.rubric_scores.length > 0) {
      rubricChipsHtml = `
        <div class="scores-rubric-mini-grid">
          ${ev.rubric_scores.map(r => {
            const sc = Number(r.score) || 0;
            const mx = Number(r.max_score) || 3;
            const cls = sc >= mx - 1 ? 'is-high' : (sc >= 1 ? 'is-mid' : 'is-zero');
            const shortTitle = String(r.title || '').replace(/^\d+\.\s*/, '');
            return `
              <div class="scores-rubric-chip ${cls}" title="${escapeHtml(`${r.title} (${sc}/${mx} · ${r.level_label || ''})\nหลักฐาน: ${r.evidence || '-'}`)}">
                <span style="color:#cbd5e1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">ข้อ ${r.id}</span>
                <strong style="color:#f8fafc;">${sc}/${mx}</strong>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    const setBadgeHtml = setCode !== '-' && PRACTICAL_EXAM_SETS_META[setCode]
      ? `<span class="rubric-score-badge lvl-good" style="font-size:0.76rem;">ชุด ${escapeHtml(setCode)}</span>
         <div style="font-size:0.72rem; color:#94a3b8; margin-top:4px;">${escapeHtml(setMeta ? setMeta.title : '')}</div>`
      : `<span style="color:#64748b;">ยังไม่ระบุชุด</span>`;

    const scoreHtml = hasScore
      ? `<div style="font-size:1.15rem; font-weight:800; color:#f8fafc;">${scoreVal} <span style="font-size:0.8rem; font-weight:500; color:#94a3b8;">/ ${maxVal}</span></div>
         <span class="rubric-score-badge ${qInfo.badgeClass}" style="margin-top:4px; display:inline-block;">${escapeHtml(qInfo.level)}</span>`
      : (s.note
          ? `<div style="font-weight:700; color:#fde047;">${escapeHtml(s.note)}</div>`
          : `<span style="color:#64748b;">ยังไม่ตรวจ</span>`);

    return `
      <tr class="${idx === state.currentIndex ? 'is-current-student' : ''}" data-row-stu-idx="${idx}">
        <td style="font-weight:700; color:#94a3b8; width:42px;">${idx + 1}</td>
        <td style="min-width:190px;">
          ${info.studentId ? `<span class="scores-stu-id-badge">รหัส/เลขที่: ${escapeHtml(info.studentId)}</span><br>` : ''}
          <div style="font-weight:700; color:#f8fafc; font-size:0.88rem; word-break:break-all;">${escapeHtml(info.displayName)}</div>
          <div style="font-size:0.75rem; color:#94a3b8; font-family:var(--font-mono); margin-top:2px; word-break:break-all;">🐍 ${escapeHtml(info.fileName)}</div>
          <div style="display:flex; align-items:center; gap:6px; margin-top:7px; flex-wrap:wrap;">
            <button type="button" class="btn btn-secondary btn-xs btn-scores-jump-student" data-stu-idx="${idx}" title="เปิดดูโค้ดและตาราง Rubric ของนักเรียนคนนี้">
              🔍 ดูโค้ด / ตรวจ
            </button>
            ${!hasScore ? `<button type="button" class="btn btn-primary btn-xs btn-scores-grade-now" data-stu-idx="${idx}">⚡ ตรวจทันที</button>` : ''}
          </div>
        </td>
        <td style="min-width:130px;">${setBadgeHtml}</td>
        <td style="min-width:110px;">
          ${scoreHtml}
          <div style="margin-top:6px; font-size:0.72rem; color:${s.viewed ? '#34d399' : '#94a3b8'};">
            ${s.viewed ? `✓ ตรวจแล้ว${s.saved_score_at ? ` (${escapeHtml(s.saved_score_at)})` : ''}` : '⏳ รอบันทึก'}
          </div>
        </td>
        <td>${rubricChipsHtml}</td>
        <td>
          <div class="scores-comment-box">
            <textarea class="scores-comment-textarea" data-comment-stu-idx="${idx}" rows="3" placeholder="บันทึกคอมเมนต์หรือเหตุผลชี้แจงคะแนนรายข้อสำหรับนักเรียนคนนี้...">${escapeHtml(commentVal)}</textarea>
            <div class="scores-comment-actions">
              <span class="scores-save-hint" data-save-hint-idx="${idx}" style="font-size:0.73rem; color:#94a3b8;">
                ${s.teacher_comment ? '💾 บันทึกคอมเมนต์ไว้แล้ว' : 'แก้ไขข้อความแล้วกดบันทึกได้ทันที'}
              </span>
              <div style="display:flex; align-items:center; gap:6px;">
                <button type="button" class="btn btn-primary btn-xs btn-scores-save-comment" data-stu-idx="${idx}">
                  💾 บันทึกคอมเมนต์
                </button>
                <button type="button" class="btn btn-secondary btn-xs btn-scores-copy-report" data-stu-idx="${idx}">
                  📋 คัดลอกส่งนักเรียน
                </button>
              </div>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div class="scores-hero-banner">
      <div>
        <div class="scores-hero-title">
          <span>📊</span>
          <span>ตารางสรุปคะแนน & คอมเมนต์ชี้แจงนักเรียนทั้งหมด</span>
        </div>
        <div class="scores-hero-sub">
          วิชา: <strong>${escapeHtml(courseLabel)}</strong> · งาน: <strong>${escapeHtml(assignLabel)}</strong>
          (แก้ไขคอมเมนต์รายคนและส่งออกเป็นไฟล์ Excel <code>.xlsx</code> แท้แบบไม่เพี้ยนได้ทันที)
        </div>
      </div>
      <div class="scores-hero-actions">
        <button type="button" id="btnScoresExportXlsx" class="btn btn-primary btn-sm btn-excel-solid">
          📗 ส่งออกไฟล์ Excel (.xlsx ไม่เพี้ยน)
        </button>
        <button type="button" id="btnScoresExportCsv" class="btn btn-secondary btn-sm">
          📄 ส่งออก CSV (UTF-8)
        </button>
        <button type="button" id="btnScoresCopyTsv" class="btn btn-secondary btn-sm" title="คัดลอกตารางทั้งหมดเพื่อนำไปกด Ctrl+V วางใน Excel หรือ Google Sheets ได้ทันที">
          📋 คัดลอกตารางวางใน Excel
        </button>
      </div>
    </div>

    <div class="scores-kpi-grid">
      <div class="scores-kpi-card">
        <span class="scores-kpi-label">ความคืบหน้าการตรวจ</span>
        <span class="scores-kpi-value" style="color:#34d399;">${gradedOrViewedCount} / ${totalStudents} คน</span>
        <span class="scores-kpi-meta">มีผลประเมิน Rubric แล้ว ${evaluatedList.length} คน</span>
      </div>
      <div class="scores-kpi-card">
        <span class="scores-kpi-label">คะแนนเฉลี่ยทั้งห้อง</span>
        <span class="scores-kpi-value" style="color:#38bdf8;">${escapeHtml(avgScoreText)}</span>
        <span class="scores-kpi-meta">${escapeHtml(minMaxText)}</span>
      </div>
      <div class="scores-kpi-card">
        <span class="scores-kpi-label">จำนวนตามชุดข้อสอบ (A–D)</span>
        <span class="scores-kpi-value" style="font-size:1.05rem;">
          A:${setCounts.A} · B:${setCounts.B} · C:${setCounts.C} · D:${setCounts.D}
        </span>
        <span class="scores-kpi-meta">คลิกตัวกรองด้านล่างเพื่อดูแยกทีละชุด</span>
      </div>
      <div class="scores-kpi-card">
        <span class="scores-kpi-label">ระดับคุณภาพ</span>
        <span class="scores-kpi-value" style="font-size:0.95rem;">
          ดีมาก:${qualityCounts['ดีมาก']} · ดี:${qualityCounts['ดี']} · พอใช้:${qualityCounts['พอใช้']} · ปรับปรุง:${qualityCounts['ปรับปรุง']}
        </span>
        <span class="scores-kpi-meta">เกณฑ์มาตรฐาน 20 คะแนน</span>
      </div>
    </div>

    <div class="scores-filter-toolbar">
      <input type="text" id="scoresMenuSearchInput" class="scores-search-input"
        placeholder="🔍 ค้นหาชื่อ, รหัสนักเรียน (เช่น 004, 020), ชื่อไฟล์ หรือคอมเมนต์..."
        value="${escapeHtml(state.scoresSearchQuery || '')}">
      <div class="scores-filter-pills">
        <button type="button" class="scores-filter-pill ${activeFilter === 'all' ? 'active' : ''}" data-scores-filter="all">ทั้งหมด (${totalStudents})</button>
        <button type="button" class="scores-filter-pill ${activeFilter === 'scored' ? 'active' : ''}" data-scores-filter="scored">✓ ตรวจแล้ว (${gradedOrViewedCount})</button>
        <button type="button" class="scores-filter-pill ${activeFilter === 'unscored' ? 'active' : ''}" data-scores-filter="unscored">⏳ ยังไม่ตรวจ (${totalStudents - gradedOrViewedCount})</button>
        <button type="button" class="scores-filter-pill ${activeFilter === 'A' ? 'active' : ''}" data-scores-filter="A">ชุด A (${setCounts.A})</button>
        <button type="button" class="scores-filter-pill ${activeFilter === 'B' ? 'active' : ''}" data-scores-filter="B">ชุด B (${setCounts.B})</button>
        <button type="button" class="scores-filter-pill ${activeFilter === 'C' ? 'active' : ''}" data-scores-filter="C">ชุด C (${setCounts.C})</button>
        <button type="button" class="scores-filter-pill ${activeFilter === 'D' ? 'active' : ''}" data-scores-filter="D">ชุด D (${setCounts.D})</button>
      </div>
    </div>

    <div class="scores-master-card">
      <div class="scores-table-scroll">
        <table class="scores-master-table">
          <thead>
            <tr>
              <th>#</th>
              <th>รหัส / ชื่อนักเรียน & ไฟล์งาน</th>
              <th>ชุดข้อสอบ</th>
              <th>คะแนนรวม</th>
              <th>คะแนนรายข้อ (Rubric ข้อ 1–6)</th>
              <th>คอมเมนต์ & คำชี้แจงคะแนนสำหรับนักเรียน (แก้ไขและบันทึกได้)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="6" style="text-align:center; padding:28px; color:#94a3b8;">ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // Bind buttons inside #scoresMenuContainer
  const btnXlsx = container.querySelector('#btnScoresExportXlsx');
  if (btnXlsx) btnXlsx.addEventListener('click', exportResultsToExcelXlsx);

  const btnCsv = container.querySelector('#btnScoresExportCsv');
  if (btnCsv) btnCsv.addEventListener('click', exportResultsToCsv);

  const btnTsv = container.querySelector('#btnScoresCopyTsv');
  if (btnTsv) btnTsv.addEventListener('click', copyAllScoresAsTsv);

  const searchIn = container.querySelector('#scoresMenuSearchInput');
  if (searchIn) {
    searchIn.addEventListener('input', (e) => {
      state.scoresSearchQuery = e.target.value;
      const pos = e.target.selectionStart;
      renderScoresMenuTab();
      const newIn = container.querySelector('#scoresMenuSearchInput');
      if (newIn) {
        newIn.focus();
        try { newIn.setSelectionRange(pos, pos); } catch (err) {}
      }
    });
  }

  container.querySelectorAll('.scores-filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      state.scoresFilter = pill.dataset.scoresFilter || 'all';
      renderScoresMenuTab();
    });
  });

  container.querySelectorAll('.btn-scores-jump-student').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.stuIdx, 10);
      if (students[idx]) {
        selectStudent(idx);
        switchTab('inspect');
      }
    });
  });

  container.querySelectorAll('.btn-scores-grade-now').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.stuIdx, 10);
      if (students[idx]) {
        selectStudent(idx);
        switchTab('inspect');
        gradeCurrentStudentAgainstAssignment(students[idx]);
      }
    });
  });

  container.querySelectorAll('.btn-scores-save-comment').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.stuIdx, 10);
      const stu = students[idx];
      if (!stu) return;
      const ta = container.querySelector(`.scores-comment-textarea[data-comment-stu-idx="${idx}"]`);
      const newComment = ta ? ta.value.trim() : '';
      stu.teacher_comment = newComment;
      stu.viewed = true;
      stu.saved_score_at = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
      if (stu.assignment_evaluation && !stu.note) {
        stu.note = stu.assignment_evaluation.suggested_teacher_note || `คะแนน ${stu.assignment_evaluation.score}/${stu.assignment_evaluation.max_score || 20}`;
      }
      persistLocalStudentReview(stu);
      syncActiveCourseState();
      updateStudentItemCard(stu);
      updateViewedStats();
      saveStudentReview(stu.owner, stu.repo, stu.viewed, stu.note || '', stu.teacher_comment, stu.assignment_evaluation);
      const hintEl = container.querySelector(`.scores-save-hint[data-save-hint-idx="${idx}"]`);
      if (hintEl) {
        hintEl.style.color = '#34d399';
        hintEl.textContent = `✓ บันทึกคอมเมนต์เรียบร้อย (${stu.saved_score_at})`;
      }
      showToast(`💾 บันทึกคอมเมนต์ชี้แจงของ "${stu.student_name || stu.repo}" แล้ว`, 'success');
    });
  });

  container.querySelectorAll('.btn-scores-copy-report').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.stuIdx, 10);
      const stu = students[idx];
      if (!stu) return;
      const ta = container.querySelector(`.scores-comment-textarea[data-comment-stu-idx="${idx}"]`);
      if (ta && ta.value.trim()) {
        stu.teacher_comment = ta.value.trim();
        persistLocalStudentReview(stu);
      }
      copyStudentScoreExplanationReport(stu);
    });
  });
}

// -------------------------------------------------------------
// Pure-JS Standard Office Open XML (.xlsx) Workbook Generator
// เปิดใน Microsoft Excel (Mac/Windows), Google Sheets, Numbers ได้ 100% ไม่เพี้ยน
// -------------------------------------------------------------
const _CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function computeCrc32(bytes) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) {
    crc = _CRC32_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function buildStoreZipBlob(entries) {
  const encoder = new TextEncoder();
  const fileRecords = entries.map(entry => {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = typeof entry.content === 'string' ? encoder.encode(entry.content) : entry.content;
    const crc = computeCrc32(dataBytes);
    return { nameBytes, dataBytes, crc };
  });

  let localTotalSize = 0;
  let centralTotalSize = 0;
  fileRecords.forEach(r => {
    localTotalSize += 30 + r.nameBytes.length + r.dataBytes.length;
    centralTotalSize += 46 + r.nameBytes.length;
  });

  const totalSize = localTotalSize + centralTotalSize + 22;
  const buf = new Uint8Array(totalSize);
  const view = new DataView(buf.buffer);

  let offset = 0;
  fileRecords.forEach(r => {
    r.localHeaderOffset = offset;
    view.setUint32(offset, 0x04034b50, true); // Local file header signature
    view.setUint16(offset + 4, 20, true);     // Version needed (2.0)
    view.setUint16(offset + 6, 0x0800, true); // UTF-8 filename flag
    view.setUint16(offset + 8, 0, true);      // Compression method: 0 (STORE)
    view.setUint16(offset + 10, 0, true);     // Mod time
    view.setUint16(offset + 12, 0x5421, true);// Mod date
    view.setUint32(offset + 14, r.crc, true); // CRC-32
    view.setUint32(offset + 18, r.dataBytes.length, true); // Compressed size
    view.setUint32(offset + 22, r.dataBytes.length, true); // Uncompressed size
    view.setUint16(offset + 26, r.nameBytes.length, true); // Filename length
    view.setUint16(offset + 28, 0, true);     // Extra field length
    buf.set(r.nameBytes, offset + 30);
    buf.set(r.dataBytes, offset + 30 + r.nameBytes.length);
    offset += 30 + r.nameBytes.length + r.dataBytes.length;
  });

  const centralDirOffset = offset;
  fileRecords.forEach(r => {
    view.setUint32(offset, 0x02014b50, true); // Central directory file header signature
    view.setUint16(offset + 4, 20, true);     // Version made by
    view.setUint16(offset + 6, 20, true);     // Version needed
    view.setUint16(offset + 8, 0x0800, true); // UTF-8 flag
    view.setUint16(offset + 10, 0, true);     // Compression method: 0 (STORE)
    view.setUint16(offset + 12, 0, true);
    view.setUint16(offset + 14, 0x5421, true);
    view.setUint32(offset + 16, r.crc, true);
    view.setUint32(offset + 20, r.dataBytes.length, true);
    view.setUint32(offset + 24, r.dataBytes.length, true);
    view.setUint16(offset + 28, r.nameBytes.length, true);
    view.setUint16(offset + 30, 0, true);     // Extra field length
    view.setUint16(offset + 32, 0, true);     // Comment length
    view.setUint16(offset + 34, 0, true);     // Disk number
    view.setUint16(offset + 36, 0, true);     // Internal attrs
    view.setUint32(offset + 38, 0, true);     // External attrs
    view.setUint32(offset + 42, r.localHeaderOffset, true);
    buf.set(r.nameBytes, offset + 46);
    offset += 46 + r.nameBytes.length;
  });

  const centralDirSize = offset - centralDirOffset;
  view.setUint32(offset, 0x06054b50, true); // End of central directory signature
  view.setUint16(offset + 4, 0, true);
  view.setUint16(offset + 6, 0, true);
  view.setUint16(offset + 8, fileRecords.length, true);
  view.setUint16(offset + 10, fileRecords.length, true);
  view.setUint32(offset + 12, centralDirSize, true);
  view.setUint32(offset + 16, centralDirOffset, true);
  view.setUint16(offset + 20, 0, true);

  return new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

function escapeXmlForXlsx(val) {
  return String(val === null || val === undefined ? '' : val)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n/g, '&#10;');
}

function xlsxColumnLetter(colIdx0) {
  let n = colIdx0 + 1;
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function buildNativeXlsxBlob(sheetTitle, columns, dataRows) {
  const safeSheetName = String(sheetTitle || 'สรุปคะแนน').replace(/[\\/?*[\]:]/g, ' ').trim().slice(0, 31) || 'สรุปคะแนน';

  const colsXml = columns.map((col, idx) => {
    const cNum = idx + 1;
    return `<col min="${cNum}" max="${cNum}" width="${col.width || 16}" customWidth="1"/>`;
  }).join('');

  // Row 1: Header row (style s="1")
  const headerCellsXml = columns.map((col, cIdx) => {
    const ref = `${xlsxColumnLetter(cIdx)}1`;
    return `<c r="${ref}" s="1" t="inlineStr"><is><t xml:space="preserve">${escapeXmlForXlsx(col.header)}</t></is></c>`;
  }).join('');

  const sheetRowsXml = [`<row r="1" ht="28" customHeight="1">${headerCellsXml}</row>`];

  dataRows.forEach((rowCells, rIdx) => {
    const rowNum = rIdx + 2;
    let maxLinesInRow = 1;
    const cellsXml = rowCells.map((cell, cIdx) => {
      const ref = `${xlsxColumnLetter(cIdx)}${rowNum}`;
      const isObj = cell && typeof cell === 'object';
      const rawVal = isObj ? cell.value : cell;
      const cellType = isObj && cell.type ? cell.type : (typeof rawVal === 'number' && Number.isFinite(rawVal) ? 'number' : 'string');
      const styleId = isObj && cell.style ? cell.style : (cellType === 'number' ? 4 : (columns[cIdx] && columns[cIdx].align === 'center' ? 3 : 2));

      if (cellType === 'number' && typeof rawVal === 'number' && Number.isFinite(rawVal)) {
        return `<c r="${ref}" s="${styleId}" t="n"><v>${rawVal}</v></c>`;
      }
      const strVal = String(rawVal === null || rawVal === undefined ? '' : rawVal);
      const lineCount = strVal.split(/\r?\n/).length;
      if (lineCount > maxLinesInRow) maxLinesInRow = lineCount;
      return `<c r="${ref}" s="${styleId}" t="inlineStr"><is><t xml:space="preserve">${escapeXmlForXlsx(strVal)}</t></is></c>`;
    }).join('');

    const rowHeight = Math.min(180, Math.max(24, maxLinesInRow * 16 + 6));
    sheetRowsXml.push(`<row r="${rowNum}" ht="${rowHeight}" customHeight="1">${cellsXml}</row>`);
  });

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${escapeXmlForXlsx(safeSheetName)}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="3">
    <font><sz val="11"/><color rgb="FF0F172A"/><name val="Tahoma"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Tahoma"/></font>
    <font><b/><sz val="11"/><color rgb="FF0F172A"/><name val="Tahoma"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF1E293B"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFEFF6FF"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFCBD5E1"/></left>
      <right style="thin"><color rgb="FFCBD5E1"/></right>
      <top style="thin"><color rgb="FFCBD5E1"/></top>
      <bottom style="thin"><color rgb="FFCBD5E1"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="6">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center" wrapText="1"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="top" wrapText="1"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="top" wrapText="1"/>
    </xf>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="center" vertical="top"/>
    </xf>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
      <alignment horizontal="left" vertical="top" wrapText="1"/>
    </xf>
  </cellXfs>
</styleSheet>`;

  const sheet1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews>
    <sheetView tabSelected="1" workbookViewId="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="22"/>
  <cols>${colsXml}</cols>
  <sheetData>${sheetRowsXml.join('')}</sheetData>
</worksheet>`;

  return buildStoreZipBlob([
    { name: '[Content_Types].xml', content: contentTypesXml },
    { name: '_rels/.rels', content: rootRelsXml },
    { name: 'xl/workbook.xml', content: workbookXml },
    { name: 'xl/_rels/workbook.xml.rels', content: workbookRelsXml },
    { name: 'xl/styles.xml', content: stylesXml },
    { name: 'xl/worksheets/sheet1.xml', content: sheet1Xml },
  ]);
}

function buildStructuredScoreExportData() {
  const activeCourse = getActiveCourse();
  const asg = getActiveAssignmentData();
  const courseSubject = activeCourse ? activeCourse.subject : 'รายวิชา';
  const assignTitle = (asg && asg.title) || (activeCourse && activeCourse.assignment) || 'งานที่ตรวจ';
  const maxScoreDefault = (asg && Number(asg.max_score)) || 20;

  const columns = [
    { header: 'ลำดับ', width: 7, align: 'center' },
    { header: 'รหัส/เลขที่', width: 14, align: 'center' },
    { header: 'ชื่อนักเรียน', width: 24, align: 'left' },
    { header: 'ชื่อไฟล์งาน', width: 26, align: 'left' },
    { header: 'ชุดข้อสอบ', width: 13, align: 'center' },
    { header: 'ชื่อชุดข้อสอบ', width: 28, align: 'left' },
    { header: 'คะแนนรวม', width: 13, align: 'center' },
    { header: 'คะแนนเต็ม', width: 12, align: 'center' },
    { header: 'ระดับคุณภาพ', width: 15, align: 'center' },
    { header: 'ข้อ 1: รับข้อมูล/ตัวแปร (3)', width: 16, align: 'center' },
    { header: 'ข้อ 2: Class/Attributes (3)', width: 16, align: 'center' },
    { header: 'ข้อ 3: Object/Method (3)', width: 16, align: 'center' },
    { header: 'ข้อ 4: Function/Parameter (3)', width: 16, align: 'center' },
    { header: 'ข้อ 5: วนซ้ำ/เงื่อนไข (4)', width: 16, align: 'center' },
    { header: 'ข้อ 6: คำนวณ/แสดงผล (4)', width: 16, align: 'center' },
    { header: 'คอมเมนต์และคำชี้แจงคะแนนรายข้อ (สำหรับนักเรียน)', width: 62, align: 'left' },
    { header: 'บันทึกย่อของครู', width: 34, align: 'left' },
    { header: 'สถานะการตรวจ', width: 15, align: 'center' },
    { header: 'โอกาสใช้ AI (%)', width: 15, align: 'center' },
  ];

  const rows = (state.students || []).map((s, index) => {
    const info = extractStudentIdAndCleanName(s);
    const ev = s.assignment_evaluation;
    const rawSet = ((ev && ev.exam_set) || s.confirmed_exam_set || '').toUpperCase();
    const setMeta = PRACTICAL_EXAM_SETS_META[rawSet] || null;
    const setLabel = rawSet ? `ชุด ${rawSet}` : '-';
    const setTitle = setMeta ? setMeta.title : '-';

    const hasScore = Boolean(ev && typeof ev.score === 'number');
    const scoreCell = hasScore ? { value: Number(ev.score), type: 'number', style: 4 } : { value: '-', type: 'string', style: 3 };
    const maxCell = hasScore ? { value: Number(ev.max_score || maxScoreDefault), type: 'number', style: 4 } : { value: maxScoreDefault, type: 'number', style: 4 };
    const qualityVal = hasScore
      ? String(ev.quality_level || ev.status_label || getExamQualityLevelInfo(ev.score).level).replace(/\s*\(\d+\/\d+\)/g, '')
      : '-';

    const itemCells = [1, 2, 3, 4, 5, 6].map(itemNum => {
      const rItem = getStudentRubricScoreByIndex(ev, itemNum);
      if (rItem && typeof rItem.score === 'number') {
        return { value: Number(rItem.score), type: 'number', style: 4 };
      }
      return { value: '-', type: 'string', style: 3 };
    });

    const commentText = (s.teacher_comment || (ev ? buildAutoExplanationFromEvaluation(s) : '') || s.note || '').trim();
    const noteText = (s.note || '').trim();
    const viewedText = s.viewed ? 'ตรวจแล้ว' : 'ยังไม่ได้ตรวจ';
    const aiInfo = s.ai_analysis || (s.local_bundle && s.local_bundle.inspect && s.local_bundle.inspect.ai_analysis);
    const aiScoreText = aiInfo && typeof aiInfo.ai_score === 'number' ? `${aiInfo.ai_score}%` : '-';

    return [
      { value: index + 1, type: 'number', style: 4 },
      { value: info.studentId || '-', type: 'string', style: 3 },
      { value: info.displayName, type: 'string', style: 2 },
      { value: info.fileName, type: 'string', style: 2 },
      { value: setLabel, type: 'string', style: 3 },
      { value: setTitle, type: 'string', style: 2 },
      scoreCell,
      maxCell,
      { value: qualityVal, type: 'string', style: 3 },
      ...itemCells,
      { value: commentText || '-', type: 'string', style: 2 },
      { value: noteText || '-', type: 'string', style: 2 },
      { value: viewedText, type: 'string', style: 3 },
      { value: aiScoreText, type: 'string', style: 3 },
    ];
  });

  return { courseSubject, assignTitle, columns, rows };
}

function exportResultsToExcelXlsx() {
  if (!state.students || state.students.length === 0) {
    showToast('ยังไม่มีรายชื่อนักเรียนให้ส่งออก กรุณานำเข้างานก่อน', 'warning');
    return;
  }

  const { courseSubject, assignTitle, columns, rows } = buildStructuredScoreExportData();
  const blob = buildNativeXlsxBlob(assignTitle, columns, rows);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  const safeSlug = `${courseSubject}_${assignTitle}`.replace(/[^a-zA-Z0-9ก-๙_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 65) || 'scores';
  link.setAttribute('href', url);
  link.setAttribute('download', `ตารางคะแนน_${safeSlug}_${dateStr}.xlsx`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('📗 ส่งออกไฟล์ Excel (.xlsx แท้) เรียบร้อยแล้ว เปิดใน Excel ได้ทันทีโดยไม่เพี้ยน!', 'success');
}

async function copyAllScoresAsTsv() {
  if (!state.students || state.students.length === 0) {
    showToast('ยังไม่มีรายชื่อนักเรียนให้คัดลอก', 'warning');
    return;
  }
  const { columns, rows } = buildStructuredScoreExportData();
  const headerLine = columns.map(c => c.header).join('\t');
  const bodyLines = rows.map(row =>
    row.map(cell => {
      const v = cell && typeof cell === 'object' ? cell.value : cell;
      return String(v === null || v === undefined ? '' : v).replace(/\t/g, ' ').replace(/\r?\n/g, ' | ');
    }).join('\t')
  );
  const tsv = [headerLine, ...bodyLines].join('\n');
  try {
    await navigator.clipboard.writeText(tsv);
    showToast('📋 คัดลอกตารางคะแนนทั้งหมดแล้ว นำไปกด Ctrl+V วางใน Excel หรือ Google Sheets ได้ทันที!', 'success');
  } catch (e) {
    showToast('ไม่สามารถคัดลอกตารางอัตโนมัติได้ กรุณากดปุ่มส่งออกไฟล์ Excel (.xlsx)', 'warning');
  }
}

function exportResultsToCsv() {
  if (!state.students || state.students.length === 0) {
    showToast('ยังไม่มีรายชื่อนักเรียนให้ส่งออก กรุณานำเข้างานก่อน', 'warning');
    return;
  }

  const { courseSubject, assignTitle, columns, rows } = buildStructuredScoreExportData();
  const csvEscape = (val) => {
    const str = String(val === null || val === undefined ? '' : val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const headerLine = columns.map(c => csvEscape(c.header)).join(',');
  const csvRows = rows.map(row =>
    row.map((cell, cIdx) => {
      const raw = cell && typeof cell === 'object' ? cell.value : cell;
      // สำหรับคอลัมน์รหัสนักเรียนที่มีเลข 0 นำหน้า เช่น 004 ให้คงรูปข้อความชัดเจน
      if (cIdx === 1 && typeof raw === 'string' && /^0\d+$/.test(raw)) {
        return csvEscape(`'${raw}`);
      }
      return csvEscape(raw);
    }).join(',')
  );

  // UTF-8 BOM (\uFEFF) ensures Excel opens Thai text correctly
  const csvContent = '\uFEFF' + [headerLine, ...csvRows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  const safeSlug = `${courseSubject}_${assignTitle}`.replace(/[^a-zA-Z0-9ก-๙_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 65) || 'scores';
  link.setAttribute('href', url);
  link.setAttribute('download', `ตารางคะแนน_${safeSlug}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showToast('📄 ส่งออกไฟล์ CSV (UTF-8 BOM) เรียบร้อยแล้ว', 'success');
}

// -------------------------------------------------------------
// Sidebar Drawer & Space Optimization Toggles
// -------------------------------------------------------------
function toggleMobileSidebar() {
  const sidebar = elements.mainSidebar || document.getElementById('mainSidebar');
  const backdrop = elements.sidebarBackdrop;
  if (!sidebar) return;

  if (window.innerWidth <= 860) {
    // Mobile Drawer mode
    const isOpen = sidebar.classList.contains('mobile-open');
    if (isOpen) {
      closeMobileSidebar();
    } else {
      sidebar.classList.add('mobile-open');
      if (backdrop) backdrop.classList.add('visible');
    }
  } else {
    toggleDesktopSidebar();
  }
}

function toggleDesktopSidebar() {
  const sidebar = elements.mainSidebar || document.getElementById('mainSidebar');
  if (!sidebar) return;
  const isNowCollapsed = !sidebar.classList.contains('collapsed');
  sidebar.classList.toggle('collapsed', isNowCollapsed);
  document.body.classList.toggle('sidebar-collapsed', isNowCollapsed);

  if (elements.sidebarToggleText) {
    elements.sidebarToggleText.textContent = isNowCollapsed ? '▶ แสดงรายชื่อ' : 'รายชื่อ';
  }
  if (elements.btnToggleSidebarBar) {
    elements.btnToggleSidebarBar.title = isNowCollapsed ? 'แสดงแถบรายชื่อนักเรียน (คีย์ลัด [)' : 'ซ่อนแถบรายชื่อเพื่อขยายพื้นที่ตรวจงาน (คีย์ลัด [)';
    elements.btnToggleSidebarBar.classList.toggle('active', isNowCollapsed);
  }
  if (isNowCollapsed) {
    showToast('ซ่อนแถบรายชื่อแล้ว (กด [ หรือคลิก "แสดงรายชื่อ" เพื่อเปิด)', 'info');
  }
}

function toggleZenMode() {
  const layout = document.querySelector('.app-layout');
  if (!layout) return;
  const isZen = !layout.classList.contains('zen-mode');
  layout.classList.toggle('zen-mode', isZen);
  if (elements.btnToggleZenMode) {
    elements.btnToggleZenMode.classList.toggle('active', isZen);
    elements.btnToggleZenMode.innerHTML = isZen
      ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg><span>ย่อจอ</span>`
      : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg><span>เต็มจอ</span>`;
    elements.btnToggleZenMode.title = isZen ? 'ออกจากโหมดเต็มจอ (Esc)' : 'โหมดโฟกัสเต็มจอ (ซ่อนแถบอื่น ๆ เพื่อดูโค้ดและผลลัพธ์ได้เต็มจอ)';
  }
  if (isZen) {
    showToast('เข้าสู่โหมดเต็มจอ (กด Esc หรือคลิก "ย่อจอ" เพื่อคืนค่า)', 'info');
  }
}

function closeMobileSidebar() {
  const sidebar = elements.mainSidebar || document.getElementById('mainSidebar');
  const backdrop = elements.sidebarBackdrop;
  if (sidebar) sidebar.classList.remove('mobile-open');
  if (backdrop) backdrop.classList.remove('visible');
}

function setupMobileSwipeGestures() {
  let touchStartX = 0;
  let touchStartY = 0;

  window.addEventListener('touchstart', (e) => {
    if (!e.touches || e.touches.length !== 1) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  window.addEventListener('touchend', (e) => {
    if (window.innerWidth > 860 || !e.changedTouches || e.changedTouches.length !== 1) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY);

    // ต้องเป็นการปัดแนวนอนเป็นหลัก
    if (Math.abs(dx) < 55 || dy > Math.abs(dx) * 0.7) return;

    const sidebar = elements.mainSidebar || document.getElementById('mainSidebar');
    if (!sidebar) return;
    const isOpen = sidebar.classList.contains('mobile-open');

    if (!isOpen && touchStartX < 28 && dx > 60) {
      // ปัดขวาจากขอบซ้ายจอเพื่อเปิดเมนูรายชื่อ
      sidebar.classList.add('mobile-open');
      if (elements.sidebarBackdrop) elements.sidebarBackdrop.classList.add('visible');
    } else if (isOpen && dx < -55) {
      // ปัดซ้ายเพื่อปิดเมนูรายชื่อ
      closeMobileSidebar();
    }
  }, { passive: true });
}

// -------------------------------------------------------------
// Iframe Sandbox Message Listener (Console logs & 404s)
// -------------------------------------------------------------
function setupIframeMessageListener() {
  window.addEventListener('message', (event) => {
    // ตรวจสอบความปลอดภัย: อนุญาตเฉพาะข้อความที่มาจาก iframe พรีวิวของเราเท่านั้น ป้องกันการปลอมแปลงจากแท็บอื่น
    if (elements.previewIframe && event.source !== elements.previewIframe.contentWindow) {
      return;
    }

    const data = event.data;
    if (!data || data.source !== 'repo-previewer-sandbox') return;

    const student = getCurrentStudent();
    if (!student) return;

    if (!student.console_logs) student.console_logs = [];
    if (!student.network_errors) student.network_errors = [];

    if (data.type === 'console_error' || data.type === 'runtime_error') {
      student.console_logs.push({
        type: 'error',
        message: data.payload.message || 'Error',
        time: data.timestamp || new Date().toISOString(),
      });
      updateObservationsBadge(student);
      if (state.activeTab === 'inspect') renderInspectTab(student);
    } else if (data.type === 'console_warn') {
      student.console_logs.push({
        type: 'warn',
        message: data.payload.message || 'Warning',
        time: data.timestamp || new Date().toISOString(),
      });
      updateObservationsBadge(student);
      if (state.activeTab === 'inspect') renderInspectTab(student);
    } else if (data.type === 'resource_error') {
      student.network_errors.push({
        url: data.payload.url,
        tagName: data.payload.tagName,
        message: data.payload.message,
        time: data.timestamp || new Date().toISOString(),
      });
      updateObservationsBadge(student);
      if (state.activeTab === 'inspect') renderInspectTab(student);
    }
  });
}

// -------------------------------------------------------------
// Modal, Link Parsing & File Upload Import
// -------------------------------------------------------------
function openModal() {
  elements.inputModal.style.display = 'flex';
  renderAssignmentPickers();
  if (state.importMode === 'upload') {
    renderSelectedUploadFiles();
  } else {
    if (elements.bulkLinksTextarea) elements.bulkLinksTextarea.focus();
    updateParsedStats();
  }
}

function closeModal() {
  elements.inputModal.style.display = 'none';
}

function switchImportMode(mode) {
  state.importMode = mode === 'upload' ? 'upload' : 'github';
  if (elements.importModeTabs) {
    elements.importModeTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.importMode === state.importMode);
    });
  }
  if (elements.importTabGithub) {
    elements.importTabGithub.classList.toggle('active', state.importMode === 'github');
  }
  if (elements.importTabUpload) {
    elements.importTabUpload.classList.toggle('active', state.importMode === 'upload');
  }
  if (elements.importPaneGithub) {
    elements.importPaneGithub.style.display = state.importMode === 'github' ? 'block' : 'none';
  }
  if (elements.importPaneUpload) {
    elements.importPaneUpload.style.display = state.importMode === 'upload' ? 'block' : 'none';
  }

  if (state.importMode === 'upload') {
    renderSelectedUploadFiles();
  } else {
    updateParsedStats();
  }
}

// -------------------------------------------------------------
// Toast Notifications
// -------------------------------------------------------------
function showToast(message, type = 'info') {
  let container = elements.toastContainer || document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast-pill ${type}`;
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  else if (type === 'warning') icon = '⚠️';
  else if (type === 'error') icon = '❌';

  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-text">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 320);
  }, 3200);
}

// -------------------------------------------------------------
// Asynchronous File & Directory Extractor (Handles folders & files)
// -------------------------------------------------------------
async function extractFilesFromDataTransfer(dt) {
  if (!dt) return [];
  const files = [];

  // Check if browser supports webkitGetAsEntry (Chrome, Edge, Safari, Firefox)
  if (dt.items && dt.items.length > 0 && typeof dt.items[0].webkitGetAsEntry === 'function') {
    const queue = [];
    for (let i = 0; i < dt.items.length; i++) {
      const item = dt.items[i];
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
        if (entry) queue.push(entry);
        else {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
    }

    async function traverseEntry(entry) {
      if (!entry) return;
      if (entry.isFile) {
        return new Promise((resolve) => {
          entry.file((file) => {
            if (file) files.push(file);
            resolve();
          }, () => resolve());
        });
      } else if (entry.isDirectory) {
        return new Promise((resolve) => {
          const dirReader = entry.createReader();
          const readNextBatch = () => {
            dirReader.readEntries(async (batch) => {
              if (!batch || batch.length === 0) {
                resolve();
              } else {
                for (const child of batch) {
                  await traverseEntry(child);
                }
                readNextBatch();
              }
            }, () => resolve());
          };
          readNextBatch();
        });
      }
    }

    for (const entry of queue) {
      await traverseEntry(entry);
    }
  } else if (dt.files && dt.files.length > 0) {
    for (let i = 0; i < dt.files.length; i++) {
      files.push(dt.files[i]);
    }
  }

  return files;
}

// -------------------------------------------------------------
// Global & In-Modal Drag-and-Drop Handlers
// -------------------------------------------------------------
function setupDragAndDropHandlers() {
  let windowDragDepth = 0;

  function isFileDrag(e) {
    const dt = e.dataTransfer;
    if (!dt) return false;
    if (dt.types) {
      for (let i = 0; i < dt.types.length; i++) {
        if (dt.types[i] === 'Files') return true;
      }
    }
    return false;
  }

  // 1. Global Window Drag Handlers
  window.addEventListener('dragenter', (e) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    windowDragDepth++;
    if (windowDragDepth === 1) {
      const modalOpen = elements.inputModal && elements.inputModal.style.display !== 'none';
      if (!modalOpen) {
        const active = getActiveCourse();
        if (elements.windowDragCourseLabel && active) {
          elements.windowDragCourseLabel.textContent = `วิชาปัจจุบัน: ${active.subject} (${active.assignment})`;
        }
        if (elements.windowDragOverlay) {
          elements.windowDragOverlay.style.display = 'flex';
        }
      }
    }
  });

  window.addEventListener('dragover', (e) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  });

  window.addEventListener('dragleave', (e) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    windowDragDepth--;
    if (windowDragDepth <= 0) {
      windowDragDepth = 0;
      if (elements.windowDragOverlay) {
        elements.windowDragOverlay.style.display = 'none';
      }
    }
  });

  window.addEventListener('drop', async (e) => {
    if (!isFileDrag(e)) return;
    e.preventDefault();
    windowDragDepth = 0;
    if (elements.windowDragOverlay) {
      elements.windowDragOverlay.style.display = 'none';
    }

    const files = await extractFilesFromDataTransfer(e.dataTransfer);
    if (files && files.length > 0) {
      const modalOpen = elements.inputModal && elements.inputModal.style.display !== 'none';
      if (modalOpen) {
        switchImportMode('upload');
        addPendingUploadFiles(files);
      } else {
        await uploadFilesDirectlyToActiveCourse(files);
      }
    }
  });

  // 2. Modal Drop Zone (#uploadDropZone)
  if (elements.uploadDropZone) {
    elements.uploadDropZone.addEventListener('dragenter', (e) => {
      e.preventDefault();
      e.stopPropagation();
      elements.uploadDropZone.classList.add('dragover');
    });

    elements.uploadDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      elements.uploadDropZone.classList.add('dragover');
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    });

    elements.uploadDropZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      elements.uploadDropZone.classList.remove('dragover');
    });

    elements.uploadDropZone.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      elements.uploadDropZone.classList.remove('dragover');
      const files = await extractFilesFromDataTransfer(e.dataTransfer);
      addPendingUploadFiles(files);
    });
  }

  // 3. Drop anywhere in Import Pane Upload (#importPaneUpload)
  if (elements.importPaneUpload) {
    elements.importPaneUpload.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    elements.importPaneUpload.addEventListener('drop', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const files = await extractFilesFromDataTransfer(e.dataTransfer);
      addPendingUploadFiles(files);
    });
  }

  // 4. File input change listener
  if (elements.studentFilesInput) {
    elements.studentFilesInput.addEventListener('change', (e) => {
      addPendingUploadFiles(Array.from(e.target.files || []));
      e.target.value = '';
    });
  }

  // 5. Clear all selected upload files
  if (elements.btnClearSelectedFiles) {
    elements.btnClearSelectedFiles.addEventListener('click', (e) => {
      e.stopPropagation();
      state.pendingUploadFiles = [];
      if (elements.studentFilesInput) elements.studentFilesInput.value = '';
      renderSelectedUploadFiles();
      showToast('ล้างรายการไฟล์ที่เลือกเรียบร้อย', 'info');
    });
  }

  // 6. Sidebar Drag-and-Drop Handlers (#mainSidebar & #sidebarDropArea)
  const sidebarEl = elements.mainSidebar || document.getElementById('mainSidebar');
  const dropAreaEl = elements.sidebarDropArea || document.getElementById('sidebarDropArea');
  const sidebarFileInputEl = elements.sidebarFileInput || document.getElementById('sidebarFileInput');

  if (dropAreaEl && sidebarFileInputEl) {
    dropAreaEl.addEventListener('click', () => {
      sidebarFileInputEl.click();
    });

    sidebarFileInputEl.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) {
        await uploadFilesDirectlyToActiveCourse(files);
      }
      sidebarFileInputEl.value = '';
    });
  }

  if (sidebarEl) {
    let sidebarDragDepth = 0;

    sidebarEl.addEventListener('dragenter', (e) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      e.stopPropagation();
      sidebarDragDepth++;
      sidebarEl.classList.add('dragover-active');
      if (dropAreaEl) dropAreaEl.classList.add('dragover');
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    });

    sidebarEl.addEventListener('dragover', (e) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      e.stopPropagation();
      sidebarEl.classList.add('dragover-active');
      if (dropAreaEl) dropAreaEl.classList.add('dragover');
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    });

    sidebarEl.addEventListener('dragleave', (e) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      e.stopPropagation();
      sidebarDragDepth--;
      if (sidebarDragDepth <= 0) {
        sidebarDragDepth = 0;
        sidebarEl.classList.remove('dragover-active');
        if (dropAreaEl) dropAreaEl.classList.remove('dragover');
      }
    });

    sidebarEl.addEventListener('drop', async (e) => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      e.stopPropagation();
      sidebarDragDepth = 0;
      sidebarEl.classList.remove('dragover-active');
      if (dropAreaEl) dropAreaEl.classList.remove('dragover');
      if (elements.windowDragOverlay) {
        elements.windowDragOverlay.style.display = 'none';
      }

      const files = await extractFilesFromDataTransfer(e.dataTransfer);
      if (files && files.length > 0) {
        await uploadFilesDirectlyToActiveCourse(files);
      }
    });
  }
}

async function uploadFilesDirectlyToActiveCourse(files) {
  if (!files || files.length === 0) return;
  const course = getActiveCourse();
  if (!course) {
    showToast('กรุณาเลือกรายวิชาก่อนนำเข้าไฟล์', 'warning');
    return;
  }

  const allowedExts = ['py', 'ipynb', 'zip', 'html', 'htm', 'css', 'js', 'txt', 'csv', 'json'];
  const validFiles = files.filter(f => {
    if (!f || !f.name) return false;
    if (f.name.startsWith('.') || f.name === '__MACOSX') return false;
    const parts = f.name.split('.');
    const ext = (parts.length > 1 ? parts.pop() : '').toLowerCase();
    return allowedExts.includes(ext);
  });

  if (validFiles.length === 0) {
    showToast('ไม่พบไฟล์ที่รองรับ (กรุณาเลือกไฟล์ .py, .ipynb, .zip, .html)', 'warning');
    return;
  }

  showToast(`⏳ กำลังนำเข้าและตรวจวิเคราะห์ ${validFiles.length} ไฟล์...`, 'info');

  try {
    const encodedFiles = [];
    for (const file of validFiles) {
      const b64 = await fileToBase64(file);
      encodedFiles.push({
        filename: file.name,
        content_base64: b64,
        student_name: null,
      });
    }

    const res = await fetch('/api/repos/upload-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: encodedFiles,
        group_as_single_student: false,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'อัปโหลดไฟล์ไม่สำเร็จ');
    }

    const data = await res.json();
    const newItems = (data.items || []).map(it => ({
      ...it,
      console_logs: [],
      network_errors: [],
    }));

    if (newItems.length === 0) {
      showToast('ไม่สามารถแยกไฟล์งานได้', 'warning');
      return;
    }

    newItems.forEach(newItem => {
      hydrateStudentReviewState(newItem, course.id);
      const existIdx = state.students.findIndex(s =>
        s.key === newItem.key ||
        (s.source_type === 'upload' && newItem.source_type === 'upload' &&
          s.raw_input && newItem.raw_input && s.raw_input === newItem.raw_input)
      );
      if (existIdx >= 0) {
        const prev = state.students[existIdx];
        newItem.viewed = !!(newItem.viewed || prev.viewed);
        if (!newItem.note && prev.note) newItem.note = prev.note;
        state.students[existIdx] = newItem;
      } else {
        state.students.push(newItem);
      }
    });

    syncActiveCourseState();
    renderCourseSelect();
    setHubSidebarMode(false);
    renderStudentsList();
    updateViewedStats();

    // เลือกดูคนใหม่คนแรกทันที
    const firstNewKey = newItems[0].key;
    const targetIdx = state.students.findIndex(s => s.key === firstNewKey);
    if (targetIdx >= 0) {
      selectStudent(targetIdx);
    }

    showToast(`✓ นำเข้างานนักเรียน ${newItems.length} คนสำเร็จแล้ว`, 'success');
  } catch (err) {
    showToast(`เกิดข้อผิดพลาดในการนำเข้าไฟล์: ${err.message}`, 'error');
  }
}

function addPendingUploadFiles(files) {
  if (!files || files.length === 0) return 0;
  const allowedExts = ['py', 'ipynb', 'zip', 'html', 'htm', 'css', 'js', 'txt', 'csv', 'json'];
  let addedCount = 0;
  let ignoredCount = 0;

  files.forEach(file => {
    if (!file || !file.name) return;
    if (file.name.startsWith('.') || file.name === '__MACOSX') return;

    const parts = file.name.split('.');
    const ext = (parts.length > 1 ? parts.pop() : '').toLowerCase();

    if (!allowedExts.includes(ext)) {
      ignoredCount++;
      return;
    }

    const exists = state.pendingUploadFiles.some(
      f => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified
    );
    if (!exists) {
      state.pendingUploadFiles.push(file);
      addedCount++;
    }
  });

  renderSelectedUploadFiles();

  if (addedCount > 0) {
    showToast(`เพิ่มไฟล์งานแล้ว ${addedCount} รายการ (รวม ${state.pendingUploadFiles.length} ไฟล์)`, 'success');
  } else if (ignoredCount > 0 && state.pendingUploadFiles.length === 0) {
    showToast('ไฟล์ไม่รองรับ กรุณาเลือกไฟล์ .py, .ipynb, .zip, .html, .css, .js', 'warning');
  } else if (addedCount === 0 && state.pendingUploadFiles.length > 0) {
    showToast('ไฟล์นี้มีอยู่ในรายการแล้ว', 'info');
  }

  return addedCount;
}

function renderSelectedUploadFiles() {
  const listEl = elements.selectedFilesList;
  const statsBar = elements.uploadStatsBar || document.getElementById('uploadStatsBar');
  const countEl = elements.uploadStatsCount || document.getElementById('uploadStatsCount');
  const sizeEl = elements.uploadStatsSize || document.getElementById('uploadStatsSize');

  const totalFiles = state.pendingUploadFiles.length;
  const totalBytes = state.pendingUploadFiles.reduce((acc, f) => acc + (f.size || 0), 0);

  if (state.importMode === 'upload' && elements.parsedStatsLabel) {
    elements.parsedStatsLabel.innerText = `เลือกไฟล์พร้อมนำเข้า: ${totalFiles} ไฟล์ (${formatFileSize(totalBytes)})`;
  }

  if (totalFiles === 0) {
    if (listEl) {
      listEl.style.display = 'none';
      listEl.innerHTML = '';
    }
    if (statsBar) statsBar.style.display = 'none';
    if (elements.btnStartFetch) {
      elements.btnStartFetch.classList.remove('has-pending-files');
    }
    return;
  }

  if (statsBar) {
    statsBar.style.display = 'flex';
    if (countEl) countEl.innerText = `เลือกไฟล์แล้ว ${totalFiles} ไฟล์`;
    if (sizeEl) sizeEl.innerText = `(${formatFileSize(totalBytes)})`;
  }

  if (elements.btnStartFetch) {
    elements.btnStartFetch.classList.add('has-pending-files');
  }

  if (!listEl) return;
  listEl.style.display = 'flex';
  listEl.innerHTML = '';

  state.pendingUploadFiles.forEach((file, idx) => {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    let icon = '📄';
    if (ext === 'py') icon = '🐍';
    else if (ext === 'ipynb') icon = '📓';
    else if (ext === 'zip') icon = '📦';
    else if (ext === 'html' || ext === 'htm') icon = '🌐';
    else if (ext === 'js') icon = '⚡';
    else if (ext === 'css') icon = '🎨';

    const chip = document.createElement('div');
    chip.className = 'selected-file-chip';
    chip.innerHTML = `
      <span class="selected-file-info">
        <span>${icon}</span>
        <span class="selected-file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</span>
        <span class="selected-file-size">(${formatFileSize(file.size || 0)})</span>
      </span>
      <button type="button" class="btn-remove-upload-file" title="เอาไฟล์นี้ออก">&times;</button>
    `;
    chip.querySelector('.btn-remove-upload-file').addEventListener('click', (e) => {
      e.stopPropagation();
      state.pendingUploadFiles.splice(idx, 1);
      renderSelectedUploadFiles();
    });
    listEl.appendChild(chip);
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ ' + file.name));
    reader.readAsDataURL(file);
  });
}

function updateParsedStats() {
  if (state.importMode === 'upload') {
    if (elements.parsedStatsLabel) {
      elements.parsedStatsLabel.innerText = `เลือกไฟล์พร้อมนำเข้า: ${state.pendingUploadFiles.length} ไฟล์`;
    }
    return;
  }
  const text = elements.bulkLinksTextarea.value.trim();
  if (!text) {
    elements.parsedStatsLabel.innerText = 'ตรวจพบคัดกรอง: 0 รายการ';
    return;
  }
  const lines = text.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
  elements.parsedStatsLabel.innerText = `ตรวจพบคัดกรอง: ประมาณ ${lines.length} รายการ`;
}

async function handleStartFetch() {
  if (state.importMode === 'upload') {
    await handleStartFileUpload();
    return;
  }

  const text = elements.bulkLinksTextarea.value.trim();
  if (!text) {
    alert('กรุณาวางลิงก์อย่างน้อย 1 รายการ หรือสลับไปแท็บ "อัปโหลดไฟล์งาน"');
    return;
  }

  elements.btnStartFetch.disabled = true;
  elements.btnStartFetch.innerText = 'กำลังประมวลผล...';

  try {
    // 1. ตรวจสอบและแปลงลิงก์
    const parseRes = await fetch('/api/links/parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const parsedData = await parseRes.json();
    const items = parsedData.items || [];

    if (items.length === 0) {
      alert('ไม่พบลิงก์ GitHub ที่ถูกต้อง');
      elements.btnStartFetch.disabled = false;
      elements.btnStartFetch.innerText = 'เริ่มโหลดและตรวจงาน';
      return;
    }

    // คงรายการที่อัปโหลดจากไฟล์ไว้ในวิชานี้ด้วย (ถ้ามี)
    const activeCourse = getActiveCourse();
    const activeCourseId = activeCourse ? activeCourse.id : '';
    const prevByKey = new Map(state.students.map(s => [s.key, s]));
    const uploadedStudents = state.students.filter(s => s.source_type === 'upload');
    const githubStudents = items.map(it => {
      const merged = {
        ...it,
        console_logs: [],
        network_errors: [],
      };
      const prev = prevByKey.get(merged.key);
      if (prev) {
        merged.viewed = !!(merged.viewed || prev.viewed);
        if (!merged.note && prev.note) merged.note = prev.note;
      }
      hydrateStudentReviewState(merged, activeCourseId);
      return merged;
    });
    state.students = [...uploadedStudents, ...githubStudents];

    syncActiveCourseState();
    renderCourseSelect();
    closeModal();
    setHubSidebarMode(false);
    renderStudentsList();
    updateViewedStats();

    // 2. ถ้ามีรายการที่เป็น cached พร้อมดูอยู่แล้ว ให้เลือกคนแรกทันที
    const readyIdx = state.students.findIndex(s => s.status === 'ready');
    if (readyIdx >= 0) {
      selectStudent(readyIdx);
    }

    // 3. เริ่ม Streaming ดาวน์โหลดสำหรับรายการที่ยังไม่ได้โหลด
    startFetchStream(githubStudents);

  } catch (err) {
    alert('เกิดข้อผิดพลาดในการประมวลผลลิงก์: ' + err.message);
  } finally {
    elements.btnStartFetch.disabled = false;
    elements.btnStartFetch.innerText = 'เริ่มโหลดและตรวจงาน';
  }
}

async function handleStartFileUpload() {
  if (state.pendingUploadFiles.length === 0) {
    alert('กรุณาเลือกไฟล์งานนักเรียนอย่างน้อย 1 ไฟล์ (.py, .ipynb, .zip, .html)');
    return;
  }

  elements.btnStartFetch.disabled = true;
  elements.btnStartFetch.innerText = 'กำลังอัปโหลดและวิเคราะห์โค้ด...';

  try {
    const encodedFiles = [];
    for (const file of state.pendingUploadFiles) {
      const b64 = await fileToBase64(file);
      encodedFiles.push({
        filename: file.name,
        content_base64: b64,
        student_name: null,
      });
    }

    const groupSingle = !!(elements.checkGroupSingleStudent && elements.checkGroupSingleStudent.checked);
    const res = await fetch('/api/repos/upload-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: encodedFiles,
        group_as_single_student: groupSingle,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'อัปโหลดไฟล์ไม่สำเร็จ');
    }

    const data = await res.json();
    const newItems = (data.items || []).map(it => ({
      ...it,
      console_logs: [],
      network_errors: [],
    }));

    if (newItems.length === 0) {
      alert('ไม่พบไฟล์ที่สามารถนำเข้าได้');
      return;
    }

    // รวมเข้ากับรายการนักเรียนในรายวิชาปัจจุบัน (อัปเดตหากชื่อไฟล์ซ้ำ หรือเพิ่มต่อท้าย)
    const activeUploadCourse = getActiveCourse();
    const activeUploadCourseId = activeUploadCourse ? activeUploadCourse.id : '';
    newItems.forEach(newItem => {
      hydrateStudentReviewState(newItem, activeUploadCourseId);
      const existIdx = state.students.findIndex(s =>
        s.key === newItem.key ||
        (s.source_type === 'upload' && newItem.source_type === 'upload' &&
          s.raw_input && newItem.raw_input && s.raw_input === newItem.raw_input)
      );
      if (existIdx >= 0) {
        const prev = state.students[existIdx];
        newItem.viewed = !!(newItem.viewed || prev.viewed);
        if (!newItem.note && prev.note) newItem.note = prev.note;
        state.students[existIdx] = newItem;
      } else {
        state.students.push(newItem);
      }
    });

    state.pendingUploadFiles = [];
    if (elements.studentFilesInput) elements.studentFilesInput.value = '';
    renderSelectedUploadFiles();

    syncActiveCourseState();
    renderCourseSelect();
    closeModal();
    setHubSidebarMode(false);
    renderStudentsList();
    updateViewedStats();

    // เลือกเปิดดูงานคนที่เพิ่งอัปโหลดคนแรกทันที
    const firstNewKey = newItems[0].key;
    const targetIdx = state.students.findIndex(s => s.key === firstNewKey);
    if (targetIdx >= 0) {
      selectStudent(targetIdx);
    }
  } catch (err) {
    alert('เกิดข้อผิดพลาดในการอัปโหลดไฟล์: ' + err.message);
  } finally {
    elements.btnStartFetch.disabled = false;
    elements.btnStartFetch.innerText = 'เริ่มโหลดและตรวจงาน';
  }
}

async function startFetchStream(items) {
  const toFetch = items.filter(it => it.status !== 'ready' && it.is_valid && it.source_type !== 'upload');
  if (toFetch.length === 0) return;

  // ตั้งสถานะเป็น loading ในรายการ
  toFetch.forEach(it => {
    it.status = 'loading';
    it.loadingMessage = 'กำลังดาวน์โหลด...';
  });
  renderStudentsList();

  try {
    const res = await fetch('/api/repos/fetch-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: toFetch, force_refresh: false }),
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop(); // เก็บเศษบรรทัดสุดท้ายที่ยังไม่สมบูรณ์

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;

        try {
          const event = JSON.parse(jsonStr);
          handleStreamEvent(event);
        } catch (e) {
          console.error('Error parsing SSE event:', e);
        }
      }
    }
  } catch (err) {
    console.error('Fetch stream error:', err);
  }
}

function handleStreamEvent(event) {
  if (event.type === 'progress') {
    const student = state.students.find(s => s.key === event.key);
    if (student) {
      student.status = 'loading';
      student.loadingMessage = event.message;
      updateStudentItemCard(student);
    }
  } else if (event.type === 'completed') {
    const student = state.students.find(s => s.key === event.key);
    if (student) {
      if (event.success) {
        student.status = 'ready';
        student.meta = event.data.meta || {};
        student.loadingMessage = null;
      } else {
        student.status = 'error';
        student.error_message = event.error_message || 'ดาวน์โหลดไม่สำเร็จ';
      }
      syncActiveCourseState();
      renderCourseSelect();
      updateStudentItemCard(student);

      // ถ้ายังไม่ได้เลือกใคร ให้เปิดดูคนแรกที่พร้อมทันที!
      if (state.currentIndex === -1 && student.status === 'ready') {
        const idx = state.students.indexOf(student);
        selectStudent(idx);
      } else if (state.currentIndex >= 0 && state.students[state.currentIndex] === student) {
        // อัปเดตหน้าต่างงานของคนปัจจุบัน
        selectStudent(state.currentIndex);
      }
    }
  }
}

// -------------------------------------------------------------
// Student List Rendering & Filtering
// -------------------------------------------------------------
function findStudentCardElement(studentKey) {
  if (!studentKey || !elements.studentsList) return null;
  const cards = elements.studentsList.querySelectorAll('.student-item');
  for (const card of cards) {
    if (card.dataset && card.dataset.studentKey === studentKey) {
      return card;
    }
  }
  return null;
}

function buildStudentItemScoreRowHtml(student) {
  if (!student) return '';
  const ev = student.assignment_evaluation;
  if (!ev && !student.teacher_comment) return '';
  let pillHtml = '';
  if (ev && typeof ev.score === 'number') {
    const statusCls = ev.status === 'passed' ? 'passed' : (ev.status === 'partial' ? 'partial' : 'failed');
    const setPrefix = ev.exam_set ? `ชุด ${escapeHtml(ev.exam_set)} · ` : '';
    pillHtml = `<span class="student-item-score-pill ${statusCls}">${setPrefix}${ev.score}/${ev.max_score || 20}</span>`;
  }
  const commentHtml = student.teacher_comment
    ? `<span class="student-item-comment-tag" title="${escapeHtml(student.teacher_comment)}">💬 มีคำชี้แจง</span>`
    : '';
  return `<div class="student-item-score-row">${pillHtml}${commentHtml}</div>`;
}

function renderStudentsList() {
  const list = elements.studentsList;
  list.innerHTML = '';

  const filtered = getFilteredStudents();
  elements.totalStudentsCount.innerText = state.students.length;

  if (state.students.length === 0) {
    list.innerHTML = `
      <div class="empty-list-notice sidebar-empty-drop" id="btnEmptyListDrop" title="ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเพิ่มงาน (.py, .zip)">
        <div style="font-size: 1.8rem; margin-bottom: 4px;">📂</div>
        <p style="margin: 0; font-weight: 600;">ยังไม่มีรายชื่อนักเรียน</p>
        <span style="font-size: 0.75rem; color: #38bdf8;">ลากไฟล์มาวาง หรือคลิกเพิ่มงาน</span>
      </div>
    `;
    const emptyDrop = document.getElementById('btnEmptyListDrop');
    if (emptyDrop) {
      emptyDrop.addEventListener('click', () => {
        const input = elements.sidebarFileInput || document.getElementById('sidebarFileInput');
        if (input) input.click();
      });
    }
    return;
  }

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-list-notice"><p>ไม่พบรายการที่ตรงกับเงื่อนไข</p></div>`;
    return;
  }

  filtered.forEach((student, idx) => {
    const originalIndex = state.students.indexOf(student);
    const itemEl = document.createElement('div');
    itemEl.className = `student-item ${originalIndex === state.currentIndex ? 'active' : ''} ${student.viewed ? 'is-viewed' : ''}`.trim();
    itemEl.style.animationDelay = `${Math.min(idx * 35, 350)}ms`;
    itemEl.dataset.studentKey = student.key || '';

    // Status Dot Class
    let dotClass = 'pending';
    if (student.status === 'ready') dotClass = 'ready';
    else if (student.status === 'loading') dotClass = 'loading';
    else if (student.status === 'error') dotClass = 'error';

    // Tooltip status
    let statusTitle = 'พร้อมตรวจ';
    if (student.status === 'loading') statusTitle = student.loadingMessage || 'กำลังโหลด...';
    else if (student.status === 'error') statusTitle = student.error_message || 'พบข้อผิดพลาด';

    const isUploadedItem = student.source_type === 'upload' || student.owner === 'local-upload';
    const rawFileLabel = (student.raw_input || 'ไฟล์อัปโหลด').replace(/^\[ไฟล์(?:อัปโหลด)?\]\s*/i, '').trim();
    const subLabel = isUploadedItem
      ? rawFileLabel
      : (student.owner ? `${student.owner}/${student.repo}` : (student.raw_input || ''));
    const showSubLine = subLabel && subLabel.toLowerCase() !== (student.student_name || '').trim().toLowerCase();

    itemEl.innerHTML = `
      <div class="student-item-left">
        <div class="student-item-checkbox ${student.viewed ? 'checked' : ''}" title="คลิกเพื่อทำเครื่องหมายว่าตรวจแล้ว"></div>
        <div class="student-item-details">
          <span class="student-item-name" title="${escapeHtml(student.student_name)}">${escapeHtml(student.student_name)}</span>
          ${showSubLine ? `<span class="student-item-sub" title="${escapeHtml(subLabel)}">${escapeHtml(subLabel)}</span>` : ''}
          ${buildStudentItemScoreRowHtml(student)}
        </div>
      </div>
      <div class="student-item-right">
        <div class="status-dot ${dotClass}" title="${escapeHtml(statusTitle)}"></div>
        <button type="button" class="btn-remove-student" title="ลบรายการคนนี้ออก" aria-label="ลบรายการคนนี้ออก">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `;

    // Click on item to select student
    itemEl.addEventListener('click', (e) => {
      if (e.target.closest('.btn-remove-student')) {
        e.stopPropagation();
        handleDeleteStudent(originalIndex);
      } else if (e.target.closest('.student-item-checkbox')) {
        e.stopPropagation();
        handleViewedToggle(originalIndex, !student.viewed);
      } else {
        selectStudent(originalIndex);
      }
    });

    list.appendChild(itemEl);
  });
}

function updateStudentItemCard(student) {
  const el = findStudentCardElement(student.key);
  if (!el) {
    renderStudentsList();
    return;
  }

  el.classList.toggle('is-viewed', !!student.viewed);

  const dot = el.querySelector('.status-dot');
  if (dot) {
    dot.className = `status-dot ${student.status}`;
    dot.title = student.status === 'error' ? (student.error_message || 'เกิดข้อผิดพลาด') :
                (student.status === 'loading' ? (student.loadingMessage || 'กำลังโหลด') : 'พร้อมตรวจ');
  }

  const chk = el.querySelector('.student-item-checkbox');
  if (chk) {
    chk.classList.toggle('checked', !!student.viewed);
  }

  const detailsEl = el.querySelector('.student-item-details');
  if (detailsEl) {
    const oldRow = detailsEl.querySelector('.student-item-score-row');
    if (oldRow) oldRow.remove();
    const scoreRowHtml = buildStudentItemScoreRowHtml(student);
    if (scoreRowHtml) {
      detailsEl.insertAdjacentHTML('beforeend', scoreRowHtml);
    }
  }
}

function getFilteredStudents() {
  return state.students.filter(s => {
    // Filter
    if (state.filter === 'unviewed' && s.viewed) return false;
    if (state.filter === 'viewed' && !s.viewed) return false;
    if (state.filter === 'ready' && s.status !== 'ready') return false;
    if (state.filter === 'error' && s.status !== 'error') return false;

    // Search
    if (state.searchQuery) {
      const q = state.searchQuery;
      const matchName = (s.student_name || '').toLowerCase().includes(q);
      const matchRepo = `${s.owner}/${s.repo}`.toLowerCase().includes(q);
      const matchRaw = (s.raw_input || '').toLowerCase().includes(q);
      if (!matchName && !matchRepo && !matchRaw) return false;
    }

    return true;
  });
}

function updateViewedStats() {
  const total = state.students.length;
  const viewedCount = state.students.filter(s => s.viewed).length;
  elements.viewedStatsText.innerText = `ตรวจแล้ว: ${viewedCount} / ${total}`;
  const pct = total > 0 ? (viewedCount / total) * 100 : 0;
  elements.viewedProgressFill.style.width = `${pct}%`;
  updateScoresMenuBadge();
}

// -------------------------------------------------------------
// Student Selection & Workspace Setup
// -------------------------------------------------------------
async function selectStudent(index) {
  if (index < 0 || index >= state.students.length) return;
  state.currentIndex = index;
  const student = state.students[index];

  // ปิด Drawer บนหน้าจอมือถืออัตโนมัติเมื่อเลือกนักเรียน
  const isMobile = window.innerWidth <= 860;
  if (isMobile) {
    closeMobileSidebar();
  }

  // อัปเดต UI ให้แสดง workspace พร้อมแอนิเมชันนุ่มนวล (ข้ามการบังคับ reflow บนมือถือเพื่อให้สลับหน้าได้ทันที)
  setHubSidebarMode(false);
  elements.blankState.style.display = 'none';
  elements.studentWorkspace.style.display = 'flex';
  if (elements.topWorkspaceBar) elements.topWorkspaceBar.style.display = 'flex';
  if (elements.sidebarActiveMeta) elements.sidebarActiveMeta.style.display = 'flex';
  if (!isMobile) {
    elements.studentWorkspace.classList.remove('workspace-animate');
    void elements.studentWorkspace.offsetWidth;
    elements.studentWorkspace.classList.add('workspace-animate');
  }

  // Highlight active ใน sidebar โดยยังคงสถานะติ๊กตรวจแล้วของทุกคนไว้ครบ
  document.querySelectorAll('.student-item').forEach((item) => {
    item.classList.remove('active');
  });
  const activeCard = findStudentCardElement(student.key);
  if (activeCard) {
    activeCard.classList.add('active');
    activeCard.classList.toggle('is-viewed', !!student.viewed);
    const activeChk = activeCard.querySelector('.student-item-checkbox');
    if (activeChk) activeChk.classList.toggle('checked', !!student.viewed);
    if (!isMobile) {
      activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // Header Details
  elements.activeStudentName.innerText = student.student_name;
  const isUploaded = student.source_type === 'upload' || (student.canonical_url && student.canonical_url.startsWith('upload://'));
  elements.activeRepoText.innerText = isUploaded ? (student.raw_input || student.repo) : (student.owner ? `${student.owner}/${student.repo}` : student.raw_input);
  elements.activeRepoLink.href = isUploaded ? '#' : (student.canonical_url || '#');
  elements.activeRepoLink.style.pointerEvents = isUploaded ? 'none' : 'auto';
  if (elements.btnReloadCurrentRepo) {
    elements.btnReloadCurrentRepo.style.display = isUploaded ? 'none' : 'inline-flex';
  }
  elements.navCounterText.innerText = `${index + 1} / ${state.students.length}`;
  elements.checkViewed.checked = !!student.viewed;
  elements.studentNoteInput.value = student.note || '';

  // Badges
  updateAssignmentGradeBadge(student);
  renderAssignmentPickers();
  renderStudioPromptPane(student);
  const commit = student.meta && student.meta.commit_hash ? student.meta.commit_hash.substring(0, 7) : '-';
  if (elements.commitBadge) {
    elements.commitBadge.style.display = isUploaded ? 'none' : 'inline-flex';
    elements.commitBadge.innerText = isUploaded ? 'ไฟล์อัปโหลด' : `Commit: ${commit}`;
  }

  // ถ้าสถานะยังเป็น Error ให้แสดงข้อมูลข้อผิดพลาด
  if (student.status === 'error') {
    elements.noWebNotice.style.display = 'flex';
    elements.noWebNotice.querySelector('h3').innerText = 'ไม่สามารถดาวน์โหลดได้';
    elements.noWebNotice.querySelector('p').innerText = student.error_message || 'พบข้อผิดพลาด';
    elements.btnSwitchToCode.style.display = 'none';
    elements.iframeContainer.style.display = 'none';
    if (elements.pythonPreviewStudio) elements.pythonPreviewStudio.style.display = 'none';
    return;
  }

  // โหลด Preview (รองรับทั้ง HTML Web และ Python OOP Studio)
  loadPreviewForStudent(student);

  // โหลด File Tree สำหรับแท็บโค้ด
  loadFileTreeForStudent(student);

  // โหลดข้อสังเกตสำหรับแท็บ Inspect
  loadInspectForStudent(student);
}

async function loadPreviewForStudent(student) {
  if (!student.owner || !student.repo) return;

  try {
    let data = null;
    const fallbackPyInfo = student.python_info
      || (student.local_bundle && student.local_bundle.python_info)
      || (student.local_bundle && student.local_bundle.inspect && student.local_bundle.inspect.python_info)
      || null;
    const isLocalPythonUpload = (student.source_type === 'upload' || student.owner === 'local-upload')
      && !student.has_web
      && fallbackPyInfo
      && Array.isArray(fallbackPyInfo.files)
      && fallbackPyInfo.files.length > 0;

    if (isLocalPythonUpload) {
      data = {
        ...(student.local_bundle && student.local_bundle.preview ? student.local_bundle.preview : {}),
        has_web: false,
        has_python: true,
        python_info: fallbackPyInfo,
      };
    } else {
      const res = await fetch(`/api/preview/${student.owner}/${student.repo}`);
      if (res.ok) {
        data = await res.json();
      } else if (student.local_bundle || fallbackPyInfo) {
        data = {
          ...(student.local_bundle && student.local_bundle.preview ? student.local_bundle.preview : {}),
          has_python: !!(student.has_python || (fallbackPyInfo && fallbackPyInfo.has_python)),
          python_info: fallbackPyInfo,
        };
      } else {
        const errData = await res.json().catch(() => ({}));
        elements.hasWebBadge.className = 'badge badge-warning';
        elements.hasWebBadge.innerText = 'โหลดไม่สำเร็จ';
        elements.noWebNotice.style.display = 'flex';
        elements.noWebNotice.querySelector('h3').innerText = 'ไม่สามารถดาวน์โหลด repository ได้';
        elements.noWebNotice.querySelector('p').innerText = errData.detail || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ GitHub';
        elements.btnSwitchToCode.style.display = 'none';
        elements.iframeContainer.style.display = 'none';
        if (elements.pythonPreviewStudio) elements.pythonPreviewStudio.style.display = 'none';
        elements.previewIframe.src = 'about:blank';
        student.preview_url = null;
        return;
      }
    }

    if (data.python_info) {
      student.python_info = data.python_info;
    } else if (fallbackPyInfo) {
      student.python_info = fallbackPyInfo;
    }
    student.has_python = !!(data.has_python || (student.python_info && student.python_info.has_python));

    const deviceSwitcherEl = document.querySelector('.device-switcher');

    if (data.has_web && data.url) {
      // 1. มี index.html เสิร์ฟเป็นเว็บสถิต
      student.has_web = true;
      student.preview_url = data.url;
      elements.hasWebBadge.className = 'badge badge-success';
      elements.hasWebBadge.innerText = '🌐 Web';
      elements.hasWebBadge.title = data.is_subfolder ? `เว็บสถิต (${data.index_rel})` : 'เว็บสถิต (HTML)';
      elements.noWebNotice.style.display = 'none';
      if (elements.pythonPreviewStudio) elements.pythonPreviewStudio.style.display = 'none';
      if (elements.previewToolbar) elements.previewToolbar.style.display = 'flex';
      if (deviceSwitcherEl) deviceSwitcherEl.style.display = 'flex';
      if (elements.btnOpenExternal) elements.btnOpenExternal.style.display = 'inline-flex';
      elements.iframeContainer.style.display = 'flex';
      elements.previewIframe.src = data.url;
    } else if (student.has_python && student.python_info && (student.python_info.files || []).length > 0) {
      // 2. โปรเจกต์ Python / OOP — เปิดโหมด Python & OOP Output Preview Studio
      student.has_web = false;
      student.preview_url = null;
      elements.previewIframe.src = 'about:blank';
      elements.iframeContainer.style.display = 'none';
      elements.noWebNotice.style.display = 'none';
      if (elements.previewToolbar) elements.previewToolbar.style.display = 'none';
      if (deviceSwitcherEl) deviceSwitcherEl.style.display = 'none';
      if (elements.btnOpenExternal) elements.btnOpenExternal.style.display = 'none';

      const oopSum = student.python_info.oop_summary || {};
      elements.hasWebBadge.className = 'badge badge-python';
      elements.hasWebBadge.innerText = '🐍 Python';
      elements.hasWebBadge.title = oopSum.total_classes > 0 ? `Python OOP (${oopSum.total_classes} คลาส)` : `Python (${student.python_info.total_python_files || 1} ไฟล์)`;

      if (elements.pythonPreviewStudio) {
        elements.pythonPreviewStudio.style.display = 'flex';
        setupPythonStudioForStudent(student, student.python_info);
      }
    } else {
      // 3. ไม่มีทั้ง index.html และไฟล์ Python
      student.has_web = false;
      if (elements.previewToolbar) elements.previewToolbar.style.display = 'none';
      elements.hasWebBadge.className = 'badge badge-warning';
      elements.hasWebBadge.innerText = 'ดูได้เฉพาะโค้ด';
      elements.noWebNotice.style.display = 'flex';
      elements.noWebNotice.querySelector('h3').innerText = 'ไม่พบหน้าเว็บ index.html หรือไฟล์ Python';
      elements.noWebNotice.querySelector('p').innerText = 'สามารถตรวจดูไฟล์ทั้งหมดในแท็บ "โค้ด" ได้ตามปกติ';
      elements.btnSwitchToCode.style.display = 'inline-flex';
      elements.iframeContainer.style.display = 'none';
      if (elements.pythonPreviewStudio) elements.pythonPreviewStudio.style.display = 'none';
      elements.previewIframe.src = 'about:blank';
      student.preview_url = null;
    }

    syncActiveCourseState();
  } catch (err) {
    console.error('Error getting preview:', err);
  }
}

// -------------------------------------------------------------
// Python & OOP Output Preview Studio (In-Browser Pyodide Runner)
// -------------------------------------------------------------
function setupPythonStudioForStudent(student, pythonInfo) {
  state.pyCurrentStudentKey = student.key;
  state.pyFilesMap = {};

  const files = pythonInfo.files || [];
  files.forEach(f => {
    state.pyFilesMap[f.path] = f;
  });

  if (elements.pyEntryFileSelect) {
    elements.pyEntryFileSelect.innerHTML = '';
    files.forEach(f => {
      const opt = document.createElement('option');
      opt.value = f.path;
      const icon = f.extension === 'ipynb' ? '📓' : '🐍';
      const classes = (f.analysis && f.analysis.classes) || [];
      const classHint = classes.length > 0 ? ` — [Class: ${classes.map(c => c.name).join(', ')}]` : '';
      opt.textContent = `${icon} ${f.path}${classHint}`;
      elements.pyEntryFileSelect.appendChild(opt);
    });
  }

  const defaultEntry = pythonInfo.entry_file || (files[0] && files[0].path);
  if (defaultEntry) {
    if (elements.pyEntryFileSelect) elements.pyEntryFileSelect.value = defaultEntry;
    selectPythonStudioFile(student, defaultEntry, true);
  }
  renderStudioPromptPane(student);
}

function selectPythonStudioFile(student, filePath, isAutoInit = false) {
  const fileObj = state.pyFilesMap[filePath];
  if (!fileObj) return;

  state.pyCurrentFilePath = filePath;
  state.pyOriginalCode = fileObj.content || '';

  if (elements.pyCodeEditor) {
    elements.pyCodeEditor.value = state.pyOriginalCode;
    updatePyEditorLineNumbers();
  }

  const analysis = fileObj.analysis || {};
  const oopSummary = (student.python_info && student.python_info.oop_summary) || {};
  renderPythonOopChips(analysis, oopSummary);

  // แจ้งเตือนและเปิดช่อง Stdin อัตโนมัติเฉพาะเมื่อโค้ดมีการเรียกใช้ input()
  if (elements.pyInputDetectedBadge) {
    elements.pyInputDetectedBadge.style.display = analysis.uses_input ? 'inline-block' : 'none';
  }
  if (elements.pyStdinBox) {
    const showStdin = !!analysis.uses_input;
    elements.pyStdinBox.style.display = showStdin ? 'flex' : 'none';
    if (elements.btnToggleStdin) {
      elements.btnToggleStdin.classList.toggle('active', showStdin);
    }
  }
  if (elements.pyStdinInput) {
    if (analysis.uses_input && analysis.input_prompts && analysis.input_prompts.length > 0) {
      elements.pyStdinInput.placeholder = `ตรวจพบ input(${analysis.input_prompts.map(p => `"${p}"`).join(', ')}) — พิมพ์ค่าที่จะป้อนให้โปรแกรมทีละบรรทัดที่นี่ หรือกด "รันโค้ด" เพื่อป้อนผ่านป๊อปอัป`;
    } else {
      elements.pyStdinInput.placeholder = 'พิมพ์ค่าที่จะป้อนให้ input() ทีละบรรทัดที่นี่ หรือเว้นว่างไว้เพื่อป้อนผ่านกล่องโต้ตอบตอนกดรัน...';
    }
  }

  // หากมี SyntaxError แสดงทันทีใน Console
  if (analysis.syntax_valid === false && analysis.syntax_error) {
    const err = analysis.syntax_error;
    if (elements.pyExecStatus) {
      elements.pyExecStatus.className = 'py-exec-status status-error';
      elements.pyExecStatus.innerText = `SyntaxError บรรทัด ${err.lineno || '?'}`;
    }
    if (elements.pyOutputConsole) {
      elements.pyOutputConsole.innerHTML = `
        <div class="py-console-error-box">
          <div class="py-console-error-title">❌ พบข้อผิดพลาดทางไวยากรณ์ (SyntaxError) ในไฟล์ ${escapeHtml(filePath)}</div>
          <pre class="py-console-pre error-text">บรรทัดที่ ${err.lineno || '?'}: ${escapeHtml(err.message || '')}\n${escapeHtml(err.text || '')}</pre>
          <div class="py-console-hint">💡 ครูสามารถทดลองแก้โค้ดในช่องด้านซ้ายแล้วกด <strong>"รันโค้ด (Run)"</strong> เพื่อทดสอบผลลัพธ์ได้ทันที</div>
        </div>
      `;
    }
    return;
  }

  // กรณีไฟล์มีคำสั่ง input() และยังไม่ได้พิมพ์ค่าในช่อง Stdin ตอนเปิดครั้งแรก ให้แสดงคำแนะนำพร้อมปุ่มกดรันโต้ตอบ
  const hasStdinText = elements.pyStdinInput && elements.pyStdinInput.value.trim().length > 0;
  if (isAutoInit && analysis.uses_input && !hasStdinText) {
    if (elements.pyExecStatus) {
      elements.pyExecStatus.className = 'py-exec-status status-waiting';
      elements.pyExecStatus.innerText = 'รอค่า input() จากผู้ตรวจ';
    }
    const promptsHtml = (analysis.input_prompts || []).length > 0
      ? `<div style="margin-top:6px; color: var(--text-secondary);">ข้อความถามค่าในโค้ด: ${analysis.input_prompts.map(p => `<code>input("${escapeHtml(p)}")</code>`).join(', ')}</div>`
      : '';

    let savedNotebookHtml = '';
    if (fileObj.is_notebook && fileObj.notebook_info && (fileObj.notebook_info.saved_outputs || []).length > 0) {
      savedNotebookHtml = renderSavedNotebookOutputsHtml(fileObj.notebook_info.saved_outputs);
    }

    if (elements.pyOutputConsole) {
      elements.pyOutputConsole.innerHTML = `
        <div class="py-input-notice-card">
          <div class="py-input-notice-title">⌨️ โค้ดของนักเรียนมีการรับค่าด้วยคำสั่ง <code>input()</code> (${analysis.input_count || 1} จุด)</div>
          <p>คุณครูสามารถเลือกวิธีทดสอบรันโค้ดได้ 2 แบบ:</p>
          <ol>
            <li>พิมพ์ค่าทดสอบเตรียมไว้ในช่อง <strong>"ค่าป้อนเข้า input() (Stdin)"</strong> ด้านบน (1 บรรทัดต่อ 1 input) แล้วกดปุ่มรัน</li>
            <li>หรือกดปุ่มด้านล่างเพื่อรันและป้อนค่าทีละคำถามผ่านหน้าต่างป๊อปอัปได้ทันที</li>
          </ol>
          ${promptsHtml}
          <div style="margin-top: 12px;">
            <button type="button" class="btn btn-primary btn-sm" id="btnRunInteractiveNow">
              ▶️ รันโค้ดและป้อนค่า input() ทันที
            </button>
          </div>
        </div>
        ${savedNotebookHtml}
      `;
      const btnNow = document.getElementById('btnRunInteractiveNow');
      if (btnNow) {
        btnNow.addEventListener('click', () => runPythonCodeInStudio(true));
      }
    }
    return;
  }

  // รันโค้ดอัตโนมัติทันทีเพื่อพรีวิวผลลัพธ์!
  runPythonCodeInStudio(false);
}

function syncPyEditorScroll() {
  if (!elements.pyCodeEditor) return;
  if (elements.pyEditorLineNumbers) {
    elements.pyEditorLineNumbers.scrollTop = elements.pyCodeEditor.scrollTop;
  }
  if (elements.pyCodeHighlight) {
    elements.pyCodeHighlight.scrollTop = elements.pyCodeEditor.scrollTop;
    elements.pyCodeHighlight.scrollLeft = elements.pyCodeEditor.scrollLeft;
  }
}

function updatePyEditorHighlight() {
  if (!elements.pyCodeEditor || !elements.pyCodeHighlightCode) return;
  const raw = elements.pyCodeEditor.value || '';
  // เพิ่มบรรทัดว่างปิดท้ายเมื่อลงท้ายด้วย \n เพื่อให้ความสูง scroll ของ <pre> ตรงกับ <textarea> เป๊ะ
  const highlighted = highlightPythonCode(raw) + (raw.endsWith('\n') ? '\n' : '');
  elements.pyCodeHighlightCode.innerHTML = highlighted;
  syncPyEditorScroll();
}

function updatePyEditorLineNumbers() {
  if (!elements.pyCodeEditor || !elements.pyEditorLineNumbers) return;
  const lineCount = (elements.pyCodeEditor.value || '').split('\n').length;
  const nums = [];
  for (let i = 1; i <= lineCount; i++) {
    nums.push(i);
  }
  elements.pyEditorLineNumbers.innerText = nums.join('\n');
  if (elements.pyEditorStats) {
    elements.pyEditorStats.innerText = `${lineCount} บรรทัด · แก้ไขโค้ดเพื่อทดสอบรันได้`;
  }
  updatePyEditorHighlight();
}

function renderPythonOopChips(analysis, oopSummary) {
  if (!elements.pyOopChipsBar) return;
  const classes = (analysis && analysis.classes) || [];
  const functions = (analysis && analysis.functions) || [];
  const chips = [];

  if (classes.length === 0 && (!oopSummary || !oopSummary.total_classes)) {
    chips.push(`<span class="oop-chip oop-chip-neutral">สคริปต์ทั่วไป (ไม่มี Class)</span>`);
  } else {
    classes.forEach(cls => {
      const baseText = cls.bases && cls.bases.length > 0 ? ` <span class="oop-chip-sub">(${escapeHtml(cls.bases.join(', '))})</span>` : '';
      chips.push(`<span class="oop-chip oop-chip-class" title="ประกาศที่บรรทัด ${cls.lineno}">class <strong>${escapeHtml(cls.name)}</strong>${baseText}</span>`);

      if (cls.attributes && cls.attributes.length > 0) {
        chips.push(`<span class="oop-chip oop-chip-attr" title="Instance Attributes">self.${cls.attributes.map(a => escapeHtml(a)).join(', self.')}</span>`);
      }

      if (cls.methods && cls.methods.length > 0) {
        const methodNames = cls.methods.map(m => `${escapeHtml(m.name)}()`).join(', ');
        chips.push(`<span class="oop-chip oop-chip-method" title="Methods ในคลาส ${escapeHtml(cls.name)}">${methodNames}</span>`);
      }
    });
  }

  if (functions.length > 0) {
    chips.push(`<span class="oop-chip oop-chip-func">def ${functions.map(f => `${escapeHtml(f.name)}()`).join(', ')}</span>`);
  }

  if (analysis && analysis.syntax_valid === false && analysis.syntax_error) {
    chips.push(`<span class="oop-chip oop-chip-error">❌ SyntaxError บรรทัด ${analysis.syntax_error.lineno || '?'}</span>`);
  }

  elements.pyOopChipsBar.innerHTML = chips.join('');
}

async function loadPyodideRuntime() {
  if (state.pyodideInstance) return state.pyodideInstance;
  if (state.pyodideLoadingPromise) return state.pyodideLoadingPromise;

  state.pyodideLoadingPromise = (async () => {
    if (typeof window.loadPyodide !== 'function') {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js';
        script.async = true;
        script.onload = resolve;
        script.onerror = () => reject(new Error('ไม่สามารถโหลดเอนจิน Python (Pyodide) จาก CDN ได้'));
        document.head.appendChild(script);
      });
    }
    const pyodide = await window.loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/',
    });
    state.pyodideInstance = pyodide;
    return pyodide;
  })();

  try {
    return await state.pyodideLoadingPromise;
  } catch (err) {
    state.pyodideLoadingPromise = null;
    throw err;
  }
}

async function runPythonCodeInStudio(allowInteractivePrompt = false) {
  const student = getCurrentStudent();
  if (!student || !elements.pyCodeEditor || !elements.pyOutputConsole) return;

  const codeToRun = elements.pyCodeEditor.value || '';
  const currentFilePath = state.pyCurrentFilePath || 'main.py';
  const fileObj = state.pyFilesMap[currentFilePath] || {};
  const stdinRaw = elements.pyStdinInput ? elements.pyStdinInput.value : '';

  if (elements.btnRunPython) elements.btnRunPython.disabled = true;
  if (elements.pyExecStatus) {
    elements.pyExecStatus.className = 'py-exec-status status-running';
    elements.pyExecStatus.innerText = state.pyodideInstance ? 'กำลังรันโค้ด...' : 'กำลังเตรียมเอนจิน Python ครั้งแรก...';
  }
  elements.pyOutputConsole.innerHTML = `
    <div class="py-console-loading">
      <div class="ai-analyzing-orb-wrap" style="width:52px; height:52px;">
        <div class="ai-orb-ring-outer"></div>
        <div class="ai-orb-ring-inner"></div>
        <div class="ai-orb-core" style="width:28px; height:28px; font-size:1rem;">🐍</div>
      </div>
      <div class="ai-analyzing-title" style="font-size:0.94rem;">
        ${state.pyodideInstance ? 'กำลังรันโค้ดและวิเคราะห์ผลลัพธ์การทำงาน...' : 'กำลังเตรียมเอนจิน Python (Pyodide WebAssembly)...'}
      </div>
      <div class="ai-analyzing-sub" style="font-size:0.78rem;">
        ${state.pyodideInstance ? 'ประมวลผลคำสั่ง Python · ตรวจสอบ Class, Object และดักจับ Output Console' : 'โหลดสภาพแวดล้อม Python ในเบราว์เซอร์ครั้งแรก (ใช้เวลาประมาณ 2–3 วินาที)'}
      </div>
      <div class="ai-shimmer-progress-track" style="max-width:300px;">
        <div class="ai-shimmer-progress-bar"></div>
      </div>
    </div>
  `;

  try {
    // 1. วิเคราะห์ AST ล่าสุดจากโค้ดใน Editor (เผื่อครูแก้ไขโค้ดทดลอง)
    try {
      const astRes = await fetch('/api/python/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeToRun, filename: currentFilePath }),
      });
      if (astRes.ok) {
        const astData = await astRes.json();
        renderPythonOopChips(astData, student.python_info ? student.python_info.oop_summary : {});
      }
    } catch (_) {
      // ไม่บังคับหากออฟไลน์
    }

    // 2. โหลด Pyodide Runtime
    const pyodide = await loadPyodideRuntime();

    // 3. จำลองไฟล์ทั้งหมดของโปรเจกต์ลงใน Virtual FileSystem ของ Pyodide (/home/pyodide/workspace)
    // เพื่อให้นักเรียนที่แยกคลาสไว้คนละไฟล์ (เช่น from student import Student) สามารถ import ข้ามไฟล์ได้จริง!
    const supportFiles = (student.python_info && student.python_info.support_files) || {};
    const workspaceFiles = { ...supportFiles, [currentFilePath]: codeToRun };

    window.__pyWorkspaceFiles = workspaceFiles;
    window.__pyEntryPath = currentFilePath;
    window.__pyUserCode = codeToRun;
    window.__pyStdinText = stdinRaw;
    window.__pyAllowInteractive = !!allowInteractivePrompt;
    window.__pyPromptInput = (promptMsg) => {
      const ans = window.prompt(promptMsg ? `${promptMsg}` : 'ป้อนค่า input() สำหรับโปรแกรม Python:', '');
      return ans === null ? '' : String(ans);
    };

    const rawResultJson = await pyodide.runPythonAsync(`
import sys, io, os, json, traceback, builtins, inspect
import js

workspace_root = "/home/pyodide/workspace"
os.makedirs(workspace_root, exist_ok=True)

# เขียนไฟล์ทั้งหมดในโปรเจกต์ของนักเรียนลงใน workspace
files_dict = js.window.__pyWorkspaceFiles.to_py()
for rel_path, content in files_dict.items():
    full_path = os.path.join(workspace_root, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(str(content))

entry_rel = str(js.window.__pyEntryPath)
entry_full = os.path.join(workspace_root, entry_rel)
entry_dir = os.path.dirname(entry_full) or workspace_root
os.chdir(entry_dir)

for p in [workspace_root, entry_dir]:
    if p in sys.path:
        sys.path.remove(p)
    sys.path.insert(0, p)

# ล้างโมดูลที่เคยถูก import จากโปรเจกต์ก่อนหน้า
for mod_name, mod_obj in list(sys.modules.items()):
    mod_file = getattr(mod_obj, "__file__", "") or ""
    if mod_file.startswith(workspace_root):
        del sys.modules[mod_name]

stdout_buf = io.StringIO()
stderr_buf = io.StringIO()
old_stdout, old_stderr = sys.stdout, sys.stderr
old_input = builtins.input

stdin_raw = str(js.window.__pyStdinText or "")
stdin_lines = stdin_raw.splitlines() if stdin_raw.strip() != "" else []
stdin_idx = 0
allow_interactive = bool(js.window.__pyAllowInteractive)

def custom_input(prompt=""):
    global stdin_idx
    prompt_str = str(prompt) if prompt is not None else ""
    if stdin_idx < len(stdin_lines):
        val = stdin_lines[stdin_idx]
        stdin_idx += 1
        print(f"{prompt_str}{val}")
        return val
    if allow_interactive:
        val = str(js.window.__pyPromptInput(prompt_str))
        print(f"{prompt_str}{val}")
        return val
    raise EOFError(f'โค้ดต้องการรับค่า input("{prompt_str}") เพิ่มเติม — กรุณาพิมพ์ค่าในช่อง Stdin ด้านบน หรือกดปุ่ม "รันโค้ด (Run)" เพื่อป้อนค่าผ่านป๊อปอัป')

sys.stdout = stdout_buf
sys.stderr = stderr_buf
builtins.input = custom_input

exec_globals = {"__name__": "__main__", "__file__": entry_full}
user_code = str(js.window.__pyUserCode)
exec_success = True
error_text = ""

try:
    compiled = compile(user_code, entry_rel, "exec")
    exec(compiled, exec_globals)
except Exception as e:
    exec_success = False
    tb_lines = traceback.format_exception(type(e), e, e.__traceback__)
    # กรองเฉพาะเฟรมของโค้ดนักเรียนเพื่อให้ครูอ่านง่าย
    filtered_tb = [line for line in tb_lines if "pyodide" not in line or entry_rel in line]
    error_text = "".join(filtered_tb if len(filtered_tb) > 1 else tb_lines)
finally:
    sys.stdout = old_stdout
    sys.stderr = old_stderr
    builtins.input = old_input

# สำรวจ Class และ Object Instances ที่ถูกสร้างขึ้นหลังรันโค้ดเสร็จ (สำหรับตรวจงานวิชา OOP)
defined_classes = []
created_objects = []

for var_name, val in list(exec_globals.items()):
    if var_name.startswith("__"):
        continue
    if inspect.isclass(val):
        mod_name = getattr(val, "__module__", "")
        if mod_name == "__main__" or mod_name in files_dict or any(rel.startswith(mod_name) for rel in files_dict):
            bases = [b.__name__ for b in val.__bases__ if b.__name__ != "object"]
            methods = [m for m, member in inspect.getmembers(val, predicate=inspect.isfunction) if not m.startswith("__") or m in ("__init__", "__str__", "__repr__")]
            defined_classes.append({
                "name": val.__name__,
                "bases": bases,
                "methods": methods,
            })

def inspect_single_instance(label, obj):
    cls = type(obj)
    cls_mod = getattr(cls, "__module__", "")
    if cls_mod in ("builtins", "types", "io", "sys", "os"):
        return None
    if not (cls_mod == "__main__" or hasattr(obj, "__dict__")):
        return None
    attrs = {}
    if hasattr(obj, "__dict__"):
        for k, v in obj.__dict__.items():
            try:
                attrs[str(k)] = repr(v)[:140]
            except Exception:
                attrs[str(k)] = "<ไม่สามารถแปลงค่าได้>"
    try:
        str_val = str(obj)[:180]
    except Exception:
        str_val = f"<{cls.__name__} object>"
    bases = [b.__name__ for b in cls.__bases__ if b.__name__ != "object"]
    return {
        "var_name": label,
        "class_name": cls.__name__,
        "bases": bases,
        "str_value": str_val,
        "attributes": attrs,
    }

for var_name, val in list(exec_globals.items()):
    if var_name.startswith("_") or inspect.isclass(val) or inspect.ismodule(val) or inspect.isfunction(val):
        continue
    inst_info = inspect_single_instance(var_name, val)
    if inst_info:
        created_objects.append(inst_info)
    elif isinstance(val, (list, tuple)):
        for idx, elem in enumerate(val[:12]):
            sub_info = inspect_single_instance(f"{var_name}[{idx}]", elem)
            if sub_info:
                created_objects.append(sub_info)

json.dumps({
    "success": exec_success,
    "stdout": stdout_buf.getvalue(),
    "stderr": stderr_buf.getvalue(),
    "error": error_text,
    "defined_classes": defined_classes,
    "created_objects": created_objects[:24],
})
    `);

    const execResult = JSON.parse(rawResultJson);
    renderPythonExecutionOutput(execResult, fileObj);
  } catch (err) {
    if (elements.pyExecStatus) {
      elements.pyExecStatus.className = 'py-exec-status status-error';
      elements.pyExecStatus.innerText = 'รันไม่สำเร็จ';
    }
    let fallbackHtml = `
      <div class="py-console-error-box">
        <div class="py-console-error-title">⚠️ ไม่สามารถรันโค้ดในเบราว์เซอร์ได้: ${escapeHtml(err.message || String(err))}</div>
      </div>
    `;
    if (fileObj.is_notebook && fileObj.notebook_info && (fileObj.notebook_info.saved_outputs || []).length > 0) {
      fallbackHtml += renderSavedNotebookOutputsHtml(fileObj.notebook_info.saved_outputs);
    }
    elements.pyOutputConsole.innerHTML = fallbackHtml;
  } finally {
    if (elements.btnRunPython) elements.btnRunPython.disabled = false;
  }
}

function renderPythonExecutionOutput(result, fileObj) {
  if (!elements.pyOutputConsole) return;

  if (elements.pyExecStatus) {
    if (result.success) {
      elements.pyExecStatus.className = 'py-exec-status status-ok';
      elements.pyExecStatus.innerText = '✓ รันสำเร็จ';
    } else {
      elements.pyExecStatus.className = 'py-exec-status status-error';
      elements.pyExecStatus.innerText = 'พบ Runtime Error';
    }
  }

  const parts = [];

  // 1. แสดงผลลัพธ์จาก print() / Standard Output
  const hasStdout = result.stdout && result.stdout.length > 0;
  parts.push(`
    <div class="py-output-section">
      <div class="py-output-section-header">
        <span>🖥️ ผลลัพธ์การทำงาน (Standard Output / print)</span>
      </div>
      ${
        hasStdout
          ? `<pre class="py-console-pre">${escapeHtml(result.stdout)}</pre>`
          : `<div class="py-console-empty-msg">ไม่มีข้อความที่ถูกสั่งพิมพ์ผ่าน <code>print()</code></div>`
      }
    </div>
  `);

  // 2. หากมี Error หรือ Warning
  if (result.stderr && result.stderr.trim()) {
    parts.push(`
      <div class="py-output-section">
        <div class="py-output-section-header" style="color: #fbbf24;">⚠️ Standard Error</div>
        <pre class="py-console-pre warn-text">${escapeHtml(result.stderr)}</pre>
      </div>
    `);
  }

  if (!result.success && result.error) {
    const isInputEof = result.error.includes('EOFError');
    parts.push(`
      <div class="py-console-error-box">
        <div class="py-console-error-title">${isInputEof ? '⌨️ โปรแกรมต้องการค่า input() เพิ่มเติม' : '❌ ข้อผิดพลาดขณะรันโปรแกรม (Exception / Traceback)'}</div>
        <pre class="py-console-pre error-text">${escapeHtml(result.error)}</pre>
        ${
          isInputEof
            ? `<button type="button" class="btn btn-primary btn-sm" id="btnRetryInteractiveInput" style="margin-top:8px;">▶️ คลิกเพื่อรันใหม่และป้อนค่าผ่านป๊อปอัป</button>`
            : ''
        }
      </div>
    `);
  }

  // 3. ตารางตรวจสอบอ็อบเจกต์ OOP ที่ถูกสร้างขึ้นในหน่วยความจำ (OOP Object Instance Inspector)
  const objects = result.created_objects || [];
  if (objects.length > 0) {
    const objCards = objects.map(obj => {
      const attrEntries = Object.entries(obj.attributes || {});
      const attrsHtml = attrEntries.length > 0
        ? `<div class="py-obj-attrs-grid">
            ${attrEntries.map(([k, v]) => `
              <div class="py-obj-attr-item">
                <span class="py-obj-attr-key">self.${escapeHtml(k)}</span>
                <span class="py-obj-attr-val">${escapeHtml(v)}</span>
              </div>
            `).join('')}
          </div>`
        : `<div class="py-obj-no-attrs">ไม่มี Instance Attributes (<code>self.__dict__</code> ว่าง)</div>`;

      const baseBadge = obj.bases && obj.bases.length > 0
        ? `<span class="py-obj-base-badge">สืบทอดจาก ${escapeHtml(obj.bases.join(', '))}</span>`
        : '';

      return `
        <div class="py-obj-card">
          <div class="py-obj-card-head">
            <div>
              <span class="py-obj-var">${escapeHtml(obj.var_name)}</span>
              <span class="py-obj-arrow">:</span>
              <span class="py-obj-class">${escapeHtml(obj.class_name)}</span>
            </div>
            ${baseBadge}
          </div>
          ${attrsHtml}
        </div>
      `;
    }).join('');

    parts.push(`
      <div class="py-output-section">
        <div class="py-output-section-header">
          <span>🧬 อ็อบเจกต์ OOP ที่ถูกสร้างหลังรันโค้ด (${objects.length} อ็อบเจกต์)</span>
        </div>
        <div class="py-obj-inspector-list">
          ${objCards}
        </div>
      </div>
    `);
  }

  // 4. หากเป็นไฟล์ Jupyter Notebook (.ipynb) ที่มีผลลัพธ์บันทึกติดมากับไฟล์ ให้แสดงเปรียบเทียบด้วย
  if (fileObj && fileObj.is_notebook && fileObj.notebook_info && (fileObj.notebook_info.saved_outputs || []).length > 0) {
    parts.push(renderSavedNotebookOutputsHtml(fileObj.notebook_info.saved_outputs));
  }

  elements.pyOutputConsole.innerHTML = parts.join('');

  const btnRetry = document.getElementById('btnRetryInteractiveInput');
  if (btnRetry) {
    btnRetry.addEventListener('click', () => runPythonCodeInStudio(true));
  }
}

function renderSavedNotebookOutputsHtml(savedOutputs) {
  const items = savedOutputs.map(item => `
    <div class="py-nb-saved-item">
      <div class="py-nb-cell-label">Cell [${item.cell_index}]:</div>
      <pre class="py-console-pre">${escapeHtml(item.output)}</pre>
    </div>
  `).join('');

  return `
    <div class="py-output-section">
      <div class="py-output-section-header">
        <span>📓 ผลลัพธ์ที่บันทึกติดมากับไฟล์ Jupyter Notebook (.ipynb)</span>
      </div>
      ${items}
    </div>
  `;
}

async function loadFileTreeForStudent(student) {
  if (!student.owner || !student.repo) return;
  try {
    let treeData = [];
    const isLocalWithTree = (student.source_type === 'upload' || student.owner === 'local-upload')
      && student.local_bundle
      && Array.isArray(student.local_bundle.tree)
      && student.local_bundle.tree.length > 0;

    if (isLocalWithTree) {
      treeData = student.local_bundle.tree;
    } else {
      const res = await fetch(`/api/files/tree/${student.owner}/${student.repo}`);
      if (res.ok) {
        const data = await res.json();
        treeData = data.tree || [];
      } else if (student.local_bundle && student.local_bundle.tree) {
        treeData = student.local_bundle.tree;
      } else {
        const pyFiles = getStudentPythonFilesList(student);
        if (pyFiles.length > 0) {
          treeData = pyFiles.map(f => ({
            name: f.name || f.path || 'main.py',
            path: f.path || f.name || 'main.py',
            type: 'file',
            file_type: 'text',
            extension: 'py',
          }));
        }
      }
    }

    state.fileTree = treeData;
    renderFileTree(state.fileTree);

    // เปิด index.html หรือไฟล์โค้ดแรกอัตโนมัติ
    const firstText = findFirstTextFile(state.fileTree);
    if (firstText) {
      openFileContent(student.owner, student.repo, firstText.path);
    } else {
      elements.codeContentWrap.innerHTML = `<div class="code-placeholder">เลือกไฟล์จากรายการด้านซ้ายเพื่อเปิดดูเนื้อหา</div>`;
      elements.activeFilePath.innerText = 'ยังไม่ได้เลือกไฟล์';
      elements.activeFileStats.innerText = '';
    }
  } catch (err) {
    console.error('Error fetching file tree:', err);
  }
}

async function loadInspectForStudent(student) {
  if (!student.owner || !student.repo) return;
  try {
    let data = null;
    const isLocalWithInspect = (student.source_type === 'upload' || student.owner === 'local-upload')
      && student.local_bundle
      && student.local_bundle.inspect;

    if (isLocalWithInspect) {
      data = student.local_bundle.inspect;
    } else {
      const res = await fetch(`/api/inspect/${student.owner}/${student.repo}`);
      if (res.ok) {
        data = await res.json();
      } else if (student.local_bundle && student.local_bundle.inspect) {
        data = student.local_bundle.inspect;
      }
    }

    if (data) {
      state.inspectData = data;
      student.observations = data.observations || [];
      if (data.python_info) student.python_info = data.python_info;
      if (data.ai_analysis) student.ai_analysis = data.ai_analysis;
      updateAiRiskBadge(student);
      updateObservationsBadge(student);
      syncActiveCourseState();
      if (state.activeTab === 'inspect') {
        renderInspectTab(student);
      }
    }
  } catch (err) {
    console.error('Error loading inspect data:', err);
  }
}

function updateAiRiskBadge(student) {
  const badge = elements.aiRiskBadge || document.getElementById('aiRiskBadge');
  if (!badge) return;

  const ai = student && (student.ai_analysis || (student.local_bundle && student.local_bundle.inspect && student.local_bundle.inspect.ai_analysis));
  if (!ai || typeof ai.ai_score !== 'number') {
    badge.className = 'badge badge-subtle';
    badge.innerText = '🤖 AI';
    badge.title = 'รอผลวิเคราะห์โอกาสใช้ AI เขียนโค้ด';
    return;
  }

  const score = ai.ai_score;
  if (score >= 65) {
    badge.className = 'badge badge-ai-high';
    badge.innerText = `🤖 ${score}%`;
    badge.title = `โอกาสใช้ AI: ${score}% (สูง) - คลิกเพื่อดูรายละเอียด`;
  } else if (score >= 35) {
    badge.className = 'badge badge-ai-medium';
    badge.innerText = `🤖 ${score}%`;
    badge.title = `โอกาสใช้ AI: ${score}% (ปานกลาง) - คลิกเพื่อดูรายละเอียด`;
  } else {
    badge.className = 'badge badge-ai-low';
    badge.innerText = `🤖 ${score}%`;
    badge.title = `โอกาสใช้ AI: ${score}% (ต่ำ) - คลิกเพื่อดูรายละเอียด`;
  }
}

function computePeerSimilarities(currentStudent) {
  const curAi = currentStudent && (currentStudent.ai_analysis || (currentStudent.local_bundle && currentStudent.local_bundle.inspect && currentStudent.local_bundle.inspect.ai_analysis));
  const curTokens = (curAi && curAi.fingerprint) || [];
  if (curTokens.length < 12) return [];

  const buildCounts = (arr) => {
    const map = {};
    arr.forEach(t => {
      map[t] = (map[t] || 0) + 1;
    });
    return map;
  };

  const curCounts = buildCounts(curTokens);
  const matches = [];

  state.students.forEach(other => {
    if (!other || other.key === currentStudent.key) return;
    const otherAi = other.ai_analysis || (other.local_bundle && other.local_bundle.inspect && other.local_bundle.inspect.ai_analysis);
    const otherTokens = (otherAi && otherAi.fingerprint) || [];
    if (otherTokens.length < 12) return;

    const otherCounts = buildCounts(otherTokens);
    let intersection = 0;
    Object.keys(curCounts).forEach(k => {
      if (otherCounts[k]) {
        intersection += Math.min(curCounts[k], otherCounts[k]);
      }
    });

    const diceSim = Math.round((2 * intersection * 100) / (curTokens.length + otherTokens.length));
    if (diceSim >= 65) {
      matches.push({
        student_name: other.student_name,
        repo: other.owner ? `${other.owner}/${other.repo}` : other.raw_input,
        similarity: diceSim,
      });
    }
  });

  return matches.sort((a, b) => b.similarity - a.similarity).slice(0, 4);
}

function updateObservationsBadge(student) {
  const missingCount = (student.observations || []).filter(o => o.category === 'missing_file' || o.category === 'python_syntax').length;
  const consoleErrCount = (student.console_logs || []).filter(l => l.type === 'error').length;
  const netErrCount = (student.network_errors || []).length;
  const ai = student && (student.ai_analysis || (student.local_bundle && student.local_bundle.inspect && student.local_bundle.inspect.ai_analysis));
  const aiFlag = ai && ai.ai_score >= 65 ? 1 : 0;
  const totalIssues = missingCount + consoleErrCount + netErrCount + aiFlag;

  if (totalIssues > 0) {
    elements.inspectBadgeCount.style.display = 'inline-block';
    elements.inspectBadgeCount.innerText = totalIssues;
  } else {
    elements.inspectBadgeCount.style.display = 'none';
  }
}

// -------------------------------------------------------------
// Navigation (Prev / Next)
// -------------------------------------------------------------
function navigatePrev() {
  if (state.students.length === 0) return;
  let nextIdx = state.currentIndex - 1;
  if (nextIdx < 0) nextIdx = state.students.length - 1;
  selectStudent(nextIdx);
}

function navigateNext() {
  if (state.students.length === 0) return;
  let nextIdx = state.currentIndex + 1;
  if (nextIdx >= state.students.length) nextIdx = 0;
  selectStudent(nextIdx);
}

function getCurrentStudent() {
  if (state.currentIndex >= 0 && state.currentIndex < state.students.length) {
    return state.students[state.currentIndex];
  }
  return null;
}

// -------------------------------------------------------------
// Viewed & Notes Storage
// -------------------------------------------------------------
const STUDENT_REVIEWS_STORAGE_KEY = 'repo_previewer_student_reviews_v1';

function loadLocalStudentReviewsMap() {
  try {
    const raw = localStorage.getItem(STUDENT_REVIEWS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object') ? parsed : {};
  } catch (e) {
    return {};
  }
}

function getStudentReviewStorageKeys(student, courseId = '') {
  if (!student) return [];
  const cid = courseId || state.activeCourseId || 'default';
  const keys = [];
  if (student.key) keys.push(String(student.key).toLowerCase());
  if (student.owner && student.repo) {
    keys.push(`${student.owner}/${student.repo}`.toLowerCase());
  }
  if (student.source_type === 'upload' || student.owner === 'local-upload') {
    const rawFile = (student.raw_input || '').replace(/^\[ไฟล์(?:อัปโหลด)?\]\s*/i, '').trim().toLowerCase();
    const stuName = (student.student_name || '').trim().toLowerCase();
    if (rawFile) keys.push(`upload::${cid}::file::${rawFile}`);
    if (stuName) keys.push(`upload::${cid}::name::${stuName}`);
  }
  return Array.from(new Set(keys));
}

function persistLocalStudentReview(student, courseId = '') {
  if (!student) return;
  try {
    const map = loadLocalStudentReviewsMap();
    const entry = {
      viewed: !!student.viewed,
      note: student.note || '',
      teacher_comment: student.teacher_comment || '',
      saved_score_at: student.saved_score_at || null,
      confirmed_exam_set: student.confirmed_exam_set || null,
      assignment_evaluation: student.assignment_evaluation || null,
      updated_at: Date.now(),
    };
    getStudentReviewStorageKeys(student, courseId).forEach(k => {
      map[k] = entry;
    });
    localStorage.setItem(STUDENT_REVIEWS_STORAGE_KEY, JSON.stringify(map));
  } catch (e) {}
}

function hydrateStudentReviewState(student, courseId = '') {
  if (!student) return;
  const map = loadLocalStudentReviewsMap();
  const keys = getStudentReviewStorageKeys(student, courseId);
  for (const k of keys) {
    const saved = map[k];
    if (saved && typeof saved === 'object') {
      if (saved.viewed) student.viewed = true;
      if (!student.note && saved.note) student.note = saved.note;
      if (saved.teacher_comment && !student.teacher_comment) {
        student.teacher_comment = saved.teacher_comment;
      }
      if (saved.saved_score_at && !student.saved_score_at) {
        student.saved_score_at = saved.saved_score_at;
      }
      if (saved.confirmed_exam_set && !student.confirmed_exam_set) {
        student.confirmed_exam_set = saved.confirmed_exam_set;
        student.preferred_exam_set = saved.confirmed_exam_set;
      }
      if (saved.assignment_evaluation && !student.assignment_evaluation) {
        student.assignment_evaluation = saved.assignment_evaluation;
      }
      break;
    }
  }
}

async function handleViewedToggle(index, viewed) {
  if (index < 0 || index >= state.students.length) return;
  const student = state.students[index];
  student.viewed = !!viewed;

  if (index === state.currentIndex && elements.checkViewed) {
    elements.checkViewed.checked = !!viewed;
  }

  persistLocalStudentReview(student);
  syncActiveCourseState();
  renderCourseSelect();
  updateStudentItemCard(student);
  updateViewedStats();
  await saveStudentReview(student.owner, student.repo, !!viewed, null);
}

async function saveStudentReview(owner, repo, viewed, note, teacherComment = undefined, evaluation = undefined) {
  syncActiveCourseState();
  if (!owner || !repo) return;
  try {
    const payload = {};
    if (viewed !== null && viewed !== undefined) payload.viewed = viewed;
    if (note !== null && note !== undefined) payload.note = note;
    if (teacherComment !== undefined) payload.teacher_comment = teacherComment;
    if (evaluation !== undefined) payload.evaluation = evaluation;

    await fetch(`/api/reviews/${owner}/${repo}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (elements.noteSaveIndicator) {
      elements.noteSaveIndicator.classList.add('show');
      setTimeout(() => elements.noteSaveIndicator.classList.remove('show'), 1500);
    }
  } catch (err) {
    console.error('Error saving review data:', err);
  }
}

// -------------------------------------------------------------
// Reload Single Repo & Clear Cache
// -------------------------------------------------------------
async function handleReloadCurrentRepo() {
  const student = getCurrentStudent();
  if (!student || student.source_type === 'upload') return;

  elements.btnReloadCurrentRepo.disabled = true;
  student.status = 'loading';
  student.loadingMessage = 'กำลังโหลดใหม่จาก GitHub...';
  updateStudentItemCard(student);

  try {
    const res = await fetch('/api/repos/fetch-single', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        owner: student.owner,
        repo: student.repo,
        student_name: student.student_name,
        force_refresh: true,
      }),
    });
    const data = await res.json();
    if (data.success) {
      student.status = 'ready';
      student.meta = data.data.meta || {};
      selectStudent(state.currentIndex);
    } else {
      student.status = 'error';
      student.error_message = data.error_message || 'ดาวน์โหลดไม่สำเร็จ';
      selectStudent(state.currentIndex);
    }
  } catch (err) {
    alert('เกิดข้อผิดพลาดในการโหลดใหม่: ' + err.message);
  } finally {
    elements.btnReloadCurrentRepo.disabled = false;
  }
}

async function handleDeleteStudent(index) {
  if (index < 0 || index >= state.students.length) return;
  const student = state.students[index];
  student._deleted = true;

  // 1. ลบออกจากรายการใน state
  state.students.splice(index, 1);

  // 2. อัปเดตข้อความในช่องนำเข้าลิงก์ให้ตรงกับรายการที่เหลืออยู่
  if (elements.bulkLinksTextarea) {
    elements.bulkLinksTextarea.value = state.students
      .filter(s => s.source_type !== 'upload')
      .map(s => s.raw_input)
      .join('\n');
    updateParsedStats();
  }

  syncActiveCourseState();
  renderCourseSelect();

  // 3. ปรับปรุงรายการที่กำลังเลือกดูอยู่ (currentIndex) และอัปเดต UI
  if (state.students.length === 0) {
    state.currentIndex = -1;
    elements.studentWorkspace.style.display = 'none';
    if (elements.topWorkspaceBar) elements.topWorkspaceBar.style.display = 'none';
    if (elements.sidebarActiveMeta) elements.sidebarActiveMeta.style.display = 'none';
    elements.blankState.style.display = 'flex';
    if (elements.previewIframe) elements.previewIframe.src = 'about:blank';
    renderStudentsList();
    updateViewedStats();
  } else if (index === state.currentIndex) {
    const nextIdx = Math.min(index, state.students.length - 1);
    renderStudentsList();
    updateViewedStats();
    selectStudent(nextIdx);
  } else {
    if (index < state.currentIndex) {
      state.currentIndex -= 1;
    }
    elements.navCounterText.innerText = `${state.currentIndex + 1} / ${state.students.length}`;
    renderStudentsList();
    updateViewedStats();
  }

  // 4. ส่งคำสั่งลบแคชและปิดเซิร์ฟเวอร์ของ repo รายบุคคลไปยัง Backend
  const stillUsed = state.students.some(s => s.key === student.key);
  if (student.owner && student.repo && !stillUsed) {
    try {
      await fetch('/api/cache/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: student.owner,
          repo: student.repo,
        }),
      });
    } catch (err) {
      console.error('Error deleting single repo cache:', err);
    }
  }
}

async function handleClearAllCache() {
  if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการล้างรายการงานในวิชานี้และแคชไฟล์ในเครื่อง?')) {
    return;
  }

  try {
    const res = await fetch('/api/cache/clear', { method: 'POST' });
    const data = await res.json();
    alert(`ล้างข้อมูลเรียบร้อยแล้ว (ลบแคช ${data.deleted_repos_count} รายการ)`);
    // ล้างรายการของวิชาปัจจุบันและรีเซ็ตหน้าจอ
    state.students = [];
    state.currentIndex = -1;
    if (elements.bulkLinksTextarea) {
      elements.bulkLinksTextarea.value = '';
      updateParsedStats();
    }
    syncActiveCourseState();
    renderCourseSelect();
    renderStudentsList();
    updateViewedStats();
    elements.studentWorkspace.style.display = 'none';
    if (elements.topWorkspaceBar) elements.topWorkspaceBar.style.display = 'none';
    if (elements.sidebarActiveMeta) elements.sidebarActiveMeta.style.display = 'none';
    elements.blankState.style.display = 'flex';
    if (elements.previewIframe) elements.previewIframe.src = 'about:blank';
  } catch (err) {
    alert('เกิดข้อผิดพลาดในการล้างแคช: ' + err.message);
  }
}

// -------------------------------------------------------------
// Tabs & Device Switcher
// -------------------------------------------------------------
function switchTab(tabName) {
  state.activeTab = tabName;
  elements.tabButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  Object.keys(elements.tabPanes).forEach(name => {
    elements.tabPanes[name].classList.toggle('active', name === tabName);
  });

  // แสดง/ซ่อน toolbar สำหรับ preview (เฉพาะโปรเจกต์เว็บเท่านั้น)
  const currentStudent = getCurrentStudent();
  const showWebTools = tabName === 'preview' && (!currentStudent || currentStudent.has_web);
  if (elements.previewToolbar) {
    elements.previewToolbar.style.display = showWebTools ? 'flex' : 'none';
  }

  if (tabName === 'inspect') {
    const student = getCurrentStudent();
    if (student) renderInspectTab(student);
  } else if (tabName === 'scores') {
    renderScoresMenuTab();
  }
}

function setDeviceMode(device) {
  state.deviceMode = device;
  elements.deviceButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.device === device);
  });

  if (elements.iframeContainer) {
    elements.iframeContainer.className = `iframe-container device-${device}`;
  }
}

// -------------------------------------------------------------
// File Tree & Code Viewer
// -------------------------------------------------------------
function renderFileTree(nodes, container = elements.fileTreeContent, depth = 0) {
  if (depth === 0) container.innerHTML = '';

  nodes.forEach(node => {
    const nodeEl = document.createElement('div');

    if (node.type === 'directory') {
      const folderHeader = document.createElement('div');
      folderHeader.className = 'tree-node folder';
      folderHeader.style.paddingLeft = `${12 + depth * 14}px`;
      folderHeader.innerHTML = `
        <span class="folder-arrow">▼</span>
        <span>📁</span>
        <span>${escapeHtml(node.name)}</span>
      `;

      const childrenContainer = document.createElement('div');
      childrenContainer.className = 'tree-folder-children';

      folderHeader.addEventListener('click', () => {
        const isCollapsed = childrenContainer.classList.toggle('collapsed');
        folderHeader.querySelector('.folder-arrow').innerText = isCollapsed ? '▶' : '▼';
      });

      nodeEl.appendChild(folderHeader);
      nodeEl.appendChild(childrenContainer);
      renderFileTree(node.children || [], childrenContainer, depth + 1);
    } else {
      const fileRow = document.createElement('div');
      fileRow.className = `tree-node file ${state.activeFilePath === node.path ? 'active' : ''}`;
      fileRow.style.paddingLeft = `${16 + depth * 14}px`;
      
      let icon = '📄';
      if (node.file_type === 'image') icon = '🖼️';
      else if (node.extension === 'py') icon = '🐍';
      else if (node.extension === 'ipynb') icon = '📓';
      else if (node.extension === 'html' || node.extension === 'htm') icon = '🌐';
      else if (node.extension === 'css') icon = '🎨';
      else if (node.extension === 'js') icon = '⚡';
      else if (node.extension === 'json' || node.extension === 'csv') icon = '📋';
      else if (node.extension === 'md') icon = '📝';

      fileRow.innerHTML = `
        <span>${icon}</span>
        <span>${escapeHtml(node.name)}</span>
      `;

      fileRow.addEventListener('click', () => {
        document.querySelectorAll('.tree-node.file').forEach(el => el.classList.remove('active'));
        fileRow.classList.add('active');
        const cur = getCurrentStudent();
        if (cur) openFileContent(cur.owner, cur.repo, node.path);
      });

      nodeEl.appendChild(fileRow);
    }

    container.appendChild(nodeEl);
  });
}

function findFirstTextFile(nodes) {
  for (const node of nodes) {
    if (node.type === 'file' && (node.name.toLowerCase() === 'index.html' || node.extension === 'py' || node.file_type === 'text')) {
      return node;
    }
    if (node.type === 'directory' && node.children) {
      const found = findFirstTextFile(node.children);
      if (found) return found;
    }
  }
  return null;
}

function findLocalStudentFileContent(student, relPath) {
  if (!student || !relPath) return undefined;
  const pyFiles = getStudentPythonFilesList(student);
  const matchedFile = pyFiles.find(f => f && (f.path === relPath || f.name === relPath));
  if (matchedFile && typeof matchedFile.content === 'string') {
    return matchedFile.content;
  }
  const pyInfo = student.python_info
    || (student.local_bundle && student.local_bundle.python_info)
    || (student.local_bundle && student.local_bundle.inspect && student.local_bundle.inspect.python_info);
  if (pyInfo && pyInfo.support_files && pyInfo.support_files[relPath] !== undefined) {
    return pyInfo.support_files[relPath];
  }
  return undefined;
}

async function openFileContent(owner, repo, relPath) {
  state.activeFilePath = relPath;
  elements.activeFilePath.innerText = relPath;
  elements.codeContentWrap.innerHTML = `<div class="code-placeholder">กำลังเปิดอ่านไฟล์...</div>`;

  try {
    const cur = getCurrentStudent();
    if (owner === 'local-upload' && cur) {
      const localContent = findLocalStudentFileContent(cur, relPath);
      if (localContent !== undefined) {
        const ext = (relPath.split('.').pop() || '').toLowerCase();
        elements.activeFileIcon.innerText = ext === 'py' ? '🐍' : '📄';
        elements.activeFileStats.innerText = `${localContent.split('\n').length} บรรทัด • utf-8`;
        renderSyntaxCode(localContent, ext);
        return;
      }
    }

    const res = await fetch(`/api/files/content/${owner}/${repo}?path=${encodeURIComponent(relPath)}`);
    if (!res.ok) {
      // Fallback กรณีไฟล์อัปโหลดถูกเก็บไว้ในหน่วยความจำของ client (local_bundle / support_files)
      const supportContent = findLocalStudentFileContent(cur, relPath);
      if (supportContent !== undefined) {
        const ext = (relPath.split('.').pop() || '').toLowerCase();
        elements.activeFileIcon.innerText = ext === 'py' ? '🐍' : '📄';
        elements.activeFileStats.innerText = `${supportContent.split('\n').length} บรรทัด • utf-8`;
        renderSyntaxCode(supportContent, ext);
        return;
      }
    }

    const data = await res.json();

    if (data.error) {
      elements.codeContentWrap.innerHTML = `<div class="code-placeholder" style="color: var(--color-error);">${escapeHtml(data.error)}</div>`;
      return;
    }

    elements.activeFileStats.innerText = `${formatFileSize(data.size || 0)} ${data.lines ? `• ${data.lines} บรรทัด` : ''} • ${data.encoding || ''}`;

    if (data.type === 'image') {
      elements.activeFileIcon.innerText = '🖼️';
      elements.codeContentWrap.innerHTML = `
        <div class="image-preview-box">
          <img src="${data.data_url}" alt="${escapeHtml(data.name)}">
          <div class="image-info">${escapeHtml(data.name)} (${formatFileSize(data.size)})</div>
        </div>
      `;
    } else if (data.type === 'text') {
      elements.activeFileIcon.innerText = data.extension === 'py' ? '🐍' : '📄';
      renderSyntaxCode(data.content || '', data.extension);
    } else {
      elements.activeFileIcon.innerText = '📦';
      elements.codeContentWrap.innerHTML = `
        <div class="code-placeholder">
          ${escapeHtml(data.message || 'ไฟล์ไบนารี ไม่สามารถแสดงเป็นข้อความได้')}
        </div>
      `;
    }
  } catch (err) {
    elements.codeContentWrap.innerHTML = `<div class="code-placeholder" style="color: var(--color-error);">เกิดข้อผิดพลาดในการโหลดไฟล์</div>`;
  }
}

function renderSyntaxCode(content, ext) {
  const lines = content.split('\n');
  const lineNumbersHtml = lines.map((_, i) => i + 1).join('\n');
  const highlighted = highlightSyntax(content, ext);

  elements.codeContentWrap.innerHTML = `
    <table class="code-viewer-table">
      <tr>
        <td class="line-numbers">${lineNumbersHtml}</td>
        <td class="code-text-cell">${highlighted}</td>
      </tr>
    </table>
  `;
}

/**
 * Lightweight safe syntax highlighter สำหรับ HTML, CSS, JS, Python, JSON
 */
/**
 * Single-pass Python syntax highlighter พร้อมเส้นนำระดับย่อหน้า (Indentation Guides)
 * คงจำนวนตัวอักษรและระยะห่างตรงกับโค้ดต้นฉบับของนักเรียน 100%
 */
function highlightPythonCode(rawCode) {
  const normalized = String(rawCode || '').replace(/\r\n/g, '\n');
  const tokenRegex = /([furbFURB]{0,2}(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'))|(#[^\n]*)|(@[A-Za-z_]\w*)|\b(class|def)\b([ \t]+)([A-Za-z_]\w*)|\b(if|elif|else|for|while|in|return|import|from|as|try|except|finally|raise|with|pass|break|continue|and|or|not|is|lambda|yield|global|nonlocal|assert|del|async|await|match|case)\b|\b(True|False|None)\b|\b(self|cls)\b|\b(print|input|int|float|str|bool|list|dict|set|tuple|len|range|sum|min|max|abs|round|type|isinstance|issubclass|super|open|enumerate|zip|map|filter|sorted|reversed|format|chr|ord|hex|bin|oct|pow|divmod|any|all|dir|id|vars)\b|\b([A-Za-z_]\w*)(?=\s*\()|\b(\d+(?:\.\d+)?)\b|(==|!=|<=|>=|->|\+=|-=|\*=|\/=|\/\/|\*\*|[+\-*/%=<>:&|^~])/g;

  const lines = normalized.split('\n');
  return lines.map(line => {
    // 1. คงและตกแต่ง Indentation ด้านหน้า (ทั้ง Space 4 ช่อง และ Tab) โดยไม่เปลี่ยนความกว้างตัวอักษร
    const indentMatch = line.match(/^([ \t]+)/);
    let indentHtml = '';
    let body = line;
    if (indentMatch) {
      const ws = indentMatch[1];
      body = line.slice(ws.length);
      indentHtml = ws.replace(/( {4}|\t)/g, '<span class="tok-indent">$1</span>');
    }

    // 2. ระบายสีโค้ดแบบ Single-Pass Tokenizer (ไม่ทับซ้อนภายใน string หรือ comment)
    let out = '';
    let lastIdx = 0;
    tokenRegex.lastIndex = 0;
    let m;
    while ((m = tokenRegex.exec(body)) !== null) {
      if (m.index > lastIdx) {
        out += escapeHtml(body.slice(lastIdx, m.index));
      }
      if (m[1] !== undefined) {
        out += `<span class="tok-str">${escapeHtml(m[1])}</span>`;
      } else if (m[2] !== undefined) {
        out += `<span class="tok-comment">${escapeHtml(m[2])}</span>`;
      } else if (m[3] !== undefined) {
        out += `<span class="tok-decorator">${escapeHtml(m[3])}</span>`;
      } else if (m[4] !== undefined) {
        out += `<span class="tok-kw">${escapeHtml(m[4])}</span>${escapeHtml(m[5])}<span class="tok-def">${escapeHtml(m[6])}</span>`;
      } else if (m[7] !== undefined) {
        out += `<span class="tok-kw">${escapeHtml(m[7])}</span>`;
      } else if (m[8] !== undefined) {
        out += `<span class="tok-const">${escapeHtml(m[8])}</span>`;
      } else if (m[9] !== undefined) {
        out += `<span class="tok-self">${escapeHtml(m[9])}</span>`;
      } else if (m[10] !== undefined) {
        out += `<span class="tok-builtin">${escapeHtml(m[10])}</span>`;
      } else if (m[11] !== undefined) {
        out += `<span class="tok-func">${escapeHtml(m[11])}</span>`;
      } else if (m[12] !== undefined) {
        out += `<span class="tok-num">${escapeHtml(m[12])}</span>`;
      } else if (m[13] !== undefined) {
        out += `<span class="tok-op">${escapeHtml(m[13])}</span>`;
      }
      lastIdx = tokenRegex.lastIndex;
    }
    if (lastIdx < body.length) {
      out += escapeHtml(body.slice(lastIdx));
    }

    return indentHtml + out;
  }).join('\n');
}

function highlightSyntax(rawCode, ext) {
  if (ext === 'py') {
    return highlightPythonCode(rawCode);
  }

  let escaped = escapeHtml(rawCode);

  if (ext === 'html' || ext === 'htm') {
    // HTML Tags and attributes
    escaped = escaped.replace(/(&lt;\/?[a-zA-Z0-9\-]+)(\s|&gt;)/g, '<span style="color: #7ee787;">$1</span>$2');
    escaped = escaped.replace(/([a-zA-Z\-]+)=(&quot;.*?&quot;|&#39;.*?&#39;)/g, '<span style="color: #79c0ff;">$1</span>=<span style="color: #a5d6ff;">$2</span>');
    escaped = escaped.replace(/(&lt;!--[\s\S]*?--&gt;)/g, '<span style="color: #8b949e; font-style: italic;">$1</span>');
  } else if (ext === 'css') {
    escaped = escaped.replace(/([a-zA-Z\-]+)\s*:/g, '<span style="color: #7ee787;">$1</span>:');
    escaped = escaped.replace(/(:[^;]+;)/g, '<span style="color: #a5d6ff;">$1</span>');
  } else if (ext === 'js' || ext === 'ts' || ext === 'mjs') {
    const keywords = /\b(const|let|var|function|return|if|else|for|while|import|export|from|class|new|try|catch|async|await)\b/g;
    escaped = escaped.replace(keywords, '<span style="color: #ff7b72;">$1</span>');
    escaped = escaped.replace(/(&quot;.*?&quot;|&#39;.*?&#39;|`.*?`)/g, '<span style="color: #a5d6ff;">$1</span>');
    escaped = escaped.replace(/(\/\/.*$)/gm, '<span style="color: #8b949e; font-style: italic;">$1</span>');
  }

  return escaped;
}

function getStudentPythonFilesList(student) {
  if (!student) return [];
  const pyInfo = student.python_info
    || (student.local_bundle && student.local_bundle.python_info)
    || (student.local_bundle && student.local_bundle.inspect && student.local_bundle.inspect.python_info)
    || null;
  if (pyInfo && Array.isArray(pyInfo.files) && pyInfo.files.length > 0) {
    return pyInfo.files;
  }
  if (pyInfo && pyInfo.support_files && typeof pyInfo.support_files === 'object') {
    const entries = Object.entries(pyInfo.support_files);
    if (entries.length > 0) {
      return entries.map(([path, content]) => ({
        path,
        name: path.split('/').pop() || path,
        content: String(content || ''),
        analysis: { syntax_valid: true },
      }));
    }
  }
  if (state.pyCurrentStudentKey === student.key && elements.pyCodeEditor && elements.pyCodeEditor.value) {
    const fallbackName = (elements.pyEntryFileSelect && elements.pyEntryFileSelect.value)
      || (student.raw_input || 'main.py').replace(/^\[ไฟล์(?:อัปโหลด)?\]\s*/i, '');
    return [{
      path: fallbackName,
      name: fallbackName,
      content: elements.pyCodeEditor.value,
      analysis: { syntax_valid: true },
    }];
  }
  return [];
}

function buildInlineCodePreviewHtml(student) {
  const files = getStudentPythonFilesList(student);
  if (files.length === 0) {
    return `
      <div class="eval-code-preview-card">
        <div class="eval-code-preview-header">
          <div class="eval-code-header-left">
            <span>🐍</span>
            <span class="eval-code-file-title">โค้ดของนักเรียน</span>
          </div>
          <div class="eval-code-header-right">
            <button type="button" class="btn btn-secondary btn-xs btn-jump-to-studio">▶ เปิดหน้าโค้ด</button>
          </div>
        </div>
        <div class="eval-code-preview-body" style="align-items:center; justify-content:center; padding:24px; color:#94a3b8;">
          กำลังโหลดโค้ดของนักเรียน...
        </div>
      </div>
    `;
  }

  const selectedPath = (student.inspect_selected_file && files.some(f => f.path === student.inspect_selected_file))
    ? student.inspect_selected_file
    : files[0].path;
  const activeFile = files.find(f => f.path === selectedPath) || files[0];
  const rawCode = (state.pyCurrentStudentKey === student.key && state.pyCurrentFilePath === activeFile.path && elements.pyCodeEditor && elements.pyCodeEditor.value)
    ? elements.pyCodeEditor.value
    : (activeFile.content || '');
  const lines = rawCode.replace(/\r\n/g, '\n').split('\n');
  const lineNums = lines.map((_, i) => i + 1).join('\n');
  const highlighted = highlightPythonCode(rawCode);
  const analysis = activeFile.analysis || {};
  const hasSyntaxErr = analysis.syntax_valid === false && analysis.syntax_error;

  const fileSelectorHtml = files.length > 1
    ? `<select class="eval-code-file-select">${files.map(f => `<option value="${escapeHtml(f.path)}" ${f.path === activeFile.path ? 'selected' : ''}>🐍 ${escapeHtml(f.path)}</option>`).join('')}</select>`
    : `<span class="eval-code-file-title">🐍 ${escapeHtml(activeFile.path)}</span>`;

  const syntaxBadgeHtml = hasSyntaxErr
    ? `<span class="rubric-score-badge lvl-poor">❌ SyntaxError บรรทัด ${analysis.syntax_error.lineno || '?'}</span>`
    : `<span class="rubric-score-badge lvl-excellent">✓ ${lines.length} บรรทัด</span>`;

  const errBarHtml = hasSyntaxErr
    ? `<div class="eval-code-syntax-err-bar">❌ บรรทัดที่ ${analysis.syntax_error.lineno || '?'}: ${escapeHtml(analysis.syntax_error.message || 'SyntaxError')}</div>`
    : '';

  return `
    <div class="eval-code-preview-card">
      <div class="eval-code-preview-header">
        <div class="eval-code-header-left">
          ${fileSelectorHtml}
          ${syntaxBadgeHtml}
        </div>
        <div class="eval-code-header-right">
          <button type="button" class="btn btn-secondary btn-xs btn-jump-to-studio" title="สลับไปหน้ารันและทดลองแก้โค้ด">
            ▶ รัน / ทดสอบโค้ด
          </button>
        </div>
      </div>
      <div class="eval-code-preview-body">
        <div class="eval-code-line-nums">${lineNums}</div>
        <pre class="eval-code-pre"><code>${highlighted}</code></pre>
      </div>
      ${errBarHtml}
    </div>
  `;
}

// -------------------------------------------------------------
// Tab 3: Observations Rendering (Web + Python OOP Analysis)
// -------------------------------------------------------------
function renderInspectTab(student) {
  const container = elements.inspectContainer;
  container.innerHTML = '';

  const observations = student.observations || [];
  const missingFiles = observations.filter(o => o.category === 'missing_file');
  const structureNotes = observations.filter(o => o.category === 'structure' || o.category === 'python_syntax' || o.category === 'python_oop');
  const consoleLogs = student.console_logs || [];
  const networkErrors = student.network_errors || [];

  // 0. การ์ดผลการตรวจตามโจทย์ & เกณฑ์การให้คะแนน (Assignment Rubric Evaluation)
  if (student && state.isGradingStudentKey === student.key) {
    const analyzingCard = document.createElement('div');
    analyzingCard.className = 'inspect-card';
    analyzingCard.innerHTML = `
      <div class="inspect-card-body" style="padding: 16px;">
        <div class="eval-rubric-code-split">
          ${buildAnalyzingShowcaseHtml(student, getActiveAssignmentData(), state.isGradingExamSet, false)}
          ${buildInlineCodePreviewHtml(student)}
        </div>
      </div>
    `;
    container.appendChild(analyzingCard);
    return;
  }

  const evalInfo = student.assignment_evaluation;
  if (evalInfo) {
    const evalCard = document.createElement('div');
    evalCard.className = `inspect-card assignment-eval-card ${evalInfo.status || 'passed'}`;
    const isExamEval = Boolean(evalInfo.is_practical_exam && Array.isArray(evalInfo.rubric_scores));
    const examSetCode = evalInfo.exam_set || 'A';
    const setMeta = PRACTICAL_EXAM_SETS_META[examSetCode] || PRACTICAL_EXAM_SETS_META.A;
    const prefMode = (student && student.preferred_exam_set) ? student.preferred_exam_set : 'AUTO';
    const qInfo = getExamQualityLevelInfo(evalInfo.score);
    const cleanStatusWord = String(evalInfo.quality_level || evalInfo.status_label || qInfo.level).replace(/\s*\(\d+\/\d+\)/g, '').trim();

    if (isExamEval) {
      evalCard.innerHTML = `
        <div class="inspect-card-body" style="padding: 16px;">
          <!-- แถบหัวข้อชุดข้อสอบ + คะแนนรวม + ปุ่มบันทึก ในแถวเดียวอ่านง่าย -->
          <div class="exam-rubric-hero-bar">
            <div class="exam-hero-left">
              <div class="exam-hero-title-row">
                <span class="exam-set-big-badge">ชุด ${escapeHtml(examSetCode)}</span>
                <span class="exam-hero-name">${escapeHtml(setMeta.title)}</span>
                <span class="spec-tag">Class ${escapeHtml(setMeta.className)}</span>
              </div>
              <div class="exam-set-pills-row" style="max-width: 540px;">
                <button type="button" class="exam-set-pill ${examSetCode === 'A' ? 'active' : ''}" data-exam-set="A">ชุด A · ราคาสินค้า</button>
                <button type="button" class="exam-set-pill ${examSetCode === 'B' ? 'active' : ''}" data-exam-set="B">ชุด B · ยอดขาย</button>
                <button type="button" class="exam-set-pill ${examSetCode === 'C' ? 'active' : ''}" data-exam-set="C">ชุด C · สินค้าคงเหลือ</button>
                <button type="button" class="exam-set-pill ${examSetCode === 'D' ? 'active' : ''}" data-exam-set="D">ชุด D · หน่วยไฟฟ้า</button>
              </div>
            </div>

            <div class="exam-hero-right">
              <div class="exam-total-score-pill ${evalInfo.status || 'passed'}">
                <span class="exam-total-num">${evalInfo.score}</span>
                <span class="exam-total-max">/ ${evalInfo.max_score || 20}</span>
                <span class="rubric-score-badge ${qInfo.badgeClass}" style="margin-left: 4px; font-size: 0.78rem; padding: 2px 10px;">${escapeHtml(cleanStatusWord)}</span>
              </div>
              <div style="display:flex; align-items:center; gap:8px;">
                <button type="button" class="btn btn-primary btn-sm btn-apply-eval-note">
                  <span>✓ บันทึกคะแนน (${evalInfo.score}/${evalInfo.max_score || 20})</span>
                </button>
                <button type="button" class="btn btn-secondary btn-sm btn-regrade-student" title="เลือกยืนยันชุดข้อสอบใหม่หรือตรวจซ้ำ">
                  <span>🔀 เปลี่ยนชุด / ตรวจซ้ำ</span>
                </button>
              </div>
            </div>
          </div>

          <!-- แบ่งครึ่งซ้าย-ขวา: ตาราง Rubric 6 ข้อ (ซ้าย) คู่กับ พรีวิวโค้ดของนักเรียน (ขวา) -->
          <div class="eval-rubric-code-split">
            <div class="rubric-clean-table">
              <div class="rubric-table-head">
                <div>รายการประเมิน (6 หัวข้อ)</div>
                <div>คลิกเลือกระดับคะแนนรายข้อ</div>
                <div style="text-align:right;">คะแนนที่ได้</div>
              </div>
              ${evalInfo.rubric_scores.map(r => {
                const lvl = getCriterionLevelInfo(r.score, r.max_score);
                const cleanTitle = String(r.title || '').replace(/^\d+\.\s*/, '');
                const segBtns = [];
                for (let p = 0; p <= r.max_score; p++) {
                  const pLvl = getCriterionLevelInfo(p, r.max_score);
                  const shortLbl = (r.max_score === 4 && p === 0) ? 'ไม่มี' : pLvl.label;
                  segBtns.push(`
                    <button type="button" class="rubric-seg-btn ${Number(r.score) === p ? `active ${pLvl.cls}` : ''}" data-crit-id="${r.id}" data-crit-pt="${p}" title="คลิกเพื่อให้ ${p}/${r.max_score} คะแนน (${shortLbl})">
                      <span class="seg-pt">${p}</span>
                      <span class="seg-lbl">${shortLbl}</span>
                    </button>
                  `);
                }
                return `
                  <div class="rubric-table-row">
                    <div class="rubric-row-info">
                      <span class="rubric-row-num">${r.id}</span>
                      <div class="rubric-row-text">
                        <div class="rubric-row-title">${escapeHtml(cleanTitle)}</div>
                        <div class="rubric-row-ev">${escapeHtml(r.evidence || r.feedback || '')}</div>
                      </div>
                    </div>
                    <div class="rubric-seg-group">
                      ${segBtns.join('')}
                    </div>
                    <div class="rubric-row-score-cell">
                      <span class="rubric-row-score-num">${r.score} / ${r.max_score}</span>
                      <span class="rubric-score-badge ${lvl.cls}">${escapeHtml(lvl.label)}</span>
                    </div>
                  </div>
                `;
              }).join('')}
              <div class="rubric-table-footer">
                <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; font-size:0.74rem; color:#94a3b8;">
                  <span><strong>เกณฑ์:</strong></span>
                  <span style="color:#6ee7b7;">● 17–20 ดีมาก</span>
                  <span style="color:#7dd3fc;">● 13–16 ดี</span>
                  <span style="color:#fcd34d;">● 9–12 พอใช้</span>
                  <span style="color:#fca5a5;">● 0–8 ปรับปรุง</span>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                  <span style="font-size:0.84rem; color:#e2e8f0;">รวม: <strong style="font-size:1rem; color:#fff;">${evalInfo.score} / ${evalInfo.max_score || 20}</strong> (${escapeHtml(cleanStatusWord)})</span>
                </div>
              </div>
            </div>

            ${buildInlineCodePreviewHtml(student)}
          </div>

          <!-- กล่องบันทึกคะแนนและคอมเมนต์ชี้แจงสำหรับนักเรียน (เก็บไว้ดูย้อนหลังและคัดลอกส่งให้นักเรียนได้ทันที) -->
          <div class="eval-comment-explain-box">
            <div class="eval-comment-header">
              <div class="eval-comment-title">
                <span>💬</span>
                <span>คอมเมนต์ & คำชี้แจงคะแนนสำหรับนักเรียน (บันทึกเก็บไว้ชี้แจงรายข้อ)</span>
                ${student.saved_score_at ? `<span class="eval-comment-saved-pill">✓ บันทึกไว้แล้ว (${escapeHtml(student.saved_score_at)})</span>` : ''}
              </div>
              <div class="eval-comment-btn-group">
                <button type="button" class="btn btn-secondary btn-xs btn-autofill-explain" title="ดึงรายละเอียดคะแนนทั้ง 6 ข้อมาสร้างเป็นคำชี้แจงอัตโนมัติ">
                  ✨ สร้างคำชี้แจงรายข้ออัตโนมัติ
                </button>
                <button type="button" class="btn btn-secondary btn-xs btn-open-class-summary" title="ดูตารางคะแนนและคอมเมนต์ของนักเรียนทั้งหมดในห้อง">
                  📊 ดูตารางสรุปคะแนนทั้งห้อง
                </button>
              </div>
            </div>
            <textarea class="eval-comment-textarea" placeholder="พิมพ์คอมเมนต์หรือเหตุผลชี้แจงการให้คะแนนของนักเรียนคนนี้...">${escapeHtml(student.teacher_comment || buildAutoExplanationFromEvaluation(student))}</textarea>
            <div class="eval-comment-actions-row">
              <span style="font-size:0.75rem; color:#94a3b8;">💡 ระบบจะบันทึกทั้งคะแนนรายข้อและข้อความชี้แจงนี้เก็บไว้ในเครื่องอัตโนมัติ แม้เปลี่ยนไปตรวจคนอื่นหรือรีเฟรชหน้าเว็บ</span>
              <div class="eval-comment-btn-group">
                <button type="button" class="btn btn-secondary btn-sm btn-copy-explain-report">
                  📋 คัดลอกใบชี้แจงคะแนน (ส่งให้นักเรียน)
                </button>
                <button type="button" class="btn btn-primary btn-sm btn-save-score-and-comment">
                  💾 บันทึกคะแนน & คอมเมนต์เก็บไว้ (${evalInfo.score}/${evalInfo.max_score || 20})
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    } else {
      evalCard.innerHTML = `
        <div class="inspect-card-header">
          <div class="inspect-card-title">
            <span>🎯</span>
            <span>ผลการตรวจตามโจทย์ & เกณฑ์การให้คะแนน</span>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            <button type="button" class="btn btn-secondary btn-sm btn-regrade-student" title="กดเพื่อตรวจซ้ำใหม่">
              <span>🔄 ตรวจซ้ำ</span>
            </button>
            <span class="badge ${evalInfo.status === 'passed' ? 'badge-success' : (evalInfo.status === 'partial' ? 'badge-warning' : 'badge-danger')}">
              ${escapeHtml(cleanStatusWord)} (${evalInfo.score}/${evalInfo.max_score || 10})
            </span>
          </div>
        </div>
        <div class="inspect-card-body">
          <div class="eval-overview-grid">
            <div class="eval-score-box ${evalInfo.status || 'passed'}">
              <div class="eval-score-num">${evalInfo.score}</div>
              <div class="eval-score-max">เต็ม ${evalInfo.max_score || 10} คะแนน</div>
              <div class="eval-score-label badge ${evalInfo.status === 'passed' ? 'badge-success' : (evalInfo.status === 'partial' ? 'badge-warning' : 'badge-danger')}">${escapeHtml(cleanStatusWord)}</div>
            </div>
            <div class="eval-summary-col">
              <p class="eval-summary-text">${escapeHtml(evalInfo.summary || '')}</p>
              <div class="eval-note-action-row">
                <span class="eval-note-preview">📝 ${escapeHtml(evalInfo.suggested_teacher_note || '')}</span>
                <button type="button" class="btn btn-primary btn-sm btn-apply-eval-note">
                  <span>บันทึกลงช่องคะแนน</span>
                </button>
              </div>
            </div>
          </div>

          <div class="ai-section-subtitle">📋 เช็คลิสต์ข้อกำหนดตามโจทย์ (${(evalInfo.checklist || []).filter(c => c.passed).length}/${(evalInfo.checklist || []).length} ข้อ)</div>
          <div class="rubric-checklist">
            ${(evalInfo.checklist || []).map(item => `
              <div class="rubric-item ${item.passed ? 'passed' : 'failed'}">
                <div class="rubric-item-icon">${item.passed ? '✅' : '❌'}</div>
                <div class="rubric-item-content">
                  <div class="rubric-item-title">${escapeHtml(item.criterion)}</div>
                  ${item.evidence ? `<div class="rubric-item-evidence">🔍 ${escapeHtml(item.evidence)}</div>` : ''}
                  ${item.feedback ? `<div class="rubric-item-feedback">${escapeHtml(item.feedback)}</div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    evalCard.querySelectorAll('.btn-apply-eval-note').forEach(btnApply => {
      btnApply.addEventListener('click', () => applyEvaluationNote(student));
    });
    const btnRegrade = evalCard.querySelector('.btn-regrade-student');
    if (btnRegrade) {
      btnRegrade.addEventListener('click', () => gradeCurrentStudentAgainstAssignment(student));
    }
    evalCard.querySelectorAll('.exam-set-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const chosen = pill.dataset.examSet;
        if (chosen && PRACTICAL_EXAM_SETS_META[chosen]) {
          confirmStudentExamSetAndGrade(student, chosen);
        } else {
          openExamSetConfirmModal(student);
        }
      });
    });
    evalCard.querySelectorAll('.rubric-pt-btn, .rubric-seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const critId = parseInt(btn.dataset.critId, 10);
        const pt = parseInt(btn.dataset.critPt, 10);
        updateStudentRubricCriterionScore(student, examSetCode, critId, pt);
      });
    });
    evalCard.querySelectorAll('.btn-jump-to-studio').forEach(btn => {
      btn.addEventListener('click', () => switchTab('preview'));
    });
    const fileSelectInEval = evalCard.querySelector('.eval-code-file-select');
    if (fileSelectInEval) {
      fileSelectInEval.addEventListener('change', (e) => {
        student.inspect_selected_file = e.target.value;
        renderInspectTab(student);
      });
    }
    const commentTextarea = evalCard.querySelector('.eval-comment-textarea');
    if (commentTextarea) {
      commentTextarea.addEventListener('input', (e) => {
        student.teacher_comment = e.target.value;
        persistLocalStudentReview(student);
      });
    }
    const btnAutoExplain = evalCard.querySelector('.btn-autofill-explain');
    if (btnAutoExplain && commentTextarea) {
      btnAutoExplain.addEventListener('click', () => {
        const generated = buildAutoExplanationFromEvaluation(student);
        commentTextarea.value = generated;
        student.teacher_comment = generated;
        persistLocalStudentReview(student);
        showToast('✨ สร้างคำชี้แจงคะแนนรายข้อจากตาราง Rubric แล้ว', 'info');
      });
    }
    const btnSaveComment = evalCard.querySelector('.btn-save-score-and-comment');
    if (btnSaveComment) {
      btnSaveComment.addEventListener('click', () => {
        const textVal = commentTextarea ? commentTextarea.value : student.teacher_comment;
        applyEvaluationNote(student, textVal);
      });
    }
    const btnCopyExplain = evalCard.querySelector('.btn-copy-explain-report');
    if (btnCopyExplain) {
      btnCopyExplain.addEventListener('click', () => {
        if (commentTextarea) {
          student.teacher_comment = commentTextarea.value;
          persistLocalStudentReview(student);
        }
        copyStudentScoreExplanationReport(student);
      });
    }
    const btnOpenSummary = evalCard.querySelector('.btn-open-class-summary');
    if (btnOpenSummary) {
      btnOpenSummary.addEventListener('click', openScoresMenuView);
    }

    container.appendChild(evalCard);
  } else {
    const isPracticalExamMode = isActiveAssignmentPracticalExam();
    const activeAssignTitle = (state.assignment && state.assignment.title)
      ? state.assignment.title
      : 'งานที่กำหนด';
    const descHtml = isPracticalExamMode
      ? 'ข้อสอบปฏิบัติ 4 ชุด (ชุด A, B, C, D) • ระบบจะให้ครูยืนยันชุดข้อสอบของนักเรียนก่อนประเมินตามตาราง Rubric Score 6 หัวข้อ (20 คะแนน)'
      : `เปรียบเทียบโค้ด Python ของนักเรียนกับโจทย์ (${escapeHtml(activeAssignTitle)}) พร้อมวิเคราะห์คะแนนตามเกณฑ์`;
    const inlineCodeHtml = buildInlineCodePreviewHtml(student);

    const uncheckCard = document.createElement('div');
    uncheckCard.className = 'inspect-card';
    uncheckCard.style.cssText = 'border: 1px dashed var(--color-primary, #3b82f6); background: rgba(59, 130, 246, 0.04);';
    uncheckCard.innerHTML = `
      <div class="inspect-card-body">
        <div class="${inlineCodeHtml ? 'eval-rubric-code-split' : ''}">
          <div class="eval-rubric-left-col" style="display: flex; flex-direction: column; justify-content: center; gap: 14px; padding: 12px 6px;">
            <div>
              <div style="font-weight: 700; font-size: 1rem; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                <span>🎯</span>
                <span>ตรวจงานคนนี้ตามโจทย์อัตโนมัติด้วย AI</span>
              </div>
              <div style="font-size: 0.84rem; color: var(--text-secondary); margin-top: 6px; line-height: 1.5;">
                ${descHtml}
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <button type="button" class="btn btn-primary btn-sm btn-trigger-grade-student" style="padding: 8px 16px; font-weight: 700;">
                <span>⚡ เริ่มตรวจตามโจทย์</span>
              </button>
            </div>
          </div>
          ${inlineCodeHtml}
        </div>
      </div>
    `;
    const btnTrigger = uncheckCard.querySelector('.btn-trigger-grade-student');
    if (btnTrigger) {
      btnTrigger.addEventListener('click', () => {
        gradeCurrentStudentAgainstAssignment(student);
      });
    }
    const inlineFileSelect = uncheckCard.querySelector('#evalInlineFileSelect');
    if (inlineFileSelect) {
      inlineFileSelect.addEventListener('change', (e) => {
        state.evalPreviewFileIdx = parseInt(e.target.value, 10) || 0;
        renderInspectTab(student);
      });
    }
    const btnCopyInlineCode = uncheckCard.querySelector('#btnCopyEvalInlineCode');
    if (btnCopyInlineCode) {
      btnCopyInlineCode.addEventListener('click', () => {
        const files = getStudentPythonFilesList(student);
        const idx = Math.min(Math.max(0, state.evalPreviewFileIdx || 0), Math.max(0, files.length - 1));
        const activeFile = files[idx];
        if (activeFile && activeFile.content) {
          navigator.clipboard.writeText(activeFile.content).then(() => {
            showToast('📋 คัดลอกโค้ดของนักเรียนแล้ว');
          });
        }
      });
    }
    container.appendChild(uncheckCard);
  }

  // 0. การ์ดวิเคราะห์โอกาสใช้ AI เขียนโค้ด & ตรวจความคล้ายคลึงกับเพื่อนในห้อง (AI Code & Plagiarism Inspector)
  const aiInfo = student.ai_analysis || (student.local_bundle && student.local_bundle.inspect && student.local_bundle.inspect.ai_analysis);
  if (aiInfo) {
    const score = aiInfo.ai_score || 0;
    const riskClass = score >= 65 ? 'ai-risk-high' : (score >= 35 ? 'ai-risk-medium' : 'ai-risk-low');
    const breakdown = aiInfo.breakdown || { comment_style: 0, advanced_syntax: 0, ai_boilerplate: 0 };
    const signals = aiInfo.signals || [];
    const vivaQuestions = aiInfo.viva_questions || [];
    const peerMatches = computePeerSimilarities(student);

    const aiCard = document.createElement('div');
    aiCard.className = `inspect-card ai-inspector-card ${riskClass}`;
    aiCard.innerHTML = `
      <div class="inspect-card-header">
        <div class="inspect-card-title">
          <span>🤖</span>
          <span>วิเคราะห์โอกาสใช้ AI เขียนโค้ด & ความคล้ายคลึง (AI Code & Plagiarism Inspector)</span>
        </div>
        <span class="badge ${score >= 65 ? 'badge-ai-high' : (score >= 35 ? 'badge-ai-medium' : 'badge-ai-low')}">
          ${escapeHtml(aiInfo.risk_label || 'ประเมินผล')} (${score}%)
        </span>
      </div>
      <div class="inspect-card-body">
        <div class="ai-overview-grid">
          <div class="ai-score-circle-box ${riskClass}">
            <div class="ai-score-number">${score}%</div>
            <div class="ai-score-caption">โอกาสใช้ AI</div>
          </div>

          <div class="ai-breakdown-col">
            <p class="ai-summary-text">${escapeHtml(aiInfo.summary || '')}</p>
            <div class="ai-meters-list">
              <div class="ai-meter-row">
                <div class="ai-meter-label">
                  <span>💬 สไตล์คอมเมนต์และ Docstring แบบตำรา AI</span>
                  <strong>${breakdown.comment_style || 0}%</strong>
                </div>
                <div class="ai-meter-track"><div class="ai-meter-fill" style="width: ${breakdown.comment_style || 0}%;"></div></div>
              </div>
              <div class="ai-meter-row">
                <div class="ai-meter-label">
                  <span>⚡ ไวยากรณ์/ฟีเจอร์ขั้นสูงเกินระดับพื้นฐาน (Type Hints, Decorators, API)</span>
                  <strong>${breakdown.advanced_syntax || 0}%</strong>
                </div>
                <div class="ai-meter-track"><div class="ai-meter-fill" style="width: ${breakdown.advanced_syntax || 0}%;"></div></div>
              </div>
              <div class="ai-meter-row">
                <div class="ai-meter-label">
                  <span>📋 โครงสร้างแม่พิมพ์และคำจำลองมาตรฐาน AI (Boilerplate / Placeholders)</span>
                  <strong>${breakdown.ai_boilerplate || 0}%</strong>
                </div>
                <div class="ai-meter-track"><div class="ai-meter-fill" style="width: ${breakdown.ai_boilerplate || 0}%;"></div></div>
              </div>
            </div>
          </div>
        </div>

        ${
          peerMatches.length > 0
            ? `
              <div class="ai-peer-alert-box">
                <div class="ai-section-subtitle">👥 ตรวจพบความคล้ายคลึงของโครงสร้างโค้ดกับเพื่อนในวิชาเดียวกัน</div>
                <div class="ai-peer-list">
                  ${peerMatches.map(m => `
                    <div class="ai-peer-item">
                      <span>⚠️ โครงสร้างโค้ดคล้ายกับของ <strong>${escapeHtml(m.student_name)}</strong> (${escapeHtml(m.repo)})</span>
                      <span class="badge badge-ai-high">คล้ายกัน ${m.similarity}%</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            `
            : ''
        }

        <div class="ai-signals-section">
          <div class="ai-section-subtitle">🔍 จุดสังเกตและหลักฐานในโค้ดที่ตรวจพบ (${signals.length} รายการ)</div>
          ${
            signals.length === 0
              ? `<p style="color: var(--color-success); font-size: 0.84rem;">✓ ไม่พบแพทเทิร์นคอมเมนต์หรือโครงสร้างแม่พิมพ์ที่ชัดเจนจาก AI</p>`
              : `<div class="ai-signals-list">
                  ${signals.map(sig => `
                    <div class="ai-signal-item">
                      <div class="ai-signal-head">
                        <span class="ai-signal-title">${escapeHtml(sig.title)}</span>
                        <button type="button" class="btn-open-signal-file" data-file="${escapeHtml(sig.file)}">
                          📄 ${escapeHtml(sig.file)}:${sig.lineno || 1}
                        </button>
                      </div>
                      ${sig.snippet ? `<code class="ai-signal-snippet">${escapeHtml(sig.snippet)}</code>` : ''}
                    </div>
                  `).join('')}
                </div>`
          }
        </div>

        ${
          vivaQuestions.length > 0
            ? `
              <div class="ai-viva-box">
                <div class="ai-section-subtitle">🎤 คำถามแนะนำสำหรับครูใช้ถามสอบปากเปล่านักเรียน (สร้างจากโค้ดของนักเรียนคนนี้)</div>
                <ol class="ai-viva-list">
                  ${vivaQuestions.map(q => `<li>${escapeHtml(q)}</li>`).join('')}
                </ol>
              </div>
            `
            : ''
        }
      </div>
    `;

    aiCard.querySelectorAll('.btn-open-signal-file').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetFile = btn.dataset.file;
        if (targetFile) {
          switchTab('code');
          openFileContent(student.owner, student.repo, targetFile);
        }
      });
    });

    container.appendChild(aiCard);
  }

  // 0.5 หากเป็นโปรเจกต์ Python / OOP ให้แสดงการ์ดวิเคราะห์โครงสร้าง OOP ด้านบนสุด
  const pyInfo = student.python_info || (student.local_bundle && student.local_bundle.python_info);
  if (pyInfo && pyInfo.has_python) {
    const oopSum = pyInfo.oop_summary || {};
    const allClasses = oopSum.classes || [];
    const syntaxErrs = oopSum.syntax_errors || [];

    const pyCard = document.createElement('div');
    pyCard.className = 'inspect-card';
    pyCard.innerHTML = `
      <div class="inspect-card-header">
        <div class="inspect-card-title">
          <span>🐍</span>
          <span>โครงสร้างโค้ด Python & การเขียนโปรแกรมเชิงวัตถุ (OOP Analysis)</span>
        </div>
      </div>
      <div class="inspect-card-body">
        <div class="oop-summary-stats">
          <div class="oop-stat-box">
            <span class="oop-stat-num">${pyInfo.total_python_files || 0}</span>
            <span class="oop-stat-label">ไฟล์ Python</span>
          </div>
          <div class="oop-stat-box">
            <span class="oop-stat-num">${oopSum.total_classes || 0}</span>
            <span class="oop-stat-label">คลาส (Classes)</span>
          </div>
          <div class="oop-stat-box">
            <span class="oop-stat-num">${oopSum.total_methods || 0}</span>
            <span class="oop-stat-label">เมธอด (Methods)</span>
          </div>
          <div class="oop-stat-box">
            <span class="oop-stat-num">${oopSum.has_inheritance ? '✓ มี' : '-'}</span>
            <span class="oop-stat-label">การสืบทอด (Inheritance)</span>
          </div>
        </div>
        ${
          syntaxErrs.length > 0
            ? syntaxErrs.map(e => `
                <div class="issue-item" style="margin-top: 10px;">
                  <div class="issue-title">❌ SyntaxError ในไฟล์ ${escapeHtml(e.file)} (บรรทัด ${e.lineno || '?'})</div>
                  <div class="issue-detail">${escapeHtml(e.message || '')}</div>
                </div>
              `).join('')
            : ''
        }
        ${
          allClasses.length > 0
            ? `<div class="oop-inspect-grid">
                ${allClasses.map(cls => `
                  <div class="oop-inspect-class-card">
                    <div class="oop-inspect-class-head">
                      <strong>🏛️ class ${escapeHtml(cls.name)}</strong>
                      <span class="oop-inspect-file-tag">${escapeHtml(cls.file)}:${cls.lineno}</span>
                    </div>
                    ${cls.bases && cls.bases.length > 0 ? `<div class="oop-inspect-row"><strong>สืบทอดจาก (Base Class):</strong> <code>${escapeHtml(cls.bases.join(', '))}</code></div>` : ''}
                    <div class="oop-inspect-row">
                      <strong>Attributes (<code>self.xxx</code>):</strong>
                      ${cls.attributes && cls.attributes.length > 0 ? cls.attributes.map(a => `<code>self.${escapeHtml(a)}</code>`).join(' ') : '<span style="color:var(--text-muted);">ไม่พบ</span>'}
                    </div>
                    <div class="oop-inspect-row">
                      <strong>Methods (<code>def</code>):</strong>
                      ${cls.methods && cls.methods.length > 0 ? cls.methods.map(m => `<code>${escapeHtml(m.name)}(${escapeHtml((m.args || []).join(', '))})</code>`).join(' ') : '<span style="color:var(--text-muted);">ไม่พบ</span>'}
                    </div>
                  </div>
                `).join('')}
              </div>`
            : `<p style="color: var(--text-secondary); margin-top: 8px;">ไม่พบการประกาศ <code>class</code> ในโปรเจกต์นี้ (เป็นสคริปต์ Python แบบฟังก์ชัน/ลำดับคำสั่งทั่วไป)</p>`
        }
      </div>
    `;
    container.appendChild(pyCard);
  }

  // 1. Missing Files Card (ข้อสังเกตหลักสำหรับเว็บ)
  if (student.has_web || missingFiles.length > 0) {
    const missingCard = document.createElement('div');
    missingCard.className = 'inspect-card';
    missingCard.innerHTML = `
      <div class="inspect-card-header">
        <div class="inspect-card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>ไฟล์ที่อ้างถึงแต่หาไม่เจอ (${missingFiles.length})</span>
        </div>
      </div>
      <div class="inspect-card-body" id="missingFilesBody">
        ${missingFiles.length === 0 ? '<p style="color: var(--color-success);">✓ ไม่พบไฟล์ที่อ้างอิงผิดพลาดใน index.html</p>' : ''}
      </div>
    `;

    if (missingFiles.length > 0) {
      const body = missingCard.querySelector('#missingFilesBody');
      missingFiles.forEach(item => {
        const issue = document.createElement('div');
        issue.className = 'issue-item';
        issue.innerHTML = `
          <div class="issue-title">${escapeHtml(item.title)}</div>
          <div class="issue-detail">${escapeHtml(item.detail)}</div>
          ${item.suggestion ? `
            <div class="suggestion-box">
              <span>💡 <strong>แนะนำแก้ไข:</strong> พบไฟล์ชื่อเดียวกันที่ <code>${escapeHtml(item.suggestion)}</code></span>
            </div>
          ` : ''}
        `;
        body.appendChild(issue);
      });
    }
    container.appendChild(missingCard);

    // 2. Console Logs & 404s Card
    const consoleCard = document.createElement('div');
    consoleCard.className = 'inspect-card';
    consoleCard.innerHTML = `
      <div class="inspect-card-header">
        <div class="inspect-card-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">
            <polygon points="12 2 2 22 22 22 12 2"></polygon>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <span>Console Errors & Failed Requests (${consoleLogs.length + networkErrors.length})</span>
        </div>
      </div>
      <div class="inspect-card-body" id="consoleBody">
        ${consoleLogs.length === 0 && networkErrors.length === 0 ? '<p style="color: var(--text-secondary);">ไม่พบ error หรือ failed request ขณะเปิดพรีวิวหน้าเว็บ</p>' : ''}
      </div>
    `;

    if (consoleLogs.length > 0 || networkErrors.length > 0) {
      const body = consoleCard.querySelector('#consoleBody');
      const table = document.createElement('table');
      table.className = 'console-table';
      table.innerHTML = `
        <thead>
          <tr>
            <th style="width: 80px;">ประเภท</th>
            <th>รายละเอียดข้อความ</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;
      const tbody = table.querySelector('tbody');

      networkErrors.forEach(err => {
        const tr = document.createElement('tr');
        tr.className = 'console-row error';
        tr.innerHTML = `
          <td><span class="badge" style="background: rgba(239, 68, 68, 0.2); color: #f87171;">404</span></td>
          <td>${escapeHtml(err.message)}</td>
        `;
        tbody.appendChild(tr);
      });

      consoleLogs.forEach(log => {
        const tr = document.createElement('tr');
        tr.className = `console-row ${log.type}`;
        tr.innerHTML = `
          <td><span class="badge" style="${log.type === 'error' ? 'background: rgba(239, 68, 68, 0.2); color: #f87171;' : 'background: rgba(245, 158, 11, 0.2); color: #fbbf24;'}">${log.type.toUpperCase()}</span></td>
          <td>${escapeHtml(log.message)}</td>
        `;
        tbody.appendChild(tr);
      });

      body.appendChild(table);
    }
    container.appendChild(consoleCard);
  }

  // 3. Repository Structure & Metadata Card
  const metaCard = document.createElement('div');
  metaCard.className = 'inspect-card';
  metaCard.innerHTML = `
    <div class="inspect-card-header">
      <div class="inspect-card-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
        <span>ข้อมูลงานและโครงสร้างไฟล์</span>
      </div>
    </div>
    <div class="inspect-card-body">
      ${structureNotes.map(n => `
        <div class="issue-item ${n.severity === 'error' ? '' : 'warning'}">
          <div class="issue-title">${escapeHtml(n.title)}</div>
          <div class="issue-detail">${escapeHtml(n.detail)}</div>
        </div>
      `).join('')}
      <div style="font-size: 0.85rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 6px;">
        <div><strong>แหล่งที่มา:</strong> ${student.canonical_url && student.canonical_url.startsWith('upload://') ? `อัปโหลดไฟล์ (${escapeHtml(student.raw_input)})` : `<a href="${student.canonical_url}" target="_blank" style="color: var(--accent-primary);">${student.canonical_url}</a>`}</div>
        <div><strong>Commit / สถานะ:</strong> <code>${student.meta && student.meta.commit_hash ? student.meta.commit_hash : 'ไม่ระบุ'}</code></div>
        <div><strong>จำนวนไฟล์ทั้งหมด:</strong> ${student.meta && student.meta.total_files ? student.meta.total_files : '-'} ไฟล์ (${formatFileSize(student.meta ? student.meta.total_size_bytes : 0)})</div>
        <div><strong>เวลาที่นำเข้า:</strong> ${student.meta && student.meta.fetched_at ? new Date(student.meta.fetched_at).toLocaleString('th-TH') : '-'}</div>
      </div>
    </div>
  `;
  container.appendChild(metaCard);
}

// -------------------------------------------------------------
// Utilities
// -------------------------------------------------------------
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// -------------------------------------------------------------
// Interactive Liquid Aurora & Constellation Network Background
// -------------------------------------------------------------
function setupCursorEffects() {
  const canvas = document.getElementById('cursorCanvas');
  if (!canvas) return;

  // ปิดเอฟเฟกต์บนหน้าจอสัมผัส (มือถือ/แท็บเล็ต) เพื่อประหยัดพลังงาน
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
    canvas.style.display = 'none';
    return;
  }

  const ctx = canvas.getContext('2d');
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let width = window.innerWidth;
  let height = window.innerHeight;

  function resizeCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // ตรวจสอบว่าเมาส์อยู่บนพื้นที่ว่างพื้นหลังหรือไม่
  function isBackgroundTarget(target) {
    if (!target || !target.closest) return false;
    if (
      target.closest(
        '.top-nav, .sidebar, .blank-state, .student-bar, .note-bar, .tabs-header, .tab-pane, .modal-card, button, a, input, select, textarea, iframe'
      )
    ) {
      return false;
    }
    return true;
  }

  // สร้างโหนดดวงดาว (Constellation Nodes) ลอยอย่างนุ่มนวลในพื้นหลัง
  const NODE_COUNT = 44;
  const LINK_DIST = 135;
  const MOUSE_DIST = 195;
  const nodePalette = [
    { r: 56, g: 189, b: 248 },  // Cyan
    { r: 129, g: 140, b: 248 }, // Indigo
    { r: 192, g: 132, b: 252 }, // Violet
    { r: 45, g: 212, b: 191 },  // Teal
  ];

  const nodes = Array.from({ length: NODE_COUNT }, () => {
    const c = nodePalette[Math.floor(Math.random() * nodePalette.length)];
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.38,
      vy: (Math.random() - 0.5) * 0.38,
      radius: Math.random() * 1.4 + 1.0,
      color: c,
      phase: Math.random() * Math.PI * 2,
    };
  });

  // กลุ่มก้อนแสง Liquid Aurora 3 ชั้นที่เคลื่อนตามเมาส์ด้วยความหน่วงต่างกัน (Silk Lag)
  const auroraFollowers = [
    { x: width * 0.5, y: height * 0.5, spring: 0.14, radius: 220, r: 56, g: 189, b: 248, maxAlpha: 0.11 },
    { x: width * 0.5, y: height * 0.5, spring: 0.07, radius: 270, r: 99, g: 102, b: 241, maxAlpha: 0.09 },
    { x: width * 0.5, y: height * 0.5, spring: 0.035, radius: 320, r: 168, g: 85, b: 247, maxAlpha: 0.07 },
  ];

  const pulses = [];
  let mouseX = width * 0.5;
  let mouseY = height * 0.5;
  let smoothX = mouseX;
  let smoothY = mouseY;
  let onBackground = false;
  let activeStrength = 0;

  window.addEventListener('mousemove', (e) => {
    onBackground = isBackgroundTarget(e.target);
    if (onBackground) {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }
  });

  window.addEventListener('mouseleave', () => {
    onBackground = false;
  });

  window.addEventListener('mousedown', (e) => {
    if (!isBackgroundTarget(e.target)) return;
    const clickX = e.clientX;
    const clickY = e.clientY;

    // สร้างคลื่นแสงนุ่ม ๆ และผลักโหนดรอบจุดคลิกเบา ๆ
    pulses.push({ x: clickX, y: clickY, radius: 8, maxRadius: 210, alpha: 0.45 });
    nodes.forEach((n) => {
      const dx = n.x - clickX;
      const dy = n.y - clickY;
      const d = Math.hypot(dx, dy);
      if (d > 0 && d < 200) {
        const force = ((200 - d) / 200) * 1.6;
        n.vx += (dx / d) * force;
        n.vy += (dy / d) * force;
      }
    });
  });

  function animate() {
    ctx.clearRect(0, 0, width, height);

    // ค่อย ๆ เพิ่ม/ลดความสว่างของเอฟเฟกต์เมาส์อย่างสมูทเมื่อเข้า/ออกพื้นที่พื้นหลัง
    const targetStrength = onBackground ? 1 : 0;
    activeStrength += (targetStrength - activeStrength) * 0.08;

    smoothX += (mouseX - smoothX) * 0.16;
    smoothY += (mouseY - smoothY) * 0.16;

    // 1. วาดแสง Liquid Aurora Silk 3 ชั้นตามการลากเมาส์
    if (activeStrength > 0.005) {
      auroraFollowers.forEach((orb) => {
        orb.x += (mouseX - orb.x) * orb.spring;
        orb.y += (mouseY - orb.y) * orb.spring;

        const alpha = orb.maxAlpha * activeStrength;
        const grad = ctx.createRadialGradient(orb.x, orb.y, 4, orb.x, orb.y, orb.radius);
        grad.addColorStop(0, `rgba(${orb.r}, ${orb.g}, ${orb.b}, ${alpha})`);
        grad.addColorStop(0.5, `rgba(${orb.r}, ${orb.g}, ${orb.b}, ${alpha * 0.4})`);
        grad.addColorStop(1, `rgba(${orb.r}, ${orb.g}, ${orb.b}, 0)`);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(orb.x, orb.y, orb.radius, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // 2. อัปเดตตำแหน่งโหนดและแรงดึงดูดกับเมาส์
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.phase += 0.02;
      n.x += n.vx;
      n.y += n.vy;

      // ลดความเร็วส่วนเกินให้กลับสู่ความเร็วลอยตัวปกติ
      const speed = Math.hypot(n.vx, n.vy);
      if (speed > 0.45) {
        n.vx *= 0.96;
        n.vy *= 0.96;
      }

      // วนกลับเมื่อชนขอบจอ
      if (n.x < -20) n.x = width + 20;
      else if (n.x > width + 20) n.x = -20;
      if (n.y < -20) n.y = height + 20;
      else if (n.y > height + 20) n.y = -20;

      // แรงดึงดูดเบา ๆ เข้าหาเคอร์เซอร์เมื่อลากเมาส์บนพื้นหลัง
      if (activeStrength > 0.05) {
        const dx = smoothX - n.x;
        const dy = smoothY - n.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 35 && dist < MOUSE_DIST) {
          const pull = ((MOUSE_DIST - dist) / MOUSE_DIST) * 0.012 * activeStrength;
          n.x += dx * pull;
          n.y += dy * pull;
        }
      }
    }

    // 3. วาดเส้นเชื่อมระหว่างโหนดใกล้เคียง (Constellation Lines)
    ctx.lineWidth = 0.75;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < LINK_DIST) {
          const lineAlpha = (1 - dist / LINK_DIST) * 0.14;
          ctx.strokeStyle = `rgba(148, 163, 184, ${lineAlpha})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // 4. วาดเส้นใยแสงเชื่อมจากเมาส์ไปยังโหนดรอบ ๆ (Interactive Cursor Constellation)
    if (activeStrength > 0.01) {
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const dx = smoothX - n.x;
        const dy = smoothY - n.y;
        const dist = Math.hypot(dx, dy);

        if (dist < MOUSE_DIST) {
          const proximity = 1 - dist / MOUSE_DIST;
          const lineAlpha = proximity * 0.42 * activeStrength;

          const lineGrad = ctx.createLinearGradient(smoothX, smoothY, n.x, n.y);
          lineGrad.addColorStop(0, `rgba(56, 189, 248, ${lineAlpha})`);
          lineGrad.addColorStop(1, `rgba(${n.color.r}, ${n.color.g}, ${n.color.b}, ${lineAlpha * 0.25})`);

          ctx.strokeStyle = lineGrad;
          ctx.lineWidth = 0.8 + proximity * 0.9;
          ctx.beginPath();
          ctx.moveTo(smoothX, smoothY);
          ctx.lineTo(n.x, n.y);
          ctx.stroke();
        }
      }
    }

    // 5. วาดจุดดวงดาวแต่ละโหนด
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      const dx = smoothX - n.x;
      const dy = smoothY - n.y;
      const dist = Math.hypot(dx, dy);
      const boost = activeStrength > 0.01 && dist < MOUSE_DIST ? (1 - dist / MOUSE_DIST) * activeStrength : 0;

      const twinkle = 0.35 + Math.sin(n.phase) * 0.15 + boost * 0.5;
      const r = n.radius + boost * 1.4;

      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${n.color.r}, ${n.color.g}, ${n.color.b}, ${Math.min(twinkle, 0.95)})`;
      ctx.fill();

      if (boost > 0.2) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 2.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${n.color.r}, ${n.color.g}, ${n.color.b}, ${boost * 0.18})`;
        ctx.fill();
      }
    }

    // 6. วาดคลื่นวงแหวนเมื่อคลิกบนพื้นหลัง
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i];
      p.radius += (p.maxRadius - p.radius) * 0.08;
      p.alpha *= 0.93;

      if (p.alpha < 0.01) {
        pulses.splice(i, 1);
        continue;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(56, 189, 248, ${p.alpha})`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

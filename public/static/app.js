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
      subject: 'การเขียนโปรแกรมเชิงวัตถุเบื้องต้น (Python OOP)',
      assignment: 'งานที่ 1',
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
};

let pyodideReadyPromise = null;

// DOM Elements
const elements = {
  courseSelect: document.getElementById('courseSelect'),
  modalActiveCourseLabel: document.getElementById('modalActiveCourseLabel'),
  courseHubGrid: document.getElementById('courseHubGrid'),
  btnOpenCourseHub: document.getElementById('btnOpenCourseHub'),

  studentsList: document.getElementById('studentsList'),
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
  },
  inspectBadgeCount: document.getElementById('inspectBadgeCount'),
  
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
function initCoursesState() {
  renderCourseSelect();
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

    const card = document.createElement('div');
    card.className = `course-hub-card ${theme.accentClass} ${isActive ? 'active' : ''}`;
    card.innerHTML = `
      <div class="course-hub-card-top">
        <div class="course-hub-icon-wrap">
          <span class="course-hub-icon">${theme.svgIcon}</span>
          <span class="course-hub-type-badge">${escapeHtml(theme.badge)}</span>
        </div>
        <div class="course-hub-top-right">
          ${isActive ? '<span class="hub-active-pill"><span class="hub-active-dot"></span>เลือกอยู่</span>' : ''}
        </div>
      </div>

      <div class="course-hub-card-body">
        <h3 class="course-hub-title">${escapeHtml(course.subject)}</h3>
        <div class="course-hub-assign-row">
          <span class="course-hub-assign-tag">${escapeHtml(course.assignment)}</span>
        </div>
      </div>

      <div class="course-hub-card-footer">
        <div class="course-hub-meta">
          <div class="course-hub-stats-row">
            <span>งานนักเรียน <strong>${total}</strong> คน</span>
            ${total > 0 ? `<span>ตรวจแล้ว <strong>${viewed}/${total}</strong> (${pct}%)</span>` : '<span class="meta-muted">ยังไม่มีงานนำเข้า</span>'}
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
                  <span>เข้าตรวจงาน (${total})</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
                <button type="button" class="btn-hub-action subtle btn-hub-import" data-course-id="${escapeHtml(course.id)}" data-import-mode="${theme.defaultImport}">
                  + นำเข้าเพิ่ม
                </button>
              `
              : `
                <button type="button" class="btn-hub-action primary btn-hub-import" data-course-id="${escapeHtml(course.id)}" data-import-mode="${theme.defaultImport}">
                  <span>${theme.type === 'python' ? 'อัปโหลดไฟล์ Python / นำเข้างาน' : 'นำเข้าลิงก์ GitHub / อัปโหลดไฟล์'}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                </button>
              `
          }
        </div>
      </div>
    `;

    // คลิกที่ตัวการ์ดเพื่อเลือกวิชานี้ทันที
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
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
    return;
  }
  syncActiveCourseState();

  const target = state.courses.find(c => c.id === courseId);
  if (!target) return;

  state.activeCourseId = target.id;
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
  renderStudentsList();
  updateViewedStats();

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
      if (elements.pyEditorLineNumbers) {
        elements.pyEditorLineNumbers.scrollTop = elements.pyCodeEditor.scrollTop;
      }
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

  // Export CSV
  if (elements.btnExportCsv) {
    elements.btnExportCsv.addEventListener('click', exportResultsToCsv);
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
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      handleReloadCurrentRepo();
    } else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      toggleMobileSidebar();
    }
  });
}

// -------------------------------------------------------------
// Export Results to CSV (with Thai UTF-8 BOM support)
// -------------------------------------------------------------
function exportResultsToCsv() {
  if (!state.students || state.students.length === 0) {
    alert('ยังไม่มีรายชื่อนักเรียนให้ส่งออก กรุณานำเข้างานก่อน');
    return;
  }

  const activeCourse = getActiveCourse();
  const courseTitle = activeCourse ? `${activeCourse.subject} - ${activeCourse.assignment}` : 'ทั่วไป';

  const headers = ['ลำดับ', 'รายวิชา/งาน', 'ชื่อนักเรียน', 'แหล่งที่มา / Repository', 'ลิงก์ GitHub', 'ประเภทโปรเจกต์', 'โอกาสใช้ AI (%)', 'ผลประเมิน AI', 'สถานะการตรวจ', 'ข้อความบันทึกของครู', 'Commit ล่าสุด'];
  const rows = state.students.map((s, index) => {
    let projTypeText = '-';
    if (s.meta?.has_web || s.has_web) projTypeText = 'เว็บสถิต (HTML)';
    else if (s.meta?.has_python || s.has_python) projTypeText = 'Python / OOP';
    else if (s.status === 'ready') projTypeText = 'โค้ดทั่วไป';

    const aiInfo = s.ai_analysis || (s.local_bundle && s.local_bundle.inspect && s.local_bundle.inspect.ai_analysis);
    const aiScoreText = aiInfo && typeof aiInfo.ai_score === 'number' ? `${aiInfo.ai_score}%` : '-';
    const aiLabelText = aiInfo && aiInfo.risk_label ? aiInfo.risk_label : '-';

    const viewedText = s.viewed ? 'ตรวจแล้ว' : 'ยังไม่ได้ตรวจ';
    const commitSha = s.meta?.commit_hash ? s.meta.commit_hash.substring(0, 7) : (s.meta?.commit_sha ? s.meta.commit_sha.substring(0, 7) : '-');
    const noteText = s.note || '';

    return [
      index + 1,
      `"${courseTitle.replace(/"/g, '""')}"`,
      `"${(s.student_name || '').replace(/"/g, '""')}"`,
      `"${(s.owner && s.repo ? `${s.owner}/${s.repo}` : s.raw_input).replace(/"/g, '""')}"`,
      `"${(s.canonical_url || '').replace(/"/g, '""')}"`,
      `"${projTypeText}"`,
      `"${aiScoreText}"`,
      `"${aiLabelText.replace(/"/g, '""')}"`,
      `"${viewedText}"`,
      `"${noteText.replace(/"/g, '""')}"`,
      `"${commitSha}"`,
    ].join(',');
  });

  // UTF-8 BOM (\uFEFF) ensures Excel opens Thai text correctly
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const safeCourseSlug = courseTitle.replace(/[^a-zA-Z0-9ก-๙_-]+/g, '_');
  link.setAttribute('href', url);
  link.setAttribute('download', `report-${safeCourseSlug}-${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// -------------------------------------------------------------
// Sidebar Drawer & Collapse Toggling
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
    // Desktop Fullscreen/Collapse toggle
    if (sidebar.classList.contains('hub-auto-hidden')) {
      sidebar.classList.remove('hub-auto-hidden');
      sidebar.classList.remove('collapsed');
    } else {
      sidebar.classList.toggle('collapsed');
    }
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
      switchImportMode('upload');
      addPendingUploadFiles(files);
      openModal();
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
    const uploadedStudents = state.students.filter(s => s.source_type === 'upload');
    const githubStudents = items.map(it => ({
      ...it,
      console_logs: [],
      network_errors: [],
    }));
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
    newItems.forEach(newItem => {
      const existIdx = state.students.findIndex(s => s.key === newItem.key);
      if (existIdx >= 0) {
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
function renderStudentsList() {
  const list = elements.studentsList;
  list.innerHTML = '';

  const filtered = getFilteredStudents();
  elements.totalStudentsCount.innerText = state.students.length;

  if (state.students.length === 0) {
    list.innerHTML = `
      <div class="empty-list-notice">
        <p>ยังไม่มีรายชื่อนักเรียน</p>
      </div>
    `;
    return;
  }

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-list-notice"><p>ไม่พบรายการที่ตรงกับเงื่อนไข</p></div>`;
    return;
  }

  filtered.forEach((student, idx) => {
    const originalIndex = state.students.indexOf(student);
    const itemEl = document.createElement('div');
    itemEl.className = `student-item ${originalIndex === state.currentIndex ? 'active' : ''}`;
    itemEl.style.animationDelay = `${Math.min(idx * 35, 350)}ms`;
    itemEl.id = `student-card-${student.key.replace(/[^a-zA-Z0-9]/g, '_')}`;

    // Status Dot Class
    let dotClass = 'pending';
    if (student.status === 'ready') dotClass = 'ready';
    else if (student.status === 'loading') dotClass = 'loading';
    else if (student.status === 'error') dotClass = 'error';

    // Tooltip status
    let statusTitle = 'พร้อมตรวจ';
    if (student.status === 'loading') statusTitle = student.loadingMessage || 'กำลังโหลด...';
    else if (student.status === 'error') statusTitle = student.error_message || 'พบข้อผิดพลาด';

    const initial = (student.student_name || student.owner || 'S').trim().charAt(0).toUpperCase();
    const isUploadedItem = student.source_type === 'upload' || student.owner === 'local-upload';
    const subLabel = isUploadedItem
      ? (student.raw_input || 'ไฟล์อัปโหลด')
      : (student.owner ? `${student.owner}/${student.repo}` : student.raw_input);

    itemEl.innerHTML = `
      <div class="student-item-left">
        <div class="student-item-checkbox ${student.viewed ? 'checked' : ''}" title="คลิกเพื่อทำเครื่องหมายว่าตรวจแล้ว"></div>
        <div class="student-avatar">${escapeHtml(initial)}</div>
        <div class="student-item-details">
          <span class="student-item-name" title="${escapeHtml(student.student_name)}">${escapeHtml(student.student_name)}</span>
          <span class="student-item-sub" title="${escapeHtml(subLabel)}">
            ${escapeHtml(subLabel)}
          </span>
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
      } else if (e.target.classList.contains('student-item-checkbox')) {
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
  const safeId = `student-card-${student.key.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const el = document.getElementById(safeId);
  if (!el) {
    renderStudentsList();
    return;
  }

  const dot = el.querySelector('.status-dot');
  if (dot) {
    dot.className = `status-dot ${student.status}`;
    dot.title = student.status === 'error' ? (student.error_message || 'เกิดข้อผิดพลาด') :
                (student.status === 'loading' ? (student.loadingMessage || 'กำลังโหลด') : 'พร้อมตรวจ');
  }

  const chk = el.querySelector('.student-item-checkbox');
  if (chk) {
    if (student.viewed) chk.classList.add('checked');
    else chk.classList.remove('checked');
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

  // Highlight active ใน sidebar
  document.querySelectorAll('.student-item').forEach((item, i) => {
    item.classList.remove('active');
  });
  const safeId = `student-card-${student.key.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const activeCard = document.getElementById(safeId);
  if (activeCard) {
    activeCard.classList.add('active');
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
    const res = await fetch(`/api/preview/${student.owner}/${student.repo}`);
    if (res.ok) {
      data = await res.json();
    } else if (student.local_bundle && student.local_bundle.preview) {
      data = {
        ...student.local_bundle.preview,
        has_python: student.has_python,
        python_info: student.python_info || student.local_bundle.python_info,
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

    if (data.python_info) {
      student.python_info = data.python_info;
    } else if (student.local_bundle && student.local_bundle.python_info) {
      student.python_info = student.local_bundle.python_info;
    }
    student.has_python = !!(data.has_python || (student.python_info && student.python_info.has_python));

    const deviceSwitcherEl = document.querySelector('.device-switcher');

    if (data.has_web && data.url) {
      // 1. มี index.html เสิร์ฟเป็นเว็บสถิต
      student.has_web = true;
      student.preview_url = data.url;
      elements.hasWebBadge.className = 'badge badge-success';
      elements.hasWebBadge.innerText = data.is_subfolder ? `เว็บสถิต (${data.index_rel})` : 'เว็บสถิต (HTML)';
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
      if (oopSum.total_classes > 0) {
        elements.hasWebBadge.innerText = `🐍 Python OOP (${oopSum.total_classes} คลาส)`;
      } else {
        elements.hasWebBadge.innerText = `🐍 Python (${student.python_info.total_python_files || 1} ไฟล์)`;
      }

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
      <div class="spinner-sm"></div>
      <span>${state.pyodideInstance ? 'กำลังประมวลผลโค้ด Python และตรวจสอบอ็อบเจกต์ OOP...' : 'กำลังโหลดเอนจิน Python (Pyodide WebAssembly) ครั้งแรก (ใช้เวลาประมาณ 2-3 วินาที)...'}</span>
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
    const res = await fetch(`/api/files/tree/${student.owner}/${student.repo}`);
    if (res.ok) {
      const data = await res.json();
      treeData = data.tree || [];
    } else if (student.local_bundle && student.local_bundle.tree) {
      treeData = student.local_bundle.tree;
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
    const res = await fetch(`/api/inspect/${student.owner}/${student.repo}`);
    if (res.ok) {
      data = await res.json();
    } else if (student.local_bundle && student.local_bundle.inspect) {
      data = student.local_bundle.inspect;
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
    badge.innerText = '🤖 AI: รอผล...';
    return;
  }

  const score = ai.ai_score;
  if (score >= 65) {
    badge.className = 'badge badge-ai-high';
    badge.innerText = `🤖 AI: ${score}% (สูง)`;
  } else if (score >= 35) {
    badge.className = 'badge badge-ai-medium';
    badge.innerText = `🤖 AI: ${score}% (ปานกลาง)`;
  } else {
    badge.className = 'badge badge-ai-low';
    badge.innerText = `🤖 AI: ${score}% (ต่ำ)`;
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
async function handleViewedToggle(index, viewed) {
  if (index < 0 || index >= state.students.length) return;
  const student = state.students[index];
  student.viewed = viewed;

  if (index === state.currentIndex) {
    elements.checkViewed.checked = viewed;
  }

  syncActiveCourseState();
  renderCourseSelect();
  updateStudentItemCard(student);
  updateViewedStats();
  await saveStudentReview(student.owner, student.repo, viewed, null);
}

async function saveStudentReview(owner, repo, viewed, note) {
  syncActiveCourseState();
  if (!owner || !repo) return;
  try {
    const payload = {};
    if (viewed !== null && viewed !== undefined) payload.viewed = viewed;
    if (note !== null && note !== undefined) payload.note = note;

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

  // แสดง/ซ่อน toolbar สำหรับ preview
  elements.previewToolbar.style.display = tabName === 'preview' ? 'flex' : 'none';

  if (tabName === 'inspect') {
    const student = getCurrentStudent();
    if (student) renderInspectTab(student);
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

async function openFileContent(owner, repo, relPath) {
  state.activeFilePath = relPath;
  elements.activeFilePath.innerText = relPath;
  elements.codeContentWrap.innerHTML = `<div class="code-placeholder">กำลังเปิดอ่านไฟล์...</div>`;

  try {
    const res = await fetch(`/api/files/content/${owner}/${repo}?path=${encodeURIComponent(relPath)}`);
    if (!res.ok) {
      // Fallback กรณีไฟล์อัปโหลดถูกเก็บไว้ในหน่วยความจำของ client (local_bundle / support_files)
      const cur = getCurrentStudent();
      const supportContent = cur && cur.python_info && cur.python_info.support_files && cur.python_info.support_files[relPath];
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
function highlightSyntax(rawCode, ext) {
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
  } else if (ext === 'py') {
    const pyKeywords = /\b(class|def|return|if|elif|else|for|while|in|import|from|as|try|except|finally|raise|with|pass|break|continue|True|False|None|and|or|not|super|self)\b/g;
    escaped = escaped.replace(pyKeywords, '<span style="color: #ff7b72;">$1</span>');
    escaped = escaped.replace(/(&quot;.*?&quot;|&#039;.*?&#039;)/g, '<span style="color: #a5d6ff;">$1</span>');
    escaped = escaped.replace(/(#.*$)/gm, '<span style="color: #8b949e; font-style: italic;">$1</span>');
  }

  return escaped;
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

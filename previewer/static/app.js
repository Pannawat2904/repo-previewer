/**
 * Repo Previewer - Frontend JavaScript Logic
 */

// Application State
const state = {
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
};

// DOM Elements
const elements = {
  studentsList: document.getElementById('studentsList'),
  totalStudentsCount: document.getElementById('totalStudentsCount'),
  studentFilterSelect: document.getElementById('studentFilterSelect'),
  searchInput: document.getElementById('searchInput'),
  viewedStatsText: document.getElementById('viewedStatsText'),
  viewedProgressFill: document.getElementById('viewedProgressFill'),
  
  blankState: document.getElementById('blankState'),
  studentWorkspace: document.getElementById('studentWorkspace'),
  
  activeStudentName: document.getElementById('activeStudentName'),
  activeRepoLink: document.getElementById('activeRepoLink'),
  activeRepoText: document.getElementById('activeRepoText'),
  commitBadge: document.getElementById('commitBadge'),
  cacheBadge: document.getElementById('cacheBadge'),
  hasWebBadge: document.getElementById('hasWebBadge'),
  
  btnPrevStudent: document.getElementById('btnPrevStudent'),
  btnNextStudent: document.getElementById('btnNextStudent'),
  navCounterText: document.getElementById('navCounterText'),
  checkViewed: document.getElementById('checkViewed'),
  btnReloadCurrentRepo: document.getElementById('btnReloadCurrentRepo'),
  btnDeleteCurrentRepo: document.getElementById('btnDeleteCurrentRepo'),
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
  btnReloadIframe: document.getElementById('btnReloadIframe'),
  btnOpenExternal: document.getElementById('btnOpenExternal'),
  noWebNotice: document.getElementById('noWebNotice'),
  btnSwitchToCode: document.getElementById('btnSwitchToCode'),
  
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
  btnBlankImport: document.getElementById('btnBlankImport'),
  btnBlankLoadSample: document.getElementById('btnBlankLoadSample'),
  btnEmptyPromptAdd: document.getElementById('btnEmptyPromptAdd'),
  btnCloseModal: document.getElementById('btnCloseModal'),
  btnCancelModal: document.getElementById('btnCancelModal'),
  bulkLinksTextarea: document.getElementById('bulkLinksTextarea'),
  parsedStatsLabel: document.getElementById('parsedStatsLabel'),
  btnFillSampleLinks: document.getElementById('btnFillSampleLinks'),
  btnStartFetch: document.getElementById('btnStartFetch'),
  btnClearAllCache: document.getElementById('btnClearAllCache'),
  btnExportCsv: document.getElementById('btnExportCsv'),
};

// Sample test link data with realistic student submissions
const SAMPLE_LINKS = `ปัฐวิกาณ (ลูกปัด)\thttps://github.com/patvikan24-oss/my-profil-013
สัญหณัฐ (029)\thttps://github.com/sanhanut200419-cmd/my-profile-029
พงศธร (045)\thttps://github.com/Pongsatorn045/My-profile-045
ธารณิดา (006)\thttps://github.com/tharanida006/my-profile-006
สมชาย เข็มกลัด\thttps://github.com/torvalds/subsurface-for-dirk`;

// -------------------------------------------------------------
// Initialization
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  setupIframeMessageListener();
  setupKeyboardShortcuts();
});

function setupEventListeners() {
  // Modal toggling
  elements.btnOpenInputModal.addEventListener('click', openModal);
  if (elements.btnBlankImport) elements.btnBlankImport.addEventListener('click', openModal);
  if (elements.btnEmptyPromptAdd) elements.btnEmptyPromptAdd.addEventListener('click', openModal);
  elements.btnCloseModal.addEventListener('click', closeModal);
  elements.btnCancelModal.addEventListener('click', closeModal);
  elements.inputModal.addEventListener('click', (e) => {
    if (e.target === elements.inputModal) closeModal();
  });

  // Sample links fill
  elements.btnFillSampleLinks.addEventListener('click', () => {
    elements.bulkLinksTextarea.value = SAMPLE_LINKS;
    updateParsedStats();
  });
  if (elements.btnBlankLoadSample) {
    elements.btnBlankLoadSample.addEventListener('click', () => {
      openModal();
      elements.bulkLinksTextarea.value = SAMPLE_LINKS;
      updateParsedStats();
    });
  }

  // Textarea input monitoring
  elements.bulkLinksTextarea.addEventListener('input', updateParsedStats);

  // Start fetch
  elements.btnStartFetch.addEventListener('click', handleStartFetch);

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

  // Reload & Delete current repo
  elements.btnReloadCurrentRepo.addEventListener('click', handleReloadCurrentRepo);
  if (elements.btnDeleteCurrentRepo) {
    elements.btnDeleteCurrentRepo.addEventListener('click', () => {
      handleDeleteStudent(state.currentIndex);
    });
  }

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

  // Iframe actions
  elements.btnReloadIframe.addEventListener('click', () => {
    const cur = getCurrentStudent();
    if (cur && cur.preview_url) {
      elements.previewIframe.src = cur.preview_url;
    }
  });

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
    }
  });
}

// -------------------------------------------------------------
// Export Results to CSV (with Thai UTF-8 BOM support)
// -------------------------------------------------------------
function exportResultsToCsv() {
  if (!state.students || state.students.length === 0) {
    alert('ยังไม่มีรายชื่อนักเรียนให้ส่งออก กรุณานำเข้าลิงก์ก่อน');
    return;
  }

  const headers = ['ลำดับ', 'ชื่อนักเรียน', 'Repository (Owner/Repo)', 'ลิงก์ GitHub', 'สถานะเว็บ', 'สถานะการตรวจ', 'ข้อความบันทึกของครู', 'Commit ล่าสุด'];
  const rows = state.students.map((s, index) => {
    const hasWebText = s.meta?.has_web ? 'ใช่ (HTML)' : (s.status === 'ready' ? 'ไม่ใช่เว็บสถิต' : '-');
    const viewedText = s.viewed ? 'ตรวจแล้ว' : 'ยังไม่ได้ตรวจ';
    const commitSha = s.meta?.commit_sha ? s.meta.commit_sha.substring(0, 7) : '-';
    const noteText = s.note || '';

    return [
      index + 1,
      `"${(s.student_name || '').replace(/"/g, '""')}"`,
      `"${(s.owner && s.repo ? `${s.owner}/${s.repo}` : s.raw_input).replace(/"/g, '""')}"`,
      `"${(s.canonical_url || '').replace(/"/g, '""')}"`,
      `"${hasWebText}"`,
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
  link.setAttribute('href', url);
  link.setAttribute('download', `repo-preview-report-${dateStr}.csv`);
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
    sidebar.classList.toggle('collapsed');
  }
}

function closeMobileSidebar() {
  const sidebar = elements.mainSidebar || document.getElementById('mainSidebar');
  const backdrop = elements.sidebarBackdrop;
  if (sidebar) sidebar.classList.remove('mobile-open');
  if (backdrop) backdrop.classList.remove('visible');
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
// Modal & Link Parsing
// -------------------------------------------------------------
function openModal() {
  elements.inputModal.style.display = 'flex';
  elements.bulkLinksTextarea.focus();
  updateParsedStats();
}

function closeModal() {
  elements.inputModal.style.display = 'none';
}

function updateParsedStats() {
  const text = elements.bulkLinksTextarea.value.trim();
  if (!text) {
    elements.parsedStatsLabel.innerText = 'ตรวจพบคัดกรอง: 0 รายการ';
    return;
  }
  const lines = text.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
  elements.parsedStatsLabel.innerText = `ตรวจพบคัดกรอง: ประมาณ ${lines.length} รายการ`;
}

async function handleStartFetch() {
  const text = elements.bulkLinksTextarea.value.trim();
  if (!text) {
    alert('กรุณาวางลิงก์อย่างน้อย 1 รายการ');
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

    // รวมรายการเข้า state (อัปเดตหรือเพิ่มใหม่)
    state.students = items.map(it => ({
      ...it,
      console_logs: [],
      network_errors: [],
    }));

    closeModal();
    renderStudentsList();
    updateViewedStats();

    // 2. ถ้ามีรายการที่เป็น cached พร้อมดูอยู่แล้ว ให้เลือกคนแรกทันที
    const readyIdx = state.students.findIndex(s => s.status === 'ready');
    if (readyIdx >= 0) {
      selectStudent(readyIdx);
    }

    // 3. เริ่ม Streaming ดาวน์โหลดสำหรับรายการที่ยังไม่ได้โหลด
    startFetchStream(state.students);

  } catch (err) {
    alert('เกิดข้อผิดพลาดในการประมวลผลลิงก์: ' + err.message);
  } finally {
    elements.btnStartFetch.disabled = false;
    elements.btnStartFetch.innerText = 'เริ่มโหลดและตรวจงาน';
  }
}

async function startFetchStream(items) {
  const toFetch = items.filter(it => it.status !== 'ready' && it.is_valid);
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
        <p>ยังไม่มีรายการงาน</p>
        <button class="btn btn-sm btn-outline" id="btnEmptyAdd">วางลิงก์เพื่อเริ่มตรวจ</button>
      </div>
    `;
    document.getElementById('btnEmptyAdd').addEventListener('click', openModal);
    return;
  }

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-list-notice"><p>ไม่พบรายการที่ตรงกับเงื่อนไข</p></div>`;
    return;
  }

  filtered.forEach(student => {
    const originalIndex = state.students.indexOf(student);
    const itemEl = document.createElement('div');
    itemEl.className = `student-item ${originalIndex === state.currentIndex ? 'active' : ''}`;
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

    itemEl.innerHTML = `
      <div class="student-item-left">
        <div class="student-item-checkbox ${student.viewed ? 'checked' : ''}" title="คลิกเพื่อทำเครื่องหมายว่าตรวจแล้ว"></div>
        <div class="student-avatar">${escapeHtml(initial)}</div>
        <div class="student-item-details">
          <span class="student-item-name" title="${escapeHtml(student.student_name)}">${escapeHtml(student.student_name)}</span>
          <span class="student-item-sub" title="${escapeHtml(student.owner ? `${student.owner}/${student.repo}` : student.raw_input)}">
            ${escapeHtml(student.owner ? `${student.owner}/${student.repo}` : student.raw_input)}
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
  if (window.innerWidth <= 860) {
    closeMobileSidebar();
  }

  // อัปเดต UI ให้แสดง workspace
  elements.blankState.style.display = 'none';
  elements.studentWorkspace.style.display = 'flex';

  // Highlight active ใน sidebar
  document.querySelectorAll('.student-item').forEach((item, i) => {
    item.classList.remove('active');
  });
  const safeId = `student-card-${student.key.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const activeCard = document.getElementById(safeId);
  if (activeCard) {
    activeCard.classList.add('active');
    activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Header Details
  elements.activeStudentName.innerText = student.student_name;
  elements.activeRepoText.innerText = student.owner ? `${student.owner}/${student.repo}` : student.raw_input;
  elements.activeRepoLink.href = student.canonical_url || '#';
  elements.navCounterText.innerText = `${index + 1} / ${state.students.length}`;
  elements.checkViewed.checked = !!student.viewed;
  elements.studentNoteInput.value = student.note || '';

  // Badges
  const commit = student.meta && student.meta.commit_hash ? student.meta.commit_hash.substring(0, 7) : '-';
  elements.commitBadge.innerText = `Commit: ${commit}`;

  // ถ้าสถานะยังเป็น Error ให้แสดงข้อมูลข้อผิดพลาด
  if (student.status === 'error') {
    elements.noWebNotice.style.display = 'flex';
    elements.noWebNotice.querySelector('h3').innerText = 'ไม่สามารถดาวน์โหลดได้';
    elements.noWebNotice.querySelector('p').innerText = student.error_message || 'พบข้อผิดพลาด';
    elements.btnSwitchToCode.style.display = 'none';
    elements.iframeContainer.style.display = 'none';
    return;
  }

  // โหลด Preview ผ่าน Lazy Port
  loadPreviewForStudent(student);

  // โหลด File Tree สำหรับแท็บโค้ด
  loadFileTreeForStudent(student);

  // โหลดข้อสังเกตสำหรับแท็บ Inspect
  loadInspectForStudent(student);
}

async function loadPreviewForStudent(student) {
  if (!student.owner || !student.repo) return;

  try {
    const res = await fetch(`/api/preview/${student.owner}/${student.repo}`);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      elements.hasWebBadge.className = 'badge badge-warning';
      elements.hasWebBadge.innerText = 'โหลดไม่สำเร็จ';
      elements.noWebNotice.style.display = 'flex';
      elements.noWebNotice.querySelector('h3').innerText = 'ไม่สามารถดาวน์โหลด repository ได้';
      elements.noWebNotice.querySelector('p').innerText = errData.detail || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ GitHub';
      elements.btnSwitchToCode.style.display = 'none';
      elements.iframeContainer.style.display = 'none';
      elements.previewIframe.src = 'about:blank';
      student.preview_url = null;
      return;
    }

    const data = await res.json();

    if (!data.has_web) {
      // ไม่มี index.html (ไม่ใช่เว็บสถิต)
      student.has_web = false;
      elements.hasWebBadge.className = 'badge badge-warning';
      elements.hasWebBadge.innerText = 'ไม่ใช่เว็บสถิต';
      elements.noWebNotice.style.display = 'flex';
      elements.noWebNotice.querySelector('h3').innerText = 'ไม่ใช่เว็บสถิต ดูได้เฉพาะโค้ด';
      elements.noWebNotice.querySelector('p').innerText = 'Repository นี้ไม่มีไฟล์ index.html (อาจเป็นโปรเจกต์ภาษาอื่น) สามารถตรวจดูไฟล์ในแท็บ "โค้ด" ได้ตามปกติ';
      elements.btnSwitchToCode.style.display = 'inline-flex';
      elements.iframeContainer.style.display = 'none';
      elements.previewIframe.src = 'about:blank';
      student.preview_url = null;
    } else {
      // มี index.html เสิร์ฟสำเร็จ
      student.has_web = true;
      student.preview_url = data.url;
      elements.hasWebBadge.className = 'badge badge-success';
      elements.hasWebBadge.innerText = data.is_subfolder ? `เว็บสถิต (${data.index_rel})` : 'เว็บสถิต (HTML)';
      elements.noWebNotice.style.display = 'none';
      elements.iframeContainer.style.display = 'flex';
      elements.previewIframe.src = data.url;
    }
  } catch (err) {
    console.error('Error getting preview:', err);
  }
}

async function loadFileTreeForStudent(student) {
  if (!student.owner || !student.repo) return;
  try {
    const res = await fetch(`/api/files/tree/${student.owner}/${student.repo}`);
    const data = await res.json();
    state.fileTree = data.tree || [];
    renderFileTree(state.fileTree);

    // เปิด index.html อัตโนมัติเป็นไฟล์แรกถ้ามี
    const firstHtml = findFirstTextFile(state.fileTree);
    if (firstHtml) {
      openFileContent(student.owner, student.repo, firstHtml.path);
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
    const res = await fetch(`/api/inspect/${student.owner}/${student.repo}`);
    const data = await res.json();
    state.inspectData = data;
    student.observations = data.observations || [];
    updateObservationsBadge(student);
    if (state.activeTab === 'inspect') {
      renderInspectTab(student);
    }
  } catch (err) {
    console.error('Error loading inspect data:', err);
  }
}

function updateObservationsBadge(student) {
  const missingCount = (student.observations || []).filter(o => o.category === 'missing_file').length;
  const consoleErrCount = (student.console_logs || []).filter(l => l.type === 'error').length;
  const netErrCount = (student.network_errors || []).length;
  const totalIssues = missingCount + consoleErrCount + netErrCount;

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

  updateStudentItemCard(student);
  updateViewedStats();
  await saveStudentReview(student.owner, student.repo, viewed, null);
}

async function saveStudentReview(owner, repo, viewed, note) {
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
  if (!student) return;

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
    elements.bulkLinksTextarea.value = state.students.map(s => s.raw_input).join('\n');
    updateParsedStats();
  }

  // 3. ปรับปรุงรายการที่กำลังเลือกดูอยู่ (currentIndex) และอัปเดต UI
  if (state.students.length === 0) {
    state.currentIndex = -1;
    elements.studentWorkspace.style.display = 'none';
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
  if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการล้างแคชไฟล์ repository ทั้งหมดในเครื่อง?')) {
    return;
  }

  try {
    const res = await fetch('/api/cache/clear', { method: 'POST' });
    const data = await res.json();
    alert(`ล้างแคชเรียบร้อยแล้ว (ลบ ${data.deleted_repos_count} repos)`);
    // ล้างรายการทั้งหมดและรีเซ็ตหน้าจอ
    state.students = [];
    state.currentIndex = -1;
    if (elements.bulkLinksTextarea) {
      elements.bulkLinksTextarea.value = '';
      updateParsedStats();
    }
    renderStudentsList();
    updateViewedStats();
    elements.studentWorkspace.style.display = 'none';
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
      else if (node.extension === 'html' || node.extension === 'htm') icon = '🌐';
      else if (node.extension === 'css') icon = '🎨';
      else if (node.extension === 'js') icon = '⚡';
      else if (node.extension === 'json') icon = '📋';
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
    if (node.type === 'file' && (node.name.toLowerCase() === 'index.html' || node.file_type === 'text')) {
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
      elements.activeFileIcon.innerText = '📄';
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
  }

  return escaped;
}

// -------------------------------------------------------------
// Tab 3: Observations Rendering
// -------------------------------------------------------------
function renderInspectTab(student) {
  const container = elements.inspectContainer;
  container.innerHTML = '';

  const observations = student.observations || [];
  const missingFiles = observations.filter(o => o.category === 'missing_file');
  const structureNotes = observations.filter(o => o.category === 'structure');
  const consoleLogs = student.console_logs || [];
  const networkErrors = student.network_errors || [];

  // 1. Missing Files Card (ข้อสังเกตหลัก)
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
        <span>ข้อมูล Repository และโครงสร้าง</span>
      </div>
    </div>
    <div class="inspect-card-body">
      ${structureNotes.map(n => `
        <div class="issue-item warning">
          <div class="issue-title">${escapeHtml(n.title)}</div>
          <div class="issue-detail">${escapeHtml(n.detail)}</div>
        </div>
      `).join('')}
      <div style="font-size: 0.85rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 6px;">
        <div><strong>URL ต้นฉบับ:</strong> <a href="${student.canonical_url}" target="_blank" style="color: var(--accent-primary);">${student.canonical_url}</a></div>
        <div><strong>Commit Hash:</strong> <code>${student.meta && student.meta.commit_hash ? student.meta.commit_hash : 'ไม่ระบุ'}</code></div>
        <div><strong>จำนวนไฟล์ทั้งหมด:</strong> ${student.meta && student.meta.total_files ? student.meta.total_files : '-'} ไฟล์ (${formatFileSize(student.meta ? student.meta.total_size_bytes : 0)})</div>
        <div><strong>เวลาที่ดาวน์โหลด:</strong> ${student.meta && student.meta.fetched_at ? new Date(student.meta.fetched_at).toLocaleString('th-TH') : '-'}</div>
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

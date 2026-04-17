

'use strict';


const BLANK = '□';
const ACCEPT_STATE = 'qAccept';
const REJECT_STATE = 'qReject';
const TAPE_SIZE = 40;
const SPEED_MAP = { 1: 900, 2: 500, 3: 280, 4: 120, 5: 40 };


let sim = {

  tapes: [[], [], []],
  heads: [0, 0, 0],
  state: 'q0',
  step: 0,
  halted: false,
  accepted: null,


  mode: 'IDLE',
  autoTimer: null,
  problem: 'palindrome',


  log: [],
  lastRead: ['—', '—', '—'],
  lastWrite: ['—', '—', '—'],
  lastDirs: ['—', '—', '—'],
  lastNext: '—',
};



const PROBLEM_DESCRIPTIONS = {
  palindrome: `<b>Palindrome Checker</b><br>
    Tape 1 carries the input string. The machine compares characters from the left and right ends simultaneously. 
    Tape 2 stores the right-side pointer, Tape 3 mirrors matched symbols.
    It accepts if the string reads the same forwards and backwards.`,
  copy: `<b>String Copying</b><br>
    Tape 1 holds the original string. The machine copies each symbol one by one onto Tape 2 
    while Tape 3 tracks the current position as a counter. 
    Accepts after all symbols are successfully duplicated.`,
  binary: `<b>Binary Addition</b><br>
    Tape 1 holds the first binary number, Tape 2 holds the second.
    The machine performs ripple-carry addition from right to left.
    Tape 3 stores the binary result. Accepts on completion.`,
};

const TAPE_LABELS = {
  palindrome: ['Input Tape', 'Right-Pointer Tape', 'Match Tape'],
  copy: ['Input Tape', 'Copy Tape', 'Position Tape'],
  binary: ['Operand A', 'Operand B', 'Result Tape'],
};



const $ = id => document.getElementById(id);

const DOM = {
  problemSelect: $('problem-select'),
  inputStr: $('input-string'),
  inputStrB: $('input-string-b'),
  inputGroupB: $('input-group-b'),
  inputHint: $('input-hint'),
  inputError: $('input-error'),

  btnInit: $('btn-init'),
  btnStep: $('btn-step'),
  btnAuto: $('btn-auto'),
  btnReset: $('btn-reset'),

  speedSlider: $('speed-slider'),
  speedLabel: $('speed-label'),

  hdrState: $('hdr-current-state'),
  hdrStep: $('hdr-step-counter'),
  hdrMode: $('hdr-exec-mode'),
  hdrBadge: $('hdr-status-badge'),

  sbStart: $('sb-start-state'),
  sbCurrent: $('sb-current-state'),
  sbAccept: $('sb-accept-state'),
  sbReject: $('sb-reject-state'),
  machineStatus: $('machine-status'),

  tape1Track: $('tape1-track'),
  tape2Track: $('tape2-track'),
  tape3Track: $('tape3-track'),
  tape2Label: $('tape2-label'),
  tape3Label: $('tape3-label'),

  head1Pos: $('tape1-head-pos'),
  head2Pos: $('tape2-head-pos'),
  head3Pos: $('tape3-head-pos'),

  tapeCard1: $('tape-card-1'),
  tapeCard2: $('tape-card-2'),
  tapeCard3: $('tape-card-3'),

  panelProblemLabel: $('panel-problem-label'),

  rpState: $('rp-current-state'),
  rpRead: $('rp-read-sym'),
  rpWrite: $('rp-write-sym'),
  rpDir: $('rp-direction'),
  rpNext: $('rp-next-state'),
  rpStep: $('rp-step-num'),
  rpMode: $('rp-exec-mode'),

  resultBanner: $('result-banner'),

  transBody: $('transition-tbody'),
  btnClearLog: $('btn-clear-log'),
};

const SPEED_LABELS = { 1: 'Very Slow', 2: 'Slow', 3: 'Medium', 4: 'Fast', 5: 'Very Fast' };

function buildPalindromeTransitions(input) {
  const n = input.length;
  const isOdd = n % 2 === 1;
  const comparisons = Math.floor(n / 2);


  return function delta(state, reads) {
    const [r1, r2, r3] = reads;

    if (state === 'q1') {

      if (r1 === BLANK && r2 === BLANK) {
        return { writes: [BLANK, BLANK, BLANK], moves: ['S', 'S', 'S'], next: ACCEPT_STATE };
      }

      if (r1 === BLANK && r2 !== BLANK) {
        return { writes: [BLANK, r2, r3], moves: ['S', 'S', 'S'], next: REJECT_STATE };
      }

      if (r1 === r2) {
        return { writes: [r1, r2, r1], moves: ['R', 'R', 'R'], next: 'q1' };
      } else {
        return { writes: [r1, r2, r3], moves: ['S', 'S', 'S'], next: REJECT_STATE };
      }

    }

    return null;
  };
}



function buildCopyTransitions(input) {
  return function delta(state, reads) {
    const [r1, r2, r3] = reads;
    switch (state) {
      case 'q1': {
        if (r1 !== BLANK) {
          return { writes: [r1, r1, '1'], moves: ['R', 'R', 'R'], next: 'q1' };
        } else {
          return { writes: [BLANK, BLANK, BLANK], moves: ['S', 'S', 'S'], next: ACCEPT_STATE };
        }

      }
      default: return null;
    }
  };
}



function buildBinaryTransitions(a, b) {
  return function delta(state, reads) {
    const [r1, r2, r3] = reads;

    if (state === 'q_seek') {
      if (r1 !== BLANK || r2 !== BLANK) {
        const m1 = r1 !== BLANK ? 'R' : 'S';
        const m2 = r2 !== BLANK ? 'R' : 'S';
        return { writes: [r1, r2, r3], moves: [m1, m2, 'S'], next: 'q_seek' };
      } else {
        return { writes: [r1, r2, r3], moves: ['L', 'L', 'S'], next: 'q_add0' };
      }
    }


    if (state === 'q_add0' || state === 'q_add1') {
      const carry = state === 'q_add1' ? 1 : 0;
      const d1 = (r1 === BLANK || r1 === undefined) ? 0 : parseInt(r1);
      const d2 = (r2 === BLANK || r2 === undefined) ? 0 : parseInt(r2);
      const sum = d1 + d2 + carry;
      const bit = (sum % 2).toString();
      const newCarry = Math.floor(sum / 2);
      const t1done = (r1 === BLANK);
      const t2done = (r2 === BLANK);

      if (t1done && t2done && carry === 0) {
        return { writes: [r1, r2, r3], moves: ['S', 'S', 'S'], next: ACCEPT_STATE };
      }

      if (t1done && t2done && carry === 1) {
        return { writes: [r1, r2, '1'], moves: ['S', 'S', 'L'], next: ACCEPT_STATE };
      }

      const m1 = t1done ? 'S' : 'L';
      const m2 = t2done ? 'S' : 'L';
      return {
        writes: [t1done ? r1 : BLANK, t2done ? r2 : BLANK, bit],
        moves: [m1, m2, 'L'],
        next: newCarry === 1 ? 'q_add1' : 'q_add0'
      };
    }

    return null;
  };
}



function initTape(symbols, padLen) {
  const t = [...symbols];
  while (t.length < padLen) t.push(BLANK);
  return t;
}

function ensureTapeLength(tapeIndex, pos) {
  while (sim.tapes[tapeIndex].length <= pos + 3) {
    sim.tapes[tapeIndex].push(BLANK);
  }
}



function initialize() {
  clearError();
  const input1 = DOM.inputStr.value.trim();
  const problem = DOM.problemSelect.value;

  if (!validateInput(problem, input1)) return;

  let input2 = '';
  if (problem === 'binary') {
    input2 = DOM.inputStrB.value.trim();
    if (!validateInput('binary2', input2)) return;
  }

  stopAuto();

  const padLen = Math.max(input1.length, input2.length, 1) + 10;

  sim.tapes = [[], [], []];
  sim.heads = [0, 0, 0];
  sim.state = 'q1';
  sim.step = 0;
  sim.halted = false;
  sim.accepted = null;
  sim.problem = problem;
  sim.log = [];
  sim.lastRead = ['—', '—', '—'];
  sim.lastWrite = ['—', '—', '—'];
  sim.lastDirs = ['—', '—', '—'];
  sim.lastNext = '—';
  sim.mode = 'STEP';

  if (problem === 'palindrome') {
    sim.tapes[0] = initTape(input1.split(''), padLen);
    sim.tapes[1] = initTape([...input1].reverse(), padLen);
    sim.tapes[2] = initTape([], padLen);
    sim.heads[0] = 0;
    sim.heads[1] = 0;
    sim.heads[2] = 0;
    sim.state = 'q1';
    sim.delta = buildPalindromeTransitions(input1);
  } else if (problem === 'copy') {
    sim.tapes[0] = initTape(input1.split(''), padLen);
    sim.tapes[1] = initTape([], padLen);
    sim.tapes[2] = initTape([], padLen);
    sim.state = 'q1';
    sim.delta = buildCopyTransitions(input1);
  } else if (problem === 'binary') {
    sim.tapes[0] = initTape(input1.split(''), padLen);
    sim.tapes[1] = initTape(input2.split(''), padLen);
    const resultLen = Math.max(input1.length, input2.length) + 2;
    sim.tapes[2] = initTape([], resultLen);
    sim.heads[2] = resultLen - 1;
    sim.state = 'q_seek';
    sim.delta = buildBinaryTransitions(input1, input2);
  }

  const labels = TAPE_LABELS[problem];
  DOM.tape2Label.textContent = labels[1];
  DOM.tape3Label.textContent = labels[2];

  DOM.sbStart.textContent = 'q0';
  DOM.sbCurrent.textContent = sim.state;
  DOM.sbAccept.textContent = ACCEPT_STATE;
  DOM.sbReject.textContent = REJECT_STATE;

  DOM.btnStep.disabled = false;
  DOM.btnAuto.disabled = false;
  DOM.btnStep.innerHTML = stepIcon() + ' Step Run';
  DOM.btnAuto.innerHTML = autoIcon() + ' Auto Run';

  // Clear log
  sim.log = [];
  renderTransitionTable();

  // Hide result banner
  DOM.resultBanner.style.display = 'none';
  DOM.resultBanner.className = 'result-banner';

  // Remove glow
  DOM.tapeCard1.className = 'tape-card';
  DOM.tapeCard2.className = 'tape-card';
  DOM.tapeCard3.className = 'tape-card';

  // Render tapes
  renderAllTapes();
  updateHeaderAndPanels();
  setMachineStatus('ready');
  DOM.panelProblemLabel.textContent = PROBLEM_DESCRIPTIONS[problem]
    .replace(/<[^>]+>/g, '').split('.')[0];
}



function validateInput(type, val) {
  if (!val || val.length === 0) {
    showError('Input cannot be empty.');
    return false;
  }
  if (type === 'palindrome' || type === 'copy') {
    if (!/^[a-zA-Z0-9]+$/.test(val)) {
      showError('Only letters (a-z, A-Z) and digits (0-9) are allowed.');
      return false;
    }
  }
  if (type === 'binary' || type === 'binary2') {
    if (!/^[01]+$/.test(val)) {
      showError('Only binary digits (0 and 1) are allowed for binary addition.');
      return false;
    }
  }
  return true;
}

function showError(msg) {
  DOM.inputError.textContent = msg;
  DOM.inputError.style.display = 'block';
  DOM.inputStr.style.borderColor = '#dc2626';
  setTimeout(() => clearError(), 4000);
}

function clearError() {
  DOM.inputError.style.display = 'none';
  DOM.inputError.textContent = '';
  DOM.inputStr.style.borderColor = '';
  if (DOM.inputStrB) DOM.inputStrB.style.borderColor = '';
}



function step() {
  if (sim.halted) return;

  // Read symbols from all tape heads
  const reads = sim.tapes.map((tape, i) => tape[sim.heads[i]] ?? BLANK);

  // Get transition
  const tx = sim.delta(sim.state, reads);

  sim.step++;

  if (!tx || tx.next === REJECT_STATE || tx.next === ACCEPT_STATE) {
    const isAccept = tx && tx.next === ACCEPT_STATE;
    const finalState = isAccept ? ACCEPT_STATE : REJECT_STATE;

    // Apply writes if provided
    if (tx) {
      tx.writes.forEach((w, i) => {
        ensureTapeLength(i, sim.heads[i]);
        sim.tapes[i][sim.heads[i]] = w;
      });
    }

    // Log final transition
    const logEntry = {
      step: sim.step,
      state: sim.state,
      reads: [...reads],
      writes: tx ? tx.writes : reads,
      dirs: tx ? tx.moves : ['S', 'S', 'S'],
      next: finalState,
    };
    sim.log.push(logEntry);
    sim.lastRead = reads;
    sim.lastWrite = tx ? tx.writes : reads;
    sim.lastDirs = tx ? tx.moves : ['S', 'S', 'S'];
    sim.lastNext = finalState;

    sim.state = finalState;
    sim.halted = true;
    sim.accepted = isAccept;
    sim.mode = 'HALTED';

    DOM.btnStep.disabled = true;
    DOM.btnAuto.disabled = true;
    stopAuto();

    renderAllTapes();
    renderTransitionTable();
    updateHeaderAndPanels();
    showResult(isAccept);
    setMachineStatus(isAccept ? 'accepted' : 'rejected');
    applyGlow(isAccept);
    return;
  }



  const { writes, moves, next } = tx;



  const logEntry = {
    step: sim.step,
    state: sim.state,
    reads: [...reads],
    writes: [...writes],
    dirs: [...moves],
    next,
  };
  sim.log.push(logEntry);
  sim.lastRead = reads;
  sim.lastWrite = writes;
  sim.lastDirs = moves;
  sim.lastNext = next;



  writes.forEach((w, i) => {
    ensureTapeLength(i, sim.heads[i]);
    sim.tapes[i][sim.heads[i]] = w;
  });



  moves.forEach((dir, i) => {
    if (dir === 'R') sim.heads[i]++;
    else if (dir === 'L') sim.heads[i] = Math.max(0, sim.heads[i] - 1);
    ensureTapeLength(i, sim.heads[i]);
  });

  sim.state = next;

  renderAllTapes(writes);
  renderTransitionTable();
  updateHeaderAndPanels();
  setMachineStatus('running');
}



function startAuto() {
  if (sim.halted) return;
  sim.mode = 'AUTO';
  DOM.btnAuto.innerHTML = pauseIcon() + ' Pause';
  DOM.btnStep.disabled = true;
  DOM.hdrMode.textContent = 'AUTO';
  DOM.rpMode.textContent = 'AUTO';
  scheduleNext();
}

function scheduleNext() {
  if (sim.halted || sim.mode !== 'AUTO') return;
  const delay = SPEED_MAP[+DOM.speedSlider.value] ?? 280;
  sim.autoTimer = setTimeout(() => {
    step();
    if (!sim.halted) scheduleNext();
  }, delay);
}

function stopAuto() {
  if (sim.autoTimer) { clearTimeout(sim.autoTimer); sim.autoTimer = null; }
  if (sim.mode === 'AUTO') {
    sim.mode = 'STEP';
    DOM.btnAuto.innerHTML = autoIcon() + ' Auto Run';
    DOM.btnStep.disabled = sim.halted;
    DOM.hdrMode.textContent = 'STEP';
    DOM.rpMode.textContent = 'STEP';
  }
}



function reset() {
  stopAuto();
  sim.tapes = [[], [], []];
  sim.heads = [0, 0, 0];
  sim.state = 'q0';
  sim.step = 0;
  sim.halted = false;
  sim.accepted = null;
  sim.mode = 'IDLE';
  sim.log = [];
  sim.lastRead = ['—', '—', '—'];
  sim.lastWrite = ['—', '—', '—'];
  sim.lastDirs = ['—', '—', '—'];
  sim.lastNext = '—';

  DOM.btnStep.disabled = true;
  DOM.btnAuto.disabled = true;
  DOM.btnStep.innerHTML = stepIcon() + ' Step Run';
  DOM.btnAuto.innerHTML = autoIcon() + ' Auto Run';
  DOM.inputStr.value = '';
  if (DOM.inputStrB) DOM.inputStrB.value = '';
  clearError();

  DOM.resultBanner.style.display = 'none';
  DOM.resultBanner.className = 'result-banner';
  DOM.tapeCard1.className = 'tape-card';
  DOM.tapeCard2.className = 'tape-card';
  DOM.tapeCard3.className = 'tape-card';

  renderAllTapes();
  renderTransitionTable();
  updateHeaderAndPanels();
  setMachineStatus('ready');
  DOM.panelProblemLabel.textContent = 'Select a problem and initialize';
}



function renderAllTapes(recentWrites) {
  [0, 1, 2].forEach(ti => {
    renderTape(ti, recentWrites ? recentWrites[ti] : undefined);
  });
}

function renderTape(tapeIndex, writtenSym) {
  const tape = sim.tapes[tapeIndex];
  const headPos = sim.heads[tapeIndex];
  const tracks = [DOM.tape1Track, DOM.tape2Track, DOM.tape3Track];
  const track = tracks[tapeIndex];
  const headDisplays = [DOM.head1Pos, DOM.head2Pos, DOM.head3Pos];



  const displayCount = Math.max(tape.length, TAPE_SIZE);

  track.innerHTML = '';

  const start = Math.max(0, headPos - 8);
  const end = Math.min(displayCount - 1, headPos + 16);

  for (let i = start; i <= end; i++) {
    const sym = tape[i] ?? BLANK;
    const cell = document.createElement('div');
    cell.className = 'tape-cell';
    cell.dataset.index = i;



    const idxEl = document.createElement('div');
    idxEl.className = 'tape-cell-index';
    idxEl.textContent = i;



    const symEl = document.createElement('div');
    symEl.className = 'tape-cell-sym';
    symEl.textContent = sym === BLANK ? '□' : sym;

    cell.appendChild(idxEl);
    cell.appendChild(symEl);



    if (sym === BLANK) cell.classList.add('cell-blank');
    if (i === headPos) {
      cell.classList.add('cell-head');
      if (writtenSym !== undefined) cell.classList.add('cell-written');
    }



    if (sim.halted && i === headPos) {
      cell.classList.add(sim.accepted ? 'cell-accepted' : 'cell-rejected');
    }

    track.appendChild(cell);
  }



  const headCell = track.querySelector('[data-index="' + headPos + '"]');
  if (headCell) {
    const wrapper = track.parentElement;
    const cellLeft = headCell.offsetLeft;
    const cellW = headCell.offsetWidth;
    const wrapW = wrapper.offsetWidth;
    wrapper.scrollLeft = cellLeft - wrapW / 2 + cellW / 2;
  }

  headDisplays[tapeIndex].textContent = headPos;
}



function updateHeaderAndPanels() {


  DOM.hdrState.textContent = sim.state || '—';
  DOM.hdrStep.textContent = sim.step;
  DOM.hdrMode.textContent = sim.mode;



  let badgeClass = 'badge-idle';
  let badgeText = 'IDLE';
  if (sim.halted && sim.accepted === true) {
    badgeClass = 'badge-accepted'; badgeText = 'ACCEPTED';
  } else if (sim.halted && sim.accepted === false) {
    badgeClass = 'badge-rejected'; badgeText = 'REJECTED';
  } else if (sim.mode === 'AUTO') {
    badgeClass = 'badge-running'; badgeText = 'RUNNING';
  } else if (sim.mode === 'STEP') {
    badgeClass = 'badge-ready'; badgeText = 'READY';
  } else if (sim.mode === 'HALTED') {
    badgeClass = 'badge-idle'; badgeText = 'HALTED';
  }
  DOM.hdrBadge.className = 'status-badge ' + badgeClass;
  DOM.hdrBadge.textContent = badgeText;



  DOM.sbCurrent.textContent = sim.state || '—';



  DOM.rpState.textContent = sim.state || '—';
  DOM.rpRead.textContent = sim.lastRead.map(s => s === BLANK ? '□' : s).join(' | ');
  DOM.rpWrite.textContent = sim.lastWrite.map(s => s === BLANK ? '□' : s).join(' | ');
  DOM.rpDir.textContent = sim.lastDirs.join(' | ');
  DOM.rpNext.textContent = sim.lastNext;
  DOM.rpStep.textContent = sim.step;
  DOM.rpMode.textContent = sim.mode;



  DOM.hdrStep.classList.remove('counter-animating');
  void DOM.hdrStep.offsetWidth;
  DOM.hdrStep.classList.add('counter-animating');
}



function showResult(accepted) {
  const banner = DOM.resultBanner;
  banner.style.display = 'block';
  if (accepted) {
    banner.className = 'result-banner accepted';
    banner.innerHTML = `✅ &nbsp; String <b>ACCEPTED</b> — The machine halted in an accept state after ${sim.step} steps.`;
  } else {
    banner.className = 'result-banner rejected';
    banner.innerHTML = `❌ &nbsp; String <b>REJECTED</b> — The machine halted in a reject state after ${sim.step} steps.`;
  }
}

function applyGlow(accepted) {
  const cls = accepted ? 'accepted-glow' : 'rejected-glow';
  DOM.tapeCard1.classList.add(cls);
  DOM.tapeCard2.classList.add(cls);
  DOM.tapeCard3.classList.add(cls);
}



function setMachineStatus(state) {
  const el = DOM.machineStatus;
  el.className = 'machine-status';
  const map = {
    ready: ['status-ready', 'READY'],
    running: ['status-running', 'RUNNING'],
    halted: ['status-halted', 'HALTED'],
    accepted: ['status-accepted', 'ACCEPTED'],
    rejected: ['status-rejected', 'REJECTED'],
  };
  const [cls, txt] = map[state] || ['status-ready', 'READY'];
  el.classList.add(cls);
  el.textContent = txt;
}



function renderTransitionTable() {
  const tbody = DOM.transBody;

  if (sim.log.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No transitions yet. Initialize and run the simulation.</td></tr>';
    return;
  }

  tbody.innerHTML = '';

  sim.log.forEach((entry, idx) => {
    const tr = document.createElement('tr');
    if (idx === sim.log.length - 1) tr.classList.add('row-latest');

    const dirHTML = entry.dirs.map(d => `<span class="dir-badge dir-${d}">${d}</span>`).join(' ');
    const nextClass = entry.next === ACCEPT_STATE ? 'state-accept' :
      entry.next === REJECT_STATE ? 'state-reject' : '';
    const readStr = entry.reads.map(s => s === BLANK ? '□' : s).join(', ');
    const writeStr = entry.writes.map(s => s === BLANK ? '□' : s).join(', ');

    tr.innerHTML = `
      <td>${entry.step}</td>
      <td>${entry.state}</td>
      <td>${readStr}</td>
      <td>${writeStr}</td>
      <td>${dirHTML}</td>
      <td class="${nextClass}">${entry.next}</td>
    `;
    tbody.appendChild(tr);
  });



  const wrap = DOM.transBody.closest('.transition-table-wrap');
  if (wrap) wrap.scrollTop = wrap.scrollHeight;
}



function stepIcon() {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/><line x1="22" y1="3" x2="22" y2="21"/></svg>`;
}
function autoIcon() {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
}
function pauseIcon() {
  return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
}



function updateSpeedSlider() {
  const val = +DOM.speedSlider.value;
  DOM.speedLabel.textContent = SPEED_LABELS[val] || 'Medium';


  const pct = ((val - 1) / 4) * 100;
  DOM.speedSlider.style.background = `linear-gradient(to right, var(--primary) 0%, var(--primary) ${pct}%, var(--border) ${pct}%)`;
}



function onProblemChange() {
  const p = DOM.problemSelect.value;
  if (p === 'binary') {
    DOM.inputGroupB.style.display = 'flex';
    DOM.inputHint.textContent = 'Binary digits only (0/1)';
  } else {
    DOM.inputGroupB.style.display = 'none';
    DOM.inputHint.textContent = p === 'palindrome'
      ? 'Letters a–z / digits 0–9 (e.g. abba)'
      : 'Letters a–z / digits 0–9 (e.g. hello)';
  }
  clearError();
}



DOM.btnInit.addEventListener('click', initialize);

DOM.btnStep.addEventListener('click', () => {
  if (sim.mode === 'IDLE') return;
  stopAuto();
  sim.mode = 'STEP';
  step();
});

DOM.btnAuto.addEventListener('click', () => {
  if (sim.mode === 'AUTO') {
    stopAuto();
  } else {
    startAuto();
  }
});

DOM.btnReset.addEventListener('click', reset);

DOM.problemSelect.addEventListener('change', onProblemChange);

DOM.speedSlider.addEventListener('input', updateSpeedSlider);

DOM.btnClearLog.addEventListener('click', () => {
  sim.log = [];
  renderTransitionTable();
});



DOM.inputStr.addEventListener('keydown', e => {
  if (e.key === 'Enter') initialize();
});
DOM.inputStrB.addEventListener('keydown', e => {
  if (e.key === 'Enter') initialize();
});



(function startup() {


  [0, 1, 2].forEach(i => {
    sim.tapes[i] = initTape([], TAPE_SIZE);
  });
  renderAllTapes();
  updateSpeedSlider();
  onProblemChange();
  DOM.panelProblemLabel.textContent = 'Select a problem and initialize';
  setMachineStatus('ready');
  DOM.sbCurrent.textContent = '—';
  DOM.hdrState.textContent = '—';
  DOM.hdrStep.textContent = '0';
  DOM.hdrMode.textContent = 'IDLE';
})();

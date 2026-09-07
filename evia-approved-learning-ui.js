(() => {
  'use strict';

  const NAXOS_CATALOG_URL = 'https://ddrnfinch.github.io/Naxos-Mapping_Engine/course-catalog.json';
  const RING_PATH = 'M23.13 76.87 A38 38 0 1 1 76.87 76.87';

  function textValue(value) {
    if (typeof value === 'string' || typeof value === 'number') return String(value).trim();
    if (value && typeof value === 'object') {
      return String(value.wording || value.description || value.text || value.title || '').trim();
    }
    return '';
  }

  function injectApprovedStyles() {
    if (document.getElementById('eviaLearningUiFixStyles')) return;
    const style = document.createElement('style');
    style.id = 'eviaLearningUiFixStyles';
    style.textContent = `
      .status-arch .arch-progress-svg {
        inset: auto !important;
        top: 0 !important;
        left: 50% !important;
        width: 54px !important;
        height: 54px !important;
        transform: translateX(-50%);
        overflow: visible !important;
      }
      .status-arch {
        padding: 7px 2px 1px !important;
      }
      .status-arch-value {
        margin-top: 2px;
      }
      .arch-progress-track,
      .arch-progress-fill {
        stroke-width: 5 !important;
        stroke-linecap: round !important;
      }
    `;
    document.head.appendChild(style);
  }

  function reshapeHomeRings() {
    document.querySelectorAll('.status-arch .arch-progress-svg').forEach((svg) => {
      svg.setAttribute('viewBox', '0 0 100 100');
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.querySelectorAll('.arch-progress-track,.arch-progress-fill').forEach((path) => {
        path.setAttribute('d', RING_PATH);
        path.setAttribute('pathLength', '100');
      });
    });
  }

  function currentMeta() {
    try {
      if (typeof inferredCourseMeta === 'function') return inferredCourseMeta() || {};
    } catch (error) {}
    try { return activeCourseMeta || {}; } catch (error) { return {}; }
  }

  function currentCourseId() {
    const meta = currentMeta();
    return textValue(meta.qualificationId || meta.qualification?.id || meta.id);
  }

  async function ensureNaxosLearningHours() {
    const courseId = currentCourseId();
    if (!courseId) return null;

    let catalog = null;
    try {
      const response = await fetch(NAXOS_CATALOG_URL, { cache: 'no-store' });
      if (response.ok) catalog = await response.json();
    } catch (error) {}

    const course = Array.isArray(catalog?.courses)
      ? catalog.courses.find((item) => textValue(item?.id) === courseId)
      : null;

    const meta = currentMeta();
    const catalogHours = Number(course?.learning?.requiredHours);
    const existingHours = Number(
      meta.learningRequiredHours
      || meta.requiredLearningHours
      || meta.learning?.requiredHours
      || meta.glh
      || meta.otjHours
      || meta.qualification?.glh
      || meta.qualification?.otjHours
      || 0
    );
    const requiredHours = Number.isFinite(catalogHours) && catalogHours > 0
      ? catalogHours
      : (Number.isFinite(existingHours) && existingHours > 0 ? existingHours : null);

    if (!requiredHours) return null;

    const sourceLearning = course?.learning && typeof course.learning === 'object'
      ? course.learning
      : (meta.learning && typeof meta.learning === 'object' ? meta.learning : {});

    const updated = {
      ...meta,
      learning: {
        ...sourceLearning,
        requiredHours
      },
      learningRequiredHours: requiredHours
    };

    try {
      if (typeof saveCourseMeta === 'function') saveCourseMeta(updated);
      else activeCourseMeta = updated;
    } catch (error) {}

    try {
      if (typeof updateArchBars === 'function') updateArchBars().catch(() => {});
    } catch (error) {}

    return requiredHours;
  }

  function replaceText(root, replacements) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      let value = node.nodeValue || '';
      replacements.forEach(([pattern, replacement]) => {
        value = value.replace(pattern, replacement);
      });
      node.nodeValue = value;
    });
  }

  function learnerLearningWording(root = null) {
    const target = root || (typeof archDetailContent !== 'undefined' ? archDetailContent : null);
    replaceText(target, [
      [/\bOTJ\/GLH learning hours\b/gi, 'Learning Hours'],
      [/\bOTJ learning position\b/gi, 'Learning Hours'],
      [/\bGLH learning position\b/gi, 'Learning Hours'],
      [/(\d+(?:\.\d+)?) total OTJ hours are required for this course\./gi, '$1 Learning Hours are required for this course.'],
      [/(\d+(?:\.\d+)?) total GLH hours are required for this course\./gi, '$1 Learning Hours are required for this course.'],
      [/\bcollege OTJ\b/gi, 'college learning'],
      [/\bcollege GLH\b/gi, 'college learning'],
      [/\blearner-added OTJ\b/gi, 'learner-added learning'],
      [/\blearner-added GLH\b/gi, 'learner-added learning'],
      [/\bExplore OTJ ideas\b/gi, 'Explore learning ideas'],
      [/\bOther OTJ ideas\b/gi, 'Other learning ideas'],
      [/\bOTJ learning ideas\b/gi, 'Learning ideas'],
      [/\bOTJ idea areas\b/gi, 'learning areas']
    ]);
  }

  function officialTopicWordings(node, meta) {
    const ids = [
      ...(Array.isArray(node?.ksbTargets) ? node.ksbTargets : []),
      ...(Array.isArray(node?.acTargets) ? node.acTargets : [])
    ].map(textValue).filter(Boolean);
    const values = [];

    ids.forEach((id) => {
      const direct = textValue(meta?.officialItems?.[id]);
      if (direct) values.push(direct);
      const criterion = Array.isArray(meta?.criteria) ? meta.criteria.find((item) => textValue(item?.id) === id) : null;
      const criterionText = textValue(criterion?.wording);
      if (criterionText) values.push(criterionText);
    });

    return [...new Set(values)];
  }

  const SUBJECT_GUIDES = [
    {
      match: /health|safety|hazard|risk|rams|ppe|rpe|coshh|asbestos|silica|manual handling|wellbeing/i,
      points: [
        'Start by identifying the hazard, who could be harmed and the controls that reduce the risk. The safest control is the one that removes or reduces the hazard before relying on PPE.',
        'Before work starts, check that the method, equipment and controls still match the actual conditions. If conditions change or a control stops working, stop and reassess before carrying on.'
      ]
    },
    {
      match: /drawing|specification|dimension|datum|setting out|set out|level|plumb|square|measure|tolerance/i,
      points: [
        'Good setting out starts from a reliable datum or reference point. Check dimensions, level, plumb and square before committing the work so small errors do not build into larger ones.',
        'Use the current drawing and specification together. If dimensions or site conditions conflict, clarify the correct information before changing the work.'
      ]
    },
    {
      match: /tool|equipment|machine|machinery|saw|drill|mixer|plant|guard/i,
      points: [
        'Select tools and equipment for the material, task and finish required. Carry out pre-use checks and make sure guards, settings and accessories are suitable before starting.',
        'If equipment is damaged, behaves unexpectedly or cannot be used with its safety features in place, isolate it and report the problem rather than adapting around the fault.'
      ]
    },
    {
      match: /mortar|brick|block|masonry|cavity|wall tie|dpc|insulation|brickwork|blockwork/i,
      points: [
        'Masonry performance depends on accurate setting out, consistent joints, correct bonding and keeping cavities and moisture-control details clear and correctly positioned.',
        'Check line, level, plumb, gauge and specified details as the work progresses. Correct faults early rather than allowing them to continue into later lifts.'
      ]
    },
    {
      match: /timber|carpentry|joinery|door|window|frame|joint|joist|roof|stair/i,
      points: [
        'Timber work depends on accurate marking, cutting and assembly as well as choosing material that is suitable for its location, moisture condition and structural or finish requirement.',
        'Check dimensions, square, level, fit and specified tolerances before final fixing. A good joint or component should fit because the preparation is accurate, not because it has been forced together.'
      ]
    },
    {
      match: /material|product|concrete|adhesive|sealant|insulation|storage/i,
      points: [
        'Choose materials for their intended use, compatibility and required performance. Storage, preparation, mixing and working time can all affect the finished result.',
        'Follow the specification and manufacturer information for preparation and use, then check the material has achieved the required finish, strength, position or protection.'
      ]
    },
    {
      match: /quality|inspection|defect|snag|finish|check|test/i,
      points: [
        'Quality control means comparing the work with the drawing, specification, tolerances and expected finish while the work is still easy to correct.',
        'When a defect is found, identify the cause as well as the visible problem. Correcting the cause helps prevent the same fault from returning.'
      ]
    },
    {
      match: /plumb|pipe|leak|drain|electrical|circuit|service|fault|repair|maintenance/i,
      points: [
        'Diagnosis comes before repair. Confirm the source of the fault, make the system safe, then choose a repair that deals with the cause rather than only the symptom.',
        'After the work, test or check the system in the correct way so you know the repair is safe, effective and has not created another problem.'
      ]
    },
    {
      match: /sustain|environment|waste|recycl|resource|energy/i,
      points: [
        'Sustainable working reduces unnecessary material, energy and waste while still meeting the specification. Plan quantities, protect materials and separate waste correctly.',
        'Consider the whole task: efficient ordering, correct storage, careful use and appropriate reuse or recycling all reduce environmental impact.'
      ]
    },
    {
      match: /communicat|team|customer|client|behaviour|professional|work relationship/i,
      points: [
        'Clear communication means giving accurate information, listening, checking understanding and raising problems early enough for the team to act on them.',
        'Professional behaviour includes being reliable, respectful and accountable for your work, and following agreed procedures when information, scope or conditions change.'
      ]
    }
  ];

  function subjectTeachingPoints(node, path) {
    const meta = currentMeta();
    const supplied = Array.isArray(node?.teachingPoints)
      ? node.teachingPoints.map(textValue).filter((point) => point && !/evidence|photo|video|record|upload|witness/i.test(point))
      : [];
    const wordings = officialTopicWordings(node, meta);
    const combined = `${path.join(' ')} ${textValue(node?.label)} ${wordings.join(' ')}`;
    const guide = SUBJECT_GUIDES.find((item) => item.match.test(combined));
    const points = [];

    supplied.forEach((point) => { if (!points.includes(point)) points.push(point); });
    if (wordings.length) {
      const wording = wordings[0].length > 260 ? `${wordings[0].slice(0, 257)}...` : wordings[0];
      const statement = `This topic covers: ${wording}`;
      if (!points.includes(statement)) points.push(statement);
    }
    (guide?.points || []).forEach((point) => { if (!points.includes(point)) points.push(point); });

    if (points.length < 3) {
      const label = textValue(node?.label) || 'this topic';
      const fallbacks = [
        `${label} is about understanding what the task is meant to achieve, the correct sequence of work and why each stage matters.`,
        'Think about preparation first, then the correct method, then the checks that confirm the work is safe, accurate and fit for purpose.',
        'A useful way to learn the subject is to understand common faults as well as the correct method: what can go wrong, why it happens and how it should be corrected.'
      ];
      fallbacks.forEach((point) => { if (!points.includes(point)) points.push(point); });
    }

    return points.slice(0, 3);
  }

  injectApprovedStyles();
  reshapeHomeRings();

  if (typeof teachPick === 'function') {
    teachPick = async function (index) {
      if (!teachState) return;
      const node = teachState.items[index];
      if (!node) return;
      teachState.path.push(node.label);
      if (Array.isArray(node.children) && node.children.length) {
        teachState.items = node.children.slice(0, 5);
        const prompt = teachState.path.length === 1 ? 'Which part?' : 'Which topic?';
        await chatSay(prompt, teachingOptions(teachState.items, teachState.path.length + 1));
        return;
      }

      const points = subjectTeachingPoints(node, teachState.path);
      for (let i = 0; i < points.length; i += 1) {
        await chatSay(points[i]);
      }
      await chatSay('Want to learn something else?', [
        { label: 'Teach Me', action: 'teach-me' },
        { label: 'Quick Review', action: 'quick-review' },
        { label: 'Test Me', action: 'test-me' },
        { label: 'Main menu', action: 'chat-home' }
      ]);
    };
  }

  if (typeof renderLearnPage === 'function') {
    const previousRenderLearnPage = renderLearnPage;
    renderLearnPage = function (...args) {
      const result = previousRenderLearnPage.apply(this, args);
      learnerLearningWording();
      ensureNaxosLearningHours().then((hours) => {
        if (hours && typeof archDetailTitle !== 'undefined' && archDetailTitle?.textContent === 'Learn') {
          const requiredText = [...archDetailContent.querySelectorAll('.detail-card p')].find((node) => /waiting for the course learning-hours requirement/i.test(node.textContent));
          if (requiredText) previousRenderLearnPage.apply(this, args);
          learnerLearningWording();
        }
      }).catch(() => {});
      return result;
    };
  }

  if (typeof renderAttendPage === 'function') {
    const previousRenderAttendPage = renderAttendPage;
    renderAttendPage = function (...args) {
      const result = previousRenderAttendPage.apply(this, args);
      learnerLearningWording();
      return result;
    };
  }

  if (typeof renderOtjIdeasPage === 'function') {
    const previousRenderIdeas = renderOtjIdeasPage;
    renderOtjIdeasPage = function (...args) {
      const result = previousRenderIdeas.apply(this, args);
      learnerLearningWording();
      return result;
    };
  }

  if (typeof renderCatchupPage === 'function') {
    const previousRenderCatchup = renderCatchupPage;
    renderCatchupPage = async function (...args) {
      const result = await previousRenderCatchup.apply(this, args);
      learnerLearningWording();
      return result;
    };
  }

  if (typeof pushArchView === 'function') {
    const previousPushArchView = pushArchView;
    pushArchView = function (renderer, title) {
      return previousPushArchView(renderer, title === 'OTJ Ideas' ? 'Learning Ideas' : title);
    };
  }

  if (typeof applyImportedCourse === 'function') {
    const previousApplyImportedCourse = applyImportedCourse;
    applyImportedCourse = function (...args) {
      const result = previousApplyImportedCourse.apply(this, args);
      ensureNaxosLearningHours().catch(() => {});
      return result;
    };
  }

  ensureNaxosLearningHours().catch(() => {});
})();

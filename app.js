(() => {
  "use strict";

  const config = window.STUDY_CONFIG;
  if (!config) {
    document.body.innerHTML =
      '<main class="view"><div class="inline-error">Study configuration failed to load.</div></main>';
    throw new Error("window.STUDY_CONFIG is missing");
  }

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const nowIso = () => new Date().toISOString();
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const storageKey = `reconstruction-study:${config.studyId}:${config.studyVersion}`;
  const candidateLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  validateConfig();

  let state = loadOrCreateState();
  let activeTrialId = null;
  let activeTimerStartedAt = null;
  let lastPayload = null;

  const elements = {
    app: q("#app"),
    intro: q("#intro-view"),
    trial: q("#trial-view"),
    review: q("#review-view"),
    success: q("#success-view"),
    progressWrap: q("#progress-wrap"),
    progressTrack: q(".progress-track"),
    progressBar: q("#progress-bar"),
    progressLabel: q("#progress-label"),
    progressPercent: q("#progress-percent"),
    participantIdentifier: q("#participant-identifier"),
    consent: q("#consent-checkbox"),
    introError: q("#intro-error"),
    startButton: q("#start-button"),
    comparisonGrid: q("#comparison-grid"),
    attentionBanner: q("#attention-banner"),
    attentionPrompt: q("#attention-prompt"),
    validationSummary: q("#validation-summary"),
    previousButton: q("#previous-button"),
    nextButton: q("#next-button"),
    playAllButton: q("#play-all-button"),
    pauseAllButton: q("#pause-all-button"),
    reviewList: q("#review-list"),
    finalComments: q("#final-comments"),
    demoNotice: q("#demo-notice"),
    backToTrialsButton: q("#back-to-trials-button"),
    submitButton: q("#submit-button"),
    submitError: q("#submit-error"),
    successMessage: q("#success-message"),
  };

  initializeContent();
  bindEvents();
  restoreView();

  function validateConfig() {
    const errors = [];
    if (!config.studyId || !config.studyVersion) {
      errors.push("studyId and studyVersion are required");
    }
    if (!Array.isArray(config.metrics) || !config.metrics.length) {
      errors.push("at least one rating metric is required");
    }
    if (!Array.isArray(config.trials) || !config.trials.length) {
      errors.push("at least one trial is required");
    }

    const trialIds = new Set();
    config.trials.forEach((trial, index) => {
      if (!trial.id || trialIds.has(trial.id)) {
        errors.push(`trial ${index + 1} needs a unique id`);
      }
      trialIds.add(trial.id);
      if (![2, 3].includes(trial.candidates?.length)) {
        errors.push(`trial ${trial.id || index + 1} must have exactly 2 or 3 candidates`);
      }
      const methodIds = new Set((trial.candidates || []).map((candidate) => candidate.id));
      if (methodIds.size !== trial.candidates?.length || methodIds.has(undefined)) {
        errors.push(`trial ${trial.id || index + 1} needs unique candidate ids`);
      }
      if (trial.attentionCheck) {
        const metricExists = config.metrics.some(
          (metric) => metric.id === trial.attentionCheck.metricId,
        );
        if (!metricExists || !methodIds.has(trial.attentionCheck.candidateId)) {
          errors.push(`trial ${trial.id} has an invalid attention-check target`);
        }
      }
    });

    const metricIds = config.metrics.map((metric) => metric.id);
    if (new Set(metricIds).size !== metricIds.length || metricIds.includes(undefined)) {
      errors.push("metric ids must be present and unique");
    }

    if (errors.length) {
      document.body.innerHTML = `<main class="view"><div class="inline-error"><strong>Configuration error</strong><br>${errors.join(
        "<br>",
      )}</div></main>`;
      throw new Error(errors.join("; "));
    }
  }

  function loadOrCreateState() {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(storageKey));
    } catch (_error) {
      saved = null;
    }

    const base =
      saved && saved.studyId === config.studyId && saved.studyVersion === config.studyVersion
        ? saved
        : {
            studyId: config.studyId,
            studyVersion: config.studyVersion,
            sessionId: createSessionId(),
            createdAt: nowIso(),
            participantIdentifier: "",
            consentedAt: null,
            startedAt: null,
            submittedAt: null,
            currentIndex: 0,
            trialOrder: [],
            candidateOrders: {},
            responses: {},
            timings: {},
            playback: {},
            additionalComments: "",
          };

    base.responses ||= {};
    base.timings ||= {};
    base.playback ||= {};
    base.candidateOrders ||= {};
    base.currentIndex = clamp(Number(base.currentIndex) || 0, 0, config.trials.length - 1);

    const configuredTrialIds = config.trials.map((trial) => trial.id);
    if (!sameMembers(base.trialOrder || [], configuredTrialIds)) {
      base.trialOrder = [...configuredTrialIds];
      if (config.randomization?.trialOrder) shuffleInPlace(base.trialOrder);
    }

    config.trials.forEach((trial) => {
      const configuredCandidateIds = trial.candidates.map((candidate) => candidate.id);
      if (!sameMembers(base.candidateOrders[trial.id] || [], configuredCandidateIds)) {
        base.candidateOrders[trial.id] = [...configuredCandidateIds];
        if (config.randomization?.candidateOrder !== false) {
          shuffleInPlace(base.candidateOrders[trial.id]);
        }
      }
      base.responses[trial.id] ||= {};
      base.timings[trial.id] ||= {
        firstViewedAt: null,
        lastViewedAt: null,
        firstCompletedAt: null,
        activeTimeMs: 0,
        responseTimeMs: null,
        visits: 0,
      };
      base.playback[trial.id] ||= {};
    });

    persist(base);
    return base;
  }

  function createSessionId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    window.crypto?.getRandomValues?.(bytes);
    if (!bytes.some(Boolean)) {
      for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
    }
    return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function shuffleInPlace(items) {
    for (let i = items.length - 1; i > 0; i -= 1) {
      let randomValue;
      if (window.crypto?.getRandomValues) {
        const buffer = new Uint32Array(1);
        window.crypto.getRandomValues(buffer);
        randomValue = buffer[0] / 4294967296;
      } else {
        randomValue = Math.random();
      }
      const j = Math.floor(randomValue * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }

  function sameMembers(left, right) {
    return (
      left.length === right.length &&
      new Set(left).size === left.length &&
      left.every((item) => right.includes(item))
    );
  }

  function initializeContent() {
    document.title = config.title;
    q("#header-title").textContent = config.title;
    q("#study-title").textContent = config.title;
    q("#study-description").textContent = config.description;
    q("#study-tip").textContent = config.tip;
    q("#estimate").textContent = `Estimated time: ${config.estimatedTime}`;
    q("#consent-text").textContent = config.consentText;
    q("#footer-study-id").textContent = `${config.studyId} · v${config.studyVersion}`;
    elements.participantIdentifier.value = state.participantIdentifier || "";
    elements.consent.checked = Boolean(state.consentedAt);
    elements.finalComments.value = state.additionalComments || "";

    q("#instruction-list").replaceChildren(
      ...config.instructions.map((instruction) => {
        const item = document.createElement("li");
        item.textContent = instruction;
        return item;
      }),
    );

    const participantLabel = q(".field-label[for='participant-identifier']");
    participantLabel.firstChild.textContent = `${config.participantIdentifierLabel || "Participant identifier"} `;
    q("#participant-optional").textContent = config.requireParticipantIdentifier
      ? "(required)"
      : "(optional)";
    if (state.startedAt && !state.submittedAt) {
      elements.startButton.firstChild.textContent = "Resume study ";
    }
  }

  function bindEvents() {
    elements.startButton.addEventListener("click", startStudy);
    elements.previousButton.addEventListener("click", goPrevious);
    elements.nextButton.addEventListener("click", goNext);
    elements.playAllButton.addEventListener("click", () => controlAllVideos("play"));
    elements.pauseAllButton.addEventListener("click", () => controlAllVideos("pause"));
    elements.backToTrialsButton.addEventListener("click", () => {
      state.currentIndex = config.trials.length - 1;
      persist();
      showTrial();
    });
    elements.finalComments.addEventListener("input", () => {
      state.additionalComments = elements.finalComments.value;
      persist();
    });
    elements.submitButton.addEventListener("click", submitStudy);
    window.addEventListener("beforeunload", pauseActiveTimer);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) pauseActiveTimer();
      else if (activeTrialId && !activeTimerStartedAt) activeTimerStartedAt = Date.now();
    });
  }

  function restoreView() {
    if (state.submittedAt) {
      lastPayload = buildPayload();
      showSuccess();
    } else {
      showOnly("intro");
    }
  }

  function startStudy() {
    elements.introError.hidden = true;
    const participantIdentifier = elements.participantIdentifier.value.trim();
    if (config.requireParticipantIdentifier && !participantIdentifier) {
      showError(
        elements.introError,
        "Enter your name, nickname, or pseudonym before continuing.",
      );
      elements.participantIdentifier.focus();
      return;
    }
    if (!elements.consent.checked) {
      showError(elements.introError, "Please confirm consent before beginning the study.");
      elements.consent.focus();
      return;
    }

    state.participantIdentifier = participantIdentifier;
    state.consentedAt ||= nowIso();
    state.startedAt ||= nowIso();
    persist();
    showTrial();
  }

  function showTrial() {
    showOnly("trial");
    const trial = currentTrial();
    beginTrialTiming(trial.id);
    renderTrial(trial);
    updateProgress(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    elements.trial.focus({ preventScroll: true });
  }

  function renderTrial(trial) {
    const index = state.currentIndex;
    q("#trial-kicker").textContent = `Trial ${String(index + 1).padStart(2, "0")}`;
    q("#trial-title").textContent = trial.title || "Compare the smoke animations";
    q("#trial-prompt").textContent = trial.prompt || config.prompt;
    elements.previousButton.disabled = false;
    elements.previousButton.innerHTML =
      index === 0
        ? '<span aria-hidden="true">←</span> Back to instructions'
        : '<span aria-hidden="true">←</span> Previous';
    const nextLabel = index === config.trials.length - 1 ? "Review" : "Save & continue";
    elements.nextButton.innerHTML = `${nextLabel} <span aria-hidden="true">→</span>`;
    elements.validationSummary.hidden = true;
    elements.comparisonGrid.replaceChildren();

    const candidateOrder = state.candidateOrders[trial.id];
    candidateOrder.forEach((candidateId, position) => {
      const candidate = trial.candidates.find((item) => item.id === candidateId);
      const label = candidateLabel(position);
      const pair = document.createElement("section");
      pair.className = "comparison-pair";
      pair.setAttribute("aria-label", `${label} compared with ground truth`);
      pair.append(
        createMediaCard({
          trial,
          media: trial.reference,
          kind: "reference",
          title: "Reference / GT",
          kicker: `GT for ${label}`,
          mediaKey: "reference",
        }),
        createMediaCard({
          trial,
          media: candidate,
          kind: "candidate",
          candidateId,
          title: label,
          kicker: `Option ${candidateLetters[position]}`,
          mediaKey: `candidate:${candidateId}`,
          position,
        }),
      );
      elements.comparisonGrid.append(pair);
    });

    const hasPlayableVideo = Boolean(q("video:not([hidden])", elements.comparisonGrid));
    elements.playAllButton.hidden = !hasPlayableVideo;
    elements.pauseAllButton.hidden = !hasPlayableVideo;
    renderAttentionCheck(trial);
  }

  function createMediaCard({
    trial,
    media,
    kind,
    candidateId = null,
    title,
    kicker,
    mediaKey,
    position = null,
  }) {
    const card = q("#media-card-template").content.firstElementChild.cloneNode(true);
    card.classList.toggle("reference-card", kind === "reference");
    card.dataset.mediaKey = mediaKey;
    q(".card-kicker", card).textContent = kicker;
    q(".card-title", card).textContent = title;
    q(".reference-badge", card).hidden = kind !== "reference";
    q(".media-caption", card).textContent =
      media?.caption ||
      (kind === "reference" ? "Ground-truth smoke sequence" : "Smoke reconstruction");

    const video = q("video", card);
    const animatedImage = q(".animated-image", card);
    const placeholder = q(".video-placeholder", card);
    const placeholderPath = q("small", placeholder);
    const isAnimatedImage =
      media?.type === "image" || /\.gif(?:$|[?#])/i.test(String(media?.src || ""));

    if (isAnimatedImage && media?.src) {
      video.hidden = true;
      animatedImage.hidden = false;
      animatedImage.src = media.src;
      animatedImage.alt = `${title} animated result`;
      animatedImage.addEventListener("error", () => {
        animatedImage.hidden = true;
        placeholder.hidden = false;
        placeholderPath.textContent = "Ask the study administrator to check this media file.";
      });
      const stats = playbackStats(trial.id, mediaKey);
      stats.mediaType = "image/gif";
    } else if (media?.src) {
      animatedImage.hidden = true;
      video.muted = config.playback?.mutedByDefault !== false;
      video.dataset.mediaKey = mediaKey;
      video.setAttribute("aria-label", `${title} video`);
      if (media?.poster) video.poster = media.poster;
      video.src = media.src;
      video.addEventListener("error", () => {
        video.hidden = true;
        placeholder.hidden = false;
        placeholderPath.textContent = "Ask the study administrator to check this media file.";
      });
      attachPlaybackTracking(video, trial.id, mediaKey);
    } else {
      video.hidden = true;
      animatedImage.hidden = true;
      placeholder.hidden = false;
      placeholderPath.textContent = "Add a source path in config.js";
    }

    const ratings = q(".ratings", card);
    if (kind === "reference") {
      ratings.remove();
    } else {
      config.metrics.forEach((metric) => {
        ratings.append(createRating(trial, candidateId, position, metric));
      });
    }
    return card;
  }

  function createRating(trial, candidateId, position, metric) {
    const row = q("#rating-template").content.firstElementChild.cloneNode(true);
    const label = q("label", row);
    const description = q(".rating-heading p", row);
    const output = q("output", row);
    const slider = q("input", row);
    const scale = config.ratingScale;
    const savedValue = state.responses[trial.id]?.[candidateId]?.[metric.id];
    const midpoint = Math.round((scale.min + scale.max) / 2);
    const inputId = `rating-${safeId(trial.id)}-${safeId(candidateId)}-${safeId(metric.id)}`;

    row.dataset.candidateId = candidateId;
    row.dataset.metricId = metric.id;
    label.htmlFor = inputId;
    label.textContent = metric.label + (metric.required === false ? " (optional)" : "");
    description.id = `${inputId}-description`;
    description.textContent = metric.description || "";
    slider.id = inputId;
    slider.min = String(scale.min);
    slider.max = String(scale.max);
    slider.step = String(scale.step || 1);
    slider.value = String(Number.isFinite(savedValue) ? savedValue : midpoint);
    slider.setAttribute("aria-describedby", description.id);
    slider.setAttribute(
      "aria-label",
      `${candidateLabel(position)}, ${metric.label}, ${scale.min} to ${scale.max}`,
    );
    q(".scale-labels span:first-child", row).textContent = `${scale.min} ${scale.lowLabel}`;
    q(".scale-labels span:last-child", row).textContent = `${scale.max} ${scale.highLabel}`;

    if (Number.isFinite(savedValue)) updateRatingDisplay(row, savedValue);

    const commitRating = () => {
      const value = Number(slider.value);
      state.responses[trial.id][candidateId] ||= {};
      state.responses[trial.id][candidateId][metric.id] = value;
      updateRatingDisplay(row, value);
      row.classList.remove("invalid");
      elements.validationSummary.hidden = true;
      persist();
    };

    slider.addEventListener("input", commitRating);
    slider.addEventListener("change", commitRating);
    slider.addEventListener("pointerup", commitRating);
    return row;
  }

  function updateRatingDisplay(row, value) {
    row.classList.add("touched");
    q("output", row).value = String(value);
    q("output", row).textContent = String(value);
  }

  function renderAttentionCheck(trial) {
    const check = trial.attentionCheck;
    elements.attentionBanner.hidden = !check;
    if (!check) return;
    const position = state.candidateOrders[trial.id].indexOf(check.candidateId);
    elements.attentionPrompt.textContent = (check.prompt || "Follow the instruction carefully.").replaceAll(
      "{candidateLabel}",
      candidateLabel(position),
    );
  }

  function attachPlaybackTracking(video, trialId, mediaKey) {
    const stats = playbackStats(trialId, mediaKey);
    stats.mediaType = "video";
    let previousTime = null;

    video.addEventListener("play", () => {
      stats.playCount += 1;
      persist();
    });
    video.addEventListener("timeupdate", () => {
      const current = Number(video.currentTime) || 0;
      if (previousTime !== null) {
        const delta = current - previousTime;
        if (delta > 0 && delta < 1.5 && !video.paused) stats.watchedSeconds += delta;
      }
      stats.maxTimeSeconds = Math.max(stats.maxTimeSeconds, current);
      stats.durationSeconds = Number.isFinite(video.duration) ? video.duration : stats.durationSeconds;
      previousTime = current;
    });
    video.addEventListener("seeked", () => {
      previousTime = Number(video.currentTime) || 0;
    });
    video.addEventListener("pause", persist);
    video.addEventListener("ended", () => {
      stats.ended = true;
      persist();
    });
  }

  function playbackStats(trialId, mediaKey) {
    state.playback[trialId][mediaKey] ||= {
      mediaType: "video",
      playCount: 0,
      watchedSeconds: 0,
      maxTimeSeconds: 0,
      durationSeconds: null,
      ended: false,
    };
    return state.playback[trialId][mediaKey];
  }

  async function controlAllVideos(action) {
    const videos = qa("video:not([hidden])", elements.comparisonGrid);
    if (action === "pause") {
      videos.forEach((video) => video.pause());
      return;
    }
    await Promise.allSettled(
      videos.map(async (video) => {
        video.currentTime = 0;
        await video.play();
      }),
    );
  }

  function goPrevious() {
    pauseActiveTimer();
    activeTrialId = null;
    if (state.currentIndex === 0) {
      persist();
      elements.startButton.firstChild.textContent = "Resume study ";
      showOnly("intro");
      window.scrollTo({ top: 0, behavior: "smooth" });
      elements.intro.focus({ preventScroll: true });
      return;
    }
    state.currentIndex -= 1;
    persist();
    showTrial();
  }

  function goNext() {
    const trial = currentTrial();
    if (!validateTrial(trial)) return;
    completeTrialTiming(trial.id);

    if (state.currentIndex === config.trials.length - 1) {
      showReview();
      return;
    }
    state.currentIndex += 1;
    persist();
    showTrial();
  }

  function validateTrial(trial) {
    qa(".rating-row.invalid", elements.comparisonGrid).forEach((row) =>
      row.classList.remove("invalid"),
    );
    const missing = [];
    const candidateOrder = state.candidateOrders[trial.id];

    candidateOrder.forEach((candidateId, position) => {
      config.metrics
        .filter((metric) => metric.required !== false)
        .forEach((metric) => {
          const value = state.responses[trial.id]?.[candidateId]?.[metric.id];
          if (!Number.isFinite(value)) {
            missing.push(`${candidateLabel(position)} — ${metric.label}`);
            const row = q(
              `.rating-row[data-candidate-id="${cssEscape(candidateId)}"][data-metric-id="${cssEscape(metric.id)}"]`,
              elements.comparisonGrid,
            );
            row?.classList.add("invalid");
          }
        });
    });

    const minimumWatchSeconds = Number(config.playback?.minimumWatchSeconds) || 0;
    const insufficientPlayback = [];
    if (minimumWatchSeconds > 0) {
      ["reference", ...candidateOrder.map((id) => `candidate:${id}`)].forEach((mediaKey) => {
        const mediaStats = state.playback[trial.id]?.[mediaKey] || {};
        // GIFs have no browser playback timeline. Trial-level activeTimeMs still records dwell time.
        if (mediaStats.mediaType === "image/gif") return;
        const watched = Number(mediaStats.watchedSeconds) || 0;
        if (watched + 0.1 < minimumWatchSeconds) {
          insufficientPlayback.push(
            mediaKey === "reference"
              ? "Reference / GT"
              : candidateLabel(candidateOrder.indexOf(mediaKey.replace("candidate:", ""))),
          );
        }
      });
    }

    if (!missing.length && !insufficientPlayback.length) {
      elements.validationSummary.hidden = true;
      return true;
    }

    const messages = [];
    if (missing.length) {
      messages.push(
        `Complete ${missing.length} missing rating${missing.length === 1 ? "" : "s"}: ${missing
          .slice(0, 4)
          .join(", ")}${missing.length > 4 ? ", …" : ""}.`,
      );
    }
    if (insufficientPlayback.length) {
      messages.push(
        `Watch at least ${minimumWatchSeconds} seconds of: ${insufficientPlayback.join(", ")}.`,
      );
    }
    showError(elements.validationSummary, messages.join(" "));
    q(".rating-row.invalid", elements.comparisonGrid)?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    return false;
  }

  function beginTrialTiming(trialId) {
    pauseActiveTimer();
    const timing = state.timings[trialId];
    timing.firstViewedAt ||= nowIso();
    timing.lastViewedAt = nowIso();
    timing.visits += 1;
    activeTrialId = trialId;
    activeTimerStartedAt = document.hidden ? null : Date.now();
    persist();
  }

  function pauseActiveTimer() {
    if (!activeTrialId || !activeTimerStartedAt) return;
    const timing = state.timings[activeTrialId];
    timing.activeTimeMs += Math.max(0, Date.now() - activeTimerStartedAt);
    timing.lastViewedAt = nowIso();
    activeTimerStartedAt = null;
    persist();
  }

  function completeTrialTiming(trialId) {
    pauseActiveTimer();
    const timing = state.timings[trialId];
    timing.firstCompletedAt ||= nowIso();
    timing.responseTimeMs = Math.max(
      0,
      new Date(timing.firstCompletedAt).getTime() - new Date(timing.firstViewedAt).getTime(),
    );
    activeTrialId = null;
    persist();
  }

  function showReview() {
    pauseActiveTimer();
    activeTrialId = null;
    renderReviewList();
    elements.demoNotice.hidden = Boolean(config.submission?.endpoint);
    elements.submitButton.textContent = config.submission?.endpoint
      ? "Submit responses"
      : "Submission unavailable";
    elements.submitButton.disabled = !config.submission?.endpoint;
    elements.submitError.hidden = true;
    updateProgress(true);
    showOnly("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
    elements.review.focus({ preventScroll: true });
  }

  function renderReviewList() {
    elements.reviewList.replaceChildren(
      ...state.trialOrder.map((trialId, index) => {
        const trial = trialById(trialId);
        const item = document.createElement("div");
        item.className = "review-item";
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = `Trial ${String(index + 1).padStart(2, "0")} · ${trial.title}`;
        button.addEventListener("click", () => {
          state.currentIndex = index;
          persist();
          showTrial();
        });
        const status = document.createElement("span");
        status.textContent = "Complete ✓";
        item.append(button, status);
        return item;
      }),
    );
  }

  async function submitStudy() {
    elements.submitError.hidden = true;
    state.additionalComments = elements.finalComments.value.trim();
    lastPayload = buildPayload();
    elements.submitButton.disabled = true;

    if (!config.submission?.endpoint) {
      showError(
        elements.submitError,
        "Submission is not configured. Please contact the study administrator.",
      );
      return;
    }

    elements.submitButton.textContent = "Submitting…";
    try {
      const request = {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(lastPayload),
        redirect: "follow",
        keepalive: true,
      };
      if (config.submission.transport === "no-cors") request.mode = "no-cors";
      const response = await fetch(config.submission.endpoint, request);
      if (request.mode !== "no-cors" && !response.ok) {
        throw new Error(`The endpoint returned HTTP ${response.status}.`);
      }
      state.submittedAt = lastPayload.submittedAt;
      persist();
      showSuccess();
    } catch (error) {
      showError(
        elements.submitError,
        `Submission failed. Your ratings are still saved in this browser. ${error.message}`,
      );
      elements.submitButton.textContent = "Try submitting again";
    } finally {
      elements.submitButton.disabled = false;
    }
  }

  function buildPayload() {
    const submittedAt = state.submittedAt || nowIso();
    const trials = state.trialOrder.map((trialId, trialIndex) => {
      const trial = trialById(trialId);
      const order = state.candidateOrders[trialId];
      const attention = evaluateAttentionCheck(trial);
      return {
        trialIndex: trialIndex + 1,
        trialId,
        trialTitle: trial.title || "",
        candidateOrder: [...order],
        isAttentionCheck: Boolean(trial.attentionCheck),
        attentionCheckPassed: attention,
        timing: { ...state.timings[trialId] },
        playback: structuredCloneSafe(state.playback[trialId]),
        candidates: order.map((candidateId, position) => ({
          candidateId,
          displayPosition: position + 1,
          displayLabel: candidateLabel(position),
          scores: { ...(state.responses[trialId]?.[candidateId] || {}) },
        })),
      };
    });
    const checkedTrials = trials.filter((trial) => trial.isAttentionCheck);

    return {
      schemaVersion: "1.1",
      studyId: config.studyId,
      studyVersion: config.studyVersion,
      consentVersion: config.consentVersion,
      sessionId: state.sessionId,
      participantIdentifier: state.participantIdentifier || "",
      createdAt: state.createdAt,
      consentedAt: state.consentedAt,
      startedAt: state.startedAt,
      submittedAt,
      technical: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
        language: navigator.language || "",
        userAgent: navigator.userAgent || "",
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
      },
      randomization: {
        trialOrder: [...state.trialOrder],
        candidateOrders: structuredCloneSafe(state.candidateOrders),
      },
      scale: { ...config.ratingScale },
      metrics: config.metrics.map(({ id, label }) => ({ id, label })),
      attentionChecks: {
        total: checkedTrials.length,
        passed: checkedTrials.filter((trial) => trial.attentionCheckPassed).length,
        allPassed: checkedTrials.length
          ? checkedTrials.every((trial) => trial.attentionCheckPassed)
          : null,
      },
      trials,
      additionalComments: state.additionalComments || "",
    };
  }

  function evaluateAttentionCheck(trial) {
    const check = trial.attentionCheck;
    if (!check) return null;
    const score = state.responses[trial.id]?.[check.candidateId]?.[check.metricId];
    if (!Number.isFinite(score)) return false;
    return Math.abs(score - Number(check.expectedValue)) <= Number(check.tolerance || 0);
  }

  function showSuccess() {
    showOnly("success");
    updateProgress(true);
    elements.successMessage.textContent =
      "Your response was sent to the study collector. You may now close this page.";
    if (!lastPayload) lastPayload = buildPayload();
    window.scrollTo({ top: 0, behavior: "smooth" });
    elements.success.focus({ preventScroll: true });
  }

  function showOnly(viewName) {
    Object.entries({
      intro: elements.intro,
      trial: elements.trial,
      review: elements.review,
      success: elements.success,
    }).forEach(([name, element]) => {
      element.hidden = name !== viewName;
    });
    elements.progressWrap.hidden = !["trial", "review", "success"].includes(viewName);
  }

  function updateProgress(complete) {
    const value = complete
      ? 100
      : Math.round(((state.currentIndex + 1) / config.trials.length) * 100);
    elements.progressLabel.textContent = complete
      ? "All trials complete"
      : `Trial ${state.currentIndex + 1} of ${config.trials.length}`;
    elements.progressPercent.textContent = `${value}%`;
    elements.progressBar.style.width = `${value}%`;
    elements.progressTrack.setAttribute("aria-valuenow", String(value));
  }

  function showError(element, message) {
    element.textContent = message;
    element.hidden = false;
  }

  function currentTrial() {
    return trialById(state.trialOrder[state.currentIndex]);
  }

  function trialById(trialId) {
    return config.trials.find((trial) => trial.id === trialId);
  }

  function candidateLabel(position) {
    return `Candidate ${candidateLetters[position]}`;
  }

  function safeId(value) {
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "-");
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return window.CSS.escape(String(value));
    return String(value).replace(/["\\]/g, "\\$&");
  }

  function structuredCloneSafe(value) {
    if (window.structuredClone) return window.structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function persist(nextState = state) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextState));
    } catch (error) {
      console.warn("Progress could not be saved locally.", error);
    }
  }

})();

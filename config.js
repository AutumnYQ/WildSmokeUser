/**
 * EDIT THIS FILE to configure the study. No build step is required.
 *
 * Candidate IDs are saved in the dataset while participants only see randomized
 * labels such as Candidate A/B/C. Replace option_a/b/c with the real method names
 * when that mapping is known, and keep those IDs stable after data collection starts.
 */
window.STUDY_CONFIG = {
  studyId: "smoke-reconstruction-user-study-2026",
  studyVersion: "2.2.0",
  consentVersion: "1.1",

  title: "Smoke Reconstruction User Study",
  description:
    "Compare each reconstructed smoke animation with its ground-truth sequence and rate the reconstruction quality.",
  prompt:
    "Each candidate is paired with the same ground-truth animation. Rate every reconstruction independently rather than ranking the candidates.",
  estimatedTime: "8–12 minutes",
  tip: "Watch each animation for several loops before rating, especially when judging motion and temporal consistency.",
  instructions: [
    "Each candidate appears beside its ground-truth smoke animation for direct comparison.",
    "Watch every reconstructed candidate through several animation loops.",
    "Candidate order is randomized independently for each participant and each trial.",
    "Rate every candidate on all 1–7 scales. The midpoint is not selected until you move a slider.",
    "Judge only the current sequence and use the full scale when appropriate.",
  ],

  // This participant-facing identifier is stored separately from the internal anonymous session ID.
  requireParticipantIdentifier: true,
  participantIdentifierLabel: "Name or nickname/pseudonym",
  consentText:
    "I have read the information above and voluntarily agree to participate.",

  // Leave endpoint blank while testing. Paste the deployed Google Apps Script /exec URL here.
  submission: {
    endpoint: "https://script.google.com/macros/s/AKfycbysE6Mebw8cvN8qyovzmyo1cKK9uJAkrX2DMv8VTC6ZVZrzrD4mGdMxIf7Q5QLUrMKY/exec",
    // Google Apps Script is most reliable from GitHub Pages with a simple no-CORS POST.
    transport: "no-cors",
  },

  randomization: {
    candidateOrder: true,
    trialOrder: false,
  },

  playback: {
    // This validation applies to video files. GIF dwell time is captured by trial activeTimeMs.
    minimumWatchSeconds: 0,
    mutedByDefault: true,
  },

  ratingScale: {
    min: 1,
    max: 7,
    step: 1,
    lowLabel: "Poor",
    highLabel: "Excellent",
  },

  /**
   * Smoke-reconstruction metrics:
   * - Visual Quality captures rendering artifacts and perceptual cleanliness.
   * - Physical Motion focuses on flow dynamics rather than static appearance.
   * - Alignment with GT is the global space-time match to the reference.
   * - Temporal Consistency isolates animation artifacts from single-frame quality.
   * - Overall Quality captures the participant's holistic judgment.
   */
  metrics: [
    {
      id: "visual_quality",
      label: "Visual Quality",
      description: "Clarity and natural appearance, without distracting rendering artifacts or noise.",
      required: true,
    },
    {
      id: "physical_motion",
      label: "Physical Motion",
      description: "Plausibility of smoke advection, expansion, dissipation, and turbulent flow.",
      required: true,
    },
    {
      id: "gt_alignment",
      label: "Alignment with GT",
      description: "Overall frame-by-frame match to GT in position, shape, timing, and evolution.",
      required: true,
    },
    {
      id: "temporal_consistency",
      label: "Temporal Consistency",
      description: "Smooth evolution over time without flicker, popping, jitter, or discontinuities.",
      required: true,
    },
    {
      id: "overall_quality",
      label: "Overall Reconstruction Quality",
      description: "Overall fidelity and usefulness of this reconstruction relative to the GT sequence.",
      required: true,
    },
  ],

  /**
   * Google Form question 1 exposed only one target GIF and no separate candidate
   * files, so it is archived as assets/gifs/scene-01-composite.gif but omitted here.
   * Questions 2–7 form the six complete reference/candidate trials below.
   */
  trials: [
    {
      id: "smoke_01",
      title: "Smoke reconstruction 01",
      reference: {
        src: "assets/gifs/scene-02-reference.gif",
        caption: "Ground-truth smoke sequence",
      },
      candidates: [
        { id: "option_a", src: "assets/gifs/scene-02-method-a.gif", caption: "Smoke reconstruction" },
        { id: "option_b", src: "assets/gifs/scene-02-method-b.gif", caption: "Smoke reconstruction" },
        { id: "option_c", src: "assets/gifs/scene-02-method-c.gif", caption: "Smoke reconstruction" },
      ],
    },
    {
      id: "smoke_02",
      title: "Smoke reconstruction 02",
      reference: {
        src: "assets/gifs/scene-03-reference.gif",
        caption: "Ground-truth smoke sequence",
      },
      candidates: [
        { id: "option_a", src: "assets/gifs/scene-03-method-a.gif", caption: "Smoke reconstruction" },
        { id: "option_b", src: "assets/gifs/scene-03-method-b.gif", caption: "Smoke reconstruction" },
        { id: "option_c", src: "assets/gifs/scene-03-method-c.gif", caption: "Smoke reconstruction" },
      ],
    },
    {
      id: "smoke_03",
      title: "Smoke reconstruction 03",
      reference: {
        src: "assets/gifs/scene-04-reference.gif",
        caption: "Ground-truth smoke sequence",
      },
      candidates: [
        { id: "option_a", src: "assets/gifs/scene-04-method-a.gif", caption: "Smoke reconstruction" },
        { id: "option_b", src: "assets/gifs/scene-04-method-b.gif", caption: "Smoke reconstruction" },
        { id: "option_c", src: "assets/gifs/scene-04-method-c.gif", caption: "Smoke reconstruction" },
      ],
    },
    {
      id: "smoke_04",
      title: "Smoke reconstruction 04",
      reference: {
        src: "assets/gifs/scene-05-reference.gif",
        caption: "Ground-truth smoke sequence",
      },
      candidates: [
        { id: "option_a", src: "assets/gifs/scene-05-method-a.gif", caption: "Smoke reconstruction" },
        { id: "option_b", src: "assets/gifs/scene-05-method-b.gif", caption: "Smoke reconstruction" },
      ],
    },
    {
      id: "smoke_05",
      title: "Smoke reconstruction 05",
      reference: {
        src: "assets/gifs/scene-06-reference.gif",
        caption: "Ground-truth smoke sequence",
      },
      candidates: [
        { id: "option_a", src: "assets/gifs/scene-06-method-a.gif", caption: "Smoke reconstruction" },
        { id: "option_b", src: "assets/gifs/scene-06-method-b.gif", caption: "Smoke reconstruction" },
      ],
    },
    {
      id: "smoke_06",
      title: "Smoke reconstruction 06",
      reference: {
        src: "assets/gifs/scene-07-reference.gif",
        caption: "Ground-truth smoke sequence",
      },
      candidates: [
        { id: "option_a", src: "assets/gifs/scene-07-method-a.gif", caption: "Smoke reconstruction" },
        { id: "option_b", src: "assets/gifs/scene-07-method-b.gif", caption: "Smoke reconstruction" },
      ],
      // Optional instructional attention check:
      // attentionCheck: {
      //   metricId: "overall_quality",
      //   candidateId: "option_b",
      //   expectedValue: 6,
      //   tolerance: 0,
      //   prompt: "Attention check: set {candidateLabel}'s Overall Reconstruction Quality to 6.",
      // },
    },
  ],
};

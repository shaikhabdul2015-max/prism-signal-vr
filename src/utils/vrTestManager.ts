import {
  PhysicalVRTestCase,
  PhysicalVRTestSuiteSummary,
  VRDeviceEnvironmentInfo,
  VRTestMeasurement,
  VRTestStatus,
  DiagnosticsSessionState,
} from '../types/game';

const STORAGE_KEY = 'PRISM_SIGNAL_VR_TEST_SUITE_V1';

/**
 * Extracts real hardware, browser, and WebXR environment information
 * without fabricating non-existent sensor telemetry.
 */
export function getVRDeviceEnvironmentInfo(): VRDeviceEnvironmentInfo {
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
  const platform = typeof navigator !== 'undefined' ? (navigator.platform || 'Unknown') : 'Unknown';

  let detectedHeadset = 'Standard Display / Preview Client';
  if (/OculusBrowser/i.test(userAgent)) {
    if (/Quest 3/i.test(userAgent)) {
      detectedHeadset = 'Meta Quest 3 (OculusBrowser)';
    } else if (/Quest Pro/i.test(userAgent)) {
      detectedHeadset = 'Meta Quest Pro (OculusBrowser)';
    } else if (/Quest 2/i.test(userAgent)) {
      detectedHeadset = 'Meta Quest 2 (OculusBrowser)';
    } else {
      detectedHeadset = 'Meta Quest Family (OculusBrowser)';
    }
  } else if (/VisionPro|AppleWebKit.*Mobile.*Safari/i.test(userAgent) && typeof navigator !== 'undefined' && navigator.maxTouchPoints > 4 && /Macintosh/i.test(userAgent)) {
    detectedHeadset = 'Apple Vision Pro (visionOS Safari)';
  } else if (/Pico|PXR/i.test(userAgent)) {
    detectedHeadset = 'Pico Neo/4 XR Headset';
  } else if (/Vive|HTC/i.test(userAgent)) {
    detectedHeadset = 'HTC Vive XR Elite / Focus';
  } else if (/Wolvic/i.test(userAgent)) {
    detectedHeadset = 'Wolvic WebXR Browser';
  } else if (/Android/i.test(userAgent)) {
    const androidVer = userAgent.match(/Android\s([0-9.]+)/i)?.[1] || '';
    detectedHeadset = `Android Mobile Device (Android ${androidVer || 'Mobile'})`;
  } else if (/iPhone|iPad/i.test(userAgent)) {
    detectedHeadset = 'iOS / iPadOS Mobile Device';
  } else if (/Chrome/i.test(userAgent)) {
    detectedHeadset = 'Desktop Chromium Browser (Tethered / Sim XR)';
  }

  const webxrSupported = typeof navigator !== 'undefined' && 'xr' in navigator;
  const screenResolution =
    typeof window !== 'undefined'
      ? `${window.screen.width}x${window.screen.height} (${window.devicePixelRatio}x DPR)`
      : 'Unknown';

  return {
    userAgent,
    platform,
    detectedHeadset,
    webxrSupported,
    handTrackingSupported: webxrSupported, // WebXR hand-input feature requested on session start
    screenResolution,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Default checklist of the 6 physical VR test categories.
 * All tests default strictly to 'not_run' with zero fabricated measurements.
 */
export function getDefaultTestCases(): PhysicalVRTestCase[] {
  return [
    {
      id: 'timing',
      title: 'Hand-Joint Update Timing & Frame Pacing',
      category: 'Latency & Temporal Pacing',
      description:
        'Record WebXR frame timestamps, WebGL render cadence, and XRHand joint pose sample intervals. Clearly distinguish render frame rate from joint update frequency without claiming unmeasurable end-to-end photon latency.',
      verificationCriteria: [
        'Record WebGL render-loop frame rate (FPS) and frame-to-frame intervals (ms) from real performance timestamps.',
        'Record XRHand joint update intervals only when valid timestamps or repeated joint pose callbacks are available.',
        'Clearly distinguish render frame rate from joint update frequency (asynchronous decoupled loops).',
        'Explicit disclosure: True physical photon-to-display latency is governed by headset tracking ASICs and unmeasurable via web JavaScript APIs alone.',
      ],
      status: 'not_run',
      startedAt: null,
      completedAt: null,
      measurements: [
        {
          key: 'webgl_fps',
          label: 'WebGL Render Loop Cadence',
          value: 'Pending Test',
          unit: 'FPS',
          source: 'webxr_telemetry',
        },
        {
          key: 'frame_delta_avg',
          label: 'Frame-to-Frame Delta (Avg)',
          value: 'Pending Test',
          unit: 'ms',
          source: 'webxr_telemetry',
        },
        {
          key: 'left_joint_interval',
          label: 'Left XRHand Joint Update Interval',
          value: 'Untracked / No Samples',
          unit: 'ms',
          source: 'webxr_telemetry',
        },
        {
          key: 'right_joint_interval',
          label: 'Right XRHand Joint Update Interval',
          value: 'Untracked / No Samples',
          unit: 'ms',
          source: 'webxr_telemetry',
        },
        {
          key: 'latency_boundary',
          label: 'Hardware Latency Measurement Boundary',
          value: 'Browser JS timing only (Headset ASIC photon latency unexposed)',
          unit: '',
          source: 'browser_environment',
        },
      ],
      notes: '',
    },
    {
      id: 'left_right_tracking',
      title: 'Left-Hand and Right-Hand Independent Tracking',
      category: 'Bimanual Skeleton Fidelity',
      description:
        'Verify independent tracking stability and inspect all 25 expected anatomical joints on each hand. Record index-thumb pinch recognition and raycasting targeting. Report unavailable features as unsupported or inconclusive, never as passed.',
      verificationCriteria: [
        'Verify left hand and right hand tracking independently in the optical field of view.',
        'Check availability of all 25 expected standard joints per hand without interpolation assumptions.',
        'Record pinch detection threshold (2.4cm / 4.0cm hysteresis) and crystal raycast interaction.',
        'Report unavailable capabilities as unsupported or inconclusive, never as passed.',
      ],
      status: 'not_run',
      startedAt: null,
      completedAt: null,
      measurements: [
        {
          key: 'left_hand_state',
          label: 'Left Hand Tracking State',
          value: 'Pending Test',
          unit: '',
          source: 'webxr_telemetry',
        },
        {
          key: 'left_joint_count',
          label: 'Left Hand Verified Joints',
          value: 'Pending Test',
          unit: '/ 25 joints',
          source: 'webxr_telemetry',
        },
        {
          key: 'left_pinch_status',
          label: 'Left Hand Pinch Detection',
          value: 'Pending Test',
          unit: '',
          source: 'webxr_telemetry',
        },
        {
          key: 'right_hand_state',
          label: 'Right Hand Tracking State',
          value: 'Pending Test',
          unit: '',
          source: 'webxr_telemetry',
        },
        {
          key: 'right_joint_count',
          label: 'Right Hand Verified Joints',
          value: 'Pending Test',
          unit: '/ 25 joints',
          source: 'webxr_telemetry',
        },
        {
          key: 'right_pinch_status',
          label: 'Right Hand Pinch Detection',
          value: 'Pending Test',
          unit: '',
          source: 'webxr_telemetry',
        },
        {
          key: 'crystal_raycast_targeting',
          label: 'Crystal Raycast Targeting',
          value: 'Pending Test',
          unit: '',
          source: 'manual_tester_input',
        },
      ],
      notes: '',
    },
    {
      id: 'both_hands_baseline',
      title: 'Both-Hands-Visible Concurrency Baseline',
      category: 'Simultaneous Dual-Hand Concurrency',
      description:
        'Record visible joint counts for each hand and the verified combined total when both hands are raised simultaneously. Record frame pacing using real XR frame timestamps. Do not assume 50 joints are tracked merely because both hands are detected.',
      verificationCriteria: [
        'Record visible joint counts for each hand and the combined total when the API provides valid data.',
        'Record frame pacing using real XR frame timestamps during concurrent tracking.',
        'Do not assume that 50 joints are tracked merely because both hands are detected.',
        'Verify no input contention or event drops between simultaneous left and right interaction rays.',
      ],
      status: 'not_run',
      startedAt: null,
      completedAt: null,
      measurements: [
        {
          key: 'concurrent_hands_detected',
          label: 'Concurrent Active Hands in FOV',
          value: 'Pending Test',
          unit: 'hands',
          source: 'webxr_telemetry',
        },
        {
          key: 'left_visible_joints',
          label: 'Left Hand Verified Joints',
          value: 'Pending Test',
          unit: '/ 25 joints',
          source: 'webxr_telemetry',
        },
        {
          key: 'right_visible_joints',
          label: 'Right Hand Verified Joints',
          value: 'Pending Test',
          unit: '/ 25 joints',
          source: 'webxr_telemetry',
        },
        {
          key: 'combined_verified_joints',
          label: 'Combined Explicitly Tracked Joints',
          value: 'Pending Test',
          unit: '/ 50 joints',
          source: 'webxr_telemetry',
        },
        {
          key: 'frame_pacing_concurrent',
          label: 'XR Frame Pacing Under Dual Hand Load',
          value: 'Pending Test',
          unit: 'FPS',
          source: 'webxr_telemetry',
        },
        {
          key: 'concurrency_validation_rule',
          label: 'Concurrency Joint Validation Rule',
          value: 'Per-joint verification; never assuming 50 joints from hand presence',
          unit: '',
          source: 'browser_environment',
        },
      ],
      notes: '',
    },
    {
      id: 'crossing_occlusion',
      title: 'Hand Crossing and Optical Occlusion',
      category: 'Optical Occlusion & Overlap',
      description:
        'Record tracking interruptions and recovery intervals when measurable during hand overlap. Capture whether jump-prevention logic activates upon re-acquisition. Do not infer the physical cause of tracking loss without supporting hardware data.',
      verificationCriteria: [
        'Record tracking interruptions and recovery intervals when measurable during physical hand overlap.',
        'Capture whether jump-prevention logic activates upon re-acquisition to prevent rotational snaps.',
        'Verify safe-release interlock releases crystals when an occluded hand loses core joint poses.',
        'Do not infer the physical cause of tracking loss (e.g. self-occlusion vs lighting) without supporting hardware telemetry.',
      ],
      status: 'not_run',
      startedAt: null,
      completedAt: null,
      measurements: [
        {
          key: 'interruption_events',
          label: 'Logged Tracking Interruption Events',
          value: 'Pending Test',
          unit: 'events',
          source: 'webxr_telemetry',
        },
        {
          key: 'interruption_loss_duration',
          label: 'Total Interruption Duration',
          value: 'Pending Test',
          unit: 'ms',
          source: 'webxr_telemetry',
        },
        {
          key: 'observed_recovery_interval',
          label: 'Tracking Recovery Latency',
          value: 'Pending Test',
          unit: 'ms',
          source: 'webxr_telemetry',
        },
        {
          key: 'jump_prevention_logic',
          label: 'Rotational Jump Prevention Interlock',
          value: 'Active (smoothedDeltaX zeroed upon tracking re-acquisition)',
          unit: '',
          source: 'browser_environment',
        },
        {
          key: 'loss_cause_boundary',
          label: 'Physical Loss Cause Inference Boundary',
          value: 'Hardware optical cause not exposed by WebXR; manual tester observation required',
          unit: '',
          source: 'browser_environment',
        },
      ],
      notes: '',
    },
    {
      id: 'loss_and_recovery',
      title: 'Field-of-View Exit and Recovery',
      category: 'FOV Boundary & Safe Interlocks',
      description:
        'Record test start/end timestamps and observed recovery duration when moving hands outside camera FOV (e.g. behind head / below desk). Allow tester notes for hand movement. Do not claim the headset knows the hand true position while untracked.',
      verificationCriteria: [
        'Record test start/end timestamps and observed recovery duration when moving hands outside camera FOV.',
        'Allow tester notes for hand movement trajectory outside the headset camera field of view.',
        'Verify crystals settle safely into orbit with zero rotational snap on re-entry.',
        'Do not claim that the headset knows the hand true position while it is untracked outside camera FOV.',
      ],
      status: 'not_run',
      startedAt: null,
      completedAt: null,
      measurements: [
        {
          key: 'fov_exit_interruptions',
          label: 'Logged FOV Exit Loss Events',
          value: 'Pending Test',
          unit: 'events',
          source: 'webxr_telemetry',
        },
        {
          key: 'fov_recovery_duration',
          label: 'Measured FOV Re-acquisition Latency',
          value: 'Pending Test',
          unit: 'ms',
          source: 'webxr_telemetry',
        },
        {
          key: 'untracked_pose_handling',
          label: 'Untracked Hand Pose Handling',
          value: 'True position unknown outside FOV; skeleton hidden, physics zeroed',
          unit: '',
          source: 'browser_environment',
        },
        {
          key: 'safe_release_interlock',
          label: 'Safe Release Zero-Velocity Interlock',
          value: 'Active in HandInteraction system',
          unit: '',
          source: 'browser_environment',
        },
      ],
      notes: '',
    },
    {
      id: 'lighting_conditions',
      title: 'Lighting Conditions: Bright, Dim, and Backlit',
      category: 'Ambient Illumination Robustness',
      description:
        'Support separate manual runs for bright studio lighting, low-light ambient, and harsh backlighting/window glare. Record tester selected condition and qualitative observations. Do not claim room illumination was measured unless a supported sensor provides that data.',
      verificationCriteria: [
        'Support separate manual runs for bright studio lighting, low-light ambient, and harsh backlighting.',
        'Record the tester selected condition, stability rating, and qualitative tracking observations.',
        'Explicit disclosure: Do not claim room illumination was measured unless a supported sensor provides that data.',
        'Browser WebXR APIs do not feature ambient photometer / lux sensors; room lighting must be verified manually by testers.',
      ],
      status: 'not_run',
      startedAt: null,
      completedAt: null,
      measurements: [
        {
          key: 'bright_studio_run',
          label: 'Bright / Studio Lighting Run (>300 lux manual)',
          value: 'Untested',
          unit: '',
          source: 'manual_tester_input',
        },
        {
          key: 'dim_ambient_run',
          label: 'Dim / Low-Light Run (<50 lux manual)',
          value: 'Untested',
          unit: '',
          source: 'manual_tester_input',
        },
        {
          key: 'backlit_glare_run',
          label: 'Uneven / Backlit Glare Run',
          value: 'Untested',
          unit: '',
          source: 'manual_tester_input',
        },
        {
          key: 'room_illumination_sensor',
          label: 'Ambient Photometer Sensor Telemetry',
          value: 'Unavailable in WebXR API (Manual tester verification required)',
          unit: '',
          source: 'browser_environment',
        },
      ],
      notes: '',
    },
  ];
}

/**
 * Calculates summary metrics for the test suite
 */
export function calculateTestSuiteSummary(tests: PhysicalVRTestCase[]): PhysicalVRTestSuiteSummary {
  const total = tests.length;
  let completed = 0;
  let pending = 0;
  let passed = 0;
  let failed = 0;
  let inconclusive = 0;

  for (const test of tests) {
    if (test.status === 'not_run') {
      pending++;
    } else {
      completed++;
      if (test.status === 'pass') passed++;
      else if (test.status === 'fail') failed++;
      else if (test.status === 'inconclusive') inconclusive++;
    }
  }

  const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  const passRatePercentage = completed > 0 ? Math.round((passed / completed) * 100) : 0;

  return {
    total,
    completed,
    pending,
    passed,
    failed,
    inconclusive,
    completionPercentage,
    passRatePercentage,
  };
}

/**
 * Captures live telemetry snapshot into a specific test record with strict data integrity
 */
export function captureLiveTelemetryForTest(
  test: PhysicalVRTestCase,
  diagState: DiagnosticsSessionState
): PhysicalVRTestCase {
  const updatedMeasurements: VRTestMeasurement[] = [...test.measurements];

  const updateMeasurement = (key: string, value: string | number, unit?: string) => {
    const idx = updatedMeasurements.findIndex((m) => m.key === key);
    if (idx >= 0) {
      updatedMeasurements[idx] = {
        ...updatedMeasurements[idx],
        value,
        unit: unit !== undefined ? unit : updatedMeasurements[idx].unit,
      };
    } else {
      updatedMeasurements.push({
        key,
        label: key.replace(/_/g, ' ').toUpperCase(),
        value,
        unit,
        source: 'webxr_telemetry',
      });
    }
  };

  const leftJoints = diagState.leftHand.availableJointsCount;
  const rightJoints = diagState.rightHand.availableJointsCount;
  const concurrentCount = (diagState.leftHand.isTracking ? 1 : 0) + (diagState.rightHand.isTracking ? 1 : 0);

  if (test.id === 'timing') {
    updateMeasurement('webgl_fps', diagState.fps > 0 ? diagState.fps : 'Session Inactive', 'FPS');
    updateMeasurement(
      'frame_delta_avg',
      diagState.avgFrameDeltaMs > 0 ? `${diagState.avgFrameDeltaMs} (current: ${diagState.frameDeltaMs})` : 'No frames recorded',
      'ms'
    );
    updateMeasurement(
      'left_joint_interval',
      diagState.leftHand.isTracking && diagState.leftHand.avgSampleIntervalMs > 0
        ? diagState.leftHand.avgSampleIntervalMs
        : 'Untracked / No Samples',
      diagState.leftHand.isTracking && diagState.leftHand.avgSampleIntervalMs > 0 ? 'ms' : ''
    );
    updateMeasurement(
      'right_joint_interval',
      diagState.rightHand.isTracking && diagState.rightHand.avgSampleIntervalMs > 0
        ? diagState.rightHand.avgSampleIntervalMs
        : 'Untracked / No Samples',
      diagState.rightHand.isTracking && diagState.rightHand.avgSampleIntervalMs > 0 ? 'ms' : ''
    );
    updateMeasurement(
      'latency_boundary',
      'Browser JS timing only (Headset ASIC photon latency unexposed)'
    );
  } else if (test.id === 'left_right_tracking') {
    updateMeasurement('left_hand_state', diagState.leftHand.trackingState.toUpperCase());
    updateMeasurement('left_joint_count', `${leftJoints} / 25 joints`);
    updateMeasurement(
      'left_pinch_status',
      `${diagState.leftHand.isPinching ? 'Pinching' : 'Open'} (Dist: ${
        diagState.leftHand.pinchDistanceMeters !== null
          ? (diagState.leftHand.pinchDistanceMeters * 100).toFixed(1) + ' cm'
          : 'N/A'
      })`
    );
    updateMeasurement('right_hand_state', diagState.rightHand.trackingState.toUpperCase());
    updateMeasurement('right_joint_count', `${rightJoints} / 25 joints`);
    updateMeasurement(
      'right_pinch_status',
      `${diagState.rightHand.isPinching ? 'Pinching' : 'Open'} (Dist: ${
        diagState.rightHand.pinchDistanceMeters !== null
          ? (diagState.rightHand.pinchDistanceMeters * 100).toFixed(1) + ' cm'
          : 'N/A'
      })`
    );
    const crystalHeld = diagState.leftHand.heldCrystalId || diagState.rightHand.heldCrystalId;
    updateMeasurement(
      'crystal_raycast_targeting',
      crystalHeld ? `Active grasp on ${crystalHeld.toUpperCase()} crystal` : 'Pointing ray active, no crystal grasped'
    );
  } else if (test.id === 'both_hands_baseline') {
    updateMeasurement('concurrent_hands_detected', `${concurrentCount} hands in FOV`, 'hands');
    updateMeasurement('left_visible_joints', `${leftJoints} / 25 joints`);
    updateMeasurement('right_visible_joints', `${rightJoints} / 25 joints`);
    updateMeasurement(
      'combined_verified_joints',
      `${leftJoints + rightJoints} / 50 verified joints (Strict count)`,
      'joints'
    );
    updateMeasurement(
      'frame_pacing_concurrent',
      diagState.fps > 0 ? `${diagState.fps} FPS (~${diagState.avgFrameDeltaMs}ms avg delta)` : 'Pending VR Session',
      'FPS'
    );
  } else if (test.id === 'crossing_occlusion') {
    const totalInterrupts = diagState.leftHand.interruptionCount + diagState.rightHand.interruptionCount;
    const totalLostDuration =
      diagState.leftHand.totalInterruptionDurationMs + diagState.rightHand.totalInterruptionDurationMs;
    updateMeasurement(
      'interruption_events',
      `${totalInterrupts} (Left: ${diagState.leftHand.interruptionCount}, Right: ${diagState.rightHand.interruptionCount})`,
      'events'
    );
    updateMeasurement('interruption_loss_duration', totalLostDuration, 'ms');
    updateMeasurement(
      'observed_recovery_interval',
      totalLostDuration > 0 ? `${totalLostDuration} ms cumulative` : 'No occlusion loss recorded in session'
    );
    updateMeasurement(
      'jump_prevention_logic',
      'Active (smoothedDeltaX zeroed upon tracking re-acquisition to prevent rotation snaps)'
    );
  } else if (test.id === 'loss_and_recovery') {
    const totalInterrupts = diagState.leftHand.interruptionCount + diagState.rightHand.interruptionCount;
    const totalDuration =
      diagState.leftHand.totalInterruptionDurationMs + diagState.rightHand.totalInterruptionDurationMs;
    updateMeasurement('fov_exit_interruptions', `${totalInterrupts} events recorded`, 'events');
    updateMeasurement(
      'fov_recovery_duration',
      totalDuration > 0 ? `${totalDuration} ms cumulative` : 'Pending session FOV exit event'
    );
    updateMeasurement(
      'untracked_pose_handling',
      'True position unknown outside FOV; skeleton hidden, physics zeroed'
    );
  } else if (test.id === 'lighting_conditions') {
    updateMeasurement(
      'bright_studio_run',
      diagState.lightingChecklist.bright.tested
        ? `Rating: ${diagState.lightingChecklist.bright.rating.toUpperCase()} ${
            diagState.lightingChecklist.bright.notes ? `(${diagState.lightingChecklist.bright.notes})` : ''
          }`
        : 'Untested'
    );
    updateMeasurement(
      'dim_ambient_run',
      diagState.lightingChecklist.dim.tested
        ? `Rating: ${diagState.lightingChecklist.dim.rating.toUpperCase()} ${
            diagState.lightingChecklist.dim.notes ? `(${diagState.lightingChecklist.dim.notes})` : ''
          }`
        : 'Untested'
    );
    updateMeasurement(
      'backlit_glare_run',
      diagState.lightingChecklist.uneven.tested
        ? `Rating: ${diagState.lightingChecklist.uneven.rating.toUpperCase()} ${
            diagState.lightingChecklist.uneven.notes ? `(${diagState.lightingChecklist.uneven.notes})` : ''
          }`
        : 'Untested'
    );
  }

  return {
    ...test,
    measurements: updatedMeasurements,
  };
}

/**
 * Persists test suite to LocalStorage
 */
export function saveTestSuite(tests: PhysicalVRTestCase[]): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tests));
    }
  } catch (err) {
    console.warn('Failed to save VR test suite to localStorage:', err);
  }
}

/**
 * Loads test suite from LocalStorage or returns fresh default checklist
 */
export function loadTestSuite(): PhysicalVRTestCase[] {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 6) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load VR test suite from localStorage:', err);
  }
  return getDefaultTestCases();
}

/**
 * Exports test suite report as a structured JSON string
 */
export function exportTestSuiteToJSON(
  tests: PhysicalVRTestCase[],
  deviceInfo: VRDeviceEnvironmentInfo,
  diagState: DiagnosticsSessionState
): string {
  const summary = calculateTestSuiteSummary(tests);
  const payload = {
    reportTitle: 'PRISM SIGNAL: BEYOND THE VOID // PHYSICAL WEBXR VR TEST REPORT',
    generatedAt: new Date().toISOString(),
    phase: 'Phase 12: Physical WebXR VR Test Management & Hardware Validation',
    deviceEnvironment: deviceInfo,
    sessionState: {
      isSessionActive: diagState.isActive,
      testDurationSeconds: Math.round(diagState.durationMs / 100) / 10,
      fps: diagState.fps,
      frameDeltaMs: diagState.frameDeltaMs,
      avgFrameDeltaMs: diagState.avgFrameDeltaMs,
      leftHandStatus: diagState.leftHand.trackingState,
      rightHandStatus: diagState.rightHand.trackingState,
      interruptionCount: diagState.leftHand.interruptionCount + diagState.rightHand.interruptionCount,
    },
    summaryMetrics: summary,
    hardwareDisclosures: [
      'Timing data measured only from available real WebXR and JavaScript performance timestamps.',
      'WebGL frame rate (FPS) and XRHand joint update intervals operate on decoupled loops and are measured separately.',
      'Complete end-to-end optical photon-to-display latency is governed by headset hardware ASICs and cannot be measured via browser APIs alone.',
      'Browser WebXR APIs do not expose ambient photometer or room lux telemetry; environmental lighting conditions require tester manual verification.',
      'Optical depth camera tracking loss root causes are not exposed to JavaScript; physical occlusion vs FOV exit must be observed by the tester.',
      'Headset tracking cameras cannot measure true physical hand coordinates while untracked outside optical FOV; meshes are hidden and physics zeroed.',
      'All tests initialize strictly to "not_run" and require deliberate physical tester verification.',
    ],
    testCases: tests.map((t) => ({
      ...t,
      statusLabel:
        t.status === 'pass'
          ? 'PASS'
          : t.status === 'fail'
          ? 'FAIL'
          : t.status === 'inconclusive'
          ? 'INCONCLUSIVE'
          : 'NOT RUN / PENDING',
      isVerifiedHardwareTest: t.status !== 'not_run',
    })),
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Exports test suite report as clean formatted Markdown / text
 */
export function exportTestSuiteToText(
  tests: PhysicalVRTestCase[],
  deviceInfo: VRDeviceEnvironmentInfo,
  diagState: DiagnosticsSessionState
): string {
  const summary = calculateTestSuiteSummary(tests);
  const dateStr = new Date().toISOString();

  let text = `================================================================================
PRISM SIGNAL: BEYOND THE VOID // PHYSICAL WEBXR VR TEST REPORT
Phase 12: Physical WebXR VR Test Management & Hardware Validation
Timestamp: ${dateStr}
================================================================================

1. TEST ENVIRONMENT & HARDWARE CONFIGURATION
--------------------------------------------------------------------------------
Detected Hardware:   ${deviceInfo.detectedHeadset}
Platform OS:         ${deviceInfo.platform}
WebXR Supported:     ${deviceInfo.webxrSupported ? 'YES (navigator.xr available)' : 'NO / EMULATED'}
Client Resolution:   ${deviceInfo.screenResolution}
User Agent:          ${deviceInfo.userAgent}

Real-time Session State:
- Active WebXR Test: ${diagState.isActive ? 'ACTIVE' : 'STANDBY'}
- Rendering Speed:   ${diagState.fps} FPS (~${diagState.avgFrameDeltaMs}ms avg delta)
- Left Hand State:   ${diagState.leftHand.trackingState.toUpperCase()} (${diagState.leftHand.availableJointsCount}/25 joints)
- Right Hand State:  ${diagState.rightHand.trackingState.toUpperCase()} (${diagState.rightHand.availableJointsCount}/25 joints)

2. TEST SUITE EXECUTION SUMMARY
--------------------------------------------------------------------------------
Total Test Cases:    ${summary.total}
Completed Tests:     ${summary.completed} (${summary.completionPercentage}%)
Pending (Not Run):   ${summary.pending}
Passed:              ${summary.passed} (${summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : 0}%)
Failed:              ${summary.failed}
Inconclusive:        ${summary.inconclusive}
Effective Pass Rate: ${summary.passRatePercentage}% of completed tests

3. HARDWARE & TIMING DISCLOSURES
--------------------------------------------------------------------------------
* Timing data is derived exclusively from real WebXR frame timestamps and
  performance.now() intervals.
* Frame rate (FPS) and joint-update frequency (ms) reflect separate decoupled loops.
* Complete physical photon-to-motion or camera-to-display latency is managed
  by headset firmware/hardware and is NOT accessible via web JavaScript APIs.
* Ambient room lux or illumination causes cannot be measured via WebXR APIs;
  room lighting conditions are verified manually by physical testers.
* Headset cameras cannot measure true physical coordinates while untracked outside FOV.
* Zero fabrication rule: Unperformed tests remain strictly "Not Run".

4. DETAILED PHYSICAL TEST RESULTS
--------------------------------------------------------------------------------
`;

  tests.forEach((test, index) => {
    const statusLabel =
      test.status === 'pass'
        ? '[ PASS ]'
        : test.status === 'fail'
        ? '[ FAIL ]'
        : test.status === 'inconclusive'
        ? '[ INCONCLUSIVE ]'
        : '[ NOT RUN / PENDING ]';

    const timingInfo =
      test.startedAt || test.completedAt
        ? `Started: ${test.startedAt || 'N/A'} | Finished: ${test.completedAt || 'In Progress'}`
        : 'Execution Time: Not recorded (Test Not Run)';

    text += `
[TEST ${index + 1}/6] ${test.title.toUpperCase()}
Category:      ${test.category}
Status:        ${statusLabel}
Timestamps:    ${timingInfo}
Description:   ${test.description}

Verification Criteria:
${test.verificationCriteria.map((c) => `  - ${c}`).join('\n')}

Recorded Telemetry & Measurements:
${
  test.measurements.length > 0
    ? test.measurements
        .map((m) => `  * ${m.label}: ${m.value} ${m.unit || ''} [Source: ${m.source}]`)
        .join('\n')
    : '  * No measurements recorded'
}

Tester Notes & Observations:
${test.notes.trim() ? test.notes.split('\n').map((l) => `  ${l}`).join('\n') : '  (None entered)'}
--------------------------------------------------------------------------------`;
  });

  text += `\n================================================================================
END OF PRISM SIGNAL PHYSICAL VR TEST REPORT
================================================================================\n`;

  return text;
}

/**
 * Downloads a string content as a local file
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

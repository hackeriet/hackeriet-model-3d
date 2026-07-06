(() => {
  const elements = {
    navigationSelect: getRequiredElement('#navigation-select'),
    detailSelect: getRequiredElement('#detail-select'),
    pointShapeSelect: getRequiredElement('#point-shape-select'),
    pointSizeRange: getRequiredElement('#point-size-range'),
    pointSizeValue: getRequiredElement('#point-size-value'),
    pointMinSizeRange: getRequiredElement('#point-min-size-range'),
    pointMinSizeValue: getRequiredElement('#point-min-size-value'),
    toggleNavigationButton: getRequiredElement('#toggle-navigation'),
    resetViewButton: getRequiredElement('#reset-view'),
    loadingMessage: getRequiredElement('.viewer-message'),
    loadingLabel: getRequiredElement('#loading-label'),
    loadingProgress: getRequiredElement('#loading-progress'),
    navigationDataToggle: getRequiredElement('#show-navigation-data'),
    navigationData: getRequiredElement('#navigation-data'),
    potreeHost: getRequiredElement('#potree-viewer'),
    renderArea: getRequiredElement('#potree-render-area'),
  };

  const initialView = {
    position: [-12.95, 3.55, 1.81],
    target: [-13.15, 1.20, 1.40],
  };

  const detailPresets = {
    balanced: {
      pointBudget: 3_000_000,
      minNodeSize: 30,
      maxNodesLoading: 4,
    },
    high: {
      pointBudget: 8_000_000,
      minNodeSize: 10,
      maxNodesLoading: 10,
    },
    maximum: {
      pointBudget: 9_000_000,
      minNodeSize: 4,
      maxNodesLoading: 16,
    },
  };

  const pointShapes = {
    SQUARE: Potree.PointShape.SQUARE,
    CIRCLE: Potree.PointShape.CIRCLE,
    PARABOLOID: Potree.PointShape.PARABOLOID,
  };

  const moveSpeeds = {
    walk: 0.8,
    fly: 0.9,
    orbit: 0.8,
  };

  const state = {
    navigationEnabled: true,
    potreeViewer: null,
    pointcloud: null,
    loadingMonitorId: null,
    navigationDataFrameId: null,
  };

  elements.navigationSelect.addEventListener('change', () => {
    applyNavigationMode(elements.navigationSelect.value);
  });

  elements.detailSelect.addEventListener('change', () => {
    applyDetailPreset(elements.detailSelect.value);
  });

  elements.pointShapeSelect.addEventListener('change', applyPointRenderingControls);
  elements.pointSizeRange.addEventListener('input', applyPointRenderingControls);
  elements.pointMinSizeRange.addEventListener('input', applyPointRenderingControls);

  elements.navigationDataToggle.addEventListener('change', () => {
    setNavigationDataVisible(elements.navigationDataToggle.checked);
  });

  elements.toggleNavigationButton.addEventListener('click', () => {
    setNavigationEnabled(!state.navigationEnabled);
  });

  elements.resetViewButton.addEventListener('click', resetPotreeView);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && state.navigationEnabled) {
      setNavigationEnabled(false);
    }
  });

  setNavigationEnabled(state.navigationEnabled);
  startPotreeViewer();

  function startPotreeViewer() {
    const source = elements.potreeHost.dataset.source;

    try {
      elements.potreeHost.dataset.status = 'loading';
      setLoadingProgress('Starting point cloud viewer...', null);

      state.potreeViewer = new Potree.Viewer(elements.renderArea);
      configurePotreeViewer(state.potreeViewer);
      setLoadingProgress('Loading point cloud metadata...', 15);

      Potree.loadPointCloud(source, 'Hackeriet', event => {
        state.pointcloud = event.pointcloud;
        configurePointCloud(state.pointcloud);
        state.potreeViewer.scene.addPointCloud(state.pointcloud);
        resetPotreeView();
        setLoadingProgress('Preparing visible points...', 45);
        elements.potreeHost.dataset.status = 'loaded';
        monitorInitialPointLoading();
      });
    } catch (error) {
      elements.potreeHost.dataset.status = 'error';
      setLoadingProgress(`Could not start Potree viewer: ${error.message || error}`, 0);
    }
  }

  function configurePotreeViewer(viewer) {
    viewer.setEDLEnabled(true);
    viewer.setFOV(55);
    viewer.setBackground('gradient');
    applyDetailPreset(elements.detailSelect.value);
    viewer.loadSettingsFromURL();
  }

  function configurePointCloud(pointcloud) {
    const material = pointcloud.material;

    material.activeAttributeName = 'rgba';
    material.pointSizeType = Potree.PointSizeType.ADAPTIVE;
    applyPointRenderingControls();
  }

  function applyPointRenderingControls() {
    const size = Number(elements.pointSizeRange.value);
    const minSize = Number(elements.pointMinSizeRange.value);

    elements.pointSizeValue.textContent = size.toFixed(1);
    elements.pointMinSizeValue.textContent = minSize.toFixed(1);

    if (!state.pointcloud) {
      return;
    }

    const material = state.pointcloud.material;
    material.size = size;
    material.minSize = minSize;
    material.shape = pointShapes[elements.pointShapeSelect.value] || Potree.PointShape.SQUARE;
  }

  function applyDetailPreset(name) {
    const preset = detailPresets[name] || detailPresets.high;

    Potree.maxNodesLoading = preset.maxNodesLoading;

    if (state.potreeViewer) {
      state.potreeViewer.setPointBudget(preset.pointBudget);
      state.potreeViewer.setMinNodeSize(preset.minNodeSize);
    }
  }

  function monitorInitialPointLoading() {
    cancelAnimationFrame(state.loadingMonitorId);

    const startedAt = performance.now();
    const settleDelay = 900;
    let visualProgress = 45;
    let idleSince = null;

    const tick = () => {
      const visibleNodes = state.pointcloud?.visibleNodes?.length || 0;
      const isIdle = Potree.numNodesLoading === 0 && visibleNodes > 0;

      if (isIdle) {
        idleSince ||= performance.now();
      } else {
        idleSince = null;
      }

      const elapsed = performance.now() - startedAt;
      const hasTimedOutWithPoints = elapsed > 12_000 && visibleNodes > 0;

      if ((idleSince && performance.now() - idleSince > settleDelay) || hasTimedOutWithPoints) {
        setLoadingProgress('Point cloud ready.', 100);
        window.setTimeout(() => {
          elements.loadingMessage?.remove();
        }, 250);
        return;
      }

      visualProgress = Math.min(92, Math.max(visualProgress, 45 + elapsed / 120));
      const loadingSuffix = Potree.numNodesLoading > 0 ? ` (${Potree.numNodesLoading} nodes)` : '';
      setLoadingProgress(`Preparing visible points${loadingSuffix}...`, visualProgress);
      state.loadingMonitorId = requestAnimationFrame(tick);
    };

    state.loadingMonitorId = requestAnimationFrame(tick);
  }

  function setLoadingProgress(label, value) {
    elements.loadingLabel.textContent = label;

    if (value === null) {
      elements.loadingProgress.removeAttribute('value');
      return;
    }

    elements.loadingProgress.value = Math.max(0, Math.min(100, value));
  }

  function applyNavigationMode(mode) {
    const viewer = state.potreeViewer;
    if (!viewer) {
      return;
    }

    if (mode === 'orbit') {
      viewer.setControls(viewer.orbitControls);
      viewer.setMoveSpeed(moveSpeeds.orbit);
      return;
    }

    viewer.setControls(viewer.fpControls);
    viewer.fpControls.lockElevation = mode !== 'fly';
    viewer.setMoveSpeed(mode === 'fly' ? moveSpeeds.fly : moveSpeeds.walk);
  }

  function resetPotreeView() {
    const viewer = state.potreeViewer;
    if (!viewer) {
      return;
    }

    const view = viewer.scene.view;
    view.position.set(...initialView.position);
    view.lookAt(...initialView.target);
    applyNavigationMode(elements.navigationSelect.value);
    updateNavigationData();
  }

  function setNavigationDataVisible(visible) {
    elements.navigationData.hidden = !visible;
    cancelAnimationFrame(state.navigationDataFrameId);
    state.navigationDataFrameId = null;

    if (!visible) {
      return;
    }

    const tick = () => {
      updateNavigationData();
      state.navigationDataFrameId = requestAnimationFrame(tick);
    };

    tick();
  }

  function updateNavigationData() {
    const viewer = state.potreeViewer;
    if (!viewer || elements.navigationData.hidden) {
      return;
    }

    const view = viewer.scene.view;
    const position = view.position;
    const target = view.getPivot();
    const direction = view.direction;
    const yawDegrees = normalizeDegrees(radiansToDegrees(view.yaw));
    const pitchDegrees = radiansToDegrees(view.pitch);

    elements.navigationData.textContent = [
      'Position: ' + formatVector(position),
      'Target:   ' + formatVector(target),
      'Yaw: ' + formatNumber(yawDegrees) + ' deg  Pitch: ' + formatNumber(pitchDegrees) + ' deg',
      'Radius: ' + formatNumber(view.radius),
      'Direction: ' + formatVector(direction, 3),
    ].join('\n');
  }

  function formatVector(vector, decimals = 2) {
    return 'x=' + formatNumber(vector.x, decimals)
      + ' y=' + formatNumber(vector.y, decimals)
      + ' z=' + formatNumber(vector.z, decimals);
  }

  function formatNumber(value, decimals = 1) {
    return Number(value).toFixed(decimals);
  }

  function radiansToDegrees(radians) {
    return radians * 180 / Math.PI;
  }

  function normalizeDegrees(degrees) {
    return ((degrees % 360) + 360) % 360;
  }

  function getRequiredElement(selector) {
    const element = document.querySelector(selector);

    if (!element) {
      throw new Error(`Missing required element: ${selector}`);
    }

    return element;
  }

  function setNavigationEnabled(enabled) {
    state.navigationEnabled = enabled;
    elements.potreeHost.classList.toggle('navigation-active', state.navigationEnabled);
    elements.toggleNavigationButton.textContent = state.navigationEnabled ? 'Release scroll' : 'Enable navigation';
    elements.toggleNavigationButton.setAttribute('aria-pressed', String(state.navigationEnabled));
  }
})();

(() => {
  const elements = {
    viewerSelect: document.querySelector('#viewer-select'),
    navigationSelect: document.querySelector('#navigation-select'),
    toggleNavigationButton: document.querySelector('#toggle-navigation'),
    overlayNavigationButton: document.querySelector('#potree-enable-navigation'),
    resetViewButton: document.querySelector('#reset-view'),
    panels: document.querySelectorAll('[data-viewer-panel]'),
  };

  const initialView = {
    position: [-6.3, -6.0, 3.35],
    target: [-6.3, 10.5, 2.75],
  };

  const moveSpeeds = {
    walk: 0.8,
    fly: 0.9,
    orbit: 0.8,
  };

  const state = {
    navigationEnabled: false,
    potreeStarted: false,
    potreeViewer: null,
    potreeHost: null,
  };

  elements.viewerSelect.addEventListener('change', () => {
    showViewer(elements.viewerSelect.value);
  });

  elements.navigationSelect.addEventListener('change', () => {
    applyNavigationMode(elements.navigationSelect.value);
  });

  elements.toggleNavigationButton.addEventListener('click', () => {
    setNavigationEnabled(!state.navigationEnabled);
  });

  elements.overlayNavigationButton.addEventListener('click', () => {
    setNavigationEnabled(true);
  });

  elements.resetViewButton.addEventListener('click', resetPotreeView);

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && state.navigationEnabled) {
      setNavigationEnabled(false);
    }
  });

  const initialViewer = new URLSearchParams(window.location.search).get('viewer');
  if (initialViewer === 'potree' || initialViewer === 'point-cloud') {
    elements.viewerSelect.value = 'potree';
  }

  showViewer(elements.viewerSelect.value);

  function showViewer(selectedViewer) {
    for (const panel of elements.panels) {
      panel.hidden = panel.dataset.viewerPanel !== selectedViewer;
    }

    const isPointCloud = selectedViewer === 'potree';
    setPointCloudControlsEnabled(isPointCloud);

    if (!isPointCloud) {
      setNavigationEnabled(false);
      return;
    }

    if (!state.potreeStarted) {
      state.potreeStarted = true;
      startPotreeViewer();
    }
  }

  function setPointCloudControlsEnabled(enabled) {
    elements.navigationSelect.disabled = !enabled;
    elements.toggleNavigationButton.disabled = !enabled;
    elements.resetViewButton.disabled = !enabled;
  }

  function startPotreeViewer() {
    state.potreeHost = document.querySelector('#potree-viewer');
    const source = state.potreeHost.dataset.source;
    const message = state.potreeHost.querySelector('.viewer-message');
    const renderArea = document.querySelector('#potree-render-area');

    try {
      state.potreeHost.dataset.status = 'loading';
      state.potreeViewer = new Potree.Viewer(renderArea);
      configurePotreeViewer(state.potreeViewer);

      Potree.loadPointCloud(source, 'Hackeriet', event => {
        configurePointCloud(event.pointcloud);
        state.potreeViewer.scene.addPointCloud(event.pointcloud);
        resetPotreeView();
        message.remove();
        state.potreeHost.dataset.status = 'loaded';
      });
    } catch (error) {
      state.potreeHost.dataset.status = 'error';
      message.textContent = `Could not start Potree viewer: ${error.message || error}`;
    }
  }

  function configurePotreeViewer(viewer) {
    viewer.setEDLEnabled(true);
    viewer.setFOV(65);
    viewer.setPointBudget(3_000_000);
    viewer.setBackground('gradient');
    viewer.loadSettingsFromURL();
  }

  function configurePointCloud(pointcloud) {
    const material = pointcloud.material;

    material.activeAttributeName = 'rgba';
    material.size = 0.8;
    material.minSize = 1.5;
    material.pointSizeType = Potree.PointSizeType.ADAPTIVE;
    material.shape = Potree.PointShape.SQUARE;
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
  }

  function setNavigationEnabled(enabled) {
    state.navigationEnabled = enabled && elements.viewerSelect.value === 'potree';

    if (state.potreeHost) {
      state.potreeHost.classList.toggle('navigation-active', state.navigationEnabled);
    }

    elements.toggleNavigationButton.textContent = state.navigationEnabled ? 'Release scroll' : 'Enable navigation';
    elements.toggleNavigationButton.setAttribute('aria-pressed', String(state.navigationEnabled));
  }
})();

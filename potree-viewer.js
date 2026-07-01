const viewerSelect = document.querySelector('#viewer-select');
const navigationSelect = document.querySelector('#navigation-select');
const toggleNavigationButton = document.querySelector('#toggle-navigation');
const overlayNavigationButton = document.querySelector('#potree-enable-navigation');
const resetViewButton = document.querySelector('#reset-view');
const panels = document.querySelectorAll('[data-viewer-panel]');

const defaultView = {
  position: [-6.3, -17.5, 3.8],
  target: [-6.3, -1.0, 3.2],
  moveSpeed: 1.2,
};

let potreeStarted = false;
let potreeViewer = null;
let potreeHost = null;
let navigationEnabled = false;

viewerSelect.addEventListener('change', () => {
  showViewer(viewerSelect.value);
});

navigationSelect.addEventListener('change', () => {
  applyNavigationMode(navigationSelect.value);
});

toggleNavigationButton.addEventListener('click', () => {
  setNavigationEnabled(!navigationEnabled);
});

overlayNavigationButton.addEventListener('click', () => {
  setNavigationEnabled(true);
});

resetViewButton.addEventListener('click', () => {
  resetPotreeView();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && navigationEnabled) {
    setNavigationEnabled(false);
  }
});

const initialViewer = new URLSearchParams(window.location.search).get('viewer');
if (initialViewer === 'potree' || initialViewer === 'point-cloud') {
  viewerSelect.value = 'potree';
}

showViewer(viewerSelect.value);

function showViewer(selected) {
  for (const panel of panels) {
    panel.hidden = panel.dataset.viewerPanel !== selected;
  }

  const pointCloudSelected = selected === 'potree';
  navigationSelect.disabled = !pointCloudSelected;
  toggleNavigationButton.disabled = !pointCloudSelected;
  resetViewButton.disabled = !pointCloudSelected;

  if (!pointCloudSelected) {
    setNavigationEnabled(false);
    return;
  }

  if (!potreeStarted) {
    potreeStarted = true;
    startPotreeViewer();
  }
}

function startPotreeViewer() {
  potreeHost = document.querySelector('#potree-viewer');
  const source = potreeHost.dataset.source;
  const message = potreeHost.querySelector('.viewer-message');
  const renderArea = document.querySelector('#potree-render-area');

  try {
    potreeHost.dataset.status = 'loading';

    const viewer = new Potree.Viewer(renderArea);
    potreeViewer = viewer;
    window.potreeViewer = viewer;

    viewer.setEDLEnabled(true);
    viewer.setFOV(65);
    viewer.setPointBudget(3_000_000);
    viewer.setBackground('gradient');
    viewer.loadSettingsFromURL();

    Potree.loadPointCloud(source, 'Hackeriet', event => {
      const pointcloud = event.pointcloud;
      const material = pointcloud.material;

      material.activeAttributeName = 'rgba';
      material.size = 0.8;
      material.minSize = 1.5;
      material.pointSizeType = Potree.PointSizeType.ADAPTIVE;
      material.shape = Potree.PointShape.SQUARE;

      viewer.scene.addPointCloud(pointcloud);
      applyNavigationMode(navigationSelect.value);
      resetPotreeView();
      message.remove();
      potreeHost.dataset.status = 'loaded';
    });
  } catch (error) {
    potreeHost.dataset.status = 'error';
    message.textContent = `Could not start Potree viewer: ${error.message || error}`;
  }
}

function applyNavigationMode(mode) {
  if (!potreeViewer) {
    return;
  }

  if (mode === 'orbit') {
    potreeViewer.setControls(potreeViewer.orbitControls);
    potreeViewer.setMoveSpeed(defaultView.moveSpeed);
    return;
  }

  potreeViewer.setControls(potreeViewer.fpControls);
  potreeViewer.fpControls.lockElevation = mode !== 'fly';
  potreeViewer.setMoveSpeed(mode === 'fly' ? 2.2 : defaultView.moveSpeed);
}

function resetPotreeView() {
  if (!potreeViewer) {
    return;
  }

  const view = potreeViewer.scene.view;
  view.position.set(...defaultView.position);
  view.lookAt(...defaultView.target);
  potreeViewer.setMoveSpeed(defaultView.moveSpeed);
  applyNavigationMode(navigationSelect.value);
}

function setNavigationEnabled(enabled) {
  navigationEnabled = enabled && viewerSelect.value === 'potree';

  if (potreeHost) {
    potreeHost.classList.toggle('navigation-active', navigationEnabled);
  }

  toggleNavigationButton.textContent = navigationEnabled ? 'Release scroll' : 'Enable navigation';
  toggleNavigationButton.setAttribute('aria-pressed', String(navigationEnabled));
}

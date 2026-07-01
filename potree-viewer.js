const viewerSelect = document.querySelector('#viewer-select');
const panels = document.querySelectorAll('[data-viewer-panel]');
let potreeStarted = false;

viewerSelect.addEventListener('change', () => {
  showViewer(viewerSelect.value);
});

const initialViewer = new URLSearchParams(window.location.search).get('viewer');
if (initialViewer === 'potree' || initialViewer === 'point-cloud') {
  viewerSelect.value = 'potree';
  showViewer('potree');
}

function showViewer(selected) {
  for (const panel of panels) {
    panel.hidden = panel.dataset.viewerPanel !== selected;
  }

  if (selected === 'potree' && !potreeStarted) {
    potreeStarted = true;
    startPotreeViewer();
  }
}

function startPotreeViewer() {
  const host = document.querySelector('#potree-viewer');
  const source = host.dataset.source;
  const message = host.querySelector('.viewer-message');
  const renderArea = document.querySelector('#potree-render-area');

  try {
    const viewer = new Potree.Viewer(renderArea);
    window.potreeViewer = viewer;

    viewer.setEDLEnabled(true);
    viewer.setFOV(60);
    viewer.setPointBudget(2_000_000);
    viewer.setBackground('gradient');
    viewer.loadSettingsFromURL();

    Potree.loadPointCloud(source, 'Hackeriet', event => {
      const pointcloud = event.pointcloud;
      const material = pointcloud.material;

      material.activeAttributeName = 'rgba';
      material.size = 1;
      material.minSize = 2;
      material.pointSizeType = Potree.PointSizeType.ADAPTIVE;
      material.shape = Potree.PointShape.SQUARE;

      viewer.scene.addPointCloud(pointcloud);
      viewer.fitToScreen();
      message.remove();
      host.dataset.status = 'loaded';
    });
  } catch (error) {
    host.dataset.status = 'error';
    message.textContent = `Could not start Potree viewer: ${error.message || error}`;
  }
}

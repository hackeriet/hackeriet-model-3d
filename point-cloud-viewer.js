import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';

const viewerSelect = document.querySelector('#viewer-select');
const panels = document.querySelectorAll('[data-viewer-panel]');
let pointCloudStarted = false;

viewerSelect.addEventListener('change', () => {
  showViewer(viewerSelect.value);
});

const initialViewer = new URLSearchParams(window.location.search).get('viewer');
if (initialViewer === 'point-cloud') {
  viewerSelect.value = 'point-cloud';
  showViewer('point-cloud');
}

function showViewer(selected) {
  for (const panel of panels) {
    panel.hidden = panel.dataset.viewerPanel !== selected;
  }

  if (selected === 'point-cloud' && !pointCloudStarted) {
    pointCloudStarted = true;
    startPointCloudViewer();
  }
}

function startPointCloudViewer() {
  const host = document.querySelector('#point-cloud-viewer');
  const source = host.dataset.source;
  const message = host.querySelector('.viewer-message');
  host.dataset.status = 'loading';

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(window.matchMedia('(prefers-color-scheme: dark)').matches ? 0x171b20 : 0xeeeeee);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.01, 1000);
  camera.up.set(0, 0, 1);
  camera.position.set(-8, -24, 9);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  } catch (error) {
    host.dataset.status = 'error';
    message.textContent = `Could not start WebGL renderer: ${error.message || error}`;
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(-6.3, -1.0, 5.1);
  controls.update();

  const grid = new THREE.GridHelper(24, 24, 0x999999, 0xdddddd);
  grid.rotation.x = Math.PI / 2;
  grid.position.z = -0.08;
  scene.add(grid);

  const loader = new PLYLoader();
  loader.load(
    source,
    geometry => {
      geometry.computeBoundingSphere();

      const material = new THREE.PointsMaterial({
        size: 0.035,
        vertexColors: true,
        sizeAttenuation: true
      });

      const points = new THREE.Points(geometry, material);
      scene.add(points);

      if (geometry.boundingSphere) {
        controls.target.copy(geometry.boundingSphere.center);
        camera.position.copy(geometry.boundingSphere.center).add(new THREE.Vector3(0, -26, 11));
        controls.update();
      }

      host.dataset.status = 'loaded';
      host.dataset.points = String(geometry.attributes.position.count);
      message.remove();
      resize();
      animate();
    },
    undefined,
    error => {
      host.dataset.status = 'error';
      message.textContent = `Could not load point cloud: ${error.message || error}`;
    }
  );

  function resize() {
    const rect = host.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
  }

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  window.addEventListener('resize', resize);
  resize();
}

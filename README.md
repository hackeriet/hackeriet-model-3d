# Hackeriet 3D model

This repository publishes an interactive point-cloud scan of Hackeriet in Oslo as a static GitHub Pages site:

https://hackeriet.github.io/hackeriet-model-3d/

The public viewer is Potree-based. Earlier revisions also exposed a textured mesh through `<model-viewer>`, but that path was removed because the mesh viewer was less reliable, had poorer navigation for an indoor scan, and duplicated maintenance effort without matching the point-cloud viewer's usefulness.

There is no application server and no build step in the live deployment path. GitHub Pages serves the files in `master` directly from the repository root.

## Repository architecture

```text
index.html                         Static page shell, metadata, controls, Potree script loading
site.css                   Site styling and overrides for Potree's global CSS
potree-viewer.js                   Potree bootstrapping, point-cloud material, camera, navigation state
obj/                               Original OBJ/MTL mesh and texture images from the scan export
xyz/cloud.xyz.xz                   Original compressed XYZ+RGB point-cloud source
pointclouds/hackeriet-potree/      Potree 2.0 point-cloud output used by the web viewer
potree/                            Vendored Potree viewer runtime and runtime dependencies
colorplan.pdf                      Original floor/color plan source document
ceilingcolorplan.pdf               Original ceiling/color plan source document
```

Approximate artifact sizes at the time of writing:

```text
obj/                            61M
xyz/cloud.xyz.xz                59M
pointclouds/hackeriet-potree/   49M
potree/build/potree             13M
potree/libs                    5.5M
colorplan.pdf                  1.2M
ceilingcolorplan.pdf           576K
```

The repository is intentionally artifact-heavy. The deployed site is static, so the generated Potree hierarchy, Potree octree, and vendored runtime are all committed.

## Runtime model

`index.html` is the only page. It has three main responsibilities:

1. Provide document metadata for browsers, search engines, link previews, and structured-data consumers.
2. Present controls for Potree navigation mode and navigation capture/release.
3. Load the static Potree runtime and `potree-viewer.js`.

The runtime fetch path is:

```text
index.html
  -> Potree runtime under potree/
  -> potree-viewer.js
  -> pointclouds/hackeriet-potree/metadata.json
  -> pointclouds/hackeriet-potree/hierarchy.bin
  -> pointclouds/hackeriet-potree/octree.bin
  -> potree/build/potree/workers/2.0/DecoderWorker_brotli.js
```

`potree-viewer.js` starts the Potree viewer on page load. It configures:

- EDL rendering enabled.
- 65 degree field of view.
- RGB point material.
- Adaptive square point rendering.
- A fixed reset/start camera position.
- Walk, fly, and orbit navigation modes.
- Adjustable detail presets for point budget, minimum node size, and concurrent node loading.

The point cloud is passive by default. The Potree canvas is covered by `#potree-navigation-shield` until navigation is explicitly enabled, so ordinary wheel scrolling still scrolls the page. This matters because WebGL viewers normally capture pointer and wheel events aggressively.

## CSS and Potree isolation

Potree's bundled CSS includes global document rules intended for fullscreen Potree applications, including a `body` rule with `position: absolute`, `height: 100%`, and `overflow: hidden`. That breaks ordinary document scrolling on this static page.

`site.css` deliberately neutralizes those global assumptions:

- `html, body` are restored as normal scroll containers.
- `body` is forced back to `position: static`, automatic width, automatic height, zero margin, and zero padding.
- The page layout is applied to `.page-shell` instead of `body`.
- The point-cloud viewer remains constrained inside `#potree-viewer`.

Do not remove `.page-shell` or the `body` overrides without testing page scrolling after Potree has loaded.

## Point-cloud data

The original compressed source is `xyz/cloud.xyz.xz`. Each row in the decompressed source is:

```text
x y z red green blue
```

The current Potree output is in `pointclouds/hackeriet-potree/`:

```text
metadata.json    3,243 bytes
hierarchy.bin   79,596 bytes
octree.bin      50,398,245 bytes
```

Important metadata from `metadata.json`:

```text
Potree metadata version: 2.0
Source point count:      8,890,390
Encoding:                BROTLI
Hierarchy depth:         6
Spacing:                 0.1563359375
Scale:                   [0.001, 0.001, 0.001]
Offset:                  [-16.366821, -9.984478, -0.066301]
Bounding box min:        [-16.366821, -9.984478, -0.066301]
Bounding box max:        [3.644179, 10.026522, 19.944699]
Actual position max:     [3.644179, 7.865522, 10.290699]
RGB range:               [0, 0, 0] -> [65535, 65535, 65535]
```

The Potree output contains all 8,890,390 source points. It is not a preview/downsampled point cloud.

## Point-cloud conversion pipeline

The Potree point cloud was generated with PotreeConverter 2.1.3. PotreeConverter 2.x consumes LAS/LAZ, so the XYZ+RGB source was first converted into a temporary LAS file.

The conversion used these conventions:

- LAS 1.2.
- Point format 2, to carry RGB.
- Coordinate scale `0.001`.
- LAS offsets based on the minimum XYZ coordinate: `[-16.366821, -9.984478, -0.066301]`.
- Source RGB values expanded to 16-bit LAS RGB by multiplying by 257.
- PotreeConverter output encoding `BROTLI`.

The conceptual pipeline is:

```text
xyz/cloud.xyz.xz
  -> decompress and parse XYZRGB rows
  -> write temporary LAS with laspy/numpy
  -> PotreeConverter 2.1.3
  -> pointclouds/hackeriet-potree/{metadata.json,hierarchy.bin,octree.bin}
```

The exact temporary files used during the original conversion were not committed. If regenerating the point cloud, keep the generated Potree output path stable unless the HTML/JS is updated too.

A representative regeneration flow is:

```sh
# Build PotreeConverter 2.1.3 from source.
cmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build --parallel

# Convert XYZRGB to a temporary LAS using Python, laspy, and numpy.
# Then run PotreeConverter against that LAS.
PotreeConverter /tmp/hackeriet-cloud.las \
  -o pointclouds/hackeriet-potree \
  --encoding BROTLI \
  -m poisson
```

That command is intentionally illustrative rather than a complete build script. This repository currently stores the generated artifacts, not the conversion automation.

## Vendored Potree runtime

The `potree/` directory contains the browser runtime needed by the generated Potree point cloud. It was copied from the Potree 1.8.2 release and trimmed to the runtime pieces required by this page.

Keep these two facts in mind when editing it:

- `potree/build/potree/potree.js` and `potree/build/potree/potree.css` are upstream/vendor files.
- Local behavior should normally be implemented in `potree-viewer.js` or `site.css`, not by editing vendored Potree files.

The current vendored runtime has about 55 files under `potree/`, plus the generated point cloud under `pointclouds/`.

## Navigation behavior

The point-cloud viewer has three navigation modes:

- `walk`: first-person movement with elevation locked.
- `fly`: first-person movement with vertical movement allowed.
- `orbit`: orbit controls around the current view target.

Keyboard and mouse controls are handled by Potree's `FirstPersonControls` when navigation is enabled:

- `W` / Up Arrow: move forward.
- `S` / Down Arrow: move backward.
- `A` / Left Arrow: move left.
- `D` / Right Arrow: move right.
- `R` / PageUp: move up.
- `F` / PageDown: move down.
- Mouse wheel: adjust movement speed.
- Left drag: look around.
- Right drag: translate/pan.
- Double-click: jump toward the clicked point.

The page also exposes a `Detail` selector. It adjusts three Potree loading controls together:

```js
const detailPresets = {
  balanced: { pointBudget: 3_000_000, minNodeSize: 30, maxNodesLoading: 4 },
  high: { pointBudget: 8_000_000, minNodeSize: 10, maxNodesLoading: 10 },
  maximum: { pointBudget: 9_000_000, minNodeSize: 4, maxNodesLoading: 16 },
};
```

`pointBudget` caps visible points, `minNodeSize` controls how aggressively Potree descends into finer octree nodes, and `maxNodesLoading` controls how many point-cloud nodes Potree may fetch concurrently. The default is `high`.

The page starts with point-cloud navigation disabled so the page remains scrollable. Enabling navigation removes the overlay shield and lets Potree receive pointer and wheel events. Pressing `Escape` releases navigation again.

The initial point-cloud camera is defined in `potree-viewer.js`:

```js
const initialView = {
  position: [-10.3, -6.0, 1.6],
  target: [-10.3, 10.5, 1.0],
};
```

Movement speeds are defined separately:

```js
const moveSpeeds = {
  walk: 0.8,
  fly: 0.9,
  orbit: 0.8,
};
```

If navigation or loading density feels wrong, tune these values first. Avoid editing Potree internals for normal camera, movement, or point-budget changes.

## Security and metadata

`index.html` includes a conservative `Content-Security-Policy` meta tag. It is intentionally compatible with the current static deployment and Potree runtime, including:

- Local scripts and vendored Potree workers.
- Inline JSON-LD and the current inline CSP-compatible page metadata.
- Potree's need for workers and WebGL-related blob/data resources.

The page also includes:

- Canonical URL.
- Open Graph metadata.
- Twitter summary card metadata.
- JSON-LD describing the digital document, Hackeriet as the subject, and the main point-cloud encodings.
- `rel=alternate` link for the Potree metadata.

Because GitHub Pages serves this as static HTML, HTTP headers such as CSP headers or `Link` headers are not controlled by this repository unless deployment moves away from stock GitHub Pages.

## Local testing

The site can be tested with any static HTTP server. Do not use `file://`; Potree fetches JSON, binary octree data, and worker scripts, so browser fetch/CORS behavior should be exercised over HTTP.

```sh
python3 -m http.server 8123
```

Then open:

```text
http://127.0.0.1:8123/
```

Useful checks before pushing:

```sh
node --check potree-viewer.js
git diff --check
```

A useful browser smoke test is to load the page and confirm the `#potree-viewer` element reaches:

```html
data-status="loaded"
```

Headless Chrome in software WebGL mode may print GPU, GCM, or `ReadPixels` noise. Those messages are usually Chrome/headless diagnostics. The important failures are JavaScript exceptions, CSP violations, missing assets, or `data-status="error"` on `#potree-viewer`.

## Deployment

The site is published by GitHub Pages from:

```text
branch: master
path:   /
mode:   legacy GitHub Pages branch publishing
```

There is no build pipeline. A pushed commit is the deployed source. GitHub Pages may still take some time to publish the changed static files and its CDN may briefly serve older assets.

To inspect Pages state with GitHub CLI:

```sh
gh api repos/hackeriet/hackeriet-model-3d/pages
gh api repos/hackeriet/hackeriet-model-3d/pages/builds/latest
```

## Maintenance guidelines

- Keep source artifacts and generated artifacts distinct. `xyz/` and `obj/` are source material; `pointclouds/hackeriet-potree/` is the browser/deployment artifact.
- Prefer changes in `index.html`, `site.css`, and `potree-viewer.js` over edits to vendored Potree files.
- If updating Potree, test page scrolling specifically. Potree's upstream CSS is designed for fullscreen apps and can easily break normal document flow.
- If regenerating the point cloud, preserve the stable URL `pointclouds/hackeriet-potree/metadata.json` or update `index.html` accordingly.
- If adding a build step later, keep GitHub Pages deployment semantics explicit in this README.

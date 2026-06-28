# hackeriet-model-3d

A 3D scan of Hackeriet in Oslo.

The GitHub Pages viewer provides two browser views:

- `hackeriet-model.glb`: textured mesh converted from the original OBJ/MTL assets in `obj/`.
- `cloud-preview.ply`: lightweight point-cloud preview generated from `xyz/cloud.xyz.xz` by keeping every 10th point.
- `cloud-dense.ply`: dense point-cloud file generated from `xyz/cloud.xyz.xz` by evenly sampling 6,633,313 points into a 99,499,990 byte PLY, just under GitHub's single-file limit.

The original compressed point cloud remains available as `xyz/cloud.xyz.xz`.

# hackeriet-model-3d

A 3D scan of Hackeriet in Oslo.

The GitHub Pages viewer provides two browser views:

- `hackeriet-model.glb`: textured mesh converted from the original OBJ/MTL assets in `obj/`.
- `pointclouds/hackeriet-potree/metadata.json`: Potree point cloud generated from the original XYZ+RGB source.

The original compressed point cloud remains available as `xyz/cloud.xyz.xz`.

## Point cloud conversion

The Potree point cloud was generated with PotreeConverter 2.1.3 from a temporary LAS file converted from `xyz/cloud.xyz.xz`.

The source XYZ rows are in this format:

```text
x y z red green blue
```

The generated Potree output uses Brotli encoding and contains all 8,890,390 source points.

export const SRGBColorSpace = 'srgb';
export const ACESFilmicToneMapping = 4;
export const BackSide = 1;
export const FrontSide = 0;
export const DoubleSide = 2;

const EPS = 1e-6;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }
}

export class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.isVector3 = true;
  }
  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
  setScalar(value) {
    return this.set(value, value, value);
  }
  copy(v) {
    return this.set(v.x, v.y, v.z);
  }
  clone() {
    return new Vector3(this.x, this.y, this.z);
  }
  add(v) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }
  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }
  subVectors(a, b) {
    return this.set(a.x - b.x, a.y - b.y, a.z - b.z);
  }
  addScaledVector(v, s) {
    this.x += v.x * s;
    this.y += v.y * s;
    this.z += v.z * s;
    return this;
  }
  multiplyScalar(s) {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    return this;
  }
  lengthSq() {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }
  length() {
    return Math.sqrt(this.lengthSq());
  }
  normalize() {
    const length = this.length();
    return length > EPS ? this.multiplyScalar(1 / length) : this.set(0, 0, 0);
  }
  dot(v) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }
  cross(v) {
    return this.crossVectors(this, v);
  }
  crossVectors(a, b) {
    const ax = a.x;
    const ay = a.y;
    const az = a.z;
    const bx = b.x;
    const by = b.y;
    const bz = b.z;
    return this.set(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx);
  }
  distanceTo(v) {
    return Math.sqrt((this.x - v.x) ** 2 + (this.y - v.y) ** 2 + (this.z - v.z) ** 2);
  }
  lerp(v, t) {
    this.x += (v.x - this.x) * t;
    this.y += (v.y - this.y) * t;
    this.z += (v.z - this.z) * t;
    return this;
  }
  clampLength(min, max) {
    const length = this.length();
    if (length > EPS) this.multiplyScalar(clamp(length, min, max) / length);
    return this;
  }
  applyQuaternion(q) {
    const { x, y, z } = this;
    const ix = q.w * x + q.y * z - q.z * y;
    const iy = q.w * y + q.z * x - q.x * z;
    const iz = q.w * z + q.x * y - q.y * x;
    const iw = -q.x * x - q.y * y - q.z * z;
    this.x = ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y;
    this.y = iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z;
    this.z = iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x;
    return this;
  }
}

export class Euler {
  constructor(x = 0, y = 0, z = 0, order = 'XYZ') {
    this.x = x;
    this.y = y;
    this.z = z;
    this.order = order;
  }
  set(x, y, z, order = this.order) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.order = order;
    return this;
  }
}

function quaternionFromAxisAngle(axis, angle, out) {
  const half = angle * 0.5;
  const s = Math.sin(half);
  return out.set(axis.x * s, axis.y * s, axis.z * s, Math.cos(half));
}

const axisX = new Vector3(1, 0, 0);
const axisY = new Vector3(0, 1, 0);
const axisZ = new Vector3(0, 0, 1);

export class Quaternion {
  constructor(x = 0, y = 0, z = 0, w = 1) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
  }
  set(x, y, z, w) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.w = w;
    return this;
  }
  copy(q) {
    return this.set(q.x, q.y, q.z, q.w);
  }
  clone() {
    return new Quaternion(this.x, this.y, this.z, this.w);
  }
  setFromAxisAngle(axis, angle) {
    return quaternionFromAxisAngle(axis, angle, this);
  }
  multiply(q) {
    const ax = this.x;
    const ay = this.y;
    const az = this.z;
    const aw = this.w;
    const bx = q.x;
    const by = q.y;
    const bz = q.z;
    const bw = q.w;
    return this.set(
      aw * bx + ax * bw + ay * bz - az * by,
      aw * by - ax * bz + ay * bw + az * bx,
      aw * bz + ax * by - ay * bx + az * bw,
      aw * bw - ax * bx - ay * by - az * bz,
    );
  }
  setFromEuler(euler) {
    const qy = quaternionFromAxisAngle(axisY, euler.y, new Quaternion());
    const qx = quaternionFromAxisAngle(axisX, euler.x, new Quaternion());
    const qz = quaternionFromAxisAngle(axisZ, euler.z, new Quaternion());
    return this.copy(qy.multiply(qx).multiply(qz));
  }
}

export class Color {
  constructor(hex = 0xffffff) {
    this.r = 1;
    this.g = 1;
    this.b = 1;
    if (typeof hex === 'number') this.setHex(hex);
    else if (hex && typeof hex.r === 'number') this.copy(hex);
  }
  setHex(hex) {
    this.r = ((hex >> 16) & 255) / 255;
    this.g = ((hex >> 8) & 255) / 255;
    this.b = (hex & 255) / 255;
    return this;
  }
  set(value) {
    if (typeof value === 'number') return this.setHex(value);
    return this.copy(value);
  }
  copy(color) {
    this.r = color.r;
    this.g = color.g;
    this.b = color.b;
    return this;
  }
  clone() {
    return new Color().copy(this);
  }
  multiplyScalar(value) {
    this.r *= value;
    this.g *= value;
    this.b *= value;
    return this;
  }
  lerp(color, alpha) {
    this.r += (color.r - this.r) * alpha;
    this.g += (color.g - this.g) * alpha;
    this.b += (color.b - this.b) * alpha;
    return this;
  }
}

function mat4() {
  return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
}

function mat4Multiply(out, a, b) {
  const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
  for (let i = 0; i < 4; i += 1) {
    const b0 = b[i * 4];
    const b1 = b[i * 4 + 1];
    const b2 = b[i * 4 + 2];
    const b3 = b[i * 4 + 3];
    out[i * 4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[i * 4 + 1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[i * 4 + 2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[i * 4 + 3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  }
  return out;
}

function mat4Compose(out, position, quaternion, scale) {
  const x = quaternion.x;
  const y = quaternion.y;
  const z = quaternion.z;
  const w = quaternion.w;
  const x2 = x + x;
  const y2 = y + y;
  const z2 = z + z;
  const xx = x * x2;
  const xy = x * y2;
  const xz = x * z2;
  const yy = y * y2;
  const yz = y * z2;
  const zz = z * z2;
  const wx = w * x2;
  const wy = w * y2;
  const wz = w * z2;
  const sx = scale.x;
  const sy = scale.y;
  const sz = scale.z;
  out[0] = (1 - (yy + zz)) * sx;
  out[1] = (xy + wz) * sx;
  out[2] = (xz - wy) * sx;
  out[3] = 0;
  out[4] = (xy - wz) * sy;
  out[5] = (1 - (xx + zz)) * sy;
  out[6] = (yz + wx) * sy;
  out[7] = 0;
  out[8] = (xz + wy) * sz;
  out[9] = (yz - wx) * sz;
  out[10] = (1 - (xx + yy)) * sz;
  out[11] = 0;
  out[12] = position.x;
  out[13] = position.y;
  out[14] = position.z;
  out[15] = 1;
  return out;
}

function mat4Invert(out, matrix) {
  const a = matrix;
  const b00 = a[0] * a[5] - a[1] * a[4];
  const b01 = a[0] * a[6] - a[2] * a[4];
  const b02 = a[0] * a[7] - a[3] * a[4];
  const b03 = a[1] * a[6] - a[2] * a[5];
  const b04 = a[1] * a[7] - a[3] * a[5];
  const b05 = a[2] * a[7] - a[3] * a[6];
  const b06 = a[8] * a[13] - a[9] * a[12];
  const b07 = a[8] * a[14] - a[10] * a[12];
  const b08 = a[8] * a[15] - a[11] * a[12];
  const b09 = a[9] * a[14] - a[10] * a[13];
  const b10 = a[9] * a[15] - a[11] * a[13];
  const b11 = a[10] * a[15] - a[11] * a[14];
  let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
  if (!det) return out;
  det = 1 / det;
  out[0] = (a[5] * b11 - a[6] * b10 + a[7] * b09) * det;
  out[1] = (a[2] * b10 - a[1] * b11 - a[3] * b09) * det;
  out[2] = (a[13] * b05 - a[14] * b04 + a[15] * b03) * det;
  out[3] = (a[10] * b04 - a[9] * b05 - a[11] * b03) * det;
  out[4] = (a[6] * b08 - a[4] * b11 - a[7] * b07) * det;
  out[5] = (a[0] * b11 - a[2] * b08 + a[3] * b07) * det;
  out[6] = (a[14] * b02 - a[12] * b05 - a[15] * b01) * det;
  out[7] = (a[8] * b05 - a[10] * b02 + a[11] * b01) * det;
  out[8] = (a[4] * b10 - a[5] * b08 + a[7] * b06) * det;
  out[9] = (a[1] * b08 - a[0] * b10 - a[3] * b06) * det;
  out[10] = (a[12] * b04 - a[13] * b02 + a[15] * b00) * det;
  out[11] = (a[9] * b02 - a[8] * b04 - a[11] * b00) * det;
  out[12] = (a[5] * b07 - a[4] * b09 - a[6] * b06) * det;
  out[13] = (a[0] * b09 - a[1] * b07 + a[2] * b06) * det;
  out[14] = (a[13] * b01 - a[12] * b03 - a[14] * b00) * det;
  out[15] = (a[8] * b03 - a[9] * b01 + a[10] * b00) * det;
  return out;
}

function mat4Perspective(out, fov, aspect, near, far) {
  const f = 1 / Math.tan((fov * Math.PI) / 360);
  out.fill(0);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) / (near - far);
  out[11] = -1;
  out[14] = (2 * far * near) / (near - far);
  return out;
}

function lookAtQuaternion(target, source, out) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const dz = target.z - source.z;
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
  const yaw = Math.atan2(dx, -dz);
  const pitch = Math.asin(clamp(dy / distance, -1, 1));
  return out.setFromEuler(new Euler(pitch, -yaw, 0, 'YXZ'));
}

export class Object3D {
  constructor() {
    this.position = new Vector3();
    this.rotation = new Euler();
    this.scale = new Vector3(1, 1, 1);
    this.quaternion = new Quaternion();
    this.up = new Vector3(0, 1, 0);
    this.children = [];
    this.parent = null;
    this.visible = true;
    this.matrix = mat4();
    this.matrixWorld = mat4();
    this.userData = {};
    this.frustumCulled = true;
    this.isObject3D = true;
  }
  add(...objects) {
    for (const object of objects) {
      if (object.parent) object.parent.remove(object);
      object.parent = this;
      this.children.push(object);
    }
    return this;
  }
  remove(object) {
    const index = this.children.indexOf(object);
    if (index >= 0) {
      this.children.splice(index, 1);
      object.parent = null;
    }
    return this;
  }
  lookAt(target) {
    if (target && typeof target.x === 'number') lookAtQuaternion(target, this.position, this.quaternion);
    else lookAtQuaternion(new Vector3(target[0], target[1], target[2]), this.position, this.quaternion);
    return this;
  }
  rotateZ(angle) {
    return this.quaternion.multiply(quaternionFromAxisAngle(axisZ, angle, new Quaternion()));
  }
  updateMatrix() {
    mat4Compose(this.matrix, this.position, this.quaternion, this.scale);
  }
  updateMatrixWorld(force = false) {
    if (force) this.updateMatrix();
    if (this.parent) mat4Multiply(this.matrixWorld, this.parent.matrixWorld, this.matrix);
    else this.matrixWorld.set(this.matrix);
    for (const child of this.children) child.updateMatrixWorld(force);
  }
  traverse(callback) {
    callback(this);
    for (const child of [...this.children]) child.traverse(callback);
  }
}

export class Group extends Object3D {}

export class Scene extends Object3D {
  constructor() {
    super();
    this.background = null;
    this.fog = null;
  }
}

export class PerspectiveCamera extends Object3D {
  constructor(fov = 50, aspect = 1, near = 0.1, far = 1000) {
    super();
    this.fov = fov;
    this.aspect = aspect;
    this.near = near;
    this.far = far;
    this.projectionMatrix = mat4();
    this.matrixWorldInverse = mat4();
    this.isCamera = true;
    this.updateProjectionMatrix();
  }
  updateProjectionMatrix() {
    mat4Perspective(this.projectionMatrix, this.fov, this.aspect, this.near, this.far);
  }
}

class Light extends Object3D {
  constructor(color = 0xffffff, intensity = 1) {
    super();
    this.color = new Color(color);
    this.intensity = intensity;
  }
}

export class AmbientLight extends Light {}
export class HemisphereLight extends Light {
  constructor(skyColor, groundColor, intensity = 1) {
    super(skyColor, intensity);
    this.groundColor = new Color(groundColor);
  }
}
export class DirectionalLight extends Light {}
export class PointLight extends Light {
  constructor(color, intensity = 1, distance = 0) {
    super(color, intensity);
    this.distance = distance;
  }
}

export class BufferAttribute {
  constructor(array, itemSize) {
    this.array = array;
    this.itemSize = itemSize;
    this.count = array.length / itemSize;
    this.version = 0;
  }
  set needsUpdate(value) {
    if (value) this.version += 1;
  }
}

export class Float32BufferAttribute extends BufferAttribute {
  constructor(values, itemSize) {
    super(values instanceof Float32Array ? values : new Float32Array(values), itemSize);
  }
}

export class BufferGeometry {
  constructor() {
    this.attributes = {};
    this.index = null;
    this.drawRange = { start: 0, count: Infinity };
    this.disposed = false;
    this.userData = {};
    this.isBufferGeometry = true;
  }
  setAttribute(name, attribute) {
    this.attributes[name] = attribute;
    return this;
  }
  setIndex(array) {
    const values = array.array ?? array;
    this.index = new BufferAttribute(values instanceof Uint32Array ? values : new Uint16Array(values), 1);
    return this;
  }
  setDrawRange(start, count) {
    this.drawRange.start = start;
    this.drawRange.count = count;
    return this;
  }
  rotateX(angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    for (const name of ['position', 'normal']) {
      const attribute = this.attributes[name];
      if (!attribute) continue;
      for (let i = 0; i < attribute.array.length; i += 3) {
        const y = attribute.array[i + 1];
        const z = attribute.array[i + 2];
        attribute.array[i + 1] = y * c - z * s;
        attribute.array[i + 2] = y * s + z * c;
      }
      attribute.version += 1;
    }
    return this;
  }
  computeVertexNormals() {
    const position = this.attributes.position;
    if (!position) return this;
    const normals = new Float32Array(position.array.length);
    const index = this.index;
    const triangleCount = index ? index.count / 3 : position.count / 3;
    for (let t = 0; t < triangleCount; t += 1) {
      const ia = index ? index.array[t * 3] : t * 3;
      const ib = index ? index.array[t * 3 + 1] : t * 3 + 1;
      const ic = index ? index.array[t * 3 + 2] : t * 3 + 2;
      const ax = position.array[ia * 3], ay = position.array[ia * 3 + 1], az = position.array[ia * 3 + 2];
      const bx = position.array[ib * 3], by = position.array[ib * 3 + 1], bz = position.array[ib * 3 + 2];
      const cx = position.array[ic * 3], cy = position.array[ic * 3 + 1], cz = position.array[ic * 3 + 2];
      const ux = bx - ax, uy = by - ay, uz = bz - az;
      const vx = cx - ax, vy = cy - ay, vz = cz - az;
      const nx = uy * vz - uz * vy;
      const ny = uz * vx - ux * vz;
      const nz = ux * vy - uy * vx;
      for (const vertex of [ia, ib, ic]) {
        normals[vertex * 3] += nx;
        normals[vertex * 3 + 1] += ny;
        normals[vertex * 3 + 2] += nz;
      }
    }
    for (let i = 0; i < normals.length; i += 3) {
      const length = Math.sqrt(normals[i] ** 2 + normals[i + 1] ** 2 + normals[i + 2] ** 2) || 1;
      normals[i] /= length;
      normals[i + 1] /= length;
      normals[i + 2] /= length;
    }
    this.setAttribute('normal', new BufferAttribute(normals, 3));
    return this;
  }
  dispose() {
    this.disposed = true;
  }
}

function boxGeometry(width = 1, height = 1, depth = 1) {
  const geometry = new BufferGeometry();
  const w = width / 2;
  const h = height / 2;
  const d = depth / 2;
  const faces = [
    [[-w, -h, d], [w, -h, d], [w, h, d], [-w, h, d], [0, 0, 1]],
    [[w, -h, -d], [-w, -h, -d], [-w, h, -d], [w, h, -d], [0, 0, -1]],
    [[w, -h, d], [w, -h, -d], [w, h, -d], [w, h, d], [1, 0, 0]],
    [[-w, -h, -d], [-w, -h, d], [-w, h, d], [-w, h, -d], [-1, 0, 0]],
    [[-w, h, d], [w, h, d], [w, h, -d], [-w, h, -d], [0, 1, 0]],
    [[-w, -h, -d], [w, -h, -d], [w, -h, d], [-w, -h, d], [0, -1, 0]],
  ];
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  for (const face of faces) {
    const start = positions.length / 3;
    for (let i = 0; i < 4; i += 1) {
      positions.push(...face[i]);
      normals.push(...face[4]);
      uvs.push(i === 1 || i === 2 ? 1 : 0, i >= 2 ? 1 : 0);
    }
    indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }
  return geometry
    .setAttribute('position', new Float32BufferAttribute(positions, 3))
    .setAttribute('normal', new Float32BufferAttribute(normals, 3))
    .setAttribute('uv', new Float32BufferAttribute(uvs, 2))
    .setIndex(indices);
}

export class BoxGeometry extends BufferGeometry {
  constructor(width = 1, height = 1, depth = 1) {
    super();
    const source = boxGeometry(width, height, depth);
    this.attributes = source.attributes;
    this.index = source.index;
  }
}

export class PlaneGeometry extends BufferGeometry {
  constructor(width = 1, height = 1, widthSegments = 1, heightSegments = 1) {
    super();
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    for (let y = 0; y <= heightSegments; y += 1) {
      for (let x = 0; x <= widthSegments; x += 1) {
        const u = x / widthSegments;
        const v = y / heightSegments;
        positions.push((u - 0.5) * width, (0.5 - v) * height, 0);
        normals.push(0, 0, 1);
        uvs.push(u, 1 - v);
      }
    }
    for (let y = 0; y < heightSegments; y += 1) {
      for (let x = 0; x < widthSegments; x += 1) {
        const a = y * (widthSegments + 1) + x;
        const b = a + 1;
        const c = a + widthSegments + 1;
        const d = c + 1;
        indices.push(a, b, c, b, d, c);
      }
    }
    this.setAttribute('position', new Float32BufferAttribute(positions, 3))
      .setAttribute('normal', new Float32BufferAttribute(normals, 3))
      .setAttribute('uv', new Float32BufferAttribute(uvs, 2))
      .setIndex(indices);
  }
}

export class CircleGeometry extends BufferGeometry {
  constructor(radius = 1, segments = 16) {
    super();
    const positions = [0, 0, 0];
    const normals = [0, 0, 1];
    const uvs = [0.5, 0.5];
    const indices = [];
    for (let i = 0; i <= segments; i += 1) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      positions.push(x, y, 0);
      normals.push(0, 0, 1);
      uvs.push(0.5 + x / (2 * radius), 0.5 + y / (2 * radius));
      if (i > 0) indices.push(0, i, i + 1);
    }
    this.setAttribute('position', new Float32BufferAttribute(positions, 3))
      .setAttribute('normal', new Float32BufferAttribute(normals, 3))
      .setAttribute('uv', new Float32BufferAttribute(uvs, 2))
      .setIndex(indices);
  }
}

export class ConeGeometry extends BufferGeometry {
  constructor(radius = 1, height = 1, segments = 8) {
    super();
    const positions = [];
    const uvs = [];
    const indices = [];
    const half = height / 2;
    for (let i = 0; i < segments; i += 1) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      const base = positions.length / 3;
      positions.push(Math.cos(a0) * radius, -half, Math.sin(a0) * radius);
      positions.push(Math.cos(a1) * radius, -half, Math.sin(a1) * radius);
      positions.push(0, half, 0);
      uvs.push(i / segments, 0, (i + 1) / segments, 0, (i + 0.5) / segments, 1);
      indices.push(base, base + 1, base + 2);
      const capBase = positions.length / 3;
      positions.push(0, -half, 0, Math.cos(a1) * radius, -half, Math.sin(a1) * radius, Math.cos(a0) * radius, -half, Math.sin(a0) * radius);
      uvs.push(0.5, 0.5, 1, 0, 0, 0);
      indices.push(capBase, capBase + 1, capBase + 2);
    }
    this.setAttribute('position', new Float32BufferAttribute(positions, 3))
      .setAttribute('uv', new Float32BufferAttribute(uvs, 2))
      .setIndex(indices);
    this.computeVertexNormals();
  }
}

export class CylinderGeometry extends BufferGeometry {
  constructor(radiusTop = 1, radiusBottom = 1, height = 1, segments = 8) {
    super();
    const positions = [];
    const uvs = [];
    const indices = [];
    const half = height / 2;
    for (let i = 0; i < segments; i += 1) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      const base = positions.length / 3;
      positions.push(
        Math.cos(a0) * radiusBottom, -half, Math.sin(a0) * radiusBottom,
        Math.cos(a1) * radiusBottom, -half, Math.sin(a1) * radiusBottom,
        Math.cos(a1) * radiusTop, half, Math.sin(a1) * radiusTop,
        Math.cos(a0) * radiusTop, half, Math.sin(a0) * radiusTop,
      );
      uvs.push(i / segments, 0, (i + 1) / segments, 0, (i + 1) / segments, 1, i / segments, 1);
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
      const cap = positions.length / 3;
      positions.push(0, half, 0, Math.cos(a0) * radiusTop, half, Math.sin(a0) * radiusTop, Math.cos(a1) * radiusTop, half, Math.sin(a1) * radiusTop);
      uvs.push(0.5, 0.5, 0, 0, 1, 0);
      indices.push(cap, cap + 1, cap + 2);
      const bottom = positions.length / 3;
      positions.push(0, -half, 0, Math.cos(a1) * radiusBottom, -half, Math.sin(a1) * radiusBottom, Math.cos(a0) * radiusBottom, -half, Math.sin(a0) * radiusBottom);
      uvs.push(0.5, 0.5, 1, 0, 0, 0);
      indices.push(bottom, bottom + 1, bottom + 2);
    }
    this.setAttribute('position', new Float32BufferAttribute(positions, 3))
      .setAttribute('uv', new Float32BufferAttribute(uvs, 2))
      .setIndex(indices);
    this.computeVertexNormals();
  }
}

export class SphereGeometry extends BufferGeometry {
  constructor(radius = 1, widthSegments = 10, heightSegments = 6, phiStart = 0, phiLength = Math.PI * 2, thetaStart = 0, thetaLength = Math.PI) {
    super();
    const positions = [];
    const uvs = [];
    const indices = [];
    for (let y = 0; y <= heightSegments; y += 1) {
      const v = y / heightSegments;
      const theta = thetaStart + v * thetaLength;
      for (let x = 0; x <= widthSegments; x += 1) {
        const u = x / widthSegments;
        const phi = phiStart + u * phiLength;
        positions.push(
          -radius * Math.cos(phi) * Math.sin(theta),
          radius * Math.cos(theta),
          radius * Math.sin(phi) * Math.sin(theta),
        );
        uvs.push(u, 1 - v);
      }
    }
    for (let y = 0; y < heightSegments; y += 1) {
      for (let x = 0; x < widthSegments; x += 1) {
        const a = y * (widthSegments + 1) + x;
        const b = a + 1;
        const c = a + widthSegments + 1;
        const d = c + 1;
        indices.push(a, b, c, b, d, c);
      }
    }
    this.setAttribute('position', new Float32BufferAttribute(positions, 3))
      .setAttribute('uv', new Float32BufferAttribute(uvs, 2))
      .setIndex(indices);
    this.computeVertexNormals();
  }
}

export class IcosahedronGeometry extends BufferGeometry {
  constructor(radius = 1) {
    super();
    const t = (1 + Math.sqrt(5)) / 2;
    const raw = [
      [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
      [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
      [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
    ];
    const faces = [
      [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
      [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
      [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
    ];
    const positions = [];
    const uvs = [];
    const indices = [];
    for (const face of faces) {
      const start = positions.length / 3;
      for (const vertex of face) {
        const v = raw[vertex];
        const length = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
        positions.push((v[0] / length) * radius, (v[1] / length) * radius, (v[2] / length) * radius);
        uvs.push(0.5 + v[0] / (2 * length), 0.5 + v[1] / (2 * length));
      }
      indices.push(start, start + 1, start + 2);
    }
    this.setAttribute('position', new Float32BufferAttribute(positions, 3))
      .setAttribute('uv', new Float32BufferAttribute(uvs, 2))
      .setIndex(indices);
    this.computeVertexNormals();
  }
}

export class TorusGeometry extends BufferGeometry {
  constructor(radius = 1, tube = 0.4, radialSegments = 6, tubularSegments = 16) {
    super();
    const positions = [];
    const uvs = [];
    const indices = [];
    for (let j = 0; j <= tubularSegments; j += 1) {
      const u = (j / tubularSegments) * Math.PI * 2;
      const cu = Math.cos(u);
      const su = Math.sin(u);
      for (let i = 0; i <= radialSegments; i += 1) {
        const v = (i / radialSegments) * Math.PI * 2;
        const cv = Math.cos(v);
        const sv = Math.sin(v);
        positions.push((radius + tube * cv) * cu, (radius + tube * cv) * su, tube * sv);
        uvs.push(j / tubularSegments, i / radialSegments);
      }
    }
    for (let j = 0; j < tubularSegments; j += 1) {
      for (let i = 0; i < radialSegments; i += 1) {
        const a = j * (radialSegments + 1) + i;
        const b = a + 1;
        const c = a + radialSegments + 1;
        const d = c + 1;
        indices.push(a, b, c, b, d, c);
      }
    }
    this.setAttribute('position', new Float32BufferAttribute(positions, 3))
      .setAttribute('uv', new Float32BufferAttribute(uvs, 2))
      .setIndex(indices);
    this.computeVertexNormals();
  }
}

export class Texture {
  constructor(source = null) {
    this.source = source;
    this.version = 0;
    this.needsUpdate = true;
    this.disposed = false;
  }
  dispose() {
    this.disposed = true;
  }
}

export class CanvasTexture extends Texture {
  constructor(canvas) {
    super(canvas);
  }
}

class Material {
  constructor(options = {}) {
    this.color = new Color(options.color ?? 0xffffff);
    this.emissive = new Color(options.emissive ?? 0x000000);
    this.emissiveIntensity = options.emissiveIntensity ?? 1;
    this.opacity = options.opacity ?? 1;
    this.transparent = options.transparent ?? false;
    this.side = options.side ?? FrontSide;
    this.vertexColors = options.vertexColors ?? false;
    this.map = options.map ?? null;
    this.fog = options.fog !== false;
    this.roughness = options.roughness ?? 0.8;
    this.metalness = options.metalness ?? 0;
    this.shininess = options.shininess ?? 20;
    this.detail = options.detail ?? 0;
    this.groundShade = options.groundShade ?? 0;
    this.depthWrite = options.depthWrite ?? true;
    this.depthTest = options.depthTest ?? true;
    this.type = 'standard';
  }
  clone() {
    const result = Object.create(Object.getPrototypeOf(this));
    for (const [key, value] of Object.entries(this)) {
      result[key] = value && typeof value.clone === 'function' && !(value instanceof Texture) ? value.clone() : value;
    }
    return result;
  }
  dispose() {}
}

export class MeshStandardMaterial extends Material {}
export class MeshPhongMaterial extends Material {
  constructor(options) {
    super(options);
    this.specular = new Color(options.specular ?? 0xffffff);
  }
}
export class MeshBasicMaterial extends Material {
  constructor(options) {
    super(options);
    this.type = 'basic';
  }
}
export class ShaderMaterial extends Material {
  constructor(options) {
    super(options);
    this.uniforms = options.uniforms ?? {};
    this.vertexShader = options.vertexShader ?? '';
    this.fragmentShader = options.fragmentShader ?? '';
    this.type = 'shader';
  }
}
export class LineBasicMaterial extends Material {
  constructor(options) {
    super(options);
    this.type = 'line';
  }
}
export class PointsMaterial extends Material {
  constructor(options) {
    super(options);
    this.size = options.size ?? 1;
    this.type = 'points';
  }
}
export class SpriteMaterial extends Material {
  constructor(options) {
    super(options);
    this.type = 'sprite';
  }
}

export class Mesh extends Object3D {
  constructor(geometry, material) {
    super();
    this.geometry = geometry;
    this.material = material;
    this.isMesh = true;
  }
}

export class InstancedMesh extends Mesh {
  constructor(geometry, material, count) {
    super(geometry, material);
    this.count = count;
    this.instanceMatrix = new BufferAttribute(new Float32Array(count * 16), 16);
    this.instanceColor = null;
    this.isInstancedMesh = true;
  }
  setMatrixAt(index, matrix) {
    if (matrix.length) this.instanceMatrix.array.set(matrix, index * 16);
    else {
      matrix.updateMatrix();
      this.instanceMatrix.array.set(matrix.matrix, index * 16);
    }
    this.instanceMatrix.version += 1;
  }
  setColorAt(index, color) {
    if (!this.instanceColor) this.instanceColor = new BufferAttribute(new Float32Array(this.count * 3), 3);
    this.instanceColor.array.set([color.r, color.g, color.b], index * 3);
    this.instanceColor.version += 1;
  }
}

export class Line extends Object3D {
  constructor(geometry, material) {
    super();
    this.geometry = geometry;
    this.material = material;
    this.isLine = true;
  }
}

export class Points extends Object3D {
  constructor(geometry, material) {
    super();
    this.geometry = geometry;
    this.material = material;
    this.isPoints = true;
  }
}

export class Sprite extends Object3D {
  constructor(material) {
    super();
    this.material = material;
    this.isSprite = true;
  }
}

export class FogExp2 {
  constructor(color, density) {
    this.color = new Color(color);
    this.density = density;
  }
}

const MAIN_VERT = `
attribute vec3 position;
attribute vec3 normal;
attribute vec3 color;
attribute vec2 uv;
uniform mat4 uModel;
uniform mat4 uViewProj;
uniform mat3 uNormalMatrix;
varying vec3 vNormal;
varying vec3 vWorld;
varying vec3 vColor;
varying vec2 vUv;
void main(){
  vec4 world = uModel * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(uNormalMatrix * normal);
  vColor = color;
  vUv = uv;
  gl_Position = uViewProj * world;
}`;

const INSTANCED_VERT = `
attribute vec3 position;
attribute vec3 normal;
attribute vec3 color;
attribute vec2 uv;
attribute mat4 instanceMatrix;
attribute vec3 instanceColor;
uniform mat4 uModel;
uniform mat4 uViewProj;
uniform mat3 uNormalMatrix;
varying vec3 vNormal;
varying vec3 vWorld;
varying vec3 vColor;
varying vec2 vUv;
void main(){
  vec4 local = instanceMatrix * vec4(position, 1.0);
  vec4 world = uModel * local;
  vWorld = world.xyz;
  vNormal = normalize(uNormalMatrix * mat3(instanceMatrix) * normal);
  vColor = instanceColor;
  vUv = uv;
  gl_Position = uViewProj * world;
}`;

const MAIN_FRAG = `
precision highp float;
uniform vec3 uColor;
uniform vec3 uEmissive;
uniform vec3 uFogColor;
uniform vec3 uLightDir;
uniform vec3 uLightColor;
uniform vec3 uAmbient;
uniform vec3 uHemiSky;
uniform vec3 uHemiGround;
uniform vec3 uCamera;
uniform float uOpacity;
uniform float uEmissiveIntensity;
uniform float uFogDensity;
uniform float uShininess;
uniform float uDetail;
uniform float uGroundShade;
uniform float uUnlit;
uniform bool uUseTexture;
uniform bool uVertexColor;
uniform bool uFog;
uniform sampler2D uTexture;
varying vec3 vNormal;
varying vec3 vWorld;
varying vec3 vColor;
varying vec2 vUv;
float hash21(vec2 p){
  p = fract(p * vec2(123.34, 345.45));
  p += dot(p, p + 34.345);
  return fract(p.x * p.y);
}
float noise21(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
             mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
}
void main(){
  vec4 tex = vec4(1.0);
  if (uUseTexture) tex = texture2D(uTexture, vUv);
  vec3 base = uColor * tex.rgb * (uVertexColor ? vColor : vec3(1.0));
  vec3 n = normalize(vNormal);
  float diff = max(dot(n, normalize(uLightDir)), 0.0);
  float hemi = 0.5 + 0.5 * n.y;
  vec3 amb = mix(uHemiGround, uHemiSky, hemi) * 0.55 + uAmbient * 0.55;
  vec3 lit = mix(base * (amb + uLightColor * diff * 0.78), base, uUnlit);
  float grain = noise21(vWorld.xz * 0.095) * 0.5 + noise21(vWorld.xz * 0.41) * 0.32 + noise21(vWorld.xz * 1.6) * 0.18;
  lit *= mix(1.0 + (grain - 0.5) * uDetail, 1.0, uUnlit);
  float slope = mix(1.0, 0.84 + 0.16 * max(n.y, 0.0), uGroundShade);
  float hollow = mix(1.0, mix(0.78, 1.0, smoothstep(-8.0, 34.0, vWorld.y)), uGroundShade);
  lit *= mix(slope * hollow, 1.0, uUnlit);
  vec3 viewDir = normalize(uCamera - vWorld);
  float spec = pow(max(dot(reflect(-normalize(uLightDir), n), viewDir), 0.0), uShininess) * 0.2;
  lit += vec3(spec) * (0.5 + uShininess / 100.0) * (1.0 - uUnlit);
  float rim = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0) * 0.045;
  lit += uLightColor * rim * (1.0 - uUnlit);
  lit += uEmissive * uEmissiveIntensity * (1.0 - uUnlit);
  lit = clamp((lit - 0.5) * 1.1 + 0.5, 0.0, 2.0);
  lit = mix(vec3(dot(lit, vec3(0.299, 0.587, 0.114))), lit, 1.12);
  float alpha = uOpacity * tex.a;
  if (uFog) {
    float d = length(uCamera - vWorld);
    float f = 1.0 - exp(-uFogDensity * uFogDensity * d * d);
    lit = mix(lit, uFogColor, clamp(f, 0.0, 0.94));
  }
  gl_FragColor = vec4(max(lit, 0.0), alpha);
}`;

const SIMPLE_VERT = `
attribute vec3 position;
uniform mat4 uModel;
uniform mat4 uViewProj;
void main(){ gl_Position = uViewProj * uModel * vec4(position, 1.0); }`;

const SIMPLE_FRAG = `
precision highp float;
uniform vec3 uColor;
uniform float uOpacity;
void main(){ gl_FragColor = vec4(uColor, uOpacity); }`;

const SPRITE_VERT = `
attribute vec3 position;
attribute vec2 uv;
uniform mat4 uViewProj;
uniform vec3 uCenter;
uniform vec3 uRight;
uniform vec3 uUp;
uniform vec2 uScale;
varying vec2 vUv;
void main(){
  vUv = uv;
  vec3 world = uCenter + uRight * position.x * uScale.x + uUp * position.y * uScale.y;
  gl_Position = uViewProj * vec4(world, 1.0);
}`;

const SPRITE_FRAG = `
precision highp float;
uniform sampler2D uTexture;
uniform float uOpacity;
varying vec2 vUv;
void main(){
  vec4 tex = texture2D(uTexture, vUv);
  gl_FragColor = vec4(tex.rgb, tex.a * uOpacity);
}`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(`WebGL shader error: ${gl.getShaderInfoLog(shader)}`);
  return shader;
}

function program(gl, vertex, fragment) {
  const result = gl.createProgram();
  gl.attachShader(result, compile(gl, gl.VERTEX_SHADER, vertex));
  gl.attachShader(result, compile(gl, gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(result);
  if (!gl.getProgramParameter(result, gl.LINK_STATUS)) throw new Error(`WebGL link error: ${gl.getProgramInfoLog(result)}`);
  return result;
}

function uniformLocations(gl, shaderProgram, names) {
  const locations = {};
  for (const name of names) locations[name] = gl.getUniformLocation(shaderProgram, name);
  return locations;
}

const sceneState = { fog: { color: new Color(0x7f919e), density: 0.0005 }, enabled: true };

function traverseVisible(root, visit) {
  if (!root.visible) return;
  visit(root);
  for (const child of root.children) traverseVisible(child, visit);
}

export class WebGLRenderer {
  constructor(options = {}) {
    this.canvas = options.canvas ?? document.createElement('canvas');
    const gl = this.canvas.getContext('webgl2', { antialias: options.antialias ?? true, alpha: false, depth: true, powerPreference: options.powerPreference ?? 'default' });
    if (!gl) throw new Error('WebGL2 unavailable');
    this.gl = gl;
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    this.pixelRatio = 1;
    this.width = 1;
    this.height = 1;
    this.outputColorSpace = SRGBColorSpace;
    this.toneMapping = ACESFilmicToneMapping;
    this.toneMappingExposure = 1;
    this.programs = {
      standard: program(gl, MAIN_VERT, MAIN_FRAG),
      instanced: program(gl, INSTANCED_VERT, MAIN_FRAG),
      simple: program(gl, SIMPLE_VERT, SIMPLE_FRAG),
      sprite: program(gl, SPRITE_VERT, SPRITE_FRAG),
    };
    const names = ['uModel', 'uViewProj', 'uNormalMatrix', 'uColor', 'uEmissive', 'uFogColor', 'uLightDir', 'uLightColor', 'uAmbient', 'uHemiSky', 'uHemiGround', 'uCamera', 'uOpacity', 'uEmissiveIntensity', 'uFogDensity', 'uShininess', 'uDetail', 'uGroundShade', 'uUnlit', 'uUseTexture', 'uVertexColor', 'uFog', 'uTexture'];
    this.locations = {
      standard: uniformLocations(gl, this.programs.standard, names),
      instanced: uniformLocations(gl, this.programs.instanced, names),
      simple: uniformLocations(gl, this.programs.simple, ['uModel', 'uViewProj', 'uColor', 'uOpacity']),
      sprite: uniformLocations(gl, this.programs.sprite, ['uViewProj', 'uCenter', 'uRight', 'uUp', 'uScale', 'uTexture', 'uOpacity']),
    };
    this.geometryCache = new WeakMap();
    this.textureCache = new WeakMap();
    this.shaderCache = new WeakMap();
  }
  setPixelRatio(value) {
    this.pixelRatio = value;
    this.setSize(this.width, this.height);
  }
  setSize(width, height) {
    this.width = width;
    this.height = height;
    this.canvas.width = Math.max(1, Math.floor(width * this.pixelRatio));
    this.canvas.height = Math.max(1, Math.floor(height * this.pixelRatio));
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }
  geometryData(geometry) {
    let data = this.geometryCache.get(geometry);
    if (!data) {
      data = { buffers: {}, versions: {} };
      this.geometryCache.set(geometry, data);
    }
    return data;
  }
  uploadGeometry(geometry) {
    const gl = this.gl;
    const data = this.geometryData(geometry);
    for (const [name, attribute] of Object.entries(geometry.attributes)) {
      const buffer = data.buffers[name] ?? gl.createBuffer();
      data.buffers[name] = buffer;
      if (data.versions[name] !== attribute.version) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, attribute.array, gl.DYNAMIC_DRAW);
        data.versions[name] = attribute.version;
      }
    }
    if (geometry.index) {
      const buffer = data.buffers.index ?? gl.createBuffer();
      data.buffers.index = buffer;
      if (data.versions.index !== geometry.index.version) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.index.array, gl.STATIC_DRAW);
        data.versions.index = geometry.index.version;
      }
    }
    return data;
  }
  uploadTexture(texture) {
    const gl = this.gl;
    if (!texture) return null;
    let entry = this.textureCache.get(texture);
    if (!entry) {
      entry = { texture: gl.createTexture(), version: -1 };
      this.textureCache.set(texture, entry);
    }
    if (entry.version !== texture.version) {
      gl.bindTexture(gl.TEXTURE_2D, entry.texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.source);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      entry.version = texture.version;
    }
    return entry.texture;
  }
  bindGeometry(geometry, shaderProgram) {
    const gl = this.gl;
    const data = this.uploadGeometry(geometry);
    const active = {};
    const count = gl.getProgramParameter(shaderProgram, gl.ACTIVE_ATTRIBUTES);
    for (let i = 0; i < count; i += 1) {
      const info = gl.getActiveAttrib(shaderProgram, i);
      active[info.name.replace(/\[0\]$/, '')] = gl.getAttribLocation(shaderProgram, info.name);
    }
    for (const name of ['position', 'normal', 'color', 'uv']) {
      const location = active[name];
      if (location === undefined || location < 0) continue;
      const buffer = data.buffers[name];
      if (!buffer) {
        gl.disableVertexAttribArray(location);
        continue;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, name === 'uv' ? 2 : 3, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(location, 0);
    }
    if (geometry.index) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, data.buffers.index);
    return data;
  }
  render(scene, camera) {
    const gl = this.gl;
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    mat4Invert(camera.matrixWorldInverse, camera.matrixWorld);
    const viewProj = new Float32Array(16);
    mat4Multiply(viewProj, camera.projectionMatrix, camera.matrixWorldInverse);
    if (scene.fog) {
      sceneState.enabled = true;
      sceneState.fog.color.copy(scene.fog.color);
      sceneState.fog.density = scene.fog.density;
    } else {
      sceneState.enabled = false;
    }
    const background = scene.background ?? sceneState.fog.color;
    gl.clearColor(background.r, background.g, background.b, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    const lights = {
      ambient: new Color(0x404850),
      hemiSky: new Color(0x9ab8c8),
      hemiGround: new Color(0x405048),
      sun: new Color(0xffffff),
      sunIntensity: 1,
      sunDir: new Vector3(-0.4, 0.8, -0.4).normalize(),
    };
    traverseVisible(scene, (object) => {
      if (object instanceof AmbientLight) lights.ambient.copy(object.color).multiplyScalar(object.intensity);
      if (object instanceof HemisphereLight) {
        lights.hemiSky.copy(object.color).multiplyScalar(object.intensity);
        lights.hemiGround.copy(object.groundColor).multiplyScalar(object.intensity);
      }
      if (object instanceof DirectionalLight) {
        lights.sun.copy(object.color).multiplyScalar(object.intensity);
        lights.sunDir.set(object.position.x, object.position.y, object.position.z).normalize();
      }
    });
    const cameraPosition = new Vector3(camera.matrixWorld[12], camera.matrixWorld[13], camera.matrixWorld[14]);
    const sky = [];
    const opaque = [];
    const transparent = [];
    traverseVisible(scene, (object) => {
      if (!(object.isMesh || object.isLine || object.isPoints || object.isSprite)) return;
      const material = object.material;
      if (!material) return;
      const entry = { object, material, distance: cameraPosition.distanceTo(new Vector3(object.matrixWorld[12], object.matrixWorld[13], object.matrixWorld[14])) };
      if (material.type === 'shader') sky.push(entry);
      else if (material.transparent || material.opacity < 1) transparent.push(entry);
      else opaque.push(entry);
    });
    transparent.sort((a, b) => b.distance - a.distance);
    for (const entry of sky) this.renderSky(entry, camera.matrixWorldInverse, camera.projectionMatrix);
    for (const entry of opaque) this.renderObject(entry, viewProj, camera, cameraPosition, lights);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    for (const entry of transparent) this.renderObject(entry, viewProj, camera, cameraPosition, lights);
    gl.disable(gl.BLEND);
  }
  renderSky(entry, viewMatrix, projectionMatrix) {
    const gl = this.gl;
    const { object, material } = entry;
    let shaderProgram = this.shaderCache.get(material);
    if (!shaderProgram) {
      shaderProgram = program(gl, `attribute vec3 position;\nuniform mat4 uModelViewMatrix;\nuniform mat4 projectionMatrix;\n${material.vertexShader}`, `precision highp float;\n${material.fragmentShader}`);
      this.shaderCache.set(material, shaderProgram);
    }
    gl.useProgram(shaderProgram);
    const modelView = new Float32Array(16);
    mat4Multiply(modelView, viewMatrix, object.matrixWorld);
    const positions = uniformLocations(gl, shaderProgram, ['uModelViewMatrix', 'projectionMatrix']);
    gl.uniformMatrix4fv(positions.uModelViewMatrix, false, modelView);
    gl.uniformMatrix4fv(positions.projectionMatrix, false, projectionMatrix);
    for (const [name, uniform] of Object.entries(material.uniforms)) {
      const location = gl.getUniformLocation(shaderProgram, name);
      if (location === null) continue;
      const value = uniform.value;
      if (value instanceof Color) gl.uniform3f(location, value.r, value.g, value.b);
      else if (value && typeof value.x === 'number') gl.uniform3f(location, value.x, value.y, value.z ?? 0);
      else if (typeof value === 'number') gl.uniform1f(location, value);
    }
    gl.depthMask(false);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);
    const data = this.uploadGeometry(object.geometry);
    const attribute = gl.getAttribLocation(shaderProgram, 'position');
    if (attribute >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, data.buffers.position);
      gl.enableVertexAttribArray(attribute);
      gl.vertexAttribPointer(attribute, 3, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(attribute, 0);
    }
    if (object.geometry.index) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, data.buffers.index);
      gl.drawElements(gl.TRIANGLES, object.geometry.index.count, gl.UNSIGNED_SHORT, 0);
    } else {
      gl.drawArrays(gl.TRIANGLES, 0, object.geometry.attributes.position.count);
    }
    gl.depthMask(true);
    gl.enable(gl.DEPTH_TEST);
  }
  renderObject(entry, viewProj, camera, cameraPosition, lights) {
    const gl = this.gl;
    const { object, material } = entry;
    if (object.isSprite) {
      this.renderSprite(object, material, viewProj, camera);
      return;
    }
    if (object.isLine || object.isPoints) {
      const shaderProgram = this.programs.simple;
      const locations = this.locations.simple;
      gl.useProgram(shaderProgram);
      gl.disable(gl.CULL_FACE);
      gl.uniformMatrix4fv(locations.uViewProj, false, viewProj);
      gl.uniformMatrix4fv(locations.uModel, false, object.matrixWorld);
      const color = material.color;
      gl.uniform3f(locations.uColor, color.r, color.g, color.b);
      gl.uniform1f(locations.uOpacity, material.opacity);
      const data = this.uploadGeometry(object.geometry);
      const positionLocation = gl.getAttribLocation(shaderProgram, 'position');
      if (positionLocation >= 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, data.buffers.position);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(positionLocation, 0);
      }
      const range = object.geometry.drawRange;
      const count = Math.min(range.count, object.geometry.attributes.position.count - range.start);
      if (object.isPoints) gl.drawArrays(gl.POINTS, range.start, count);
      else gl.drawArrays(gl.LINE_STRIP, range.start, count);
      return;
    }
    const instanced = object.isInstancedMesh === true;
    const shaderProgram = instanced ? this.programs.instanced : this.programs.standard;
    const locations = instanced ? this.locations.instanced : this.locations.standard;
    gl.useProgram(shaderProgram);
    if (material.side === DoubleSide) gl.disable(gl.CULL_FACE);
    else {
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
    }
    gl.depthMask(material.transparent ? false : true);
    this.bindGeometry(object.geometry, shaderProgram);
    gl.uniformMatrix4fv(locations.uModel, false, object.matrixWorld);
    gl.uniformMatrix4fv(locations.uViewProj, false, viewProj);
    const normalMatrix = new Float32Array([
      object.matrixWorld[0], object.matrixWorld[1], object.matrixWorld[2],
      object.matrixWorld[4], object.matrixWorld[5], object.matrixWorld[6],
      object.matrixWorld[8], object.matrixWorld[9], object.matrixWorld[10],
    ]);
    gl.uniformMatrix3fv(locations.uNormalMatrix, false, normalMatrix);
    gl.uniform3f(locations.uColor, material.color.r, material.color.g, material.color.b);
    gl.uniform3f(locations.uEmissive, material.emissive.r, material.emissive.g, material.emissive.b);
    gl.uniform3f(locations.uFogColor, sceneState.fog.color.r, sceneState.fog.color.g, sceneState.fog.color.b);
    gl.uniform3f(locations.uLightDir, lights.sunDir.x, lights.sunDir.y, lights.sunDir.z);
    gl.uniform3f(locations.uLightColor, lights.sun.r * lights.sunIntensity, lights.sun.g * lights.sunIntensity, lights.sun.b * lights.sunIntensity);
    gl.uniform3f(locations.uAmbient, lights.ambient.r, lights.ambient.g, lights.ambient.b);
    gl.uniform3f(locations.uHemiSky, lights.hemiSky.r, lights.hemiSky.g, lights.hemiSky.b);
    gl.uniform3f(locations.uHemiGround, lights.hemiGround.r, lights.hemiGround.g, lights.hemiGround.b);
    gl.uniform3f(locations.uCamera, cameraPosition.x, cameraPosition.y, cameraPosition.z);
    gl.uniform1f(locations.uOpacity, material.opacity);
    gl.uniform1f(locations.uEmissiveIntensity, material.emissiveIntensity);
    gl.uniform1f(locations.uFogDensity, sceneState.fog.density);
    gl.uniform1f(locations.uShininess, Math.max(4, material.shininess));
    gl.uniform1f(locations.uDetail, material.detail);
    gl.uniform1f(locations.uGroundShade, material.groundShade);
    gl.uniform1f(locations.uUnlit, material.type === 'basic' ? 1 : 0);
    gl.uniform1i(locations.uUseTexture, material.map ? 1 : 0);
    gl.uniform1i(locations.uVertexColor, material.vertexColors || instanced ? 1 : 0);
    gl.uniform1i(locations.uFog, material.fog && sceneState.enabled ? 1 : 0);
    if (material.map) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.uploadTexture(material.map));
      gl.uniform1i(locations.uTexture, 0);
    }
    const data = this.geometryData(object.geometry);
    const index = object.geometry.index;
    const count = Math.min(object.geometry.drawRange.count, index ? index.count : object.geometry.attributes.position.count);
    if (instanced) {
      const matrixLocation = gl.getAttribLocation(shaderProgram, 'instanceMatrix');
      if (matrixLocation >= 0) {
        if (!data.instanceMatrixBuffer) data.instanceMatrixBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, data.instanceMatrixBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, object.instanceMatrix.array, gl.DYNAMIC_DRAW);
        for (let i = 0; i < 4; i += 1) {
          gl.enableVertexAttribArray(matrixLocation + i);
          gl.vertexAttribPointer(matrixLocation + i, 4, gl.FLOAT, false, 64, i * 16);
          gl.vertexAttribDivisor(matrixLocation + i, 1);
        }
      }
      const colorLocation = gl.getAttribLocation(shaderProgram, 'instanceColor');
      if (colorLocation >= 0) {
        if (!data.instanceColorBuffer) data.instanceColorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, data.instanceColorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, object.instanceColor ? object.instanceColor.array : new Float32Array(object.count * 3), gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(colorLocation);
        gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0);
        gl.vertexAttribDivisor(colorLocation, 1);
      }
      if (index) gl.drawElementsInstanced(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0, object.count);
      else gl.drawArraysInstanced(gl.TRIANGLES, 0, count, object.count);
      if (matrixLocation >= 0) for (let i = 0; i < 4; i += 1) gl.vertexAttribDivisor(matrixLocation + i, 0);
      if (colorLocation >= 0) gl.vertexAttribDivisor(colorLocation, 0);
    } else if (index) {
      gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, object.geometry.drawRange.start * 0);
    } else {
      gl.drawArrays(gl.TRIANGLES, object.geometry.drawRange.start, count);
    }
    if (material.transparent) gl.depthMask(true);
  }
  renderSprite(object, material, viewProj, camera) {
    const gl = this.gl;
    const shaderProgram = this.programs.sprite;
    const locations = this.locations.sprite;
    gl.useProgram(shaderProgram);
    gl.disable(gl.CULL_FACE);
    gl.depthMask(false);
    if (!object.geometry) object.geometry = new PlaneGeometry(2, 2);
    const data = this.uploadGeometry(object.geometry);
    gl.uniformMatrix4fv(locations.uViewProj, false, viewProj);
    gl.uniform3f(locations.uCenter, object.matrixWorld[12], object.matrixWorld[13], object.matrixWorld[14]);
    const right = new Vector3(camera.matrixWorld[0], camera.matrixWorld[1], camera.matrixWorld[2]).normalize();
    const up = new Vector3(camera.matrixWorld[4], camera.matrixWorld[5], camera.matrixWorld[6]).normalize();
    gl.uniform3f(locations.uRight, right.x, right.y, right.z);
    gl.uniform3f(locations.uUp, up.x, up.y, up.z);
    gl.uniform2f(locations.uScale, object.scale.x, object.scale.y);
    gl.uniform1f(locations.uOpacity, material.opacity);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.uploadTexture(material.map));
    gl.uniform1i(locations.uTexture, 0);
    const positionLocation = gl.getAttribLocation(shaderProgram, 'position');
    const uvLocation = gl.getAttribLocation(shaderProgram, 'uv');
    if (positionLocation >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, data.buffers.position);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(positionLocation, 0);
    }
    if (uvLocation >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, data.buffers.uv);
      gl.enableVertexAttribArray(uvLocation);
      gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 0, 0);
      gl.vertexAttribDivisor(uvLocation, 0);
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, data.buffers.index);
    gl.drawElements(gl.TRIANGLES, object.geometry.index.count, gl.UNSIGNED_SHORT, 0);
    gl.depthMask(true);
  }
}

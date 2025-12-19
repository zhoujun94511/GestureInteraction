import * as THREE from 'three';

export const EPS = 1e-6;

// 将 MediaPipe 归一化坐标映射到 Three.js 世界坐标
export function worldifyLandmarks(landmarks, depthScale = 35) {
    if (!landmarks || !landmarks.length) return [];
    const world = new Array(landmarks.length);
    const scaleZ = depthScale || 35;
    for (let i = 0; i < landmarks.length; i++) {
        const lm = landmarks[i];
        world[i] = new THREE.Vector3(
            (0.5 - lm.x) * 10,
            (0.5 - lm.y) * 8,
            lm.z * scaleZ
        );
    }
    return world;
}

// 计算手部中心点（取 21 个关键点平均值）
export function computeHandCenter(worldLandmarks) {
    const center = new THREE.Vector3();
    if (!worldLandmarks || worldLandmarks.length === 0) return center;
    for (let i = 0; i < worldLandmarks.length; i++) {
        center.add(worldLandmarks[i]);
    }
    center.multiplyScalar(1 / worldLandmarks.length);
    return center;
}

// 根据关键点最大距离估算手半径，并做平滑处理
export function computeHandRadius(worldLandmarks, center, prevRadius = 1, smoothing = 0.25) {
    if (!worldLandmarks || worldLandmarks.length === 0) return prevRadius;
    let maxSq = 0;
    for (let i = 0; i < worldLandmarks.length; i++) {
        const dx = worldLandmarks[i].x - center.x;
        const dy = worldLandmarks[i].y - center.y;
        const dz = worldLandmarks[i].z - center.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 > maxSq) maxSq = d2;
    }
    const target = Math.sqrt(maxSq) * 1.05; // 留出 5% 安全冗余
    const t = THREE.MathUtils.clamp(smoothing, 0, 1);
    return THREE.MathUtils.lerp(prevRadius, target, t);
}

// 手势中心的平滑插值
export function smoothHandMovement(prev, next, alpha = 0.35) {
    const t = THREE.MathUtils.clamp(alpha, 0, 1);
    return prev.clone().lerp(next, t);
}

// 3D粒子避让逻辑
export function applyDepthPushToParticles(particlesMesh, velocities, handCenter, handRadius, options = {}) {
    if (!particlesMesh || !velocities || !handCenter) return;
    const pushStrength = options.pushStrength ?? 0.18;
    const radius = Math.max((handRadius || 0) * 1.2, EPS);
    const radiusSq = radius * radius;
    const posArray = particlesMesh.geometry.attributes.position.array;
    for (let i = 0; i < posArray.length; i += 3) {
        const dx = posArray[i] - handCenter.x;
        const dy = posArray[i + 1] - handCenter.y;
        const dz = posArray[i + 2] - handCenter.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq < radiusSq) {
            const dist = Math.sqrt(distSq) + EPS;
            const t = 1 - dist / radius;
            const push = t * pushStrength;
            velocities[i] += (dx / dist) * push;
            velocities[i + 1] += (dy / dist) * push;
            velocities[i + 2] += (dz / dist) * push;
        }
    }
}

// 手在前方时让被遮挡的粒子淡出
export function applyOcclusionToParticles(
    particlesMesh,
    colors,
    occlusionFactors,
    handCenter,
    handRadius,
    opts = {}
) {
    if (!particlesMesh || !colors || !occlusionFactors) return;
    const { handPresent = true, maxFade = 0.75, colorVersion = 0, occlusionState } = opts;
    const state = occlusionState || { lastColorVersionApplied: 0 };
    const posArray = particlesMesh.geometry.attributes.position.array;
    const colorAttr = particlesMesh.geometry.attributes.color;

    // 如果颜色被外部重写，重置遮挡因子防止累乘
    if (state.lastColorVersionApplied !== colorVersion) {
        occlusionFactors.fill(1);
        state.lastColorVersionApplied = colorVersion;
    }

    const radius = Math.max(handRadius * 1.25, EPS);
    const radiusSq = radius * radius;
    let changed = false;

    for (let i = 0; i < occlusionFactors.length; i++) {
        const idx = i * 3;
        const prevFade = occlusionFactors[i] || 1;

        if (!handPresent) {
            if (prevFade !== 1) {
                colors[idx] /= prevFade;
                colors[idx + 1] /= prevFade;
                colors[idx + 2] /= prevFade;
                occlusionFactors[i] = 1;
                changed = true;
            }
            continue;
        }

        const dx = posArray[idx] - handCenter.x;
        const dy = posArray[idx + 1] - handCenter.y;
        const dz = posArray[idx + 2] - handCenter.z;

        // 手在前方（更小的 z）；仅对手前方的粒子做遮挡
        if (dz <= 0) {
            if (prevFade !== 1) {
                colors[idx] /= prevFade;
                colors[idx + 1] /= prevFade;
                colors[idx + 2] /= prevFade;
                occlusionFactors[i] = 1;
                changed = true;
            }
            continue;
        }

        const distSq = dx * dx + dy * dy;
        if (distSq > radiusSq) {
            if (prevFade !== 1) {
                colors[idx] /= prevFade;
                colors[idx + 1] /= prevFade;
                colors[idx + 2] /= prevFade;
                occlusionFactors[i] = 1;
                changed = true;
            }
            continue;
        }

        const dist = Math.sqrt(distSq) + EPS;
        const radialFactor = 1 - dist / radius; // 0-1
        const depthFactor = Math.min(1, dz / (handRadius * 1.5 + EPS));
        const fade = 1 - Math.min(maxFade, radialFactor * depthFactor * maxFade);

        if (Math.abs(fade - prevFade) > 1e-3) {
            colors[idx] = (colors[idx] / prevFade) * fade;
            colors[idx + 1] = (colors[idx + 1] / prevFade) * fade;
            colors[idx + 2] = (colors[idx + 2] / prevFade) * fade;
            occlusionFactors[i] = fade;
            changed = true;
        }
    }

    if (changed && colorAttr) {
        colorAttr.needsUpdate = true;
    }
    state.lastColorVersionApplied = colorVersion;
}


import * as THREE from 'three';
import {
    State,
    GestureShape,
    PARTICLE_COUNT,
    BATCH_SIZE,
    PARTICLE_COLOR,
    PARTICLE_SIZE,
    EXPLOSION_FORCE,
    RETURN_SPEED,
    DAMPING,
    DEPTH_PUSH_STRENGTH,
    OCCLUSION_MAX_FADE,
    RAINBOW_UPDATE_INTERVAL,
    markColorsUpdated,
    setLoading
} from './config.js';
import { applyDepthPushToParticles, applyOcclusionToParticles } from './glhand3D.js';
import { ModelLoader, PointCloudGenerator } from './modelLoader.js';

const callUpdateDebug = () => {
    if (typeof window !== 'undefined' && typeof window.updateDebugInfo === 'function') {
        window.updateDebugInfo();
    }
};

// ========== 粒子系统模块 ==========
// Three.js 初始化、粒子生成、物理更新与动画循环

export const SHAPE_GENERATORS = {
    [GestureShape.Sphere]: generateSphere,
    [GestureShape.Ring]: generateRing,
    [GestureShape.Star]: generateStar,
    [GestureShape.Heart]: generateHeart,
    [GestureShape.Text]: generateText
};

// ========== 彩虹粒子效果 ==========
function rainbowParticles() {
    const { colors, particlesMesh } = State;
    const color = new THREE.Color();
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const idx = i * 3;
        const hue = (i / PARTICLE_COUNT + State.hueOffset) % 1.0;
        color.setHSL(hue, 1.0, 0.5);
        colors[idx] = color.r;
        colors[idx + 1] = color.g;
        colors[idx + 2] = color.b;
    }
    State.colorDirty = true;
    markColorsUpdated();
    if (particlesMesh) {
        particlesMesh.geometry.attributes.color.needsUpdate = true;
        State.colorDirty = false;
    }
}

function resetToSingleColor() {
    const { colors, particlesMesh } = State;
    const colorObj = new THREE.Color(PARTICLE_COLOR);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const idx = i * 3;
        colors[idx] = colorObj.r;
        colors[idx + 1] = colorObj.g;
        colors[idx + 2] = colorObj.b;
    }
    State.colorDirty = true;
    markColorsUpdated();
    if (particlesMesh) {
        particlesMesh.geometry.attributes.color.needsUpdate = true;
        State.colorDirty = false;
    }
}

export function setupThreeJS() {
    const container = document.getElementById('canvas-container');
    State.scene = new THREE.Scene();

    State.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    State.camera.position.z = 15;

    State.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    State.renderer.setClearColor(0x000000, 1);
    State.renderer.setSize(window.innerWidth, window.innerHeight);
    State.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(State.renderer.domElement);

    // 渲染器准备好后显示容器，避免白色闪烁
    setTimeout(() => container.classList.add('ready'), 200);

    window.addEventListener('resize', () => {
        State.camera.aspect = window.innerWidth / window.innerHeight;
        State.camera.updateProjectionMatrix();
        State.renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// === 分批加载粒子 ===
export function setupParticles() {
    setLoading("正在加载粒子…");

    const geometry = new THREE.BufferGeometry();

    State.positions = new Float32Array(PARTICLE_COUNT * 3);
    State.velocities = new Float32Array(PARTICLE_COUNT * 3);
    State.targets = new Float32Array(PARTICLE_COUNT * 3);
    State.colors = new Float32Array(PARTICLE_COUNT * 3);

    geometry.setAttribute("position", new THREE.BufferAttribute(State.positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(State.colors, 3));

    const mat = new THREE.PointsMaterial({
        size: PARTICLE_SIZE,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.8
    });

    State.particlesMesh = new THREE.Points(geometry, mat);
    State.scene.add(State.particlesMesh);

    const colorObj = new THREE.Color(PARTICLE_COLOR);

    const loadBatch = () => {
        const start = State.particlesLoaded;
        const end = Math.min(start + BATCH_SIZE, PARTICLE_COUNT);
        const pos = State.positions;
        const vel = State.velocities;
        const col = State.colors;

        for (let i = start; i < end; i++) {
            const idx = i * 3;

            pos[idx] = (Math.random() - 0.5) * 20;
            pos[idx + 1] = (Math.random() - 0.5) * 20;
            pos[idx + 2] = (Math.random() - 0.5) * 20;

            col[idx] = colorObj.r;
            col[idx + 1] = colorObj.g;
            col[idx + 2] = colorObj.b;

            vel[idx] = 0;
            vel[idx + 1] = 0;
            vel[idx + 2] = 0;
        }

        State.particlesLoaded = end;

        const percent = Math.floor((State.particlesLoaded / PARTICLE_COUNT) * 100);
        setLoading(`加载粒子中… ${percent}%`);

        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.color.needsUpdate = true;

        if (State.particlesLoaded < PARTICLE_COUNT) {
            requestAnimationFrame(loadBatch);
        } else {
            setLoading("粒子加载完成，正在加载手势模型…");
            generateSphere();

            if (State.rainbowMode) {
                rainbowParticles();
            }
        }
    };

    loadBatch();
}

// --- Shape Generators ---
export function generateSphere() {
    const tgt = State.targets;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const phi = Math.acos(-1 + (2 * i) / PARTICLE_COUNT);
        const theta = Math.sqrt(PARTICLE_COUNT * Math.PI) * phi;
        const r = 4;

        const idx = i * 3;
        tgt[idx] = r * Math.cos(theta) * Math.sin(phi);
        tgt[idx + 1] = r * Math.sin(theta) * Math.sin(phi);
        tgt[idx + 2] = r * Math.cos(phi);
    }
}

export function generateRing() {
    const tgt = State.targets;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const theta = (i / PARTICLE_COUNT) * Math.PI * 2;
        const R = 4;
        const r = 1;
        const tubeAngle = Math.random() * Math.PI * 2;

        const idx = i * 3;
        tgt[idx] = (R + r * Math.cos(tubeAngle)) * Math.cos(theta);
        tgt[idx + 1] = (R + r * Math.cos(tubeAngle)) * Math.sin(theta);
        tgt[idx + 2] = r * Math.sin(tubeAngle);
    }
}

export function generateStar() {
    const tgt = State.targets;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const theta = (i / PARTICLE_COUNT) * Math.PI * 2;
        const rBase = 4;
        const k = 5;
        const r = rBase * (1 + 0.5 * Math.cos(k * theta));
        const z = (Math.random() - 0.5) * 2;

        const idx = i * 3;
        tgt[idx] = r * Math.cos(theta);
        tgt[idx + 1] = r * Math.sin(theta);
        tgt[idx + 2] = z;
    }
}

export function generateHeart() {
    const tgt = State.targets;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const t = (i / PARTICLE_COUNT) * Math.PI * 2;
        const x = 16 * Math.pow(Math.sin(t), 3);
        const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        const scale = 0.3;
        const z = (Math.random() - 0.5) * 2;

        const idx = i * 3;
        tgt[idx] = x * scale;
        tgt[idx + 1] = y * scale;
        tgt[idx + 2] = z;
    }
}

export function generateText() {
    const width = window.innerWidth;
    const textSingleLine = "I LOVE WORLD";
    const textMultiLine = "I\nLOVE\nWORLD";

    const testCanvas = document.createElement('canvas');
    const testCtx = testCanvas.getContext('2d');

    let baseFontSize, baseScale, baseCanvasWidth, baseCanvasHeight, samplingStep, lineHeight;
    let needWrap = false;

    if (width < 480) {
        baseFontSize = 40;
        baseScale = 0.05;
        baseCanvasWidth = 640;
        baseCanvasHeight = 200;
        samplingStep = 2.6;
        lineHeight = 52;
        needWrap = true;
    } else if (width < 768) {
        baseFontSize = 46;
        baseScale = 0.048;
        baseCanvasWidth = 760;
        baseCanvasHeight = 220;
        samplingStep = 2.3;
        lineHeight = 60;
        needWrap = true;
    } else if (width < 1024) {
        baseFontSize = 54;
        baseScale = 0.052;
        baseCanvasWidth = 820;
        baseCanvasHeight = 240;
        samplingStep = 1.9;
        lineHeight = 70;
        needWrap = true;
    } else if (width < 1920) {
        baseFontSize = 56;
        baseScale = 0.05;
        baseCanvasWidth = 800;
        baseCanvasHeight = 256;
        samplingStep = 2;
        lineHeight = 75;
    } else {
        baseFontSize = 66;
        baseScale = 0.055;
        baseCanvasWidth = 900;
        baseCanvasHeight = 280;
        samplingStep = 2;
        lineHeight = 85;
    }

    if (width >= 1024 && !needWrap) {
        testCtx.font = `bold ${baseFontSize}px Arial`;
        let textMetrics = testCtx.measureText(textSingleLine);
        let textWidth = textMetrics.width;
        const max3DWidth = 18;
        const scaled3DWidth = textWidth * baseScale;

        if (scaled3DWidth > max3DWidth) {
            needWrap = true;
        } else if (width >= 1920) {
            const maxFontSize = Math.floor((max3DWidth / baseScale) * (baseFontSize / textWidth));
            const calculatedFontSize = Math.min(maxFontSize, Math.floor(width / 30));
            baseFontSize = Math.min(80, calculatedFontSize);

            testCtx.font = `bold ${baseFontSize}px Arial`;
            textMetrics = testCtx.measureText(textSingleLine);
            textWidth = textMetrics.width;

            const maxScale = max3DWidth / textWidth;
            baseScale = Math.min(0.08, maxScale * 0.95);

            if (textWidth * baseScale > max3DWidth) {
                needWrap = true;
            }
        }
    }

    let canvasWidth = baseCanvasWidth;
    let canvasHeight = needWrap ? baseCanvasHeight + 60 : baseCanvasHeight;
    const fontSize = baseFontSize;
    let scale = baseScale;
    const text = needWrap ? textMultiLine : textSingleLine;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (needWrap) {
        const lines = text.split('\n');
        const centerY = canvas.height / 2;
        const startY = centerY - (lines.length - 1) * lineHeight / 2;
        lines.forEach((line, index) => {
            ctx.fillText(line.trim(), canvas.width / 2, startY + index * lineHeight);
        });
    } else {
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const validPoints = [];

    for (let y = 0; y < canvas.height; y += samplingStep) {
        for (let x = 0; x < canvas.width; x += samplingStep) {
            const index = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
            if (data[index] > 128) {
                validPoints.push({
                    x: (x - canvas.width / 2) * scale,
                    y: -(y - canvas.height / 2) * scale
                });
            }
        }
    }

    const tgt = State.targets;
    const len = validPoints.length || 1;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const point = validPoints[i % len];
        const idx = i * 3;
        tgt[idx] = point.x;
        tgt[idx + 1] = point.y;
        tgt[idx + 2] = (Math.random() - 0.5) * 1;
    }
}




// ========== Physics and Animation ==========

export function triggerExplosion() {
    State.isExploding = true;
    setTimeout(() => { State.isExploding = false; }, 300);
}

// --- Physics ---
export function updateParticles() {
    const pos = State.positions;
    const vel = State.velocities;
    const tgt = State.targets;

    const r1 = State.dynamicRadius * 0.45;
    const r2 = State.dynamicRadius * 1.0;
    const r3 = State.dynamicRadius * 1.7;
    const r1Sq = r1 * r1;
    const r2Sq = r2 * r2;
    const r3Sq = r3 * r3;

    const { handCentroid, handPresent, isExploding } = State;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const idx = i * 3;

        const px = pos[idx];
        const py = pos[idx + 1];
        const pz = pos[idx + 2];

        const tx = tgt[idx];
        const ty = tgt[idx + 1];
        const tz = tgt[idx + 2];

        if (handPresent) {
            const dx = px - handCentroid.x;
            const dy = py - handCentroid.y;
            const dz = pz - handCentroid.z;
            const distSq = dx * dx + dy * dy + dz * dz;
            let force = 0;

            if (distSq < r1Sq) {
                const t = 1 - distSq / r1Sq;
                force = 0.10 * t * t;
            } else if (distSq < r2Sq) {
                const t = 1 - (distSq - r1Sq) / (r2Sq - r1Sq);
                force = 0.035 * t * t;
            } else if (distSq < r3Sq) {
                const t = 1 - (distSq - r2Sq) / (r3Sq - r2Sq);
                force = 0.008 * t;
            }

            vel[idx] -= dx * force;
            vel[idx + 1] -= dy * force;
            vel[idx + 2] -= dz * force;
        }

        if (isExploding) {
            vel[idx] += (Math.random() - 0.5) * EXPLOSION_FORCE;
            vel[idx + 1] += (Math.random() - 0.5) * EXPLOSION_FORCE;
            vel[idx + 2] += (Math.random() - 0.5) * EXPLOSION_FORCE;
        }

        vel[idx] += (tx - px) * RETURN_SPEED;
        vel[idx + 1] += (ty - py) * RETURN_SPEED;
        vel[idx + 2] += (tz - pz) * RETURN_SPEED;

        vel[idx] *= DAMPING;
        vel[idx + 1] *= DAMPING;
        vel[idx + 2] *= DAMPING;

        pos[idx] += vel[idx];
        pos[idx + 1] += vel[idx + 1];
        pos[idx + 2] += vel[idx + 2];
    }

    State.particlesMesh.geometry.attributes.position.needsUpdate = true;
}

// --- Main Loop ---
export function animate() {
    requestAnimationFrame(animate);
    State.time += 0.01;
    const now = performance.now();

    if (now - State.lastHandTimestamp > 800) {
        State.handPresent = false;
        State.followVelocity.set(0, 0, 0);
    }

    if (State.rainbowMode) {
        State.rainbowFrameCounter++;
        if (State.rainbowFrameCounter % RAINBOW_UPDATE_INTERVAL === 0) {
            State.hueOffset += 0.001;
            if (State.hueOffset > 1.0) State.hueOffset -= 1.0;
            rainbowParticles();
        }
    }

    if (State.handPresent) {
        applyDepthPushToParticles(State.particlesMesh, State.velocities, State.handCentroid, State.handRadius3D, {
            pushStrength: DEPTH_PUSH_STRENGTH
        });
    }

    updateParticles();

    applyOcclusionToParticles(State.particlesMesh, State.colors, State.occlusionFactors, State.handCentroid, State.handRadius3D, {
        handPresent: State.handPresent,
        maxFade: OCCLUSION_MAX_FADE,
        colorVersion: State.colorVersion,
        occlusionState: State.occlusionState
    });

    if (State.colorDirty) {
        State.particlesMesh.geometry.attributes.color.needsUpdate = true;
        State.colorDirty = false;
    }

    callUpdateDebug();

    if (!State.handPresent) {
        // 明显但流畅的三轴旋转+弹跳缩放+漂浮
        const t = State.time;
        const mesh = State.particlesMesh;
        mesh.rotation.y += Math.sin(t * 0.6) * 0.03;
        mesh.rotation.x = Math.sin(t * 0.9) * 0.18;
        mesh.rotation.z = Math.cos(t * 0.8) * 0.15;

        const bounceScale = 1.0 + Math.sin(t * 1.5) * 0.12;
        mesh.scale.lerp(new THREE.Vector3(bounceScale, bounceScale, bounceScale), 0.14);

        mesh.position.y = Math.sin(t * 1.0) * 0.36;
        mesh.position.x = Math.cos(t * 0.9) * 0.26;
        mesh.position.z = Math.sin(t * 0.75) * 0.12;
    } else {
        const mesh = State.particlesMesh;
        mesh.rotation.y += (State.handCentroid.x * 0.05 - mesh.rotation.y) * 0.05;
        mesh.rotation.x += (-State.handCentroid.y * 0.05 - mesh.rotation.x) * 0.05;
    }

    State.renderer.render(State.scene, State.camera);
}

export function toggleRainbow() {
    State.rainbowMode = !State.rainbowMode;
    if (State.rainbowMode) {
        rainbowParticles();
    } else {
        resetToSingleColor();
    }
    callUpdateDebug();
}

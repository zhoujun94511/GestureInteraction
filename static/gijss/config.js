// ========== 配置文件 ==========
// 全局常量、状态与工具集中管理，供其它模块 import

import * as THREE from 'three';

export const GestureShape = {
    Sphere: 'sphere',
    Ring: 'ring',
    Star: 'star',
    Heart: 'heart',
    Text: 'text',
    Dragon: 'dragon'
};

export let colorDirty = false;

// 根据屏幕大小自适应粒子数量
// 针对复杂3D模型（多mesh组件）提高粒子数量以确保完整渲染
export const getResponsiveParticleCount = () => {
    const width = window.innerWidth;
    if (width < 480) return 4000;    // 提高：3000 → 4000
    if (width < 1024) return 8000;   // 提高：5000 → 8000 (关键改进)
    if (width < 1920) return 12000;  // 提高：9000 → 12000
    return 15000;                    // 提高：12000 → 15000
};

export const getResponsiveParticleSize = () => {
    const width = window.innerWidth;
    if (width < 480) return 0.06;
    if (width < 1024) return 0.08;
    return 0.1;
};

// 根据设备性能动态降级，避免相机交互时帧率暴跌
export const hardwareThreads = navigator.hardwareConcurrency || 4;
export const isLowPowerDevice = hardwareThreads <= 4;

export const PARTICLE_COUNT = Math.floor(
    getResponsiveParticleCount() * (isLowPowerDevice ? 0.55 : 1.0)
);
export const BATCH_SIZE = Math.min(600, Math.floor(PARTICLE_COUNT / 10));
export const PARTICLE_COLOR = 0x00ffff;
export const PARTICLE_SIZE = getResponsiveParticleSize();
export const EXPLOSION_FORCE = 2.0;
export const RETURN_SPEED = 0.08;
export const DAMPING = 0.92;
export const INTERACTION_RADIUS = 3.0;
export const DEPTH_SCALE = 35;
export const DEPTH_PUSH_STRENGTH = 0.18;
export const OCCLUSION_MAX_FADE = 0.75;
export const HAND_SMOOTHING = 0.35;
export const FOLLOW_STIFFNESS = 2.0;
export const FOLLOW_DAMPING = 0.80;
export const MAX_SPEED = 0.4;
export const DEAD_ZONE = 0.005;
export const GESTURE_STABILITY_FRAMES = 3; // 需要连续N帧相同手势才切换
export const GESTURE_HISTORY_SIZE = 10; // 历史记录最大长度
export const RAINBOW_UPDATE_INTERVAL = isLowPowerDevice ? 6 : 3;

// ========== UI显示控制开关 ==========
/**
 * 全局UI元素显示控制开关
 * 
 * 功能：
 * - 控制所有UI元素的显示/隐藏（调试面板、下载证书、相机切换、扫码访问等）
 * - 优先级最高，会覆盖其他所有显示逻辑
 * 
 * 使用方法：
 * - true: 显示所有UI元素（默认）
 * - false: 隐藏所有UI元素，用于保证界面显示效果
 * 
 * 控制的元素：
 * - 调试面板按钮 (#debugPanelBtn)
 * - 调试面板 (#debug-panel)
 * - 下载证书按钮 (#downloadCertBtn)
 * - 前置相机按钮 (#frontCamBtn)
 * - 后置相机按钮 (#backCamBtn)
 * - 相机切换按钮容器 (#cameraSwitchBtns)
 * - 扫码访问 (#qr-container)
 * - 顶部按钮容器 (#topBtns)
 * 
 * 注意：
 * - 此开关优先级高于所有其他显示逻辑
 * - 设置为false时，即使其他逻辑尝试显示UI元素，也会被隐藏
 * - 修改后需要刷新页面才能生效
 */
export const UI_ELEMENTS_VISIBLE = true;

const defaultVector = () => new THREE.Vector3(0, 0, 0);
const allocateArray = () => new Float32Array(PARTICLE_COUNT);

export const State = {
    initialized: false,
    particlesLoaded: 0,
    scene: null,
    camera: null,
    renderer: null,
    particlesMesh: null,

    positions: null,
    velocities: null,
    targets: null,
    colors: null,

    currentShape: GestureShape.Sphere,
    isExploding: false,

    handCentroid: defaultVector(),
    handVelocity: defaultVector(),
    lastHandPos: defaultVector(),
    handPresent: false,
    handRadius3D: 1.0,
    lastHandTimestamp: performance.now(),
    followVelocity: defaultVector(),
    time: 0,
    gestureHistory: [],
    lastDetectedGesture: null,
    videoElement: null,
    currentStream: null,
    useFrontCamera: true,
    hasFrontCamera: false,
    hasBackCamera: false,
    restartCamera: false,
    rainbowMode: true,
    hueOffset: 0,
    rainbowFrameCounter: 0,
    debugEnabled: false,
    lastError: null,
    dynamicRadius: 1.0,
    occlusionFactors: allocateArray(),
    occlusionState: { lastColorVersionApplied: 0 },
    colorVersion: 0,
    get colorDirty() {
        return colorDirty;
    },
    set colorDirty(v) {
        colorDirty = v;
    }
};

State.occlusionFactors.fill(1);

// 工具函数
export function markColorsUpdated() {
    State.colorVersion += 1;
}

// ========== UI元素显示控制 ==========
/**
 * 根据全局开关和相机可用性更新UI元素显示状态
 * 优先级：全局开关 > 相机可用性判断
 * 
 * 逻辑：
 * - 如果 UI_ELEMENTS_VISIBLE = false：隐藏所有UI元素
 * - 如果 UI_ELEMENTS_VISIBLE = true：
 *   - 有相机：显示调试面板、下载证书、前置相机、后置相机按钮、二维码
 *   - 无相机：仅显示调试面板和二维码
 * 
 * @param {boolean} cameraAvailable - 相机是否可用（可选，默认false）
 */
export function updateUIElementsVisibility(cameraAvailable = false) {
    // 如果全局开关为false，隐藏所有UI元素
    if (!UI_ELEMENTS_VISIBLE) {
        setAllUIElementsVisible(false);
        return;
    }
    
    // 全局开关为true，根据相机可用性显示
    setUIElementsByCamera(cameraAvailable);
}

/**
 * 设置所有UI元素的显示/隐藏（用于全局开关）
 * @param {boolean} visible - true=显示，false=隐藏
 */
function setAllUIElementsVisible(visible) {
    const debugPanel = document.getElementById('debug-panel');
    const debugPanelBtn = document.getElementById('debugPanelBtn');
    const topBtns = document.getElementById('topBtns');
    const downloadCertBtn = document.getElementById('downloadCertBtn');
    const cameraSwitchBtns = document.getElementById('cameraSwitchBtns');
    const frontCamBtn = document.getElementById('frontCamBtn');
    const backCamBtn = document.getElementById('backCamBtn');
    const qrContainer = document.getElementById('qr-container');
    
    const displayValue = visible ? '' : 'none';
    
    if (topBtns) {
        topBtns.style.display = displayValue;
        if (visible) {
            topBtns.classList.add('visible');
        } else {
            topBtns.classList.remove('visible');
        }
    }
    
    if (debugPanelBtn) {
        debugPanelBtn.style.display = displayValue;
    }
    
    if (downloadCertBtn) {
        downloadCertBtn.style.display = displayValue;
    }
    
    if (cameraSwitchBtns) {
        cameraSwitchBtns.style.display = displayValue;
    }
    
    if (frontCamBtn) {
        frontCamBtn.style.display = displayValue;
    }
    
    if (backCamBtn) {
        backCamBtn.style.display = displayValue;
    }
    
    if (qrContainer) {
        qrContainer.style.display = displayValue;
        if (visible) {
            qrContainer.classList.remove('hidden');
            qrContainer.classList.add('visible');
        } else {
            qrContainer.classList.add('hidden');
            qrContainer.classList.remove('visible');
        }
    }
    
    if (debugPanel) {
        if (!visible) {
            debugPanel.classList.add('hidden');
            State.debugEnabled = false;
        }
    }
    
    // UI元素显示状态已更新（日志已移除）
}

/**
 * 根据相机可用性设置UI元素显示
 * @param {boolean} cameraAvailable - 相机是否可用
 */
function setUIElementsByCamera(cameraAvailable) {
    const debugPanel = document.getElementById('debug-panel');
    const debugPanelBtn = document.getElementById('debugPanelBtn');
    const topBtns = document.getElementById('topBtns');
    const downloadCertBtn = document.getElementById('downloadCertBtn');
    const cameraSwitchBtns = document.getElementById('cameraSwitchBtns');
    const frontCamBtn = document.getElementById('frontCamBtn');
    const backCamBtn = document.getElementById('backCamBtn');
    const qrContainer = document.getElementById('qr-container');
    
    // 调试面板和二维码：始终显示（当UI开关为true时）
    if (debugPanelBtn) {
        debugPanelBtn.style.display = '';
    }
    
    if (topBtns) {
        topBtns.style.display = '';
        topBtns.classList.add('visible');
    }
    
    if (qrContainer) {
        qrContainer.style.display = '';
        qrContainer.classList.remove('hidden');
        qrContainer.classList.add('visible');
    }
    
    if (cameraAvailable) {
        // 有相机：显示所有元素
        if (downloadCertBtn) {
            downloadCertBtn.style.display = 'inline-block';
        }
        
        if (cameraSwitchBtns) {
            cameraSwitchBtns.style.display = 'flex';
        }
        
        if (frontCamBtn) {
            frontCamBtn.style.display = '';
        }
        
        if (backCamBtn) {
            backCamBtn.style.display = '';
        }
        
        // 相机可用：显示所有UI元素（日志已移除）
    } else {
        // 无相机：仅显示调试面板和二维码
        if (downloadCertBtn) {
            downloadCertBtn.style.display = 'none';
        }
        
        if (cameraSwitchBtns) {
            cameraSwitchBtns.style.display = 'none';
        }
        
        if (frontCamBtn) {
            frontCamBtn.style.display = 'none';
        }
        
        if (backCamBtn) {
            backCamBtn.style.display = 'none';
        }
        
        // 相机不可用：仅显示调试面板和二维码（日志已移除）
    }
}

export function setLoading(text) {
    const el = document.getElementById("loading-text");
    if (el) el.innerHTML = text;
}

export function hideLoading() {
    const el = document.getElementById("loading");
    if (!el) return;
    el.classList.remove("fade-out");
    el.style.opacity = "0";
    el.classList.add("fade-out");
    setTimeout(() => {
        el.style.display = "none";
        el.style.opacity = "0";
    }, 500);
}

export function stopCurrentStream() {
    if (State.currentStream) {
        State.currentStream.getTracks().forEach(track => track.stop());
        State.currentStream = null;
    }
}


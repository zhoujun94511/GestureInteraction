/**
 * 调试面板模块
 * 
 * 功能：
 * - FPS 实时监控
 * - CPU 核心数显示
 * - 内存使用监控
 * - 系统信息显示
 * - 手势交互状态
 * 
 * @module debug
 */

import {
    State,
    GestureShape,
    PARTICLE_COUNT,
    GESTURE_STABILITY_FRAMES,
    UI_ELEMENTS_VISIBLE
} from './config.js';

// ========== 性能监控变量 ==========
let lastFrameTime = performance.now();
let frameCount = 0;
let fps = 0;
let fpsUpdateTimer = 0;

// CPU 负载估算变量
let frameTimes = [];
let avgFrameTime = 0;
let cpuLoad = 0;
const MAX_FRAME_SAMPLES = 60; // 保留最近60帧数据

// ========== 调试面板更新函数 ==========
export function updateDebugInfo() {
    // 如果全局UI开关为false或调试未启用，不更新
    if (!UI_ELEMENTS_VISIBLE || !State.debugEnabled) return;

    // 获取所有元素
    const fpsEl = document.getElementById('debug-fps');
    const cpuEl = document.getElementById('debug-cpu');
    const memoryEl = document.getElementById('debug-memory');
    const particleCountEl = document.getElementById('debug-particle-count');
    const screenSizeEl = document.getElementById('debug-screen-size');
    const statusEl = document.getElementById('debug-hand-status');
    const streamEl = document.getElementById('debug-stream-status');
    const runModeEl = document.getElementById('debug-run-mode');
    const gestureEl = document.getElementById('debug-gesture-type');
    const posEl = document.getElementById('debug-hand-pos');
    const particleEl = document.getElementById('debug-particle-pos');
    const velEl = document.getElementById('debug-follow-vel');
    const updateEl = document.getElementById('debug-last-update');
    const errorEl = document.getElementById('debug-error');

    if (!statusEl) return;

    // ========== 性能监控 ==========

    // FPS 计算和帧时间统计
    const currentTime = performance.now();
    const deltaTime = currentTime - lastFrameTime;
    lastFrameTime = currentTime;
    frameCount++;

    // 记录帧时间用于CPU负载估算
    frameTimes.push(deltaTime);
    if (frameTimes.length > MAX_FRAME_SAMPLES) {
        frameTimes.shift(); // 保持最近60帧
    }

    // 每500ms更新一次FPS显示
    fpsUpdateTimer += deltaTime;
    if (fpsUpdateTimer >= 500) {
        fps = Math.round((frameCount / fpsUpdateTimer) * 1000);
        frameCount = 0;
        fpsUpdateTimer = 0;

        // 计算平均帧时间和CPU负载估算
        if (frameTimes.length > 0) {
            avgFrameTime = frameTimes.reduce((sum, t) => sum + t, 0) / frameTimes.length;
            // CPU负载估算：基于16.67ms（60fps）作为参考
            // 如果平均帧时间接近16.67ms，说明负载适中
            // 超过则负载高，低于则负载低
            const targetFrameTime = 16.67; // 60fps
            cpuLoad = Math.min(100, Math.max(0, (avgFrameTime / targetFrameTime) * 100));
        }
    }

    if (fpsEl) {
        fpsEl.textContent = `${fps} fps (${avgFrameTime.toFixed(1)}ms)`;
        // 颜色编码：绿色(55+) 黄色(30-55) 红色(<30)
        if (fps >= 55) {
            fpsEl.style.color = '#0f0';
        } else if (fps >= 30) {
            fpsEl.style.color = '#ff0';
        } else {
            fpsEl.style.color = '#f00';
        }
    }

    // CPU 负载估算（基于帧时间）
    if (cpuEl) {
        const cores = navigator.hardwareConcurrency || '未知';
        cpuEl.textContent = `${cores} 核 | 负载: ${cpuLoad.toFixed(0)}%`;

        // 颜色编码：基于负载百分比
        if (cpuLoad < 60) {
            cpuEl.style.color = '#0f0'; // 轻负载
        } else if (cpuLoad < 85) {
            cpuEl.style.color = '#ff0'; // 中等负载
        } else {
            cpuEl.style.color = '#f00'; // 重负载
        }
    }

    // 内存使用（如果浏览器支持）
    if (memoryEl) {
        if (performance.memory) {
            const used = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
            const total = (performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(0);
            const percent = ((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100).toFixed(0);
            memoryEl.textContent = `${used}MB / ${total}MB (${percent}%)`;

            // 颜色编码：绿色(<50%) 黄色(50-80%) 红色(>80%)
            if (percent < 50) {
                memoryEl.style.color = '#0f0';
            } else if (percent < 80) {
                memoryEl.style.color = '#ff0';
            } else {
                memoryEl.style.color = '#f00';
            }
        } else {
            memoryEl.textContent = '不支持';
            memoryEl.style.color = '#888';
        }
    }

    // 粒子数量
    if (particleCountEl) {
        const count = PARTICLE_COUNT;
        particleCountEl.textContent = `${count.toLocaleString()} 个`;
        particleCountEl.style.color = '#0ff';
    }

    // ========== 系统信息 ==========

    if (screenSizeEl) {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const dpr = window.devicePixelRatio || 1;
        const screenWidth = screen.width;
        const screenHeight = screen.height;
        screenSizeEl.textContent = `${width}×${height} (DPR:${dpr.toFixed(1)}) [屏:${screenWidth}×${screenHeight}]`;
        screenSizeEl.style.color = '#0ff';
    }

    statusEl.textContent = State.handPresent ? '✓ 检测到' : '✗ 未检测到';
    statusEl.style.color = State.handPresent ? '#0f0' : '#f00';

    if (streamEl) {
        const active = State.currentStream && State.currentStream.active;
        streamEl.textContent = active ? '✓ 活跃状态' : '✗ 停止状态';
        streamEl.style.color = active ? '#0f0' : '#f00';
    }

    // 运行模式诊断
    if (runModeEl) {
        const streamActive = State.currentStream && State.currentStream.active;
        const videoReady = State.videoElement && State.videoElement.readyState >= 2;
        const videoHasDimensions = State.videoElement &&
            State.videoElement.videoWidth > 0 &&
            State.videoElement.videoHeight > 0;
        const lastUpdateAgo = State.lastHandTimestamp ?
            (performance.now() - State.lastHandTimestamp) : Infinity;

        if (streamActive && videoReady && videoHasDimensions) {
            if (lastUpdateAgo < 2000) {
                runModeEl.textContent = '正常模式';
                runModeEl.style.color = '#0f0';
            } else {
                runModeEl.textContent = '摄像头正常但无手势';
                runModeEl.style.color = '#ff0';
            }
        } else if (!streamActive && lastUpdateAgo > 10000) {
            runModeEl.textContent = '演示模式';
            runModeEl.style.color = '#ff0';
        } else if (!streamActive) {
            runModeEl.textContent = '摄像头未启动';
            runModeEl.style.color = '#f00';
        } else if (!videoReady) {
            runModeEl.textContent = '视频初始化中...';
            runModeEl.style.color = '#ff0';
        } else {
            runModeEl.textContent = '初始化中...';
            runModeEl.style.color = '#ff0';
        }
    }

    // ========== 手势交互 ==========

    const gestureNames = {
        [GestureShape.Sphere]: '球体',
        [GestureShape.Ring]: '圆环',
        [GestureShape.Star]: '星形',
        [GestureShape.Heart]: '爱心',
        [GestureShape.Text]: '文字'
    };

    if (State.handPresent) {
        if (State.currentShape) {
            const stableCount = State.gestureHistory.length >= GESTURE_STABILITY_FRAMES ?
                State.gestureHistory.slice(-GESTURE_STABILITY_FRAMES).filter(g => g === State.lastDetectedGesture).length : 0;
            const stability = stableCount >= GESTURE_STABILITY_FRAMES ? '✓' : `(${stableCount}/${GESTURE_STABILITY_FRAMES})`;
            gestureEl.textContent = `${gestureNames[State.currentShape] || State.currentShape} ${stability}`;
            gestureEl.style.color = stableCount >= GESTURE_STABILITY_FRAMES ? '#0f0' : '#ff0';

            if (State.lastDetectedGesture && State.lastDetectedGesture !== State.currentShape) {
                gestureEl.textContent += ` [检测:${gestureNames[State.lastDetectedGesture] || State.lastDetectedGesture}]`;
            }
        } else {
            gestureEl.textContent = State.lastDetectedGesture ?
                `检测:${gestureNames[State.lastDetectedGesture] || State.lastDetectedGesture}` : '-';
            gestureEl.style.color = '#888';
        }
    } else {
        gestureEl.textContent = '-';
        gestureEl.style.color = '#888';
    }

    if (State.handPresent) {
        posEl.textContent = `${State.handCentroid.x.toFixed(2)}, ${State.handCentroid.y.toFixed(2)}, ${State.handCentroid.z.toFixed(2)}`;
    } else {
        posEl.textContent = '-';
    }

    if (State.particlesMesh) {
        const pos = State.particlesMesh.position;
        particleEl.textContent = `${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}`;
    } else {
        particleEl.textContent = '-';
    }

    velEl.textContent = `${State.followVelocity.x.toFixed(3)}, ${State.followVelocity.y.toFixed(3)}, ${State.followVelocity.z.toFixed(3)}`;

    if (State.lastHandTimestamp) {
        const timeSince = performance.now() - State.lastHandTimestamp;
        let displayText;

        if (timeSince < 1000) {
            displayText = `${timeSince.toFixed(0)}ms前`;
            updateEl.style.color = '#0f0';
        } else if (timeSince < 60000) {
            displayText = `${(timeSince / 1000).toFixed(1)}秒前`;
            updateEl.style.color = timeSince > 5000 ? '#f00' : '#ff0';
        } else {
            const minutes = Math.floor(timeSince / 60000);
            const seconds = Math.floor((timeSince % 60000) / 1000);
            displayText = `${minutes}分${seconds}秒前`;
            updateEl.style.color = '#f00';
        }

        updateEl.textContent = displayText;
    } else {
        updateEl.textContent = '从未更新';
        updateEl.style.color = '#f00';
    }

    if (State.lastError) {
        errorEl.textContent = State.lastError;
        errorEl.style.color = '#f00';
    } else {
        errorEl.textContent = '无';
        errorEl.style.color = '#0f0';
    }
}

// ========== 调试面板切换 ==========
export function toggleDebug() {
    // 如果全局UI开关为false，不允许显示调试面板
    if (!UI_ELEMENTS_VISIBLE) {
        console.warn('[Debug] UI元素已被全局隐藏，无法显示调试面板');
        return;
    }

    State.debugEnabled = !State.debugEnabled;
    const panel = document.getElementById('debug-panel');
    const btn = document.getElementById('debug-toggle') || document.getElementById('debugPanelBtn');

    if (panel) {
        if (State.debugEnabled) {
            panel.classList.remove('hidden');
            if (btn) btn.textContent = '隐藏调试';
        } else {
            panel.classList.add('hidden');
            if (btn) btn.textContent = '显示调试';
        }
    }
}

// ========== 性能统计工具 ==========
export function getPerformanceStats() {
    const stats = {
        fps: fps,
        avgFrameTime: avgFrameTime.toFixed(2),
        cpuCores: navigator.hardwareConcurrency || 0,
        cpuLoad: cpuLoad.toFixed(1),
        particleCount: PARTICLE_COUNT,
        handPresent: State.handPresent,
        currentShape: State.currentShape
    };

    // 添加内存信息（如果可用）
    if (performance.memory) {
        stats.memoryUsedMB = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
        stats.memoryLimitMB = (performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(0);
        stats.memoryPercent = ((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100).toFixed(0);
    }

    return stats;
}

// ========== 重置性能计数器 ==========
export function resetPerformanceCounters() {
    lastFrameTime = performance.now();
    frameCount = 0;
    fps = 0;
    fpsUpdateTimer = 0;
    frameTimes = [];
    avgFrameTime = 0;
    cpuLoad = 0;
    console.log('[Debug] 性能计数器已重置');
}


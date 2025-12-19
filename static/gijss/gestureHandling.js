import * as THREE from 'three';
import {
    State,
    GestureShape,
    GESTURE_HISTORY_SIZE,
    GESTURE_STABILITY_FRAMES,
    FOLLOW_STIFFNESS,
    FOLLOW_DAMPING,
    MAX_SPEED,
    DEAD_ZONE,
    DEPTH_SCALE,
    UI_ELEMENTS_VISIBLE,
    setLoading,
    hideLoading,
    stopCurrentStream,
    updateUIElementsVisibility
} from './config.js';
import {
    setupThreeJS,
    setupParticles,
    animate,
    triggerExplosion,
    SHAPE_GENERATORS
} from './particleSystem.js';
import {
    worldifyLandmarks,
    computeHandCenter,
    smoothHandMovement,
    computeHandRadius
} from './glhand3D.js';
import {
    updateDebugInfo,
    toggleDebug
} from './debug.js';

// ========== 摄像头检测和切换 ==========
async function detectCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');

        State.hasFrontCamera = videoDevices.some(d =>
            d.label.toLowerCase().includes('front') ||
            d.label.toLowerCase().includes('user') ||
            d.facingMode === 'user'
        );

        State.hasBackCamera = videoDevices.some(d =>
            d.label.toLowerCase().includes('back') ||
            d.label.toLowerCase().includes('environment') ||
            d.facingMode === 'environment'
        );

        const hasCamera = videoDevices.length > 0;

        // 根据相机可用性更新UI元素显示
        // updateUIElementsVisibility会检查UI_ELEMENTS_VISIBLE，然后根据相机状态显示相应元素
        updateUIElementsVisibility(hasCamera);

        // 如果有多个相机，更新相机按钮状态
        if (hasCamera && videoDevices.length > 1) {
            updateCameraButtonState();
        }

        return hasCamera;
    } catch (e) {
        console.warn('Camera detection failed:', e);
        return false;
    }
}

function updateCameraButtonState() {
    const frontBtn = document.getElementById('frontCamBtn');
    const backBtn = document.getElementById('backCamBtn');

    if (frontBtn && backBtn) {
        if (State.useFrontCamera) {
            frontBtn.classList.add('active');
            backBtn.classList.remove('active');
        } else {
            frontBtn.classList.remove('active');
            backBtn.classList.add('active');
        }
    }
}

async function switchCamera(useFront = true) {
    if (useFront === State.useFrontCamera) return;

    State.useFrontCamera = useFront;
    updateCameraButtonState();
    stopCurrentStream();

    try {
        // 移动端使用更低分辨率
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        const constraints = {
            video: {
                facingMode: useFront ? "user" : "environment",
                width: isMobile ? 480 : 640,
                height: isMobile ? 360 : 480
            }
        };

        console.log(`[Camera] 切换摄像头: ${constraints.video.width}x${constraints.video.height}`);

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        State.currentStream = stream;

        if (!State.videoElement) {
            State.videoElement = document.getElementById("video-element");
        }

        State.videoElement.srcObject = stream;
        await State.videoElement.play();

        console.log(`已切换到${useFront ? '前置' : '后置'}摄像头`);
    } catch (e) {
        console.error('摄像头切换失败:', e);
        alert(`无法切换到${useFront ? '前置' : '后置'}摄像头`);
    }
}

// ========== Camera Check ==========
async function checkCameraAvailable() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.some(d => d.kind === "videoinput");
    } catch {
        return false;
    }
}

// ========== Demo Mode（无相机自动播放） ==========
function enterDemoMode(alreadySetup = false) {
    if (!alreadySetup) {
        setupThreeJS();
        setupParticles();
    }

    // 无相机模式：更新UI显示（仅显示调试面板和二维码）
    updateUIElementsVisibility(false);

    setLoading("未检测到摄像头，进入演示模式…");
    setTimeout(() => hideLoading(), 800);

    const demoShapes = ["sphere", "ring", "star", "heart", "text"];
    let idx = 0;

    const startDemo = () => {
        const s = demoShapes[idx % demoShapes.length];
        State.currentShape = s;
        triggerExplosion();
        const fn = SHAPE_GENERATORS[s];
        if (fn) {
            const result = fn();
            if (result instanceof Promise) {
                result.catch(err => console.error('[Shape Generator] Error:', err));
            }
        }
        idx++;
    };

    startDemo();
    setInterval(startDemo, 6000);

    if (!alreadySetup) {
        animate();
    }
}

async function continueInit() {
    const loadingEl = document.getElementById("loading");
    if (loadingEl) {
        loadingEl.style.display = "block";
        loadingEl.style.opacity = "1";
        loadingEl.classList.remove("fade-out");
    }

    setLoading("正在检测摄像头…");

    try {
        const hasCamera = await checkCameraAvailable();
        if (!hasCamera) {
            enterDemoMode(false);
            return;
        }

        setLoading("正在初始化系统…");
        setupThreeJS();
        setupParticles();
        setupMediaPipe();
        animate();
    } catch (error) {
        console.error("初始化错误:", error);
        enterDemoMode(false);
    }
}

async function init() {
    if (State.initialized) return;
    State.initialized = true;

    // 先应用全局UI显示控制（优先级最高）
    // 初始化时还没有检测到相机，所以传入false
    // 后续在detectCameras()中会根据实际相机状态更新UI
    updateUIElementsVisibility(false);

    continueInit();
}

function setupMediaPipe() {
    setLoading("正在启动摄像头…");
    State.videoElement = document.getElementById("video-element");

    // 移动端使用更低分辨率以减少内存占用和处理负担
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const videoConstraints = isMobile
        ? { facingMode: State.useFrontCamera ? "user" : "environment", width: 480, height: 360 }  // 移动端降低分辨率
        : { facingMode: State.useFrontCamera ? "user" : "environment", width: 640, height: 480 };

    console.log(`[Camera] 请求视频流: ${videoConstraints.width}x${videoConstraints.height} (移动端: ${isMobile})`);

    navigator.mediaDevices.getUserMedia({
        video: videoConstraints
    })
        .then(stream => {
            State.currentStream = stream;
            State.videoElement.srcObject = stream;
            State.videoElement.play();

            setLoading("摄像头启动成功，正在加载手势模型…");
            detectCameras();
            initHands(State.videoElement);
        })
        .catch(e => {
            setLoading("摄像头启动失败，进入演示模式…");
            console.error("Camera Error:", e);
            enterDemoMode(true);
        });
}

let handsReady = false;
let handsProcessing = false;
let handsInstance = null;
let handsLoadTimeout = null;
let loadingHintTimer = null;

function initHands(videoElement) {
    setLoading("加载手势模型…<br><small>移动端可能需要15-30秒</small>");

    // 设置加载超时（30秒）
    clearTimeout(handsLoadTimeout);
    handsLoadTimeout = setTimeout(() => {
        if (!handsReady) {
            console.warn('[MediaPipe] 手势模型加载超时，进入无手势模式');
            setLoading("手势模型加载超时<br>继续无手势模式…");
            setTimeout(() => {
                hideLoading();
                // 允许继续使用，只是没有手势交互
            }, 2000);
        }
    }, 30000); // 30 秒超时

    const hands = new Hands({
        locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    handsInstance = hands;

    // 降低移动端复杂度以加快加载和减少内存使用
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    hands.setOptions({
        selfieMode: true,
        maxNumHands: 1,
        modelComplexity: isMobile ? 0 : 1,  // 移动端使用简化模型
        minDetectionConfidence: 0.65,
        minTrackingConfidence: 0.65
    });

    console.log(`[MediaPipe] 配置: 移动端=${isMobile}, 模型复杂度=${isMobile ? 0 : 1}`);

    hands.onResults(results => {
        if (!handsReady) {
            handsReady = true;
            clearTimeout(handsLoadTimeout);
            clearInterval(loadingHintTimer);
            setLoading("手势模型加载完成");
            console.log('[MediaPipe] 手势模型加载成功');
            setTimeout(() => hideLoading(), 800);
        }
        onHandsResults(results);
    });

    let frameCount = 0;
    const PROCESS_EVERY_N_FRAMES = 1;
    let firstFrameSent = false;

    // 显示加载进度提示
    let secondsElapsed = 0;
    clearInterval(loadingHintTimer);
    loadingHintTimer = setInterval(() => {
        if (!handsReady) {
            secondsElapsed++;
            if (secondsElapsed === 5) {
                setLoading("加载手势模型…<br><small>请耐心等待，移动端需要更长时间</small>");
                // 显示跳过按钮
                const skipBtn = document.getElementById('skip-loading-btn');
                if (skipBtn) skipBtn.style.display = 'block';
            } else if (secondsElapsed === 15) {
                setLoading("加载手势模型…<br><small>几乎完成了，请再等待片刻</small>");
            } else if (secondsElapsed === 25) {
                setLoading("加载手势模型…<br><small>马上就好，最后几秒…</small>");
            }
        } else {
            clearInterval(loadingHintTimer);
        }
    }, 1000);

    // 关键修复：等待视频准备好后立即发送第一帧以触发模型加载
    const waitForVideoAndSendFirstFrame = async () => {
        console.log('[MediaPipe] 等待视频流准备...');

        // 等待视频准备好
        const maxWaitTime = 10000; // 最多等10秒
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitTime) {
            if (videoElement && videoElement.readyState >= 2) {
                // 额外检查：确保视频有有效尺寸
                if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
                    console.log(`[MediaPipe] 视频流已准备 (${videoElement.videoWidth}x${videoElement.videoHeight})，发送第一帧...`);

                    // 添加延迟，确保 MediaPipe 完全初始化
                    await new Promise(resolve => setTimeout(resolve, 300));

                    try {
                        await hands.send({ image: videoElement });
                        firstFrameSent = true;
                        console.log('[MediaPipe] 第一帧已发送，模型开始加载');
                        break;
                    } catch (err) {
                        console.error('[MediaPipe] 发送第一帧失败:', err);
                        // 尝试重新初始化
                        if (err.message && err.message.includes('memory')) {
                            console.warn('[MediaPipe] 内存错误，可能需要重新加载');
                        }
                        break;
                    }
                } else {
                    console.log('[MediaPipe] 视频尺寸无效，继续等待...');
                }
            }
            await new Promise(resolve => setTimeout(resolve, 100)); // 每100ms检查一次
        }

        if (!firstFrameSent) {
            console.error('[MediaPipe] 视频流在10秒内未准备好');
            clearTimeout(handsLoadTimeout);
            setLoading("摄像头视频流获取失败<br>继续无手势模式…");
            setTimeout(() => hideLoading(), 2000);
        }
    };

    // 立即开始等待和发送第一帧
    waitForVideoAndSendFirstFrame();

    async function processFrame() {
        frameCount++;

        try {
            // 只在视频准备好且有有效尺寸时处理
            if (frameCount % PROCESS_EVERY_N_FRAMES === 0 &&
                videoElement &&
                videoElement.readyState >= 2 &&
                videoElement.videoWidth > 0 &&
                videoElement.videoHeight > 0) {

                // 超时重启检测
                if (handsProcessing && performance.now() - State.lastHandTimestamp > 5000) {
                    console.warn('[MediaPipe] 处理超时，重启手势检测');
                    handsProcessing = false;
                    try {
                        await handsInstance.close();
                    } catch (e) {
                        console.warn('Close hands failed:', e);
                    }
                    initHands(videoElement);
                    return;
                }

                // 防止并发调用
                if (!handsProcessing) {
                    handsProcessing = true;
                    try {
                        await hands.send({ image: videoElement });
                    } catch (err) {
                        console.error("Hands send failed:", err);

                        // 处理内存错误
                        if (err.message && err.message.includes('memory')) {
                            console.error('[MediaPipe] ❌ 内存访问错误，停止手势检测');
                            State.lastError = '手势检测内存错误';
                            clearTimeout(handsLoadTimeout);
                            clearInterval(loadingHintTimer);

                            // 停止进一步处理
                            try {
                                await handsInstance.close();
                            } catch (e) {
                                console.warn('Close hands after error failed:', e);
                            }

                            setLoading("手势检测出错<br>继续无手势模式…");
                            setTimeout(() => hideLoading(), 2000);
                            return; // 停止 processFrame
                        }

                        State.lastError = `Hands错误: ${err.message || err.name || '未知错误'}`;
                    } finally {
                        handsProcessing = false;
                    }
                }
            }
        } catch (err) {
            console.error("ProcessFrame error:", err);
            State.lastError = `处理错误: ${err.message || '未知'}`;
            handsProcessing = false;
        }

        requestAnimationFrame(processFrame);
    }

    processFrame();
}

function onHandsResults(results) {
    State.lastError = null;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        State.handPresent = true;
        State.lastHandTimestamp = performance.now();
        const landmarks = results.multiHandLandmarks[0];

        const worldLandmarks = worldifyLandmarks(landmarks, DEPTH_SCALE);
        const rawCenter = computeHandCenter(worldLandmarks);
        const smoothedCenter = smoothHandMovement(State.handCentroid, rawCenter, 0.35);

        const delta = smoothedCenter.clone().sub(State.handCentroid);
        if (delta.length() < DEAD_ZONE) {
            smoothedCenter.copy(State.handCentroid);
        }

        State.handVelocity.subVectors(smoothedCenter, State.lastHandPos);
        State.lastHandPos.copy(smoothedCenter);
        State.handCentroid.copy(smoothedCenter);
        State.handRadius3D = computeHandRadius(worldLandmarks, State.handCentroid, State.handRadius3D, 0.25);

        const toTarget = new THREE.Vector3().subVectors(State.handCentroid, State.particlesMesh.position);
        const acceleration = toTarget.multiplyScalar(FOLLOW_STIFFNESS);
        State.followVelocity.add(acceleration);
        State.followVelocity.multiplyScalar(FOLLOW_DAMPING);
        if (State.followVelocity.length() > MAX_SPEED) {
            State.followVelocity.setLength(MAX_SPEED);
        }
        State.particlesMesh.position.add(State.followVelocity);

        const detectedGesture = recognizeGesture(landmarks);
        State.lastDetectedGesture = detectedGesture;
        const stableGesture = getStableGesture(detectedGesture);

        if (stableGesture && SHAPE_GENERATORS[stableGesture]) {
            console.log(`[Gesture] Switching to: ${stableGesture}`);
            State.currentShape = stableGesture;
            triggerExplosion();
            const result = SHAPE_GENERATORS[stableGesture]();
            if (result instanceof Promise) {
                result.catch(err => console.error('[Shape Generator] Error:', err));
            }
        } else if (stableGesture && !SHAPE_GENERATORS[stableGesture]) {
            console.error(`[Gesture] ❌ No generator found for: ${stableGesture}`);
            console.log('[Gesture] Available generators:', Object.keys(SHAPE_GENERATORS));
        }

        const palmSize = Math.sqrt(
            Math.pow(landmarks[0].x - landmarks[9].x, 2) +
            Math.pow(landmarks[0].y - landmarks[9].y, 2)
        );
        const targetScale = 0.5 + palmSize * 3;
        State.particlesMesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
        const dynamicFromPalm = THREE.MathUtils.clamp(palmSize * 8, 0.8, 2.0);
        const dynamicFromDepth = THREE.MathUtils.clamp(State.handRadius3D * 0.6, 0.8, 2.2);
        State.dynamicRadius = THREE.MathUtils.lerp(State.dynamicRadius, Math.max(dynamicFromPalm, dynamicFromDepth), 0.35);
    } else {
        State.handPresent = false;
        State.followVelocity.set(0, 0, 0);
        State.particlesMesh.scale.lerp(new THREE.Vector3(1, 1, 1), 0.05);
    }
}

function recognizeGesture(landmarks) {
    const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

    const isExtended = (tipIdx, pipIdx, mcpIdx) => {
        const dTip = dist(landmarks[0], landmarks[tipIdx]);
        const dPip = dist(landmarks[0], landmarks[pipIdx]);
        const dMcp = dist(landmarks[0], landmarks[mcpIdx]);
        const ratio = dTip / dPip;
        const pipMcpRatio = dPip / dMcp;
        if (tipIdx === 4) {
            return ratio > 1.15 && pipMcpRatio > 0.85;
        }
        return ratio > 1.25 && pipMcpRatio > 0.9;
    };

    const isThumbUp = () => {
        const thumbMcp = landmarks[2];
        const thumbPip = landmarks[3];
        const thumbTip = landmarks[4];
        const wrist = landmarks[0];
        const thumbDirectionY = thumbTip.y - thumbMcp.y;
        const thumbLength = dist(thumbMcp, thumbTip);
        const wristToMcp = dist(wrist, thumbMcp);
        return thumbLength / wristToMcp > 0.4 && thumbDirectionY < 0 && thumbTip.y < thumbPip.y;
    };

    const thumbOpen = isThumbUp();
    const indexOpen = isExtended(8, 6, 5);
    const middleOpen = isExtended(12, 10, 9);
    const ringOpen = isExtended(16, 14, 13);
    const pinkyOpen = isExtended(20, 18, 17);

    const fingersCount = [thumbOpen, indexOpen, middleOpen, ringOpen, pinkyOpen].filter(Boolean).length;

    // 原始判定顺序：Victory/Text -> Star -> Heart -> Sphere -> Ring
    if (indexOpen && middleOpen && !ringOpen && !pinkyOpen && !thumbOpen) return GestureShape.Text;
    if (indexOpen && !middleOpen && !ringOpen && !pinkyOpen && !thumbOpen) return GestureShape.Star;
    if (thumbOpen && !indexOpen && !middleOpen && !ringOpen && !pinkyOpen) return GestureShape.Heart;
    if (fingersCount === 5) return GestureShape.Sphere;
    if (fingersCount === 0) return GestureShape.Ring;

    return null;
}

function getStableGesture(newGesture) {
    State.gestureHistory.push(newGesture);
    if (State.gestureHistory.length > GESTURE_HISTORY_SIZE) {
        State.gestureHistory.shift();
    }
    if (State.gestureHistory.length < GESTURE_STABILITY_FRAMES) return null;

    const recentGestures = State.gestureHistory.slice(-GESTURE_STABILITY_FRAMES);
    const firstGesture = recentGestures[0];

    if (firstGesture && recentGestures.every(g => g === firstGesture)) {
        if (firstGesture !== State.currentShape) {
            return firstGesture;
        }
    }
    return null;
}

function downloadCert() {
    window.location.href = '/download-cert';
}

function skipHandsLoading() {
    console.log('[User] 用户选择跳过手势加载');

    // 清理所有定时器
    clearTimeout(handsLoadTimeout);
    clearInterval(loadingHintTimer);

    // 停止手势模型加载
    if (handsInstance) {
        try {
            handsInstance.close();
        } catch (e) {
            console.warn('Failed to close hands instance:', e);
        }
    }

    // 隐藏跳过按钮
    const skipBtn = document.getElementById('skip-loading-btn');
    if (skipBtn) skipBtn.style.display = 'none';

    // 隐藏加载提示
    hideLoading();

    console.log('[App] 已进入无手势交互模式，可正常使用粒子动画');
}

// ========== 调试面板功能已移至 debug.js 模块 ==========

// 健康检查：流/模型状态异常时自动重启
function startHealthCheck() {
    setInterval(() => {
        if (!State.restartCamera && State.currentStream && !State.currentStream.active) {
            State.restartCamera = true;
            console.warn('检测到摄像头流停止，尝试重启');
            stopCurrentStream();
            setupMediaPipe();
            setTimeout(() => { State.restartCamera = false; }, 1500);
            return;
        }

        if (State.videoElement && State.videoElement.paused) {
            State.videoElement.play().catch(() => { });
        }
    }, 1500);
}

// 主入口
init();
startHealthCheck();

// 确保在DOM加载完成后立即应用UI控制（防止模块加载延迟）
// 此时还没有检测到相机，所以传入false
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        updateUIElementsVisibility(false);
    });
} else {
    // DOM已经加载完成，立即执行
    updateUIElementsVisibility(false);
}

// 暴露给全局按钮使用
window.switchCamera = switchCamera;
window.toggleDebug = toggleDebug;
window.downloadCert = downloadCert;
window.updateDebugInfo = updateDebugInfo;
window.skipHandsLoading = skipHandsLoading;


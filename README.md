# GestureInteraction

**GestureInteraction** is a high-performance, Web-based AR hand gesture particle interaction system powered by Flask, MediaPipe, and Three.js.

---

## 🌐 Documentation / 文档语言

- [**English (README_en.md)**](README_en.md)
- [**简体中文 (README_zh.md)**](README_zh.md)

---

![Demo GIF](Demo_GIF.gif)

---


## 📝 Introduction

GestureInteraction is a web-based Augmented Reality (AR) hand gesture particle interaction system.

The system uses **MediaPipe Hands** for real-time hand gesture recognition and **Three.js + WebGL** for rendering interactive 3D particle animations. It enables natural and smooth visual interactions driven entirely by hand gestures.

The project runs purely in the browser and does not require any native applications, making it suitable for desktop and mobile devices.

---

## ✨ Key Features

### 🖐️ Gesture Interaction
- Real-time hand tracking powered by MediaPipe Hands
- Multiple gesture modes (open palm, fist, V-sign, single finger, thumb, three fingers)
- Gesture stability processing to reduce jitter and false recognition

### 🌌 Particle System
- Three.js–based 3D particle system
- Multiple particle shapes (sphere, ring, star, text, heart, dragon)
- Physics-based following with damping and inertia for natural motion

### 🚀 Visuals and Performance
- WebGL hardware-accelerated rendering
- Adaptive particle count based on device performance
- Basic depth perception and occlusion simulation

### 📱 System Capabilities
- HTTPS secure access using self-signed certificates
- Automatic detection and switching of front/rear cameras
- Automatic demo mode when no camera is available
- Responsive layout for desktop, tablet, and mobile screens

---

## 🛠️ Technology Stack

### Backend
- **Flask** – Python web framework
- **SSL/TLS** – HTTPS support required for browser camera access

### Frontend
- **MediaPipe Hands** – Real-time hand gesture recognition
- **Three.js** – 3D scene and particle rendering
- **WebGL** – GPU-accelerated graphics
- **MediaDevices API** – Camera access and stream management
- **ES6+ JavaScript** – Modular frontend architecture

---

## 🚀 Quick Start

### Requirements
- Python 3.8 or later
- A modern browser with WebGL support
- Camera device (optional; demo mode will be enabled if unavailable)

### Installation and Run

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the server**:
   ```bash
   python app.py
   ```

3. **Open the application in your browser**:
   Access the URL displayed in the terminal:
   ```text
   https://<your-local-ip>:5001
   ```
   > [!IMPORTANT]
   > On first access, you must install the self-signed HTTPS certificate; otherwise, the browser will block camera access.

### Usage (Gestures)

| Gesture | Particle Effect |
| :--- | :--- |
| **Open palm** | Sphere |
| **Fist** | Ring |
| **V-sign** | Text particles |
| **Single finger** | Star |
| **Thumb** | Heart |
| **Three fingers** | Dragon |

Place your hand in front of the camera. The system will automatically recognize the gesture and switch to the corresponding particle shape.

---

## 📂 Project Structure

```text
GestureInteraction/
├── app.py              # Main Flask backend
├── tools/              # Utility tools
│   ├── utils.py
│   └── gsignature.py
├── requirements.txt    # Project dependencies
├── README.md           # Entry documentation
├── README_en.md        # English documentation
├── README_zh.md        # Chinese documentation
├── ssl/                # SSL certificates
│   ├── server.crt
│   └── server.key
├── static/             # Static assets
│   ├── gicss/          # Stylesheets
│   ├── gijss/          # Core logic
│   └── giresource/     # Textures and resources
└── templates/          # HTML templates
    └── index.html
```

---

## ⚙️ Configuration

### Port Configuration
The default port is `5001` and can be modified in `app.py`.

### Particle Parameters
Particle count, size, and physics parameters are configured in the frontend `static/gijss/config.js` file and can be adjusted based on performance requirements.

### Gesture Parameters
Gesture stability frames, smoothing factors, and follow strength can be tuned to better match different devices and environments.

---

## ❓ FAQ

**Camera access is blocked**
- Ensure the application is accessed via **HTTPS**.
- Check browser permission settings.
- Make sure the camera is not being used by another application.

**Low performance or frame drops**
- Reduce the particle count in `config.js`.
- Close other resource-intensive applications.
- Use a device with better GPU performance.

---

## 📄 License

This project is licensed under the MIT License.

# GestureInteraction Hand Gesture Particle Interaction System

A web-based Augmented Reality (AR) particle interaction system that uses hand gesture recognition to control 3D particle effects.  
It leverages **MediaPipe Hands** for real-time gesture detection and **Three.js** for rendering 3D particle animations, supporting multiple gestures to control different particle shapes.

## ✨ Key Features

### 🎮 Gesture Recognition & Control
- **Real-time gesture detection**: Powered by MediaPipe Hands for real-time hand tracking
- **5 gesture modes**:
  - ✋ **Open Palm** → Sphere particles
  - ✊ **Fist** → Ring particles
  - ✌️ **Scissors (V sign)** → "I LOVE WORLD" text particles
  - 👆 **Single Finger Pointing** → Star particles
  - 👍 **Thumbs Up** → Heart particles
  - Extensible for additional gestures

### 🎨 Visual Effects
- **Vision Pro–style physics system**: Smooth and natural particle following
- **Rainbow particle effects**: Dynamic gradient-colored particles
- **Three-stage magnetic attraction**: Natural interaction between hands and particles
- **Depth perception**: 3D spatial hand position tracking
- **Occlusion simulation**: Particle fade-out when occluded by the hand
- **Adaptive particle count**: Automatically adjusted based on device performance

### 📱 Functional Features
- **Front / rear camera switching**: Automatic detection and support for multiple cameras
- **HTTPS secure connection**: Uses self-signed certificates with one-click download and installation
- **QR code sharing**: Automatically generates a QR code for easy access on other devices
- **Debug panel**: Real-time display of gesture state, position, velocity, and other diagnostics
- **Demo mode**: Automatically enabled when no camera is available
- **Responsive design**: Perfectly adapts to desktop, tablet, and mobile devices

## 🚀 Quick Start

### Environment Requirements

- Python 3.8+
- A browser that supports WebGL and the MediaDevices API
- A camera device (optional; demo mode is enabled if no camera is available)

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd GestureInteraction
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Prepare SSL certificates**
   
   Place the following files in the `ssl/` directory:
   - `server.crt` – SSL certificate file
   - `server.key` – SSL private key file
   
   > **Tip**: You can generate a self-signed certificate using OpenSSL:
   > ```bash
   > openssl req -x509 -newkey rsa:4096 -nodes -keyout ssl/server.key -out ssl/server.crt -days 365
   > ```

4. **Start the service**
   ```bash
   python app.py
   ```

5. **Access the application**
   
   After startup, the browser will open automatically. The access URL is:
   ```
   https://<your-local-ip>:5001
   ```
   
   On first access, the browser will warn that the certificate is not secure. You need to:
   - Click the "Download Certificate" button
   - Install the certificate into the system trust store
   - Refresh the page to access normally

## 📖 Usage Guide

### Basic Operations

1. **Allow camera access**
   - On first visit, the browser will request camera permission
   - Click "Allow" to enable gesture recognition

2. **Gesture control**
   - Place your hand in front of the camera
   - Perform different gestures to switch particle shapes
   - Move your hand to control particle movement

3. **Camera switching**
   - If multiple cameras are available, a switch button appears in the top-right corner
   - Click "Front Camera" or "Rear Camera" to switch

4. **Debug information**
   - Click the "Debug Panel" button to view real-time diagnostic information
   - Includes gesture state, position coordinates, velocity, etc.

### Gesture Reference

| Gesture | Effect | Description |
|---------|--------|-------------|
| ✋ Open Palm (5 fingers) | Sphere | All fingers extended |
| ✊ Fist (0 fingers) | Ring | All fingers curled |
| ✌️ Scissors (2 fingers) | Text | Index and middle fingers extended |
| 👆 Single Finger | Star | Only the index finger extended |
| 👍 Thumbs Up | Heart | Only the thumb extended |

### Control Buttons

- **Debug Panel**: Show / hide the debug information panel
- **Download Certificate**: Download the HTTPS self-signed certificate (shown only when a camera is detected)
- **Front / Rear Camera**: Switch cameras (shown only when multiple cameras are detected)

## 🏗️ Project Structure

```
GestureInteraction/
├── app.py                    # Flask backend entry point
├── requirements.txt          # Python dependencies
├── README_en.md              # English documentation
├── README_zh.md              # Chinese documentation
├── tools/                    # Utility tools
│   ├── utils.py              # Utility functions (get local IP)
│   ├── gsignature.py         # Certificate signing utility
│   └── svgtool.py            # SVG processing utility
├── ssl/                      # SSL certificates
│   ├── server.crt            # SSL certificate (user-generated)
│   └── server.key            # SSL private key (user-generated)
├── static/                   # Static assets
│   ├── gicss/                # CSS styles
│   │   └── styles.css
│   ├── gijss/                # JavaScript modules
│   │   ├── config.js         # Configuration and global state
│   │   ├── particleSystem.js # Particle system and physics engine
│   │   ├── gestureHandling.js # Gesture recognition and camera management
│   │   ├── glhand3D.js       # 3D hand utility functions
│   │   ├── debug.js          # Debug utilities
│   │   └── modelLoader.js    # 3D model loader
│   ├── giimg/                # Image resources
│   │   └── c_dragon.jpg
│   └── giresource/           # Resources
│       └── favicon.ico
└── templates/                # HTML templates
    └── index.html            # Main page
```

> **Note**: Third-party libraries (MediaPipe, Three.js) are loaded via CDN in `index.html`.

### 📦 Module Overview

- **config.js** – Configuration module
  - All configuration constants and parameters
  - Global state variables
  - Utility functions (loading indicators, stream management, etc.)

- **particleSystem.js** – Particle system module
  - Three.js scene initialization and rendering
  - Particle system creation and batch loading
  - Multiple shape generators (sphere, ring, star, heart, text, dragon)
  - Physics updates and animation loop
  - Rainbow particle effects

- **gestureHandling.js** – Gesture handling module
  - MediaPipe gesture recognition initialization
  - Camera detection and switching
  - Gesture recognition algorithms and stability handling
  - Demo mode
  - Debug panel and health checks
  - Application entry point

- **glhand3D.js** – 3D hand utility functions
  - Hand landmark processing
  - 3D coordinate transformations

- **debug.js** – Debug utilities
  - Performance monitoring
  - Debug panel management

- **modelLoader.js** – 3D model loader
  - 3D model loading and processing

## 🔧 Technology Stack

### Backend
- **Flask 3.13.2** – Python web framework
- **qrcode 8.0** – QR code generation
- **Pillow 12.0.0** – Image processing
- **SSL/TLS** – HTTPS secure connection (self-signed certificates)

### Frontend
- **Three.js 0.149.0** – 3D rendering engine
- **MediaPipe Hands** – Real-time hand gesture recognition framework
- **WebGL** – Hardware-accelerated 3D rendering
- **MediaDevices API** – Camera access and stream management
- **ES6+ JavaScript** – Modular code organization

### Architecture
- **Modular design** – Clear separation into configuration, particle system, and gesture handling modules
- **Responsive layout** – Adapts to different screen sizes
- **Performance optimization** – Automatically adjusts parameters based on device capability
- **Error handling** – Robust error capture and recovery mechanisms

## ⚙️ Configuration Guide

### Port Configuration

The default port is `5001`. You can modify it in `app.py`:

```python
app.run(
    host=use_local_ip,
    port=5001,  # Change this value
    ...
)
```

### Particle Configuration

Adjust particle-related parameters in `static/gijss/config.js`:

```javascript
const PARTICLE_COUNT = 9000;       // Particle count (adaptive)
const PARTICLE_SIZE = 0.1;         // Particle size
const EXPLOSION_FORCE = 2.0;       // Explosion strength
const RETURN_SPEED = 0.08;         // Return speed
const DAMPING = 0.92;              // Damping factor
const DEPTH_PUSH_STRENGTH = 0.18;  // Depth push strength
```

### Gesture Recognition Configuration

Adjust gesture recognition parameters in `static/gijss/config.js`:

```javascript
const GESTURE_STABILITY_FRAMES = 3; // Gesture stability frames
const HAND_SMOOTHING = 0.35;        // Hand movement smoothing
const FOLLOW_STIFFNESS = 2.0;       // Follow stiffness
const FOLLOW_DAMPING = 0.80;        // Follow damping
const MAX_SPEED = 0.4;              // Maximum follow speed
```

### Performance Optimization

The system automatically adapts based on device performance:

- Low-performance devices (≤4 cores): particle count reduced by 45%
- Responsive particle count: adjusted based on screen width
- Batch loading: particles are loaded in batches to avoid frame drops

## 🐛 Troubleshooting

### Certificate Issues

**Problem**: Browser shows "Your connection is not private"

**Solution**:
1. Click "Download Certificate"
2. Install the certificate into the system trust store
3. Refresh the page

### Camera Issues

**Problem**: Camera cannot be accessed

**Solution**:
1. Check browser permission settings
2. Ensure the camera is not used by another application
3. If no camera is available, the system will automatically enter demo mode

### Performance Issues

**Problem**: Page lag or low frame rate

**Solution**:
1. Close other resource-intensive applications
2. Reduce the number of open browser tabs
3. The system will automatically reduce particle count

## 📝 Development Guide

### Code Structure

The project uses a modular design for maintainability and extensibility:

- **config.js** – Centralized configuration and global state management
- **particleSystem.js** – Independent particle system module, easy to extend with new shapes
- **gestureHandling.js** – Gesture recognition and business logic, easy to extend with new features

### Adding a New Gesture

1. **Add gesture recognition logic in `gestureHandling.js`**

   Extend the `recognizeGesture()` function:

   ```javascript
   function recognizeGesture(landmarks) {
       // ... existing code ...
       
       // Add new gesture
       if (/* new gesture condition */) {
           return 'newShape';
       }
   }
   ```

2. **Add a shape generator in `particleSystem.js`**

   ```javascript
   function generateNewShape() {
       for (let i = 0; i < PARTICLE_COUNT; i++) {
           targets[i * 3] = /* x coordinate */;
           targets[i * 3 + 1] = /* y coordinate */;
           targets[i * 3 + 2] = /* z coordinate */;
       }
   }
   ```

3. **Register the new shape in `gestureHandling.js`**

   Add a new case in the `onHandsResults()` switch statement:

   ```javascript
   switch (stableGesture) {
       // ... existing cases ...
       case 'newShape': generateNewShape(); break;
   }
   ```

   Also add the same case in the `enterDemoMode()` function.

### Modifying Physics Parameters

All physics parameters are centralized in `config.js` for easy tuning:

- `RETURN_SPEED` – Controls how fast particles return to the target shape
- `DAMPING` – Controls inertia decay
- `FOLLOW_STIFFNESS` – Controls responsiveness to hand movement
- `FOLLOW_DAMPING` – Controls smoothness of following

### Custom Styling

Edit `static/gicss/styles.css` to customize the UI, including:

- Button colors and sizes
- Debug panel styling
- QR code container styling
- Responsive breakpoints
- Loading animations

### Performance Optimization Tips

- Particle count adjustment: Modify `getResponsiveParticleCount()` in `config.js`
- Batch loading: Adjust the `BATCH_SIZE` parameter
- Low-performance devices: Automatic 45% particle reduction
- Rainbow effects: Update frequency is reduced on low-performance devices

### Debugging Tips

- Use the debug panel to inspect real-time status
- Check browser console for errors
- Use the `debugEnabled` variable to toggle the debug panel
- Inspect the `lastError` variable for the most recent error

## 🔄 Changelog

### v2.0 – Code Refactor (Latest)
- ✨ **Modular refactor**: Split `app.js` (1255 lines) into three modules
  - `config.js` - Configuration and global state
  - `particleSystem.js` - Particle system and physics engine
  - `gestureHandling.js` - Gesture recognition and business logic
- 🎯 **Improved code organization**: Better maintainability and extensibility
- 📝 **Documentation updates**: Enhanced developer and configuration guides

### v1.0 – Initial Release
- 🎮 Basic gesture recognition
- 🎨 Five particle shape effects
- 📱 Responsive design
- 🔒 HTTPS secure connection

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgements

- [Three.js](https://threejs.org/) – 3D graphics library
- [MediaPipe](https://mediapipe.dev/) – Google's hand gesture recognition framework
- [Flask](https://flask.palletsprojects.com/) – Lightweight Python web framework
- [qrcode](https://github.com/lincolnloop/python-qrcode) – Python QR code generation library

Enjoy the fun of gesture-based interaction! 🎉

> 💡 **Tip**: The project adopts a modular design, making it easy to extend and customize. It is recommended to read the code structure overview before making modifications.

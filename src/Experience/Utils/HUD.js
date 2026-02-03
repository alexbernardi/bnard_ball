import Stats from 'stats.js'

export default class HUD {
    constructor() {
        this.createHUD()
        this.createStats()
    }

    createHUD() {
        // Create container
        this.container = document.createElement('div')
        this.container.style.position = 'fixed'
        this.container.style.top = '20px'
        this.container.style.left = '20px'
        this.container.style.fontFamily = 'monospace'
        this.container.style.fontSize = '18px'
        this.container.style.color = '#00ff00'
        this.container.style.textShadow = '0 0 10px rgba(0, 255, 0, 0.5)'
        this.container.style.zIndex = '1000'
        this.container.style.userSelect = 'none'
        this.container.style.pointerEvents = 'none'
        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.6)'
        this.container.style.padding = '10px 15px'
        this.container.style.borderRadius = '5px'
        this.container.style.backdropFilter = 'blur(5px)'

        // Speedometer
        this.speedElement = document.createElement('div')
        this.speedElement.style.marginBottom = '5px'
        this.speedElement.textContent = 'SPEED: 0.0 m/s'
        this.container.appendChild(this.speedElement)

        // Altimeter
        this.altElement = document.createElement('div')
        this.altElement.textContent = 'ALT: 0.0 m'
        this.container.appendChild(this.altElement)

        // Camera info
        this.cameraInfoElement = document.createElement('div')
        this.cameraInfoElement.style.marginTop = '8px'
        this.cameraInfoElement.style.marginBottom = '3px'
        this.cameraInfoElement.textContent = 'CAM: DEFAULT'
        this.container.appendChild(this.cameraInfoElement)
        
        // Camera details
        this.cameraDetailsElement = document.createElement('div')
        this.cameraDetailsElement.textContent = 'FOV: 0.0 | OFFSET: 0.0'
        this.container.appendChild(this.cameraDetailsElement)
        
        // Camera position
        this.cameraPosElement = document.createElement('div')
        this.cameraPosElement.textContent = 'POS: (0.0, 0.0, 0.0)'
        this.container.appendChild(this.cameraPosElement)
        
        // Camera quaternion
        this.cameraQuatElement = document.createElement('div')
        this.cameraQuatElement.textContent = 'QUAT: (0.0, 0.0, 0.0, 1.0)'
        this.container.appendChild(this.cameraQuatElement)
        
        // Frame timing info
        this.frameInfoElement = document.createElement('div')
        this.frameInfoElement.style.marginTop = '8px'
        this.frameInfoElement.style.color = '#ffaa00'
        this.frameInfoElement.textContent = 'FPS: 0 | DT: 0.00ms'
        this.container.appendChild(this.frameInfoElement)
        
        // Velocity components
        this.velocityElement = document.createElement('div')
        this.velocityElement.style.fontSize = '14px'
        this.container.appendChild(this.velocityElement)

        document.body.appendChild(this.container)
    }

    createStats() {
        // Create stats.js panels
        this.stats = new Stats()
        
        // Panel 0: FPS
        // Panel 1: MS (frame time)
        // Panel 2: MB (memory, Chrome only)
        this.stats.showPanel(0) // Start with FPS panel
        
        // Position stats below the HUD
        this.stats.dom.style.position = 'fixed'
        this.stats.dom.style.top = 'auto'
        this.stats.dom.style.bottom = '20px'
        this.stats.dom.style.left = '20px'
        this.stats.dom.style.zIndex = '1000'
        
        document.body.appendChild(this.stats.dom)
    }

    update(speed, altitude, velocityComponents = null) {
        const speedMph = speed * 2.23694
        this.speedElement.textContent = `SPEED: ${speed.toFixed(1)} m/s | ${speedMph.toFixed(1)} mph`
        this.altElement.textContent = `ALT: ${altitude.toFixed(1)} m`
        
        // Update velocity components if provided
        if(velocityComponents && this.velocityElement) {
            const { x, y, z, theta } = velocityComponents
            this.velocityElement.innerHTML = `
                <div style="color: #00ff00; margin-top: 8px; margin-bottom: 3px;">VELOCITY COMPONENTS:</div>
                <div style="color: #ff6666;">X: ${x.toFixed(2)} m/s</div>
                <div style="color: #66ff66;">Y: ${y.toFixed(2)} m/s</div>
                <div style="color: #6666ff;">Z: ${z.toFixed(2)} m/s</div>
                <div style="color: #ffff66; margin-top: 3px;">θ: ${theta.toFixed(1)}°</div>
            `
        }
    }

    updateCameraInfo(fov, offset, mode, position, quaternion) {
        this.cameraInfoElement.textContent = `CAM: ${mode || 'DEFAULT'}`;
        this.cameraDetailsElement.textContent = `FOV: ${fov.toFixed(1)} | OFFSET: ${offset.toFixed(2)}`;
        if(position) {
            this.cameraPosElement.textContent = `POS: (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`;
        }
        if(quaternion) {
            this.cameraQuatElement.textContent = `QUAT: (${quaternion.x.toFixed(3)}, ${quaternion.y.toFixed(3)}, ${quaternion.z.toFixed(3)}, ${quaternion.w.toFixed(3)})`;
        }
    }

    updateFrameInfo(fps, dt) {
        if(this.frameInfoElement) {
            this.frameInfoElement.textContent = `FPS: ${fps.toFixed(0)} | DT: ${(dt * 1000).toFixed(2)}ms`
        }
        
        // Update stats.js
        if(this.stats) {
            this.stats.update()
        }
    }

    destroy() {
        if(this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container)
        }
        if(this.stats && this.stats.dom && this.stats.dom.parentNode) {
            this.stats.dom.parentNode.removeChild(this.stats.dom)
        }
    }
}

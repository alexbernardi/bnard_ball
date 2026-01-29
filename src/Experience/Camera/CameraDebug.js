/**
 * CameraDebug - Debug UI for camera settings
 * Handles lil-gui folder setup for camera properties
 */
export default class CameraDebug
{
    constructor(camera)
    {
        this.camera = camera
        this.vars = camera.vars
        this.debug = camera.debug
        
        this.setupDebug()
    }

    setupDebug()
    {
        if(!this.debug.active) return
        
        const cameraFolder = this.debug.ui.addFolder('camera')
        cameraFolder.close()
        
        // Default Mode Settings
        const defaultFolder = cameraFolder.addFolder('Default Mode')
        defaultFolder.close()
        
        defaultFolder
            .add(this.vars, 'offsetDistance')
            .min(3)
            .max(20)
            .step(0.1)
            .name('offsetDistance')
        
        defaultFolder
            .add(this.vars, 'offsetHeight')
            .min(0)
            .max(10)
            .step(0.1)
            .name('offsetHeight')
        
        defaultFolder
            .add(this.vars, 'positionLerpSpeed')
            .min(0.01)
            .max(0.2)
            .step(0.001)
            .name('positionLerpSpeed')
        
        defaultFolder
            .add(this.vars, 'rotationLerpSpeed')
            .min(0.01)
            .max(0.2)
            .step(0.001)
            .name('rotationLerpSpeed')
        
        defaultFolder
            .add(this.vars, 'minFov')
            .min(20)
            .max(50)
            .step(1)
            .name('minFov')
        
        defaultFolder
            .add(this.vars, 'maxFov')
            .min(20)
            .max(50)
            .step(1)
            .name('maxFov')
        
        defaultFolder
            .add(this.vars, 'maxSpeedForFov')
            .min(5)
            .max(30)
            .step(1)
            .name('maxSpeedForFov')
        
        // Ramp Mode Settings
        const rampFolder = cameraFolder.addFolder('Ramp Mode')
        rampFolder.close()
        
        rampFolder
            .add(this.vars, 'rampCameraDistance')
            .min(0.1)
            .max(15)
            .step(0.1)
            .name('distance')
        
        rampFolder
            .add(this.vars, 'rampHeightStart')
            .min(0.5)
            .max(5)
            .step(0.1)
            .name('height start')
        
        rampFolder
            .add(this.vars, 'rampHeightEnd')
            .min(0.1)
            .max(5)
            .step(0.1)
            .name('height end')
        
        rampFolder
            .add(this.vars, 'rampHeightAnimDuration')
            .min(500)
            .max(10000)
            .step(100)
            .name('height anim duration (ms)')
        
        // Flight Mode Settings
        const flightFolder = cameraFolder.addFolder('Flight Mode')
        flightFolder.close()
        
        flightFolder
            .add(this.vars, 'flightCameraDistance')
            .min(5)
            .max(30)
            .step(0.5)
            .name('distance')
        
        flightFolder
            .add(this.vars, 'flightCameraHeight')
            .min(1)
            .max(20)
            .step(0.5)
            .name('height')
        
        flightFolder
            .add(this.vars, 'flightFov')
            .min(30)
            .max(120)
            .step(1)
            .name('FOV')
        
        flightFolder
            .add(this.vars, 'flightLerpSpeed')
            .min(0.01)
            .max(0.2)
            .step(0.001)
            .name('lerp speed')
        
        // Ocean Mode Settings
        const oceanFolder = cameraFolder.addFolder('Ocean Mode')
        oceanFolder.close()
        
        oceanFolder
            .add(this.vars, 'oceanCameraDistance')
            .min(1)
            .max(20)
            .step(0.5)
            .name('distance')
        
        oceanFolder
            .add(this.vars, 'oceanCameraHeight')
            .min(1)
            .max(20)
            .step(0.5)
            .name('height')
        
        oceanFolder
            .add(this.vars, 'oceanFov')
            .min(20)
            .max(80)
            .step(1)
            .name('FOV')
        
        oceanFolder
            .add(this.vars, 'oceanLerpSpeed')
            .min(0.01)
            .max(0.2)
            .step(0.001)
            .name('lerp speed')
        
        // General Settings
        cameraFolder
            .add(this.vars, 'rampThresholdX')
            .min(-20)
            .max(50)
            .step(0.5)
            .name('Ramp Threshold X')
        
        // Copy button
        this.debug.addCopyButton(cameraFolder, 'camera', () => ({
            offsetDistance: this.vars.offsetDistance,
            offsetHeight: this.vars.offsetHeight,
            positionLerpSpeed: this.vars.positionLerpSpeed,
            rotationLerpSpeed: this.vars.rotationLerpSpeed,
            minFov: this.vars.minFov,
            maxFov: this.vars.maxFov,
            maxSpeedForFov: this.vars.maxSpeedForFov,
            rampCameraDistance: this.vars.rampCameraDistance,
            rampHeightStart: this.vars.rampHeightStart,
            rampHeightEnd: this.vars.rampHeightEnd,
            rampHeightAnimDuration: this.vars.rampHeightAnimDuration,
            flightCameraDistance: this.vars.flightCameraDistance,
            flightCameraHeight: this.vars.flightCameraHeight,
            flightFov: this.vars.flightFov,
            flightLerpSpeed: this.vars.flightLerpSpeed,
            oceanCameraDistance: this.vars.oceanCameraDistance,
            oceanCameraHeight: this.vars.oceanCameraHeight,
            oceanFov: this.vars.oceanFov,
            oceanLerpSpeed: this.vars.oceanLerpSpeed,
            rampThresholdX: this.vars.rampThresholdX
        }))
    }
}

import * as THREE from 'three'
import Experience from '../Experience.js'

// Camera modules
import CameraVariables from './CameraVariables.js'
import CameraDebug from './CameraDebug.js'
import DefaultCameraMode from './DefaultCameraMode.js'
import RampCameraMode from './RampCameraMode.js'
import FlightCameraMode from './FlightCameraMode.js'
import OceanCameraMode from './OceanCameraMode.js'
import FreeRoamMode from './FreeRoamMode.js'

/**
 * Camera - Main camera class
 * Orchestrates all camera subsystems and modes
 */
export default class Camera
{
    constructor()
    {
        // Core references
        this.experience = new Experience()
        this.sizes = this.experience.sizes
        this.scene = this.experience.scene
        this.canvas = this.experience.canvas
        this.debug = this.experience.debug

        // Initialize variables
        this.vars = new CameraVariables()
        
        // Controls reference (set by FreeRoamMode)
        this.controls = null

        // Setup camera instance
        this.setInstance()
        
        // Initialize mode controllers
        this.defaultMode = new DefaultCameraMode(this)
        this.rampMode = new RampCameraMode(this)
        this.flightMode = new FlightCameraMode(this)
        this.oceanMode = new OceanCameraMode(this)
        this.freeRoamMode = new FreeRoamMode(this)
        
        // Setup debug UI
        this.cameraDebug = new CameraDebug(this)
        
        // Start in free roam mode
        this.freeRoamMode.toggle()
    }

    // Getters for backwards compatibility
    get devMode() { return this.vars.devMode }
    get mode() { return this.vars.mode }
    get isFreeRoam() { return this.vars.isFreeRoam }
    get target() { return this.vars.target }

    getCameraDebugInfo()
    {
        // Returns FOV, offset, mode, free roam status, position and quaternion for HUD display
        let offset = this.vars.mode === 'ramp' ? this.vars.currentRampDistance : this.vars.offsetDistance
        let modeDisplay = this.vars.isFreeRoam ? 'FREE ROAM' : this.vars.mode.toUpperCase()
        return {
            fov: this.vars.currentFov,
            offset: offset,
            mode: modeDisplay,
            position: this.instance.position,
            quaternion: this.instance.quaternion
        }
    }

    setInstance()
    {
        this.instance = new THREE.PerspectiveCamera(35, this.sizes.width / this.sizes.height, 0.1, 10000)
        if(this.vars.devMode)
        {
            this.instance.position.set(0, 10, 15)
            this.instance.lookAt(0, 0, 0)
        }
        else
        {
            this.instance.position.copy(this.vars.currentPosition)
        }
        this.scene.add(this.instance)
    }

    setTarget(target)
    {
        this.vars.target = target
    }

    resize()
    {
        this.instance.aspect = this.sizes.width / this.sizes.height
        this.instance.updateProjectionMatrix()
    }

    update()
    {
        // Skip camera updates in dev mode
        if(this.vars.devMode)
        {
            if(this.controls)
                this.controls.update()
            return
        }
        
        // Handle free roam mode
        if(this.vars.isFreeRoam)
        {
            this.freeRoamMode.update()
            return
        }
        
        const target = this.vars.target
        if(!target || !target.group || !target.body)
            return
            
        // Determine camera mode based on ball position and flight state
        const ballX = target.group.position.x
        let previousMode = this.vars.mode
        
        // Ocean mode takes priority (player in water)
        if(target.isInOcean)
        {
            this.vars.mode = 'ocean'
        }
        // Flight mode next priority
        else if(target.isFlying)
        {
            this.vars.mode = 'flight'
        }
        else if(ballX > this.vars.rampThresholdX)
        {
            this.vars.mode = 'ramp'
        }
        else
        {
            this.vars.mode = 'default'
        }

        // On first frame entering ramp mode, trigger onEnter
        if(this.vars.mode === 'ramp' && previousMode !== 'ramp')
        {
            this.rampMode.onEnter()
        }

        // Update based on mode
        switch(this.vars.mode)
        {
            case 'default':
                this.defaultMode.update()
                break
            case 'ramp':
                this.rampMode.update()
                break
            case 'flight':
                this.flightMode.update()
                break
            case 'ocean':
                this.oceanMode.update()
                break
        }
    }

    getForwardDirection()
    {
        // Get camera's forward direction in world space
        const forward = new THREE.Vector3()
        this.instance.getWorldDirection(forward)
        forward.y = 0 // Keep on horizontal plane
        forward.normalize()
        return forward
    }

    getRightDirection()
    {
        const forward = this.getForwardDirection()
        const right = new THREE.Vector3()
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0))
        right.normalize()
        return right
    }
}

import * as THREE from 'three'
import Experience from '../../Experience.js'
import HUD from '../../Utils/HUD.js'

// Player modules
import PlayerVariables from './PlayerVariables.js'
import PlayerDebug from './PlayerDebug.js'
import PlayerVisuals from './PlayerVisuals.js'
import PlayerPhysics from './PlayerPhysics.js'
import PlayerInput from './PlayerInput.js'
import FlightMode from './FlightMode.js'
import AirMode from './AirMode.js'
import GroundMode from './GroundMode.js'
import OceanMode from './OceanMode.js'

/**
 * Player - Main player class
 * Orchestrates all player subsystems
 */
export default class Player
{
    constructor()
    {
        // Core references
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.physics = this.experience.physics
        this.camera = this.experience.camera
        this.debug = this.experience.debug
        this.time = this.experience.time
        this.resources = this.experience.resources

        // Group for player and camera
        this.group = new THREE.Group()
        this.scene.add(this.group)

        // Visual elements (set by PlayerVisuals)
        this.mesh = null
        this.liftPlane = null
        this.liftPlaneAxesGroup = null
        this.collisionMesh = null
        this.velocityArrow = null
        this.tangentArrow = null
        this.groundRayHelper = null
        this.yawArrow = null
        this.pitchArrow = null
        this.rollArrow = null
        this.graphScene = null
        this.graphCamera = null
        this.graphVelocityArrow = null

        // Initialize modules
        this.vars = new PlayerVariables()
        
        // Mode controllers (need to be created before input)
        this.flightMode = new FlightMode(this)
        this.airMode = new AirMode(this)
        this.groundMode = new GroundMode(this)
        this.oceanMode = new OceanMode(this)
        
        // Visuals
        this.visuals = new PlayerVisuals(this)
        this.visuals.setupMesh()
        this.visuals.setupGlider()
        this.visuals.setupHelpers()
        this.visuals.setupVelocityGraph()
        
        // Physics
        this.playerPhysics = new PlayerPhysics(this)
        this.playerPhysics.setup()
        
        // Input
        this.input = new PlayerInput(this)
        
        // Debug
        this.playerDebug = new PlayerDebug(this)
        
        // Set camera to follow player
        this.camera.setTarget(this)
        
        // Create HUD
        this.hud = new HUD()
    }

    // Getters for backwards compatibility with Camera.js
    get body() { return this.vars.body }
    get isFlying() { return this.vars.isFlying }
    get isGrounded() { return this.vars.isGrounded }
    get isInOcean() { return this.oceanMode.isInOcean() }

    update()
    {
        if(!this.vars.body) return
        
        // Get physics data
        const position = this.vars.body.translation()
        const rotation = this.vars.body.rotation()
        const velocity = this.vars.body.linvel()
        const velocityMagnitude = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z)
        
        // Check grounded state
        this.playerPhysics.checkGrounded()
        
        // Update mode controllers
        // Ocean mode takes priority - player loses control at sea level
        if(this.oceanMode.isInOcean())
        {
            this.oceanMode.update()
        }
        else if(this.vars.isFlying)
        {
            this.flightMode.update()
        }
        else if(!this.vars.isGrounded)
        {
            this.airMode.update()
        }
        else
        {
            this.groundMode.update()
        }
        
        // Update physics visuals
        this.playerPhysics.updateVisuals(position, rotation)
        
        // Update visual helpers
        this.visuals.updateHelpers(velocity, velocityMagnitude)
        this.visuals.updateVelocityGraph(velocity, velocityMagnitude)
        
        // Update animations
        this.visuals.updateAnimations(this.time.delta * 0.001)
        
        // Update HUD
        this.updateHUD(velocity, velocityMagnitude, position)
        
        // Store last velocity
        this.vars.lastVelocity.set(velocity.x, velocity.y, velocity.z)
    }

    updateHUD(velocity, velocityMagnitude, position)
    {
        if(!this.hud || !this.camera) return
        
        const thetaXZ = Math.atan2(velocity.z, velocity.x) * (180 / Math.PI)
        
        this.hud.update(velocityMagnitude, position.y + 360, {
            x: velocity.x,
            y: velocity.y,
            z: velocity.z,
            theta: thetaXZ
        })
        
        if(typeof this.camera.getCameraDebugInfo === 'function')
        {
            const camInfo = this.camera.getCameraDebugInfo()
            this.hud.updateCameraInfo(camInfo.fov, camInfo.offset, camInfo.mode, camInfo.position, camInfo.quaternion)
        }
        
        // Update frame timing info (delta is in ms, convert to seconds for fps)
        const deltaSeconds = this.time.delta / 1000
        const fps = 1 / deltaSeconds
        this.hud.updateFrameInfo(fps, deltaSeconds)
    }

    renderGraph()
    {
        this.visuals.renderGraph()
    }
}

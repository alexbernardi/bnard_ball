import * as THREE from 'three'

/**
 * PlayerVariables - All player properties and state variables
 * Centralized configuration for the player system
 */
export default class PlayerVariables
{
    constructor()
    {
        // Core properties
        this.radius = 1
        this.body = null
        this.collider = null
        
        // Velocity tracking
        this.lastOrientation = new THREE.Quaternion()
        this.velocityThreshold = 0
        this.orientationSmoothing = 0.1
        this.lastVelocity = new THREE.Vector3()
        this.orientationDelay = 300
        this.lastVelocityChangeTime = 0
        this.orientationUpdateEnabled = true

        // Physics properties - Metal ball
        this.torqueStrength = 2
        this.friction = 1.0
        this.restitution = 0
        this.linearDamping = 0
        this.angularDamping = 0
        this.density = 5

        // Input state
        this.keys = {
            w: false,
            s: false,
            a: false,
            d: false,
            space: false
        }
        
        // Flight physics
        this.isFlying = false
        this.hasLoggedVelocity = false
        this.velocityInitial = new THREE.Vector3()
        this.velocityFinal = new THREE.Vector3()
        this.flightTransitionDuration = 2000
        this.flightTransitionStartTime = 0
        
        // Turbulence properties
        this.turbulenceAmplitude = 2.0
        this.turbulenceFrequency = 5.0
        
        // Post-stabilization flight physics
        this.flightGravity = 9.0
        this.flightLift = 0.5
        this.flightDrag = .01
        
        // Glider physics properties
        this.liftCoefficient = 1.0
        this.liftDirection = new THREE.Vector3(0, 1, 0)
        this.flightLevelingSpeed = 0.1
        
        // Air control properties
        this.isGrounded = false
        this.airControlStrength = 1
        
        // Flight control properties (pitch and roll)
        this.currentPitch = 0
        this.currentRoll = 0
        this.currentYaw = 0
        this.targetPitch = 0
        this.targetRoll = 0
        this.pitchSpeed = 0.02
        this.rollSpeed = 0.03
        this.pitchLerpSpeed = 0.05
        this.rollLerpSpeed = 0.08
        this.maxPitch = Math.PI / 4
        this.maxRoll = Math.PI / 3
    }
}

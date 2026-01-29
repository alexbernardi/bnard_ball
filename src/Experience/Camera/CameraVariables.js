import * as THREE from 'three'

/**
 * CameraVariables - All camera properties and state variables
 * Centralized configuration for the camera system
 */
export default class CameraVariables
{
    constructor()
    {
        // Dev mode - set to true to disable sphere following and center on ramp
        this.devMode = false

        // Camera mode system
        this.mode = 'default' // 'default', 'ramp', 'flight', 'ocean', or 'freeRoam'
        this.rampThresholdX = 10 // X position where ramp curve starts
        
        // Free roam mode
        this.isFreeRoam = false
        this.savedMode = 'default' // Store the mode before entering free roam
        this.savedPosition = new THREE.Vector3()
        this.savedLookAt = new THREE.Vector3()

        // Camera follow properties
        this.target = null
        this.offset = new THREE.Vector3(0, 3, -10)
        this.offsetDistance = 10
        this.offsetHeight = 2.5
        
        // Animation properties
        this.currentPosition = new THREE.Vector3(-10, 2.5, 0) // Start behind spawn point
        this.currentAngle = -Math.PI / 2 // Start pointing along -X axis (behind ball moving in +X)
        this.targetAngle = -Math.PI / 2
        this.positionLerpSpeed = 0.02
        this.rotationLerpSpeed = 0.02
        
        // FOV properties
        this.baseFov = 35
        this.minFov = 25
        this.maxFov = 40
        this.fovLerpSpeed = 0.03
        this.currentFov = this.baseFov
        this.maxSpeedForFov = 8 // Speed at which FOV reaches maximum
        
        // Ramp mode properties
        this.rampCameraDistance = 5 // Distance from ball
        this.rampCameraHeight = 3 // Height offset above ball
        this.rampFov = 25
        this.currentRampDistance = 10 // Current dynamic distance (for HUD)
        
        // Ramp height animation
        this.rampHeightStart = 2.5 // Starting height when entering ramp mode
        this.rampHeightEnd = 1.0 // Ending height after animation
        this.rampHeightAnimDuration = 3000 // 3 seconds in milliseconds
        this.rampHeightAnimStartTime = 0 // When the animation started
        this.currentRampHeight = this.rampHeightStart
        
        // Flight mode properties
        this.flightCameraDistance = 8 // Distance behind ball during flight
        this.flightCameraHeight = 1 // Height above ball during flight
        this.flightFov = 50 // FOV during flight
        this.flightLerpSpeed = 0.05 // Smooth camera movement during flight
        
        // Ocean mode properties
        this.oceanCameraDistance = 5 // Distance from ball in ocean mode
        this.oceanCameraHeight = 3 // Height above ball in ocean mode
        this.oceanFov = 50 // FOV during ocean mode
        this.oceanLerpSpeed = 0.005 // Smooth camera movement in ocean mode
    }
}

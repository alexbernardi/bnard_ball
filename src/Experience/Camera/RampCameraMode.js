import * as THREE from 'three'

/**
 * RampCameraMode - Camera mode for ramp sections
 * Follows along velocity tangent with dynamic distance and FOV
 */
export default class RampCameraMode
{
    constructor(camera)
    {
        this.camera = camera
        this.vars = camera.vars
    }

    onEnter()
    {
        // Reset ramp camera distance and start height animation
        this.vars.rampCameraDistance = 10
        this.vars.rampHeightAnimStartTime = Date.now()
        this.vars.currentRampHeight = this.vars.rampHeightStart
    }

    update()
    {
        const target = this.vars.target
        if(!target || !target.group || !target.body) return
        
        // Camera for ramp curve - follows along velocity tangent
        const targetPos = target.group.position
        const velocity = target.body.linvel()
        const velocityVec = new THREE.Vector3(velocity.x, velocity.y, velocity.z)
        const speed = velocityVec.length()
        
        // Animate height over time
        const elapsedTime = Date.now() - this.vars.rampHeightAnimStartTime
        const progress = Math.min(elapsedTime / this.vars.rampHeightAnimDuration, 1)
        // Smooth easing function (ease-out)
        const easedProgress = 1 - Math.pow(1 - progress, 3)
        this.vars.currentRampHeight = this.vars.rampHeightStart + (this.vars.rampHeightEnd - this.vars.rampHeightStart) * easedProgress
        
        // Velocity-based camera adjustments (20 m/s to 120 m/s)
        const minSpeed = 20
        const maxSpeed = 120
        const speedRatio = Math.min(Math.max((speed - minSpeed) / (maxSpeed - minSpeed), 0), 1)
        
        // Distance: Lerp from 10 to 0.2 over time (not speed-based)
        const targetDistance = 0.2
        const startDistance = 10
        const distanceProgress = Math.min(elapsedTime / this.vars.rampHeightAnimDuration, 1) // Use same 3 second duration
        this.vars.currentRampDistance = startDistance + (targetDistance - startDistance) * distanceProgress
        
        // Increase lerp speed at high velocities so camera keeps up
        const dynamicLerpSpeed = 0.02 + (0.15 * speedRatio) // 0.02 at slow speeds, 0.17 at high speeds
        
        // FOV: 25 at 20 m/s, 100 at 120 m/s
        const minRampFov = 25
        const maxRampFov = 100
        const dynamicFov = minRampFov + (maxRampFov - minRampFov) * speedRatio
        
        // Get direction opposite to velocity (behind the ball)
        if(velocityVec.length() > 0.1) {
            const backwardDir = velocityVec.clone().normalize().multiplyScalar(-1)
            
            // Position camera behind ball along velocity tangent
            const targetCameraPos = new THREE.Vector3()
            targetCameraPos.copy(targetPos)
            targetCameraPos.add(backwardDir.multiplyScalar(this.vars.currentRampDistance))
            targetCameraPos.y += this.vars.currentRampHeight // Use animated height
            
            // Smoothly interpolate to target position with dynamic lerp speed
            this.vars.currentPosition.lerp(targetCameraPos, dynamicLerpSpeed)
            this.camera.instance.position.copy(this.vars.currentPosition)
        }
        
        // Dynamic FOV based on speed
        const targetFov = dynamicFov
        this.vars.currentFov += (targetFov - this.vars.currentFov) * this.vars.fovLerpSpeed
        this.camera.instance.fov = this.vars.currentFov
        this.camera.instance.updateProjectionMatrix()
        
        // Look at the sphere
        this.camera.instance.lookAt(targetPos)
    }
}

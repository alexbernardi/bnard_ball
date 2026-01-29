import * as THREE from 'three'

/**
 * DefaultCameraMode - Standard follow camera
 * Follows sphere with velocity-aligned positioning
 */
export default class DefaultCameraMode
{
    constructor(camera)
    {
        this.camera = camera
        this.vars = camera.vars
    }

    update()
    {
        const target = this.vars.target
        if(!target || !target.group || !target.body) return
        
        // Follow sphere with velocity-aligned camera
        const targetPos = target.group.position
        const velocity = target.body.linvel()
        const velocityVec = new THREE.Vector3(velocity.x, velocity.y, velocity.z)
        const speed = velocityVec.length()
        
        // Calculate target angle based on velocity direction
        if(speed > 0.1)
        {
            // Get angle from velocity (camera should be opposite to velocity)
            this.vars.targetAngle = Math.atan2(velocityVec.x, velocityVec.z) + Math.PI
        }
        
        // Interpolate angle (handle wrapping)
        let angleDiff = this.vars.targetAngle - this.vars.currentAngle
        
        // Normalize angle difference to [-PI, PI]
        while(angleDiff > Math.PI) angleDiff -= Math.PI * 2
        while(angleDiff < -Math.PI) angleDiff += Math.PI * 2
        
        this.vars.currentAngle += angleDiff * this.vars.rotationLerpSpeed
        
        // Calculate camera position from angle
        const targetCameraPos = new THREE.Vector3()
        targetCameraPos.x = targetPos.x + Math.sin(this.vars.currentAngle) * this.vars.offsetDistance
        targetCameraPos.y = targetPos.y + this.vars.offsetHeight
        targetCameraPos.z = targetPos.z + Math.cos(this.vars.currentAngle) * this.vars.offsetDistance
        
        // Smoothly interpolate to target position
        this.vars.currentPosition.lerp(targetCameraPos, this.vars.positionLerpSpeed)
        this.camera.instance.position.copy(this.vars.currentPosition)
        
        // Adjust FOV based on speed (higher speed = larger FOV/zoom out)
        const speedRatio = Math.min(speed / this.vars.maxSpeedForFov, 1)
        const targetFov = this.vars.minFov + (this.vars.maxFov - this.vars.minFov) * speedRatio
        this.vars.currentFov += (targetFov - this.vars.currentFov) * this.vars.fovLerpSpeed
        this.camera.instance.fov = this.vars.currentFov
        this.camera.instance.updateProjectionMatrix()
        
        // Look at the sphere
        this.camera.instance.lookAt(targetPos)
    }
}

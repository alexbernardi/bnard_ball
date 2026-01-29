import * as THREE from 'three'

/**
 * FlightCameraMode - Camera mode for glider flight
 * Wide angle, follows from further back along velocity
 */
export default class FlightCameraMode
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
        
        // Camera for flight mode - wide angle, follows from further back
        const targetPos = target.group.position
        const velocity = target.body.linvel()
        const velocityVec = new THREE.Vector3(velocity.x, velocity.y, velocity.z)
        
        // Get direction opposite to velocity (behind the ball)
        if(velocityVec.length() > 0.1) {
            const backwardDir = velocityVec.clone().normalize().multiplyScalar(-1)
            
            // Position camera behind and above ball
            const targetCameraPos = new THREE.Vector3()
            targetCameraPos.copy(targetPos)
            targetCameraPos.add(backwardDir.multiplyScalar(this.vars.flightCameraDistance))
            targetCameraPos.y += this.vars.flightCameraHeight
            
            // Smoothly interpolate to target position
            this.vars.currentPosition.lerp(targetCameraPos, this.vars.flightLerpSpeed)
            this.camera.instance.position.copy(this.vars.currentPosition)
        }
        
        // Set flight FOV
        const targetFov = this.vars.flightFov
        this.vars.currentFov += (targetFov - this.vars.currentFov) * this.vars.fovLerpSpeed
        this.camera.instance.fov = this.vars.currentFov
        this.camera.instance.updateProjectionMatrix()
        
        // Look at the sphere
        this.camera.instance.lookAt(targetPos)
    }
}

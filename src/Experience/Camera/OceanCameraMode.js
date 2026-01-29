import * as THREE from 'three'

/**
 * OceanCameraMode - Camera mode for ocean/water
 * Fixed position relative to ball, ignores velocity
 */
export default class OceanCameraMode
{
    constructor(camera)
    {
        this.camera = camera
        this.vars = camera.vars
    }

    update()
    {
        const target = this.vars.target
        if(!target || !target.group) return
        
        // Camera for ocean mode - fixed position relative to ball, ignores velocity
        const targetPos = target.group.position
        
        // Position camera at fixed offset (behind and above ball)
        // Use a fixed angle so camera doesn't spin based on velocity
        const targetCameraPos = new THREE.Vector3()
        targetCameraPos.x = targetPos.x - this.vars.oceanCameraDistance
        targetCameraPos.y = targetPos.y + this.vars.oceanCameraHeight
        targetCameraPos.z = targetPos.z + this.vars.oceanCameraDistance
        
        // Smoothly interpolate to target position
        this.vars.currentPosition.lerp(targetCameraPos, this.vars.oceanLerpSpeed)
        this.camera.instance.position.copy(this.vars.currentPosition)
        
        // Set ocean FOV
        const targetFov = this.vars.oceanFov
        this.vars.currentFov += (targetFov - this.vars.currentFov) * this.vars.fovLerpSpeed
        this.camera.instance.fov = this.vars.currentFov
        this.camera.instance.updateProjectionMatrix()
        
        // Look at the sphere
        this.camera.instance.lookAt(targetPos)
    }
}

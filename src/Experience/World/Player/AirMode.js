import * as THREE from 'three'

/**
 * AirMode - Air control for the player
 * Handles impulse-based movement when airborne (not flying)
 */
export default class AirMode
{
    constructor(player)
    {
        this.player = player
        this.vars = player.vars
        this.camera = player.camera
    }

    update()
    {
        if(!this.vars.body || this.vars.isGrounded || this.vars.isFlying) return
        
        const forward = this.camera.getForwardDirection()
        const right = this.camera.getRightDirection()
        
        // Flatten directions to world XZ plane
        const forwardFlat = new THREE.Vector3(forward.x, 0, forward.z).normalize()
        const rightFlat = new THREE.Vector3(right.x, 0, right.z).normalize()
        
        if(this.vars.keys.w)
        {
            this.vars.body.applyImpulse({ 
                x: forwardFlat.x * this.vars.airControlStrength, 
                y: 0, 
                z: forwardFlat.z * this.vars.airControlStrength 
            }, true)
        }
        
        if(this.vars.keys.s)
        {
            this.vars.body.applyImpulse({ 
                x: -forwardFlat.x * this.vars.airControlStrength, 
                y: 0, 
                z: -forwardFlat.z * this.vars.airControlStrength 
            }, true)
        }
        
        if(this.vars.keys.a)
        {
            this.vars.body.applyImpulse({ 
                x: -rightFlat.x * this.vars.airControlStrength, 
                y: 0, 
                z: -rightFlat.z * this.vars.airControlStrength 
            }, true)
        }
        
        if(this.vars.keys.d)
        {
            this.vars.body.applyImpulse({ 
                x: rightFlat.x * this.vars.airControlStrength, 
                y: 0, 
                z: rightFlat.z * this.vars.airControlStrength 
            }, true)
        }
    }
}

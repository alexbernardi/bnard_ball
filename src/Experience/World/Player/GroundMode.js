import * as THREE from 'three'

/**
 * GroundMode - Ground control for the player
 * Handles torque-based rolling motion when grounded
 */
export default class GroundMode
{
    constructor(player)
    {
        this.player = player
        this.vars = player.vars
        this.camera = player.camera
    }

    update()
    {
        if(!this.vars.body || !this.vars.isGrounded || this.vars.isFlying) return
        
        const forward = this.camera.getForwardDirection()
        const right = this.camera.getRightDirection()
        
        if(this.vars.keys.w)
        {
            const torqueDir = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize()
            this.vars.body.applyTorqueImpulse({ 
                x: torqueDir.x * this.vars.torqueStrength, 
                y: torqueDir.y * this.vars.torqueStrength, 
                z: torqueDir.z * this.vars.torqueStrength 
            }, true)
        }
        
        if(this.vars.keys.s)
        {
            const torqueDir = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize()
            this.vars.body.applyTorqueImpulse({ 
                x: -torqueDir.x * this.vars.torqueStrength, 
                y: -torqueDir.y * this.vars.torqueStrength, 
                z: -torqueDir.z * this.vars.torqueStrength 
            }, true)
        }
        
        if(this.vars.keys.a)
        {
            const torqueDir = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), right).normalize()
            this.vars.body.applyTorqueImpulse({ 
                x: -torqueDir.x * this.vars.torqueStrength, 
                y: -torqueDir.y * this.vars.torqueStrength, 
                z: -torqueDir.z * this.vars.torqueStrength 
            }, true)
        }
        
        if(this.vars.keys.d)
        {
            const torqueDir = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), right).normalize()
            this.vars.body.applyTorqueImpulse({ 
                x: torqueDir.x * this.vars.torqueStrength, 
                y: torqueDir.y * this.vars.torqueStrength, 
                z: torqueDir.z * this.vars.torqueStrength 
            }, true)
        }
    }
}

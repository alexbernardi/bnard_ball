import * as THREE from 'three'

/**
 * OceanMode - Ocean/water mode for the player
 * Activates when player reaches sea level (-230)
 * Player loses complete control in this mode
 */
export default class OceanMode
{
    constructor(player)
    {
        this.player = player
        this.vars = player.vars
        
        // Sea level height
        this.seaLevel = -230
        
        // Hysteresis to prevent mode flipping when bouncing near surface
        this.exitThreshold = 3 // Must be this far above sea level to exit ocean mode
        this.isActive = false // Track if we're currently in ocean mode
        
        // Water physics properties
        this.waterDrag = 0.98
        this.waterBuoyancy = 5
    }

    /**
     * Check if player is in ocean mode
     * Uses hysteresis to prevent flip-flopping near sea level
     */
    isInOcean()
    {
        if(!this.vars.body) return false
        
        const position = this.vars.body.translation()
        
        // Enter ocean mode when at or below sea level
        if(position.y <= this.seaLevel)
        {
            this.isActive = true
        }
        // Exit ocean mode only when significantly above sea level
        else if(position.y > this.seaLevel + this.exitThreshold)
        {
            this.isActive = false
        }
        // Otherwise keep current state (hysteresis)
        
        return this.isActive
    }

    update()
    {
        if(!this.vars.body) return
        
        // Disengage flight mode properly when entering ocean
        // Use FlightMode.activate() to properly restore gravity, stop animations, etc.
        if(this.vars.isFlying)
        {
            this.player.flightMode.activate() // This toggles off flight mode properly
        }
        
        const velocity = this.vars.body.linvel()
        const position = this.vars.body.translation()
        
        // Apply water drag to slow down movement
        this.vars.body.setLinvel({
            x: velocity.x * this.waterDrag,
            y: velocity.y * this.waterDrag,
            z: velocity.z * this.waterDrag
        }, true)
        
        // Apply gentle buoyancy to keep ball near surface
        const depthBelowSurface = this.seaLevel - position.y
        if(depthBelowSurface > 0)
        {
            this.vars.body.applyImpulse({
                x: 0,
                y: this.waterBuoyancy * Math.min(depthBelowSurface, 1),
                z: 0
            }, true)
        }
        
        // Stop angular velocity (ball stops rolling)
        const angvel = this.vars.body.angvel()
        this.vars.body.setAngvel({
            x: angvel.x * this.waterDrag,
            y: angvel.y * this.waterDrag,
            z: angvel.z * this.waterDrag
        }, true)
    }
}

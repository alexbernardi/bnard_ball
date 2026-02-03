import * as THREE from 'three'

/**
 * FlightMode - Flight physics and controls
 * Handles glider-style flight when activated
 */
export default class FlightMode
{
    constructor(player)
    {
        this.player = player
        this.vars = player.vars
    }

    activate()
    {
        // Toggle flight mode
        this.vars.isFlying = !this.vars.isFlying
        
        // Reset velocity log flag when toggling
        this.vars.hasLoggedVelocity = false
        
        // Change collision sphere color
        if(this.player.collisionMesh)
        {
            if(this.vars.isFlying)
            {
                this.player.collisionMesh.material.color.set(0x00ff00) // Green
                console.log('Flight mode activated!')
                
                // Play BallToWings animation forward (once)
                if(this.player.visuals)
                {
                    this.player.visuals.playAnimation('BallToWings', { loop: false, timeScale: 1.0 })
                }
                
                // Disconnect from world gravity - we'll apply our own
                this.vars.body.setGravityScale(0.0, true)
                
                // Zero out angular velocity to prevent spinning
                this.vars.body.setAngvel({ x: 0, y: 0, z: 0 }, true)
                
                // Capture initial velocity at moment of activation
                const vel = this.vars.body.linvel()
                this.vars.velocityInitial.set(vel.x, vel.y, vel.z)
                
                // Initialize pitch to match velocity direction (flight path angle)
                const horizontalSpeed = Math.sqrt(vel.x * vel.x + vel.z * vel.z)
                const velocityPitch = Math.atan2(vel.y, horizontalSpeed)
                this.vars.targetPitch = velocityPitch
                this.vars.currentPitch = velocityPitch
                
                // Roll starts at 0 (velocity doesn't encode roll)
                this.vars.targetRoll = 0
                this.vars.currentRoll = 0
                
                // Initialize yaw from velocity direction
                const velocityYaw = -Math.atan2(vel.z, vel.x) + Math.PI
                this.vars.currentYaw = velocityYaw
                
                // Start transition timer
                this.vars.flightTransitionStartTime = Date.now()
                
                console.log(`Initial velocity: (${vel.x.toFixed(2)}, ${vel.y.toFixed(2)}, ${vel.z.toFixed(2)})`)
                console.log(`Initial pitch: ${(velocityPitch * 180 / Math.PI).toFixed(1)}°`)
            }
            else
            {
                this.player.collisionMesh.material.color.set(0xff0000) // Red
                console.log('Flight mode deactivated!')
                
                // Stop the animation - it will smoothly fade back to the ball pose
                if(this.player.visuals)
                {
                    this.player.visuals.stopAnimation()
                }
                
                // Sync physics body rotation to match current visual orientation
                // This allows the closing animation to continue from the current flight orientation
                if(this.player.mesh)
                {
                    const meshQuat = this.player.mesh.quaternion
                    this.vars.body.setRotation({ 
                        x: meshQuat.x, 
                        y: meshQuat.y, 
                        z: meshQuat.z, 
                        w: meshQuat.w 
                    }, true)
                }
                
                // Reset pitch/roll to prevent carrying over to next flight
                this.vars.currentPitch = 0
                this.vars.currentRoll = 0
                this.vars.targetPitch = 0
                this.vars.targetRoll = 0
                
                // Restore world gravity
                this.vars.body.setGravityScale(1.0, true)
            }
        }
    }

    applyPhysics()
    {
        if(!this.vars.body || !this.vars.isFlying) return
        
        const velocity = this.vars.body.linvel()
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z)
        // Use actual delta time (convert from ms to seconds)
        const dt = this.player.experience.time.delta / 1000
        
        // Get current orientation
        const pitch = this.vars.currentPitch  // Nose up/down angle
        const roll = this.vars.currentRoll    // Bank angle
        const yaw = this.vars.currentYaw      // Heading from velocity
        
        // Calculate velocity direction (normalized)
        const velDir = new THREE.Vector3(velocity.x, velocity.y, velocity.z)
        if(speed > 0.1) velDir.normalize()

        // Debug logging
        const pos = this.vars.body.translation()
        const rot = this.vars.body.rotation()
        const angVel = this.vars.body.angvel()
        const mass = this.vars.body.mass()
        const pitchDeg = (this.vars.currentPitch * 180 / Math.PI).toFixed(1)
        const rollDeg = (this.vars.currentRoll * 180 / Math.PI).toFixed(1)
        const yawDeg = (this.vars.currentYaw * 180 / Math.PI).toFixed(1)
        
        // Calculate angle of attack (alpha)
        // Pitch angle minus velocity angle (using vertical and horizontal speed)
        const velocityAngle = Math.atan2(velocity.y, Math.sqrt(velocity.x * velocity.x + velocity.z * velocity.z))
        let alphaRadUnclamped = pitch - velocityAngle
        const maxAlphaRad = 15 * Math.PI / 180  // 15 degrees in radians
        const alphaRad = Math.max(-maxAlphaRad, Math.min(maxAlphaRad, alphaRadUnclamped))
        const alphaDeg = (alphaRad * 180 / Math.PI).toFixed(1)

        // Pick a reference up. World up is fine for now.
        const refUp = new THREE.Vector3(0, 1, 0)
        
        // constants
        const rho = 1.225
        const S = 2

        // 1) gravity as FORCE
        const gravityForce = new THREE.Vector3(0, (-mass) * 9.8, 0)

        // 2) CL with proper stall behavior
        const alphaStall = THREE.MathUtils.degToRad(12)   // Stall angle
        const alphaAbs = Math.abs(alphaRad)
        
        let CL
        if (alphaAbs < alphaStall) {
            // Linear region: CL = 2π * alpha
            CL = 2 * Math.PI * alphaRad
        } else {
            // Post-stall: CL drops off dramatically
            // Peak CL at stall, then drops
            const peakCL = 2 * Math.PI * alphaStall * Math.sign(alphaRad)
            const excessAlpha = alphaAbs - alphaStall
            const stallDropoff = Math.exp(-excessAlpha * 8)  // Rapid dropoff after stall
            CL = peakCL * stallDropoff * 0.3  // Drops to ~30% and decays further
        }
        CL = THREE.MathUtils.clamp(CL, -1.2, 1.2)

        // 3) dynamic pressure
        const q = 0.5 * rho * speed * speed

        // 4) lift magnitude (N) with stall at low speed
        const stallSpeed = 15  // Speed below which stall begins (m/s)
        const minSpeed = 5     // Below this, almost no lift
        const stallFactor = speed < stallSpeed 
            ? Math.max(0, Math.pow((speed - minSpeed) / (stallSpeed - minSpeed), 2))
            : 1.0
        const liftMagnitude = q * S * CL * stallFactor

        // If velDir is nearly parallel to refUp, cross product becomes unstable.
        // Fall back to another reference axis.
        let right = new THREE.Vector3().crossVectors(velDir, refUp)
        if (right.lengthSq() < 1e-6) {
            right = new THREE.Vector3().crossVectors(velDir, new THREE.Vector3(1, 0, 0))
        }
        right.normalize()

        // Lift direction is perpendicular to velocity, and lies in the plane defined by velDir and refUp
        let liftDir = new THREE.Vector3().crossVectors(right, velDir).normalize()
        
        // Apply roll: rotate lift direction around velocity vector
        // When rolled, lift tilts sideways, causing the aircraft to turn
        if (Math.abs(roll) > 0.001) {
            // Create quaternion for rotation around velocity axis
            const rollQuat = new THREE.Quaternion().setFromAxisAngle(velDir, roll)
            liftDir.applyQuaternion(rollQuat)
        }
        
        const liftForce = liftDir.clone().multiplyScalar(liftMagnitude)

        // 6) drag as FORCE (use a CD model instead of a unitless fudge)
        const CD0 = 0.03                                 // tune
        const k = 0.08                                   // tune
        const CD = CD0 + k * CL * CL
        const dragMagnitude = q * S * CD
        const dragForce = velDir.clone().multiplyScalar(-dragMagnitude)

        // sum forces
        const totalForce = new THREE.Vector3()
        .add(gravityForce)
        .add(liftForce)
        .add(dragForce)

        // 7) impulse = F * dt
        const impulse = totalForce.multiplyScalar(dt)
        this.vars.body.applyImpulse({ x: impulse.x, y: impulse.y, z: impulse.z }, true)

        
        // Keep angular velocity zeroed
        this.vars.body.setAngvel({ x: 0, y: 0, z: 0 }, true)
    }

    updateControls()
    {
        if(!this.vars.body || !this.vars.isFlying) return
        
        const velocity = this.vars.body.linvel()
        
        // Update target pitch based on W/S keys
        if(this.vars.keys.w)
        {
            // W = pitch down (nose down, negative pitch)
            this.vars.targetPitch = Math.max(this.vars.targetPitch - this.vars.pitchSpeed, -this.vars.maxPitch)
        }
        else if(this.vars.keys.s)
        {
            // S = pitch up (nose up, positive pitch)
            this.vars.targetPitch = Math.min(this.vars.targetPitch + this.vars.pitchSpeed, this.vars.maxPitch)
        }
        // No lerp back - pitch holds position
        
        // Update target roll based on A/D keys
        if(this.vars.keys.a)
        {
            // A = roll left (negative roll)
            this.vars.targetRoll = Math.max(this.vars.targetRoll - this.vars.rollSpeed, -this.vars.maxRoll)
        }
        else if(this.vars.keys.d)
        {
            // D = roll right (positive roll)
            this.vars.targetRoll = Math.min(this.vars.targetRoll + this.vars.rollSpeed, this.vars.maxRoll)
        }
        // No lerp back - roll holds position
        
        // Smoothly interpolate current angles towards target
        this.vars.currentPitch += (this.vars.targetPitch - this.vars.currentPitch) * 0.1
        this.vars.currentRoll += (this.vars.targetRoll - this.vars.currentRoll) * 0.1
        
        // Calculate yaw from velocity direction
        const yawAngle = Math.atan2(velocity.z, velocity.x)
        this.vars.currentYaw = -yawAngle + Math.PI  // Store for axes helper
        
        // Apply rotation to glider model and axes helper together
        if(this.player.liftPlane)
        {
            this.player.liftPlane.rotation.set(
                -this.vars.currentRoll,          // X = roll (negated for correct direction)
                this.vars.currentYaw,            // Y = yaw (from velocity)
                -this.vars.currentPitch,         // Z = pitch (negated for correct direction)
                'YXZ'
            )
        }
        
        // Apply the same rotation to the ball mesh (with wings open)
        if(this.player.mesh && this.vars.isFlying)
        {
            // Ball mesh needs same rotation as glider, but may have different initial orientation
            // Glider has initial rotation.y = Math.PI, so ball needs same offset
            // Roll and pitch signs are flipped due to the Math.PI yaw offset
            this.player.mesh.rotation.set(
                this.vars.currentRoll,           // X = roll (positive due to yaw offset)
                this.vars.currentYaw + Math.PI,  // Y = yaw + offset to match glider orientation
                this.vars.currentPitch,          // Z = pitch (positive due to yaw offset)
                'YXZ'
            )
        }
        
        // Keep axes helper aligned with glider (different offset since axes have no initial rotation)
        if(this.player.liftPlaneAxesGroup)
        {
            this.player.liftPlaneAxesGroup.rotation.set(
                this.vars.currentRoll,
                this.vars.currentYaw + Math.PI,
                this.vars.currentPitch,
                'YXZ'
            )
        }
        
        // Zero angular velocity to prevent spinning (body stays dynamic)
        this.vars.body.setAngvel({ x: 0, y: 0, z: 0 }, true)
    }

    update()
    {
        this.applyPhysics()
        this.updateControls()
    }
}

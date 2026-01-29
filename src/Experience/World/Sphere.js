import * as THREE from 'three'
import Experience from '../Experience.js'
import HUD from '../Utils/HUD.js'

export default class Sphere
{
    constructor()
    {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.physics = this.experience.physics
        this.camera = this.experience.camera
        this.debug = this.experience.debug
        this.time = this.experience.time
        this.resources = this.experience.resources

        // Properties
        this.radius = 1
        this.body = null
        this.collider = null
        
        // Group for sphere and camera
        this.group = new THREE.Group()
        this.scene.add(this.group)
        
        // Velocity tracking
        this.lastOrientation = new THREE.Quaternion()
        this.velocityThreshold = 0
        this.orientationSmoothing = 0.1
        this.lastVelocity = new THREE.Vector3()
        this.orientationDelay = 300 // milliseconds to wait before updating orientation
        this.lastVelocityChangeTime = 0
        this.orientationUpdateEnabled = true

        // Physics properties - Metal ball
        this.torqueStrength = 3
        this.friction = 1.0
        this.restitution = 0 // Bounce for airtime
        this.linearDamping = 0 // No air resistance
        this.angularDamping = 0 // No rotational resistance
        this.density = 5

        // Input
        this.keys = {
            w: false,
            s: false,
            a: false,
            d: false,
            space: false
        }
        
        // Flight physics
        this.isFlying = false
        this.hasLoggedVelocity = false // Track if we've logged velocity this flight session
        this.velocityInitial = new THREE.Vector3() // Velocity when flight mode activates
        this.velocityFinal = new THREE.Vector3() // Velocity after stabilization
        this.flightTransitionDuration = 2000 // Milliseconds to transition to level flight
        this.flightTransitionStartTime = 0 // When transition started
        
        // Turbulence properties
        this.turbulenceAmplitude = 2.0 // How much the oscillation affects velocity (m/s)
        this.turbulenceFrequency = 5.0 // How fast the oscillation occurs (Hz)
        
        // Post-stabilization flight physics (applied after transition completes)
        this.flightGravity = 9.0 // Downward acceleration in m/s² after stabilization
        this.flightLift = 0.25 // Lift coefficient - multiplied by horizontal speed for upward force
        this.flightDrag = 0.005 // Drag coefficient - slows horizontal speed over time
        
        // Glider physics properties
        this.liftCoefficient = 2.0 // How much lift is generated
        this.liftDirection = new THREE.Vector3(0, 1, 0) // Default upward
        this.flightLevelingSpeed = 0.1 // How fast to level out (0-1, lower = smoother)
        
        // Air control properties
        this.isGrounded = false
        this.airControlStrength = 1 // Impulse strength when in air (not flying)
        
        // Flight control properties (pitch and roll)
        this.currentPitch = 0 // Current pitch angle in radians
        this.currentRoll = 0  // Current roll angle in radians
        this.targetPitch = 0  // Target pitch angle
        this.targetRoll = 0   // Target roll angle
        this.pitchSpeed = 0.02 // How fast pitch changes per frame when key held
        this.rollSpeed = 0.03  // How fast roll changes per frame when key held
        this.pitchLerpSpeed = 0.05 // How fast pitch returns to 0
        this.rollLerpSpeed = 0.08  // How fast roll returns to 0
        this.maxPitch = Math.PI / 4 // Max pitch angle (45 degrees)
        this.maxRoll = Math.PI / 3  // Max roll angle (60 degrees)

        // Debug
        if(this.debug.active)
        {
            this.debugFolder = this.debug.ui.addFolder('sphere')
            this.debugFolder.open()
        }

        this.setGeometry()
        this.setMaterial()
        this.setMesh()
        this.setLiftPlane()
        this.setHelpers()
        this.setVelocityGraph()
        this.setInput()
        this.setPhysics()
        
        // Set camera to follow this sphere
        this.camera.setTarget(this)
        
        // Create HUD
        this.hud = new HUD()
    }

    setGeometry()
    {
        this.geometry = new THREE.SphereGeometry(this.radius, 16, 16)
    }

    setMaterial()
    {
        this.material = new THREE.MeshStandardMaterial({
            color: '#ffffff',
            metalness: 0.3,
            roughness: 0.4,
            wireframe: true
        })

        // Debug
        if(this.debug.active)
        {
            this.debugFolder
                .addColor(this.material, 'color')
                .name('sphereColor')
            
            this.debugFolder
                .add(this.material, 'metalness')
                .min(0)
                .max(1)
                .step(0.001)
            
            this.debugFolder
                .add(this.material, 'roughness')
                .min(0)
                .max(1)
                .step(0.001)
            
            // Copy button
            this.debug.addCopyButton(this.debugFolder, 'sphere', () => ({
                radius: this.radius,
                color: '#' + this.material.color.getHexString(),
                metalness: this.material.metalness,
                roughness: this.material.roughness
            }))
        }
    }

    setMesh()
    {
        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.mesh.castShadow = true
        this.mesh.visible = false
        this.group.add(this.mesh)
        
        // Set initial group position - at bottom center of half-pipe
        this.group.position.set(50, -9, 0)
    }

    setLiftPlane()
    {
        // Load glider model from resources
        const gliderResource = this.resources.items.gliderModel
        
        if(gliderResource && gliderResource.scene)
        {
            // Clone the glider model
            this.liftPlane = gliderResource.scene.clone()
            
            // Scale the glider to 2x size
            this.liftPlane.scale.set(2, 2, 2)
            
            // Position at center
            this.liftPlane.position.y = 0
            
            // Rotate 90 degrees right (no initial rotation)
            this.liftPlane.rotation.y = 2 * Math.PI / 2
            
            this.group.add(this.liftPlane)
            
            // Make all meshes wireframe
            this.liftPlane.traverse((child) => {
                if(child.isMesh)
                {
                    child.castShadow = true
                    child.receiveShadow = true
                    // Make wireframe
                    if(child.material)
                    {
                        child.material.wireframe = true
                        child.material.transparent = true
                        child.material.opacity = 0.9
                    }
                }
            })
        }
        else
        {
            // Fallback: create simple plane if model not loaded
            console.warn('Glider model not loaded, using fallback plane')
            const planeGeometry = new THREE.PlaneGeometry(5, 5)
            const planeMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.5
            })
            this.liftPlane = new THREE.Mesh(planeGeometry, planeMaterial)
            this.liftPlane.rotation.x = -Math.PI / 2
            this.group.add(this.liftPlane)
        }
        
        // Create a group for lift plane axes (so they rotate with the plane)
        this.liftPlaneAxesGroup = new THREE.Group()
        this.group.add(this.liftPlaneAxesGroup)
        
        // Add XYZ axes helper on the lift plane
        const axesHelper = new THREE.AxesHelper(3)
        this.liftPlaneAxesGroup.add(axesHelper)
        
        // Create rotation indicator arrows for Yaw, Pitch, Roll
        // Yaw (Y-axis rotation) - Green curved arrow around Y
        this.yawArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, 0, 0),
            2.5,
            0x00ff00, // Green for Y
            0.4,
            0.25
        )
        this.liftPlaneAxesGroup.add(this.yawArrow)
        
        // Pitch (X-axis rotation) - Red arrow along X
        this.pitchArrow = new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(0, 0, 0),
            2.5,
            0xff0000, // Red for X
            0.4,
            0.25
        )
        this.liftPlaneAxesGroup.add(this.pitchArrow)
        
        // Roll (Z-axis rotation) - Blue arrow along Z
        this.rollArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, 0),
            2.5,
            0x0000ff, // Blue for Z
            0.4,
            0.25
        )
        this.liftPlaneAxesGroup.add(this.rollArrow)
        
        // Create text labels for Yaw, Pitch, Roll
        const createTextSprite = (text, color, size = 0.5) => {
            const canvas = document.createElement('canvas')
            const context = canvas.getContext('2d')
            canvas.width = 256
            canvas.height = 128
            
            context.font = 'Bold 48px Arial'
            context.fillStyle = color
            context.textAlign = 'center'
            context.textBaseline = 'middle'
            context.fillText(text, 128, 64)
            
            const texture = new THREE.CanvasTexture(canvas)
            const spriteMaterial = new THREE.SpriteMaterial({ map: texture })
            const sprite = new THREE.Sprite(spriteMaterial)
            sprite.scale.set(size * 2, size, 1)
            
            return sprite
        }
        
        // Yaw label (Y-axis) - above
        const yawLabel = createTextSprite('YAW (Y)', '#00ff00')
        yawLabel.position.set(0, 3.2, 0)
        this.liftPlaneAxesGroup.add(yawLabel)
        
        // Pitch label (X-axis) - to the right
        const pitchLabel = createTextSprite('PITCH (X)', '#ff0000')
        pitchLabel.position.set(3.5, 0, 0)
        this.liftPlaneAxesGroup.add(pitchLabel)
        
        // Roll label (Z-axis) - forward
        const rollLabel = createTextSprite('ROLL (Z)', '#0000ff')
        rollLabel.position.set(0, 0, 3.5)
        this.liftPlaneAxesGroup.add(rollLabel)
    }

    setHelpers()
    {
        // Velocity arrow (cyan)
        this.velocityArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, 0),
            2,
            0x00ffff,
            0.3,
            0.2
        )
        this.scene.add(this.velocityArrow)
        
        // Tangent/orientation arrow (magenta)
        this.tangentArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, 0, 0),
            2,
            0xff00ff,
            0.3,
            0.2
        )
        this.scene.add(this.tangentArrow)
        
        // Ground detection ray (yellow = grounded, orange = airborne)
        this.groundRayHelper = new THREE.ArrowHelper(
            new THREE.Vector3(0, -1, 0),
            new THREE.Vector3(0, 0, 0),
            this.radius + 0.1,
            0xffff00,
            0.2,
            0.15
        )
        this.scene.add(this.groundRayHelper)
    }

    setVelocityGraph()
    {
        // Create separate scene for velocity graph
        this.graphScene = new THREE.Scene()
        this.graphScene.background = new THREE.Color(0x111111)
        
        // Create camera for graph (orthographic for better axis view)
        this.graphCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
        this.graphCamera.position.set(3, 3, 3)
        this.graphCamera.lookAt(0, 0, 0)
        
        // Add axes helpers
        const axesHelper = new THREE.AxesHelper(2)
        this.graphScene.add(axesHelper)
        
        // Add grid
        const gridHelper = new THREE.GridHelper(4, 8, 0x444444, 0x222222)
        this.graphScene.add(gridHelper)
        
        // Create velocity vector arrow (starts at origin)
        this.graphVelocityArrow = new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(0, 0, 0),
            1,
            0x00ffff,
            0.2,
            0.15
        )
        this.graphScene.add(this.graphVelocityArrow)
        
        // Create axis labels using sprites
        const createTextSprite = (text, color, size = 0.3) => {
            const canvas = document.createElement('canvas')
            const context = canvas.getContext('2d')
            canvas.width = 128
            canvas.height = 128
            
            context.font = 'Bold 80px Arial'
            context.fillStyle = color
            context.textAlign = 'center'
            context.textBaseline = 'middle'
            context.fillText(text, 64, 64)
            
            const texture = new THREE.CanvasTexture(canvas)
            const spriteMaterial = new THREE.SpriteMaterial({ map: texture })
            const sprite = new THREE.Sprite(spriteMaterial)
            sprite.scale.set(size, size, 1)
            
            return sprite
        }
        
        // Add axis labels
        const xLabel = createTextSprite('X', '#ff0000')
        xLabel.position.set(1.8, 0, 0)
        this.graphScene.add(xLabel)
        
        const yLabel = createTextSprite('Y', '#00ff00')
        yLabel.position.set(0, 1.8, 0)
        this.graphScene.add(yLabel)
        
        const zLabel = createTextSprite('Z', '#0000ff')
        zLabel.position.set(0, 0, 1.8)
        this.graphScene.add(zLabel)
        
        // Trail system for ghost effect
        this.velocityTrail = []
        this.maxTrailLength = 500 // Number of trail points
        this.trailFadeTime = 5000 // Milliseconds to fade out
    }

    setPhysics()
    {
        // Check if physics is already ready
        if(this.physics.isReady)
        {
            this.createPhysicsBody()
        }
        else
        {
            // Wait for physics to be ready
            this.physics.on('ready', () =>
            {
                this.createPhysicsBody()
            })
        }
    }

    createPhysicsBody()
    {
        const RAPIER = this.physics.getRAPIDER()

        // Spawn at origin (on ramp surface)
        const spawnX = 0
        const spawnY = this.radius // Just above origin, accounting for sphere radius
        const spawnZ = 0
        
        // Create rigid body (dynamic)
        const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(spawnX, spawnY, spawnZ)
            .setLinearDamping(this.linearDamping)
            .setAngularDamping(this.angularDamping)
            .setCanSleep(false) // Prevent abrupt stopping
            .setCcdEnabled(true) // Enable continuous collision detection
        this.body = this.physics.createRigidBody(rigidBodyDesc)

        // Create collider (sphere with same radius as mesh) with friction
        const colliderDesc = RAPIER.ColliderDesc.ball(this.radius)
            .setFriction(this.friction)
            .setRestitution(this.restitution)
            .setDensity(this.density)
            .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS) // Enable collision events
        this.collider = this.physics.createCollider(colliderDesc, this.body)
        
        // Apply initial impulse to start movement
        this.body.applyImpulse({ x: 3.0, y: 0, z: 0 }, true)
        
        // Create collision visualization
        const collisionGeometry = new THREE.SphereGeometry(this.radius, 16, 16)
        const collisionMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            wireframe: true,
            transparent: true,
            opacity: 0.7
        })
        this.collisionMesh = new THREE.Mesh(collisionGeometry, collisionMaterial)
        this.group.add(this.collisionMesh)
        
        
        // Debug controls for physics
        if(this.debug.active)
        {
            this.debugFolder
                .add(this, 'torqueStrength')
                .min(0)
                .max(20)
                .step(0.1)
                .name('torqueStrength')
            
            this.debugFolder
                .add(this, 'friction')
                .min(0)
                .max(2)
                .step(0.01)
                .name('friction')
                .onChange((value) => {
                    this.collider.setFriction(value)
                })
            
            this.debugFolder
                .add(this, 'restitution')
                .min(0)
                .max(1)
                .step(0.01)
                .name('restitution (bounce)')
                .onChange((value) => {
                    this.collider.setRestitution(value)
                })
            
            this.debugFolder
                .add(this, 'linearDamping')
                .min(0)
                .max(5)
                .step(0.1)
                .name('linearDamping')
                .onChange((value) => {
                    this.body.setLinearDamping(value)
                })
            
            this.debugFolder
                .add(this, 'angularDamping')
                .min(0)
                .max(5)
                .step(0.1)
                .name('angularDamping')
                .onChange((value) => {
                    this.body.setAngularDamping(value)
                })
            
            // Orientation debug controls
            this.debugFolder
                .add(this, 'velocityThreshold')
                .min(0)
                .max(2)
                .step(0.01)
                .name('velocityThreshold')
            
            this.debugFolder
                .add(this, 'orientationSmoothing')
                .min(0.01)
                .max(1)
                .step(0.01)
                .name('orientationSmoothing')
            
            this.debugFolder
                .add(this, 'airControlStrength')
                .min(0)
                .max(2)
                .step(0.05)
                .name('airControlStrength')
            
            // Flight physics debug controls
            const flightFolder = this.debugFolder.addFolder('Flight Physics')
            flightFolder
                .add(this, 'liftCoefficient')
                .min(0)
                .max(10)
                .step(0.1)
                .name('liftCoefficient')
            flightFolder
                .add(this, 'flightLevelingSpeed')
                .min(0.01)
                .max(1)
                .step(0.01)
                .name('levelingSpeed')
            flightFolder
                .add(this, 'flightTransitionDuration')
                .min(500)
                .max(10000)
                .step(100)
                .name('transitionDuration (ms)')
            flightFolder
                .add(this, 'turbulenceAmplitude')
                .min(0)
                .max(5)
                .step(0.1)
                .name('turbulence amplitude')
            flightFolder
                .add(this, 'turbulenceFrequency')
                .min(0.1)
                .max(10)
                .step(0.1)
                .name('turbulence frequency (Hz)')
            flightFolder
                .add(this, 'flightGravity')
                .min(0)
                .max(10)
                .step(0.1)
                .name('post-stab gravity (m/s²)')
            flightFolder
                .add(this, 'flightLift')
                .min(0)
                .max(0.5)
                .step(0.01)
                .name('post-stab lift coeff')
            flightFolder
                .add(this, 'flightDrag')
                .min(0)
                .max(0.1)
                .step(0.001)
                .name('post-stab drag coeff')
        }
    }

    setInput()
    {
        // Keyboard events
        window.addEventListener('keydown', (event) =>
        {
            if(event.key === 'w' || event.key === 'W')
                this.keys.w = true
            if(event.key === 's' || event.key === 'S')
                this.keys.s = true
            if(event.key === 'a' || event.key === 'A')
                this.keys.a = true
            if(event.key === 'd' || event.key === 'D')
                this.keys.d = true
            if(event.key === ' ')
            {
                this.keys.space = true
                this.activateFlight()
            }
        })

        window.addEventListener('keyup', (event) =>
        {
            if(event.key === 'w' || event.key === 'W')
                this.keys.w = false
            if(event.key === 's' || event.key === 'S')
                this.keys.s = false
            if(event.key === 'a' || event.key === 'A')
                this.keys.a = false
            if(event.key === 'd' || event.key === 'D')
                this.keys.d = false
            if(event.key === ' ')
                this.keys.space = false
        })
    }

    activateFlight()
    {
        // Toggle flight mode
        this.isFlying = !this.isFlying
        
        // Reset velocity log flag when toggling
        this.hasLoggedVelocity = false
        
        // Change collision sphere color to green when flight is activated
        if(this.collisionMesh)
        {
            if(this.isFlying)
            {
                this.collisionMesh.material.color.set(0x00ff00) // Green
                console.log('Flight mode activated!')
                
                // Disconnect from world gravity - we'll apply our own
                this.body.setGravityScale(0.0, true)
                
                // Lock body rotation - set to kinematic position-based mode
                this.body.setBodyType(2, true) // 2 = KinematicPositionBased
                this.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true) // Identity quaternion
                this.body.setAngvel({ x: 0, y: 0, z: 0 }, true)
                
                // Capture initial velocity at moment of activation
                const vel = this.body.linvel()
                this.velocityInitial.set(vel.x, vel.y, vel.z)
                
                // Start transition timer
                this.flightTransitionStartTime = Date.now()
                
                console.log('Physics body locked - rotation disabled')
                console.log(`Initial velocity: (${vel.x.toFixed(2)}, ${vel.y.toFixed(2)}, ${vel.z.toFixed(2)})`)
            }
            else
            {
                this.collisionMesh.material.color.set(0xff0000) // Red
                console.log('Flight mode deactivated!')
                
                // Restore world gravity
                this.body.setGravityScale(1.0, true)
                
                // Restore dynamic body type
                this.body.setBodyType(0, true) // 0 = Dynamic
            }
        }
    }

    applyFlightPhysics()
    {
        if(!this.body || !this.isFlying) return
        
        const velocity = this.body.linvel()
        
        // ==========================================
        // SIMPLE GRAVITY (placeholder for lift physics)
        // ==========================================
        const dt = 1 / 60
        const gravity = 9.8
        
        this.body.setLinvel({
            x: velocity.x,
            y: velocity.y - (gravity * dt),
            z: velocity.z
        }, true)
        
        // Keep angular velocity zeroed to maintain level flight
        this.body.setAngvel({ x: 0, y: 0, z: 0 }, true)
    }

    update()
    {
        if(this.body)
        {
            // Get physics data once at the start
            const position = this.body.translation()
            const rotation = this.body.rotation()
            const velocity = this.body.linvel()
            
            // Apply flight physics if in flight mode
            this.applyFlightPhysics()
            
            // Check if ball is grounded using contact pairs
            const world = this.physics.world
            this.isGrounded = false
            
            // Check for contacts
            world.contactPairsWith(this.collider, (otherCollider) => {
                this.isGrounded = true
            })
            
            // Get camera-relative directions
            const forward = this.camera.getForwardDirection()
            const right = this.camera.getRightDirection()
            
            // Flatten directions to world XZ plane (level with ground) for air control
            const forwardFlat = new THREE.Vector3(forward.x, 0, forward.z).normalize()
            const rightFlat = new THREE.Vector3(right.x, 0, right.z).normalize()
            
            // Flight control - pitch and roll when flying
            if(this.isFlying)
            {
                // Update target pitch based on W/S keys
                if(this.keys.w)
                {
                    // W = pitch down (nose down, negative pitch)
                    this.targetPitch = Math.max(this.targetPitch - this.pitchSpeed, -this.maxPitch)
                }
                else if(this.keys.s)
                {
                    // S = pitch up (nose up, positive pitch)
                    this.targetPitch = Math.min(this.targetPitch + this.pitchSpeed, this.maxPitch)
                }
                else
                {
                    // No pitch input - lerp back to 0
                    this.targetPitch *= (1 - this.pitchLerpSpeed)
                    if(Math.abs(this.targetPitch) < 0.001) this.targetPitch = 0
                }
                
                // Update target roll based on A/D keys
                if(this.keys.a)
                {
                    // A = roll left (negative roll)
                    this.targetRoll = Math.max(this.targetRoll - this.rollSpeed, -this.maxRoll)
                }
                else if(this.keys.d)
                {
                    // D = roll right (positive roll)
                    this.targetRoll = Math.min(this.targetRoll + this.rollSpeed, this.maxRoll)
                }
                else
                {
                    // No roll input - lerp back to 0
                    this.targetRoll *= (1 - this.rollLerpSpeed)
                    if(Math.abs(this.targetRoll) < 0.001) this.targetRoll = 0
                }
                
                // Smoothly interpolate current angles towards target
                this.currentPitch += (this.targetPitch - this.currentPitch) * 0.1
                this.currentRoll += (this.targetRoll - this.currentRoll) * 0.1
                
                // Apply pitch and roll to glider visual only (not physics body)
                // Get yaw from velocity direction
                const yawAngle = Math.atan2(velocity.z, velocity.x)
                
                // Apply rotation to glider model
                if(this.liftPlane)
                {
                    // Set rotation: Pitch around X, Yaw around Y, Roll around Z
                    this.liftPlane.rotation.set(
                        this.currentPitch,           // X = pitch
                        -yawAngle + Math.PI,         // Y = yaw (from velocity)
                        this.currentRoll,            // Z = roll
                        'YXZ'                        // Rotation order
                    )
                }
                
                // Keep physics body locked at zero rotation
                this.body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
                this.body.setAngvel({ x: 0, y: 0, z: 0 }, true)
            }
            // Air control - apply impulses when in air (not grounded, not flying)
            else if(!this.isGrounded && !this.isFlying)
            {
                if(this.keys.w)
                {
                    this.body.applyImpulse({ 
                        x: forwardFlat.x * this.airControlStrength, 
                        y: 0, 
                        z: forwardFlat.z * this.airControlStrength 
                    }, true)
                }
                if(this.keys.s)
                {
                    this.body.applyImpulse({ 
                        x: -forwardFlat.x * this.airControlStrength, 
                        y: 0, 
                        z: -forwardFlat.z * this.airControlStrength 
                    }, true)
                }
                if(this.keys.a)
                {
                    this.body.applyImpulse({ 
                        x: -rightFlat.x * this.airControlStrength, 
                        y: 0, 
                        z: -rightFlat.z * this.airControlStrength 
                    }, true)
                }
                if(this.keys.d)
                {
                    this.body.applyImpulse({ 
                        x: rightFlat.x * this.airControlStrength, 
                        y: 0, 
                        z: rightFlat.z * this.airControlStrength 
                    }, true)
                }
            }
            // Ground control - apply torque for rolling motion when grounded
            else if(this.isGrounded && !this.isFlying)
            {
                if(this.keys.w)
                {
                    const torqueDir = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize()
                    this.body.applyTorqueImpulse({ 
                        x: torqueDir.x * this.torqueStrength, 
                        y: torqueDir.y * this.torqueStrength, 
                        z: torqueDir.z * this.torqueStrength 
                    }, true)
                }
                if(this.keys.s)
                {
                    const torqueDir = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), forward).normalize()
                    this.body.applyTorqueImpulse({ 
                        x: -torqueDir.x * this.torqueStrength, 
                        y: -torqueDir.y * this.torqueStrength, 
                        z: -torqueDir.z * this.torqueStrength 
                    }, true)
                }
                if(this.keys.a)
                {
                    const torqueDir = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), right).normalize()
                    this.body.applyTorqueImpulse({ 
                        x: -torqueDir.x * this.torqueStrength, 
                        y: -torqueDir.y * this.torqueStrength, 
                        z: -torqueDir.z * this.torqueStrength 
                    }, true)
                }
                if(this.keys.d)
                {
                    const torqueDir = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), right).normalize()
                    this.body.applyTorqueImpulse({ 
                        x: torqueDir.x * this.torqueStrength, 
                        y: torqueDir.y * this.torqueStrength, 
                        z: torqueDir.z * this.torqueStrength 
                    }, true)
                }
            }
            
            // Update group position first
            this.group.position.set(position.x, position.y, position.z)

            // Update mesh rotation with physics body
            this.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w)
            
            // Update collision mesh if it exists
            if(this.collisionMesh)
            {
                this.collisionMesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w)
            }
            
            // Calculate current velocity vector
            const currentVelocity = new THREE.Vector3(velocity.x, velocity.y, velocity.z)
            const velocityMagnitude = currentVelocity.length()
            
            // Update lift plane yaw to face velocity direction (only yaw, no pitch or roll)
            if(this.liftPlane && this.liftPlaneAxesGroup && velocityMagnitude > 0.1)
            {
                // Calculate yaw angle from horizontal velocity components
                const yawAngle = Math.atan2(velocity.z, velocity.x)
                
                // Apply yaw rotation to lift plane (rotate around Y axis only)
                // Add PI/2 to orient the glider correctly (nose forward)
                this.liftPlane.rotation.y = -yawAngle + Math.PI
                
                // Apply yaw to the axes group (rotate around Y axis)
                this.liftPlaneAxesGroup.rotation.set(0, -yawAngle, 0)
            }
            
            // Update HUD
            if(this.hud && this.camera) {
                // Calculate theta for HUD
                const thetaXZ = Math.atan2(currentVelocity.z, currentVelocity.x) * (180 / Math.PI)
                
                this.hud.update(velocityMagnitude, position.y + 360, {
                    x: currentVelocity.x,
                    y: currentVelocity.y,
                    z: currentVelocity.z,
                    theta: thetaXZ
                });
                if (typeof this.camera.getCameraDebugInfo === 'function') {
                    const camInfo = this.camera.getCameraDebugInfo();
                    this.hud.updateCameraInfo(camInfo.fov, camInfo.offset, camInfo.mode, camInfo.position, camInfo.quaternion);
                }
            }
            
            // Update velocity arrow (cyan)
            if(velocityMagnitude > 0.01)
            {
                const velocityDir = currentVelocity.clone().normalize()
                this.velocityArrow.position.copy(this.group.position)
                this.velocityArrow.setDirection(velocityDir)
                this.velocityArrow.setLength(velocityMagnitude * 0.5, 0.3, 0.2)
            }
            
            // Update tangent arrow (magenta) - perpendicular to velocity
            if(velocityMagnitude > 0.01)
            {
                const velocityDir = currentVelocity.clone().normalize()
                const up = new THREE.Vector3(0, 1, 0)
                const right = new THREE.Vector3().crossVectors(up, velocityDir).normalize()
                const tangent = new THREE.Vector3().crossVectors(velocityDir, right).normalize()
                
                this.tangentArrow.position.copy(this.group.position)
                this.tangentArrow.setDirection(tangent)
                this.tangentArrow.setLength(2, 0.3, 0.2)
            }
            
            // Update ground ray helper
            this.groundRayHelper.position.copy(this.group.position)
            this.groundRayHelper.setDirection(new THREE.Vector3(0, -1, 0))
            this.groundRayHelper.setLength(this.radius + 0.1, 0.2, 0.15)
            // Yellow when grounded, orange when airborne
            this.groundRayHelper.setColor(this.isGrounded ? 0xffff00 : 0xff8800)
            
            // Update velocity graph arrow
            if(this.graphVelocityArrow && velocityMagnitude > 0.01) {
                const velDir = currentVelocity.clone().normalize()
                // Scale velocity for graph visualization (scale down for better view)
                const graphScale = Math.min(velocityMagnitude / 10, 2) // Max length 2 units
                this.graphVelocityArrow.setDirection(velDir)
                this.graphVelocityArrow.setLength(graphScale, 0.2, 0.15)
                
                // Add trail point (only add, don't filter here - filtering happens in renderGraph)
                const scaledVel = currentVelocity.clone().multiplyScalar(0.1) // Scale for graph
                scaledVel.clampLength(0, 2) // Max length 2 units
                this.velocityTrail.push({
                    position: scaledVel.clone(),
                    time: Date.now(),
                    mesh: null
                })
                
                // Limit trail length (remove oldest without mewsh cleanup, mesh cleanup in renderGraph)
                while(this.velocityTrail.length > this.maxTrailLength) {
                    const oldest = this.velocityTrail.shift()
                    if(oldest.mesh) {
                        this.graphScene.remove(oldest.mesh)
                        oldest.mesh.geometry.dispose()
                        oldest.mesh.material.dispose()
                    }
                }
            }
            
            // Store current velocity for next frame
            this.lastVelocity.copy(currentVelocity)
        }
        else
        {
            // Physics body not initialized yet
        }
    }

    renderGraph()
    {
        // Render velocity graph in bottom-right corner (called after main scene render)
        if(this.graphScene && this.graphCamera) {
            const renderer = this.experience.renderer.instance
            const width = this.experience.sizes.width
            const height = this.experience.sizes.height
            const graphSize = 600
            
            // Process trail - remove expired points and update opacity
            const currentTime = Date.now()
            const validTrails = []
            
            for(let i = 0; i < this.velocityTrail.length; i++) {
                const point = this.velocityTrail[i]
                const age = currentTime - point.time
                
                if(age >= this.trailFadeTime) {
                    // Expired - remove mesh from scene
                    if(point.mesh) {
                        this.graphScene.remove(point.mesh)
                        point.mesh.geometry.dispose()
                        point.mesh.material.dispose()
                        point.mesh = null
                    }
                    // Don't add to validTrails - it's expired
                } else {
                    // Still valid
                    const opacity = Math.max(0, 1 - (age / this.trailFadeTime))
                    
                    if(!point.mesh) {
                        // Create mesh for new trail point
                        const sphereGeometry = new THREE.SphereGeometry(0.025, 8, 8)
                        const sphereMaterial = new THREE.MeshBasicMaterial({
                            color: 0xffffff,
                            transparent: true,
                            opacity: opacity * 0.6
                        })
                        point.mesh = new THREE.Mesh(sphereGeometry, sphereMaterial)
                        point.mesh.position.copy(point.position)
                        this.graphScene.add(point.mesh)
                    } else {
                        // Update opacity on existing mesh
                        point.mesh.material.opacity = opacity * 0.6
                    }
                    
                    validTrails.push(point)
                }
            }
            
            // Replace trail array with only valid trails
            this.velocityTrail = validTrails
            
            // Set viewport for mini graph (bottom-right corner)
            renderer.setViewport(width - graphSize - 10, 10, graphSize, graphSize)
            renderer.setScissor(width - graphSize - 10, 10, graphSize, graphSize)
            renderer.setScissorTest(true)
            
            renderer.render(this.graphScene, this.graphCamera)
            
            // Reset viewport for main scene
            renderer.setViewport(0, 0, width, height)
            renderer.setScissorTest(false)
        }
    }
}

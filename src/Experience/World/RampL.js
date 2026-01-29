import * as THREE from 'three'
import Experience from '../Experience.js'

export default class RampL {
    constructor() {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.debug = this.experience.debug
        
        // ==========================================
        // MATERIALS
        // ==========================================
        // Blender imported meshes - GREEN wireframe
        this.blenderMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            wireframe: true,
        })
        
        // Computed/generated meshes - PURPLE wireframe
        this.computedMaterial = new THREE.MeshBasicMaterial({
            color: 0xff00ff,
            wireframe: true,
            side: THREE.DoubleSide,
        })
        
        // ==========================================
        // BLENDER MESH REFERENCES (imported from GLTF)
        // ==========================================
        this.blenderRampMesh = null    // The ramp mesh from Blender
        this.blenderGateMesh = null    // The gate mesh from Blender
        
        // ==========================================
        // COMPUTED MESH REFERENCES (generated in code)
        // ==========================================
        this.computedRampMesh = null   // Generated from curve function
        this.computedGateMesh = null   // Generated from gate parameters
        
        // ==========================================
        // BLENDER MESH POSITION OFFSET
        // (Blender meshes are at origin, offset here)
        // ==========================================
        this.blenderOffset = new THREE.Vector3(0, 0, 0)
        
        // ==========================================
        // COMPUTED GATE PARAMETERS
        // ==========================================
        this.gateCenter = new THREE.Vector3(236, -208, 0)  // Gate center position (x, y, z)
        this.gateWidth = 40                            // Gate width (horizontal)
        this.gateHeight = 30                           // Gate height (vertical)
        this.gateRotationX = Math.PI / 4               // Gate X rotation in radians
        this.gateRotationY = Math.PI / 2               // Gate Y rotation in radians
        this.gateRotationZ = 0                         // Gate Z rotation in radians
        
        // Computed from rotation
        this.gateNormal = new THREE.Vector3(1, 0, 0)
        
        this.playerPreviousPos = null
        this.hasPassedGate = false
        
        // ==========================================
        // COMPUTED RAMP PARAMETERS
        // ==========================================
        this.L = 30          // Ramp length
        this.M = 1.3         // Ramp shape parameter
        this.W = 40          // Ramp width
        this.rampSegments = 32  // Number of segments for computed ramp mesh
        this.gravity = 9.81  // Gravity (m/s^2)
        this.substeps = 4    // Physics substeps for stability
        this.playerRadius = 1  // Sphere radius for surface offset
        
        // Ramp mode state
        this.playerRampMode = false
        this.playerBallisticMode = false
        this.rampState = {
            rampX: 0,        // Current X position along curve (local to ramp)
            vS: 0,           // Scalar speed along arc length (m/s)
            lateralZ: 0,     // Sideways offset from ramp center
            vZ: 0            // Lateral velocity (preserved from entry)
        }
        
        // Ramp world offset (where ramp x=0 starts in world space)
        this.rampOrigin = new THREE.Vector3(229.4, -214.65, 0)
        
        this.setModel()
        this.createComputedMeshes()
        this.setDebug()
    }

    // ==========================================
    // RAMP CURVE FUNCTIONS
    // ==========================================
    
    /**
     * Get the surface normal at position x (perpendicular to curve, pointing "up")
     * Normal direction: (-y', 1) normalized
     * @param {number} x - Position along ramp
     * @returns {Object} - { nx, ny } unit normal components
     */
    getNormal(x) {
        const slope = this.dy(x)
        const denom = Math.sqrt(1 + slope * slope)
        return {
            nx: -slope / denom,
            ny: 1 / denom
        }
    }
    /**
     * Height function: y(x) = ((M-1)/(L*L)) * x^3 + ((2-M)/L) * x^2 - x
     * @param {number} x - Position along ramp (0 to L)
     * @returns {number} - Height at x
     */
    y(x) {
        const L = this.L
        const M = this.M
        const L2 = L * L
        return ((M - 1) / L2) * x * x * x + ((2 - M) / L) * x * x - x
    }
    
    /**
     * Derivative: y'(x) = 3*((M-1)/(L*L))*x^2 + 2*((2-M)/L)*x - 1
     * @param {number} x - Position along ramp (0 to L)
     * @returns {number} - Slope at x
     */
    dy(x) {
        const L = this.L
        const M = this.M
        const L2 = L * L
        return 3 * ((M - 1) / L2) * x * x + 2 * ((2 - M) / L) * x - 1
    }
    
    /**
     * Step the ramp constraint physics
     * @param {Object} state - { rampX, vS, lateralZ }
     * @param {number} dt - Time step in seconds
     * @returns {Object} - { newPosition: THREE.Vector3, newVelocity: THREE.Vector3, exitedRamp: boolean }
     */
    stepRampConstraint(state, dt) {
        let { rampX, vS, lateralZ, vZ } = state
        const g = this.gravity
        const L = this.L
        
        // Substep for stability
        const subDt = dt / this.substeps
        let exitedRamp = false
        
        for (let i = 0; i < this.substeps; i++) {
            // Get current slope
            const slope = this.dy(rampX)
            const slopeSq = slope * slope
            const denom = Math.sqrt(1 + slopeSq)
            
            // Tangential acceleration from gravity projection
            // aT = (-g * y'(x)) / sqrt(1 + y'(x)^2)
            const aT = (-g * slope) / denom
            
            // Update speed along arc
            vS += aT * subDt
            
            // Update lateral position with Z velocity
            lateralZ += vZ * subDt
            
            // Convert arc-length step to dx
            // dx = (vS * dt) / sqrt(1 + y'(x)^2)
            const dx = (vS * subDt) / denom
            
            // Update ramp X position
            rampX += dx
            
            // Clamp and check exit conditions
            if (rampX < 0) {
                rampX = 0
                vS = Math.abs(vS) // Reverse if hitting start
            }
            if (rampX >= L) {
                rampX = L
                exitedRamp = true
                break
            }
        }
        
        // Calculate final position on curve (local to ramp)
        const localY = this.y(rampX)
        
        // Get surface normal for radius offset
        const normal = this.getNormal(rampX)
        
        // Transform to world position, offset by radius along normal
        const newPosition = new THREE.Vector3(
            this.rampOrigin.x + rampX + normal.nx * this.playerRadius,
            this.rampOrigin.y + localY + normal.ny * this.playerRadius,
            this.rampOrigin.z + lateralZ
        )
        
        // Calculate unit tangent in X-Y plane
        const slope = this.dy(rampX)
        const denom = Math.sqrt(1 + slope * slope)
        const tx = 1 / denom
        const ty = slope / denom
        
        // Velocity vector (tangent to curve, scaled by speed, plus lateral Z)
        const newVelocity = new THREE.Vector3(
            vS * tx,
            vS * ty,
            vZ
        )
        
        // Update state
        state.rampX = rampX
        state.vS = vS
        state.lateralZ = lateralZ
        
        return {
            newPosition,
            newVelocity,
            exitedRamp
        }
    }
    
    /**
     * Enter ramp mode - initialize state from player's current position/velocity
     * @param {Object} player - Player object
     */
    enterRampMode(player) {
        const pos = player.vars.body.translation()
        const vel = player.vars.body.linvel()
        
        // Calculate initial rampX from world X position
        const localX = pos.x - this.rampOrigin.x
        this.rampState.rampX = Math.max(0, Math.min(localX, this.L))
        
        // Calculate initial speed along curve from velocity
        // Project velocity onto tangent direction
        const slope = this.dy(this.rampState.rampX)
        const denom = Math.sqrt(1 + slope * slope)
        const tx = 1 / denom
        const ty = slope / denom
        
        // vS = dot(velocity, tangent)
        this.rampState.vS = vel.x * tx + vel.y * ty
        
        // Store lateral offset and preserve Z velocity
        this.rampState.lateralZ = pos.z - this.rampOrigin.z
        this.rampState.vZ = vel.z
        
        // Get player radius from player vars
        this.playerRadius = player.vars.radius || 1
        
        // Immediately snap player to curve position with radius offset
        const curveY = this.y(this.rampState.rampX)
        const normal = this.getNormal(this.rampState.rampX)
        const snappedPos = {
            x: this.rampOrigin.x + this.rampState.rampX + normal.nx * this.playerRadius,
            y: this.rampOrigin.y + curveY + normal.ny * this.playerRadius,
            z: this.rampOrigin.z + this.rampState.lateralZ
        }
        
        // Set velocity to be tangent to curve, preserving Z velocity
        const snappedVel = {
            x: this.rampState.vS * tx,
            y: this.rampState.vS * ty,
            z: this.rampState.vZ
        }
        
        // Apply immediately
        player.vars.body.setTranslation(snappedPos, true)
        player.vars.body.setLinvel(snappedVel, true)
        
        // Update previous X to prevent re-triggering gate detection
        this.playerPreviousX = snappedPos.x
        
        this.playerRampMode = true
        this.playerBallisticMode = false
        
        console.log('Entered ramp mode:', {
            rampX: this.rampState.rampX,
            vS: this.rampState.vS,
            lateralZ: this.rampState.lateralZ,
            vZ: this.rampState.vZ,
            playerRadius: this.playerRadius
        })
    }
    
    /**
     * Exit ramp mode - switch to ballistic mode
     * @param {THREE.Vector3} exitVelocity - Velocity at exit
     */
    exitRampMode(exitVelocity) {
        this.playerRampMode = false
        this.playerBallisticMode = true
        
        console.log('Exited ramp mode, entering ballistic:', {
            velocity: exitVelocity
        })
    }

    setModel() {
        const gltf = this.resources.items.rampLModel
        
        if (gltf && gltf.scene) {
            this.model = gltf.scene
            
            console.log('RampL model loaded, children:')
            
            // Find the gate plane and ramp meshes from Blender
            this.model.traverse((child) => {
                if (child.isMesh) {
                    console.log('  Mesh found:', child.name)
                    
                    if (child.name === 'ramp-entrance-gate') {
                        this.blenderGateMesh = child
                        this.blenderGateMesh.material = this.blenderMaterial
                    } else {
                        // Assume other meshes are the ramp
                        this.blenderRampMesh = child
                        child.material = this.blenderMaterial
                    }
                }
            })
            
            // Apply offset to the entire model (Blender meshes at origin, offset here)
            this.model.position.copy(this.blenderOffset)
            
            this.scene.add(this.model)
            console.log('RampL model added to scene at offset:', this.blenderOffset)
        } else {
            console.warn('RampL model not found!')
        }
    }
    
    /**
     * Create the computed meshes (gate plane and ramp surface)
     * These are generated from parameters, not imported from Blender
     */
    createComputedMeshes() {
        // ==========================================
        // COMPUTED GATE MESH
        // ==========================================
        const gatePlaneGeometry = new THREE.PlaneGeometry(this.gateWidth, this.gateHeight)
        this.computedGateMesh = new THREE.Mesh(gatePlaneGeometry, this.computedMaterial)
        
        this.computedGateMesh.position.copy(this.gateCenter)
        this.computedGateMesh.rotation.order = 'YXZ'
        this.computedGateMesh.rotation.set(this.gateRotationX, this.gateRotationY, this.gateRotationZ)
        
        this.scene.add(this.computedGateMesh)
        
        // Compute gate normal from rotation
        const euler = new THREE.Euler(this.gateRotationX, this.gateRotationY, this.gateRotationZ, 'YXZ')
        const quaternion = new THREE.Quaternion().setFromEuler(euler)
        this.gateNormal.set(0, 0, 1)
        this.gateNormal.applyQuaternion(quaternion)
        // Keep only horizontal component for plane crossing detection
        this.gateNormal.y = 0
        if (this.gateNormal.length() > 0.001) {
            this.gateNormal.normalize()
        } else {
            this.gateNormal.set(1, 0, 0)
        }
        
        console.log('Computed gate mesh created, normal:', this.gateNormal)
        
        // ==========================================
        // COMPUTED RAMP MESH (from curve function)
        // ==========================================
        this.createComputedRampMesh()
    }
    
    /**
     * Create or update the computed ramp mesh based on y(x) curve function
     */
    createComputedRampMesh() {
        // Remove old mesh if exists
        if (this.computedRampMesh) {
            this.scene.remove(this.computedRampMesh)
            this.computedRampMesh.geometry.dispose()
        }
        
        const segments = this.rampSegments
        const halfWidth = this.W / 2
        
        // Create geometry with vertices along the curve
        const geometry = new THREE.BufferGeometry()
        const vertices = []
        const indices = []
        
        // Generate vertices: 2 rows (left edge and right edge) x (segments+1) points
        for (let i = 0; i <= segments; i++) {
            const x = (i / segments) * this.L
            const y = this.y(x)
            
            // Left edge vertex
            vertices.push(
                this.rampOrigin.x + x,
                this.rampOrigin.y + y,
                this.rampOrigin.z - halfWidth
            )
            
            // Right edge vertex
            vertices.push(
                this.rampOrigin.x + x,
                this.rampOrigin.y + y,
                this.rampOrigin.z + halfWidth
            )
        }
        
        // Generate triangle indices
        for (let i = 0; i < segments; i++) {
            const baseIndex = i * 2
            
            // Two triangles per segment (quad)
            // Triangle 1: bottom-left, bottom-right, top-left
            indices.push(baseIndex, baseIndex + 1, baseIndex + 2)
            // Triangle 2: bottom-right, top-right, top-left
            indices.push(baseIndex + 1, baseIndex + 3, baseIndex + 2)
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
        geometry.setIndex(indices)
        geometry.computeVertexNormals()
        
        this.computedRampMesh = new THREE.Mesh(geometry, this.computedMaterial)
        this.scene.add(this.computedRampMesh)
        
        console.log('Computed ramp mesh created with', segments, 'segments')
    }
    
    /**
     * Update computed meshes when parameters change
     */
    updateComputedMeshes() {
        // Update gate normal from rotation
        const euler = new THREE.Euler(this.gateRotationX, this.gateRotationY, this.gateRotationZ, 'YXZ')
        const quaternion = new THREE.Quaternion().setFromEuler(euler)
        this.gateNormal.set(0, 0, 1)
        this.gateNormal.applyQuaternion(quaternion)
        this.gateNormal.y = 0
        if (this.gateNormal.length() > 0.001) {
            this.gateNormal.normalize()
        } else {
            this.gateNormal.set(1, 0, 0)
        }
        
        // Update computed gate mesh
        if (this.computedGateMesh) {
            this.computedGateMesh.position.copy(this.gateCenter)
            this.computedGateMesh.rotation.set(this.gateRotationX, this.gateRotationY, this.gateRotationZ)
            this.computedGateMesh.geometry.dispose()
            this.computedGateMesh.geometry = new THREE.PlaneGeometry(this.gateWidth, this.gateHeight)
        }
        
        // Recreate computed ramp mesh
        this.createComputedRampMesh()
    }
    
    /**
     * Update Blender mesh offset
     */
    updateBlenderOffset() {
        if (this.model) {
            this.model.position.copy(this.blenderOffset)
        }
    }

    update() {
        // Get player reference
        const player = this.experience.world?.player
        if (!player || !player.vars?.body) return
        
        const playerPos = player.vars.body.translation()
        
        // Get gate world position from gateCenter
        const gatePos = this.gateCenter
        
        // Get delta time in seconds
        const dt = this.experience.time.delta / 1000
        
        // ==========================================
        // RAMP MODE PHYSICS
        // ==========================================
        if (this.playerRampMode) {
            // Step the ramp constraint physics
            const result = this.stepRampConstraint(this.rampState, dt)
            
            // Apply position and velocity to rigid body kinematically
            player.vars.body.setTranslation(
                { x: result.newPosition.x, y: result.newPosition.y, z: result.newPosition.z },
                true
            )
            player.vars.body.setLinvel(
                { x: result.newVelocity.x, y: result.newVelocity.y, z: result.newVelocity.z },
                true
            )
            
            // Check if exited ramp
            if (result.exitedRamp) {
                this.exitRampMode(result.newVelocity)
            }
            
            return // Skip gate detection while in ramp mode
        }
        
        // ==========================================
        // GATE CROSSING DETECTION
        // ==========================================
        
        // Use computed gate for detection (blenderGateMesh is just visual reference)
        if (!this.computedGateMesh) {
            // Store previous pos for next frame even without computed gate
            this.playerPreviousPos = new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z)
            return
        }
        
        // Calculate signed distance from player to gate plane
        // distance = dot(playerPos - gatePos, gateNormal)
        const toPlayer = new THREE.Vector3(
            playerPos.x - gatePos.x,
            0,  // Ignore Y for plane distance
            playerPos.z - gatePos.z
        )
        const signedDistance = toPlayer.dot(this.gateNormal)
        
        // Calculate previous signed distance
        let prevSignedDistance = null
        if (this.playerPreviousPos) {
            const toPrevPlayer = new THREE.Vector3(
                this.playerPreviousPos.x - gatePos.x,
                0,
                this.playerPreviousPos.z - gatePos.z
            )
            prevSignedDistance = toPrevPlayer.dot(this.gateNormal)
        }
        
        // Debug: log gate position and player position periodically
        if (Math.random() < 0.01) {
            const halfWidth = this.gateWidth / 2
            const halfHeight = this.gateHeight / 2
        }
        
        // Gate dimensions from the GLTF plane
        const halfWidth = this.gateWidth / 2   // Horizontal extent along gate
        const halfHeight = this.gateHeight / 2  // Y extent
        
        // Check if player is within gate bounds (Y height and lateral distance from gate center)
        const withinY = playerPos.y >= gatePos.y - halfHeight && playerPos.y <= gatePos.y + halfHeight
        
        // Calculate lateral distance along the gate (perpendicular to normal)
        const gateRight = new THREE.Vector3(-this.gateNormal.z, 0, this.gateNormal.x) // Perpendicular to normal
        const lateralDistance = Math.abs(toPlayer.dot(gateRight))
        const withinWidth = lateralDistance <= halfWidth
        
        // Log every frame when near the gate
        if (Math.abs(signedDistance) < 30) {
            console.log('Near gate:', {
                signedDistance: signedDistance.toFixed(2),
                prevSignedDistance: prevSignedDistance?.toFixed(2) ?? 'null',
                lateralDistance: lateralDistance.toFixed(2),
                halfWidth: halfWidth.toFixed(2),
                withinWidth,
                playerY: playerPos.y.toFixed(2),
                gateY: gatePos.y.toFixed(2),
                halfHeight: halfHeight.toFixed(2),
                withinY,
                gateNormal: `(${this.gateNormal.x.toFixed(2)}, ${this.gateNormal.z.toFixed(2)})`
            })
            
            // Warn if we're crossing but failing bounds check
            if (prevSignedDistance !== null) {
                const crossing = (prevSignedDistance < 0 && signedDistance >= 0) || (prevSignedDistance > 0 && signedDistance <= 0)
                if (crossing) {
                    console.warn('>>> CROSSING DETECTED <<<', {
                        withinY,
                        withinWidth,
                        willTrigger: withinY && withinWidth
                    })
                    if (!withinY) {
                        console.warn('FAILED Y CHECK:', {
                            playerY: playerPos.y.toFixed(2),
                            gateY: gatePos.y.toFixed(2),
                            yMin: (gatePos.y - halfHeight).toFixed(2),
                            yMax: (gatePos.y + halfHeight).toFixed(2)
                        })
                    }
                }
            }
        }
        
        // Detect crossing the gate plane (signed distance changes sign)
        if (prevSignedDistance !== null && withinY && withinWidth) {
            const crossedForward = prevSignedDistance < 0 && signedDistance >= 0
            const crossedBackward = prevSignedDistance > 0 && signedDistance <= 0
            
            if (crossedForward || crossedBackward) {
                const velocity = player.vars.body.linvel()
                console.log('=== GATE CROSSED ===', {
                    direction: crossedForward ? 'FRONT (forward)' : 'BACK (backward)',
                    prevSignedDistance: prevSignedDistance.toFixed(2),
                    signedDistance: signedDistance.toFixed(2),
                    playerPos: `(${playerPos.x.toFixed(1)}, ${playerPos.y.toFixed(1)}, ${playerPos.z.toFixed(1)})`,
                    velocity: `(${velocity.x.toFixed(1)}, ${velocity.y.toFixed(1)}, ${velocity.z.toFixed(1)})`
                })
                
                // Enter ramp mode when crossing forward
                if (crossedForward && !this.playerRampMode) {
                    console.log('>>> ENTERING RAMP MODE <<<')
                    this.enterRampMode(player)
                } else if (crossedBackward) {
                    console.log('>>> Crossed from back - not entering ramp mode <<<')
                }
            }
        }
        
        this.playerPreviousPos = new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z)
    }

    setDebug() {
        if (this.debug.active) {
            const folder = this.debug.ui.addFolder('rampL')
            folder.close()
            
            // ==========================================
            // MESH VISIBILITY (4 meshes: 2 Blender + 2 Computed)
            // ==========================================
            const meshFolder = folder.addFolder('mesh visibility')
            
            // Blender meshes (green wireframe)
            if (this.blenderRampMesh) {
                meshFolder.add(this.blenderRampMesh, 'visible').name('🟢 Blender Ramp')
            }
            if (this.blenderGateMesh) {
                meshFolder.add(this.blenderGateMesh, 'visible').name('🟢 Blender Gate')
            }
            
            // Computed meshes (purple wireframe)
            if (this.computedRampMesh) {
                meshFolder.add(this.computedRampMesh, 'visible').name('🟣 Computed Ramp')
            }
            if (this.computedGateMesh) {
                meshFolder.add(this.computedGateMesh, 'visible').name('🟣 Computed Gate')
            }
            
            // ==========================================
            // BLENDER MESH OFFSET
            // ==========================================
            const blenderFolder = folder.addFolder('blender offset')
            blenderFolder.add(this.blenderOffset, 'x', -500, 500, 0.01).name('offset X').onChange(() => this.updateBlenderOffset())
            blenderFolder.add(this.blenderOffset, 'y', -500, 100, 0.01).name('offset Y').onChange(() => this.updateBlenderOffset())
            blenderFolder.add(this.blenderOffset, 'z', -500, 500, 0.01).name('offset Z').onChange(() => this.updateBlenderOffset())
            
            // ==========================================
            // COMPUTED GATE PARAMETERS
            // ==========================================
            const gateFolder = folder.addFolder('computed gate')
            gateFolder.add(this.gateCenter, 'x', -500, 500, 0.01).name('center X').onChange(() => this.updateComputedMeshes())
            gateFolder.add(this.gateCenter, 'y', -500, 100, 0.01).name('center Y').onChange(() => this.updateComputedMeshes())
            gateFolder.add(this.gateCenter, 'z', -500, 500, 0.01).name('center Z').onChange(() => this.updateComputedMeshes())
            gateFolder.add(this, 'gateWidth', 1, 100, 0.01).name('width').onChange(() => this.updateComputedMeshes())
            gateFolder.add(this, 'gateHeight', 1, 100, 0.01).name('height').onChange(() => this.updateComputedMeshes())
            gateFolder.add(this, 'gateRotationX', -Math.PI, Math.PI, 0.01).name('rotation X').onChange(() => this.updateComputedMeshes())
            gateFolder.add(this, 'gateRotationY', -Math.PI, Math.PI, 0.01).name('rotation Y').onChange(() => this.updateComputedMeshes())
            gateFolder.add(this, 'gateRotationZ', -Math.PI, Math.PI, 0.01).name('rotation Z').onChange(() => this.updateComputedMeshes())
            
            // ==========================================
            // COMPUTED RAMP PARAMETERS
            // ==========================================
            const rampFolder = folder.addFolder('computed ramp')
            rampFolder.add(this, 'L', 10, 100, 0.01).name('length (L)').onChange(() => this.updateComputedMeshes())
            rampFolder.add(this, 'M', 0.1, 2, 0.01).name('shape (M)').onChange(() => this.updateComputedMeshes())
            rampFolder.add(this, 'W', 10, 100, 0.01).name('width (W)').onChange(() => this.updateComputedMeshes())
            rampFolder.add(this, 'rampSegments', 8, 64, 1).name('segments').onChange(() => this.updateComputedMeshes())
            
            // Ramp origin
            const originFolder = rampFolder.addFolder('ramp origin')
            originFolder.add(this.rampOrigin, 'x', -500, 500, 0.01).name('origin X').onChange(() => this.updateComputedMeshes())
            originFolder.add(this.rampOrigin, 'y', -500, 100, 0.01).name('origin Y').onChange(() => this.updateComputedMeshes())
            originFolder.add(this.rampOrigin, 'z', -500, 500, 0.01).name('origin Z').onChange(() => this.updateComputedMeshes())
            
            // ==========================================
            // PHYSICS PARAMETERS
            // ==========================================
            const physicsFolder = folder.addFolder('physics')
            physicsFolder.add(this, 'gravity', 1, 20, 0.1).name('gravity')
            physicsFolder.add(this, 'substeps', 1, 16, 1).name('substeps')
            physicsFolder.add(this, 'playerRampMode').name('ramp mode').listen()
            physicsFolder.add(this, 'playerBallisticMode').name('ballistic mode').listen()
            
            // Manual ramp mode trigger
            folder.add({ 
                resetRampMode: () => {
                    this.playerRampMode = false
                    this.playerBallisticMode = false
                    this.rampState.rampX = 0
                    this.rampState.vS = 0
                    this.rampState.vZ = 0
                    console.log('Ramp mode reset')
                }
            }, 'resetRampMode').name('reset ramp mode')
            
            // Copy button
            this.debug.addCopyButton(folder, 'rampL', () => ({
                blenderOffset: { x: this.blenderOffset.x, y: this.blenderOffset.y, z: this.blenderOffset.z },
                gateCenter: { x: this.gateCenter.x, y: this.gateCenter.y, z: this.gateCenter.z },
                gateWidth: this.gateWidth,
                gateHeight: this.gateHeight,
                gateRotation: { x: this.gateRotationX, y: this.gateRotationY, z: this.gateRotationZ },
                L: this.L,
                M: this.M,
                W: this.W,
                rampSegments: this.rampSegments,
                rampOrigin: { x: this.rampOrigin.x, y: this.rampOrigin.y, z: this.rampOrigin.z },
                gravity: this.gravity,
                substeps: this.substeps
            }))
        }
    }
}

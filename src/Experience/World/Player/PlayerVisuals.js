import * as THREE from 'three'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'

/**
 * PlayerVisuals - Visual elements for the player
 * Handles mesh, glider model, helpers, and velocity graph
 */
export default class PlayerVisuals
{
    constructor(player)
    {
        this.player = player
        this.experience = player.experience
        this.scene = player.scene
        this.resources = player.resources
        this.vars = player.vars
        
        // Trail system for velocity graph
        this.velocityTrail = []
        this.maxTrailLength = 500
        this.trailFadeTime = 5000
        
        // Animation properties
        this.mixer = null
        this.animations = {}
        this.currentAction = null
    }

    setupMesh()
    {
        const ballResource = this.resources.items.ball2Model
        
        if(ballResource && ballResource.scene)
        {
            // Use SkeletonUtils.clone for proper animation support with skinned meshes
            this.player.mesh = SkeletonUtils.clone(ballResource.scene)
            this.player.mesh.scale.set(1, 1, 1)
            this.player.mesh.castShadow = true
            
            // Create materials for left and right sides
            const leftMaterial = new THREE.MeshStandardMaterial({
                color: 0xf0faf3,       // Blue for left
                metalness: 0.5,
                roughness: 0.1,        // Smooth/shiny
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.4           // 60% transparent
            })
            
            const rightMaterial = new THREE.MeshStandardMaterial({
                color: 0x47ed81,       // Red for right
                metalness: 0.5,
                roughness: 0.1,        // Smooth/shiny
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.4           // 60% transparent
            })
            
            // Track mesh index to assign different materials
            let meshIndex = 0
            
            // Setup materials for all meshes
            this.player.mesh.traverse((child) => {
                if(child.isMesh)
                {
                    child.castShadow = true
                    child.receiveShadow = true
                    
                    // Compute smooth normals (like "Shade Smooth" in Blender)
                    if(child.geometry)
                    {
                        child.geometry.computeVertexNormals()
                    }
                    
                    // Assign alternating materials (left/right)
                    child.material = meshIndex % 2 === 0 ? leftMaterial : rightMaterial
                    meshIndex++
                }
            })
            
            this.player.group.add(this.player.mesh)
            
            // Setup animation mixer - must use the cloned mesh, not the original
            if(ballResource.animations && ballResource.animations.length > 0)
            {
                this.mixer = new THREE.AnimationMixer(this.player.mesh)
                
                // Store all animations by name
                ballResource.animations.forEach((clip) => {
                    this.animations[clip.name] = this.mixer.clipAction(clip)
                    console.log(`Player ball animation loaded: ${clip.name}`)
                })
                
                console.log('Available player ball animations:', Object.keys(this.animations))
            }
        }
        else
        {
            // Fallback to wireframe sphere
            console.warn('Ball2 model not loaded, using fallback wireframe sphere')
            const geometry = new THREE.SphereGeometry(this.vars.radius, 16, 16)
            const material = new THREE.MeshStandardMaterial({
                color: '#ffffff',
                metalness: 0.3,
                roughness: 0.4,
                wireframe: true
            })
            this.player.mesh = new THREE.Mesh(geometry, material)
            this.player.mesh.castShadow = true
            this.player.group.add(this.player.mesh)
        }
        
        // Set initial group position
        this.player.group.position.set(50, -9, 0)
    }

    playAnimation(name, options = {})
    {
        const action = this.animations[name]
        
        if(!action)
        {
            console.warn(`Animation "${name}" not found`)
            return
        }
        
        const loop = options.loop !== undefined ? options.loop : true
        const timeScale = options.timeScale !== undefined ? options.timeScale : 1.0
        
        // Stop current animation if playing
        if(this.currentAction && this.currentAction !== action)
        {
            this.currentAction.fadeOut(0.3)
        }
        
        // Configure action
        action.reset()
        action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce)
        action.clampWhenFinished = !loop
        action.timeScale = timeScale
        
        // Play
        action.fadeIn(0.3)
        action.play()
        
        this.currentAction = action
    }

    stopAnimation()
    {
        if(this.currentAction)
        {
            this.currentAction.fadeOut(0.3)
            this.currentAction = null
        }
    }

    playAnimationReverse(name, options = {})
    {
        const action = this.animations[name]
        
        if(!action)
        {
            console.warn(`Animation "${name}" not found`)
            return
        }
        
        const timeScale = options.timeScale !== undefined ? options.timeScale : 1.0
        
        // Stop current animation if it's different
        if(this.currentAction && this.currentAction !== action)
        {
            this.currentAction.fadeOut(0.3)
        }
        
        // Configure action for reverse playback
        action.paused = false
        action.setLoop(THREE.LoopOnce)
        action.clampWhenFinished = true
        action.timeScale = -Math.abs(timeScale) // Negative for reverse
        
        // If at the start, jump to end first
        if(action.time <= 0)
        {
            action.time = action.getClip().duration
        }
        
        // Play
        action.fadeIn(0.3)
        action.play()
        
        this.currentAction = action
    }

    updateAnimations(deltaTime)
    {
        if(this.mixer)
        {
            this.mixer.update(deltaTime)
        }
    }

    setupGlider()
    {
        const gliderResource = this.resources.items.gliderModel
        
        if(gliderResource && gliderResource.scene)
        {
            this.player.liftPlane = gliderResource.scene.clone()
            this.player.liftPlane.scale.set(2, 2, 2)
            this.player.liftPlane.position.y = 0
            this.player.liftPlane.rotation.y = 2 * Math.PI / 2
            
            this.player.group.add(this.player.liftPlane)
            
            // Make all meshes wireframe
            this.player.liftPlane.traverse((child) => {
                if(child.isMesh)
                {
                    child.castShadow = true
                    child.receiveShadow = true
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
            console.warn('Glider model not loaded, using fallback plane')
            const planeGeometry = new THREE.PlaneGeometry(5, 5)
            const planeMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ffff,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.5
            })
            this.player.liftPlane = new THREE.Mesh(planeGeometry, planeMaterial)
            this.player.liftPlane.rotation.x = -Math.PI / 2
            this.player.group.add(this.player.liftPlane)
        }
        
        this.setupAxesLabels()
    }

    setupAxesLabels()
    {
        // Create a group for lift plane axes
        this.player.liftPlaneAxesGroup = new THREE.Group()
        this.player.group.add(this.player.liftPlaneAxesGroup)
        
        // Add XYZ axes helper
        const axesHelper = new THREE.AxesHelper(3)
        this.player.liftPlaneAxesGroup.add(axesHelper)
        
        // Yaw arrow (green)
        this.player.yawArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, 0, 0),
            2.5, 0x00ff00, 0.4, 0.25
        )
        this.player.liftPlaneAxesGroup.add(this.player.yawArrow)
        
        // Pitch arrow (red)
        this.player.pitchArrow = new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(0, 0, 0),
            2.5, 0xff0000, 0.4, 0.25
        )
        this.player.liftPlaneAxesGroup.add(this.player.pitchArrow)
        
        // Roll arrow (blue)
        this.player.rollArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, 0),
            2.5, 0x0000ff, 0.4, 0.25
        )
        this.player.liftPlaneAxesGroup.add(this.player.rollArrow)
        
        // Create text labels
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
        
        const yawLabel = createTextSprite('YAW (Y)', '#00ff00')
        yawLabel.position.set(0, 3.2, 0)
        this.player.liftPlaneAxesGroup.add(yawLabel)
        
        const pitchLabel = createTextSprite('PITCH (X)', '#ff0000')
        pitchLabel.position.set(3.5, 0, 0)
        this.player.liftPlaneAxesGroup.add(pitchLabel)
        
        const rollLabel = createTextSprite('ROLL (Z)', '#0000ff')
        rollLabel.position.set(0, 0, 3.5)
        this.player.liftPlaneAxesGroup.add(rollLabel)
    }

    setupHelpers()
    {
        // Velocity arrow (cyan)
        this.player.velocityArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, 0, 1),
            new THREE.Vector3(0, 0, 0),
            2, 0x00ffff, 0.3, 0.2
        )
        this.scene.add(this.player.velocityArrow)
        
        // Tangent arrow (magenta)
        this.player.tangentArrow = new THREE.ArrowHelper(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(0, 0, 0),
            2, 0xff00ff, 0.3, 0.2
        )
        this.scene.add(this.player.tangentArrow)
        
        // Ground detection ray
        this.player.groundRayHelper = new THREE.ArrowHelper(
            new THREE.Vector3(0, -1, 0),
            new THREE.Vector3(0, 0, 0),
            this.vars.radius + 0.1,
            0xffff00, 0.2, 0.15
        )
        this.scene.add(this.player.groundRayHelper)
    }

    setupVelocityGraph()
    {
        // Create separate scene for velocity graph
        this.player.graphScene = new THREE.Scene()
        this.player.graphScene.background = new THREE.Color(0x111111)
        
        // Create camera for graph
        this.player.graphCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
        this.player.graphCamera.position.set(3, 3, 3)
        this.player.graphCamera.lookAt(0, 0, 0)
        
        // Add axes helpers
        const axesHelper = new THREE.AxesHelper(2)
        this.player.graphScene.add(axesHelper)
        
        // Add grid
        const gridHelper = new THREE.GridHelper(4, 8, 0x444444, 0x222222)
        this.player.graphScene.add(gridHelper)
        
        // Create velocity vector arrow
        this.player.graphVelocityArrow = new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0),
            new THREE.Vector3(0, 0, 0),
            1, 0x00ffff, 0.2, 0.15
        )
        this.player.graphScene.add(this.player.graphVelocityArrow)
        
        // Create axis labels
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
        
        const xLabel = createTextSprite('X', '#ff0000')
        xLabel.position.set(1.8, 0, 0)
        this.player.graphScene.add(xLabel)
        
        const yLabel = createTextSprite('Y', '#00ff00')
        yLabel.position.set(0, 1.8, 0)
        this.player.graphScene.add(yLabel)
        
        const zLabel = createTextSprite('Z', '#0000ff')
        zLabel.position.set(0, 0, 1.8)
        this.player.graphScene.add(zLabel)
    }

    updateHelpers(velocity, velocityMagnitude)
    {
        const currentVelocity = new THREE.Vector3(velocity.x, velocity.y, velocity.z)
        
        // Update velocity arrow (cyan)
        if(velocityMagnitude > 0.01)
        {
            const velocityDir = currentVelocity.clone().normalize()
            this.player.velocityArrow.position.copy(this.player.group.position)
            this.player.velocityArrow.setDirection(velocityDir)
            this.player.velocityArrow.setLength(velocityMagnitude * 0.5, 0.3, 0.2)
        }
        
        // Update tangent arrow (magenta)
        if(velocityMagnitude > 0.01)
        {
            const velocityDir = currentVelocity.clone().normalize()
            const up = new THREE.Vector3(0, 1, 0)
            const right = new THREE.Vector3().crossVectors(up, velocityDir).normalize()
            const tangent = new THREE.Vector3().crossVectors(velocityDir, right).normalize()
            
            this.player.tangentArrow.position.copy(this.player.group.position)
            this.player.tangentArrow.setDirection(tangent)
            this.player.tangentArrow.setLength(2, 0.3, 0.2)
        }
        
        // Update ground ray helper
        this.player.groundRayHelper.position.copy(this.player.group.position)
        this.player.groundRayHelper.setDirection(new THREE.Vector3(0, -1, 0))
        this.player.groundRayHelper.setLength(this.vars.radius + 0.1, 0.2, 0.15)
        this.player.groundRayHelper.setColor(this.vars.isGrounded ? 0xffff00 : 0xff8800)
        
        // Update glider yaw when not in flight mode (FlightMode handles rotation when flying)
        if(this.player.liftPlane && this.player.liftPlaneAxesGroup && velocityMagnitude > 0.1 && !this.vars.isFlying)
        {
            const yawAngle = Math.atan2(velocity.z, velocity.x)
            const yaw = -yawAngle + Math.PI
            this.player.liftPlane.rotation.set(0, yaw, 0, 'YXZ')
            this.player.liftPlaneAxesGroup.rotation.set(0, yaw + Math.PI, 0, 'YXZ')
        }
    }

    updateVelocityGraph(velocity, velocityMagnitude)
    {
        if(!this.player.graphVelocityArrow || velocityMagnitude <= 0.01) return
        
        const currentVelocity = new THREE.Vector3(velocity.x, velocity.y, velocity.z)
        const velDir = currentVelocity.clone().normalize()
        const graphScale = Math.min(velocityMagnitude / 10, 2)
        
        this.player.graphVelocityArrow.setDirection(velDir)
        this.player.graphVelocityArrow.setLength(graphScale, 0.2, 0.15)
        
        // Add trail point
        const scaledVel = currentVelocity.clone().multiplyScalar(0.1)
        scaledVel.clampLength(0, 2)
        this.velocityTrail.push({
            position: scaledVel.clone(),
            time: Date.now(),
            mesh: null
        })
        
        // Limit trail length
        while(this.velocityTrail.length > this.maxTrailLength) {
            const oldest = this.velocityTrail.shift()
            if(oldest.mesh) {
                this.player.graphScene.remove(oldest.mesh)
                oldest.mesh.geometry.dispose()
                oldest.mesh.material.dispose()
            }
        }
    }

    renderGraph()
    {
        if(!this.player.graphScene || !this.player.graphCamera) return
        
        const renderer = this.experience.renderer.instance
        const width = this.experience.sizes.width
        const height = this.experience.sizes.height
        const graphSize = 600
        
        // Process trail
        const currentTime = Date.now()
        const validTrails = []
        
        for(let i = 0; i < this.velocityTrail.length; i++) {
            const point = this.velocityTrail[i]
            const age = currentTime - point.time
            
            if(age >= this.trailFadeTime) {
                if(point.mesh) {
                    this.player.graphScene.remove(point.mesh)
                    point.mesh.geometry.dispose()
                    point.mesh.material.dispose()
                    point.mesh = null
                }
            } else {
                const opacity = Math.max(0, 1 - (age / this.trailFadeTime))
                
                if(!point.mesh) {
                    const sphereGeometry = new THREE.SphereGeometry(0.025, 8, 8)
                    const sphereMaterial = new THREE.MeshBasicMaterial({
                        color: 0xffffff,
                        transparent: true,
                        opacity: opacity * 0.6
                    })
                    point.mesh = new THREE.Mesh(sphereGeometry, sphereMaterial)
                    point.mesh.position.copy(point.position)
                    this.player.graphScene.add(point.mesh)
                } else {
                    point.mesh.material.opacity = opacity * 0.6
                }
                
                validTrails.push(point)
            }
        }
        
        this.velocityTrail = validTrails
        
        // Set viewport for mini graph
        renderer.setViewport(width - graphSize - 10, 10, graphSize, graphSize)
        renderer.setScissor(width - graphSize - 10, 10, graphSize, graphSize)
        renderer.setScissorTest(true)
        
        renderer.render(this.player.graphScene, this.player.graphCamera)
        
        // Reset viewport
        renderer.setViewport(0, 0, width, height)
        renderer.setScissorTest(false)
    }
}

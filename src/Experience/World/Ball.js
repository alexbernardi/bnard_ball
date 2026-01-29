import * as THREE from 'three'
import Experience from '../Experience.js'

/**
 * Ball - Animated ball model with debug controls
 * Loads ball2.glb with BallToWings animation
 */
export default class Ball
{
    constructor()
    {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.time = this.experience.time
        this.debug = this.experience.debug
        
        // Animation properties
        this.mixer = null
        this.animations = {}
        this.currentAction = null
        
        // Debug controls state
        this.debugControls = {
            timeScale: 1.0,
            loop: true
        }
        
        this.setup()
        
        if(this.debug.active)
        {
            this.setupDebug()
        }
    }

    setup()
    {
        const ballResource = this.resources.items.ball2Model
        
        if(!ballResource)
        {
            console.warn('Ball2 model not loaded')
            return
        }
        
        // Clone the scene to avoid modifying the original
        this.model = ballResource.scene
        this.model.scale.set(1, 1, 1)
        this.model.position.set(55, -8, 5) // Position near the player spawn
        
        // Setup materials
        this.model.traverse((child) => {
            if(child.isMesh)
            {
                child.castShadow = true
                child.receiveShadow = true
            }
        })
        
        this.scene.add(this.model)
        
        // Setup animation mixer
        if(ballResource.animations && ballResource.animations.length > 0)
        {
            this.mixer = new THREE.AnimationMixer(this.model)
            
            // Store all animations by name
            ballResource.animations.forEach((clip) => {
                this.animations[clip.name] = this.mixer.clipAction(clip)
                console.log(`Ball animation loaded: ${clip.name}`)
            })
            
            // Log available animations
            console.log('Available ball animations:', Object.keys(this.animations))
        }
        else
        {
            console.warn('No animations found in ball2 model')
        }
    }

    playAnimation(name, options = {})
    {
        const action = this.animations[name]
        
        if(!action)
        {
            console.warn(`Animation "${name}" not found`)
            return
        }
        
        // Stop current animation if playing
        if(this.currentAction && this.currentAction !== action)
        {
            this.currentAction.fadeOut(0.3)
        }
        
        // Configure action
        action.reset()
        action.setLoop(this.debugControls.loop ? THREE.LoopRepeat : THREE.LoopOnce)
        action.clampWhenFinished = !this.debugControls.loop
        action.timeScale = this.debugControls.timeScale
        
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

    setupDebug()
    {
        this.debugFolder = this.debug.ui.addFolder('Ball Animation')
        this.debugFolder.open()
        
        // Animation controls
        const animationNames = Object.keys(this.animations)
        
        if(animationNames.length > 0)
        {
            // Dropdown to select animation (default to BallToWings if available)
            this.debugControls.selectedAnimation = animationNames.includes('BallToWings') 
                ? 'BallToWings' 
                : animationNames[0]
            
            this.debugFolder
                .add(this.debugControls, 'selectedAnimation', animationNames)
                .name('Animation')
            
            // Play button
            this.debugFolder
                .add({ play: () => this.playAnimation(this.debugControls.selectedAnimation) }, 'play')
                .name('▶ Play')
            
            // Stop button
            this.debugFolder
                .add({ stop: () => this.stopAnimation() }, 'stop')
                .name('⏹ Stop')
            
            // Time scale
            this.debugFolder
                .add(this.debugControls, 'timeScale')
                .min(0.1)
                .max(3)
                .step(0.1)
                .name('Speed')
                .onChange((value) => {
                    if(this.currentAction)
                    {
                        this.currentAction.timeScale = value
                    }
                })
            
            // Loop toggle
            this.debugFolder
                .add(this.debugControls, 'loop')
                .name('Loop')
                .onChange((value) => {
                    if(this.currentAction)
                    {
                        this.currentAction.setLoop(value ? THREE.LoopRepeat : THREE.LoopOnce)
                        this.currentAction.clampWhenFinished = !value
                    }
                })
            
            // Position controls
            const positionFolder = this.debugFolder.addFolder('Position')
            positionFolder.close()
            
            if(this.model)
            {
                positionFolder.add(this.model.position, 'x').min(-100).max(100).step(0.5).name('X')
                positionFolder.add(this.model.position, 'y').min(-50).max(50).step(0.5).name('Y')
                positionFolder.add(this.model.position, 'z').min(-100).max(100).step(0.5).name('Z')
            }
            
            // Copy button
            this.debug.addCopyButton(this.debugFolder, 'ball', () => ({
                timeScale: this.debugControls.timeScale,
                loop: this.debugControls.loop,
                position: this.model ? { x: this.model.position.x, y: this.model.position.y, z: this.model.position.z } : null
            }))
        }
        else
        {
            console.warn('No animations available for debug controls')
        }
    }

    update()
    {
        if(this.mixer)
        {
            // Delta time in seconds
            this.mixer.update(this.time.delta * 0.001)
        }
    }
}

import * as THREE from 'three'
import Experience from './Experience.js'

export default class Renderer
{
    constructor()
    {
        this.experience = new Experience()
        this.canvas = this.experience.canvas
        this.sizes = this.experience.sizes
        this.scene = this.experience.scene
        this.camera = this.experience.camera
        
        // Underwater effect properties
        this.seaLevel = -230
        this.isUnderwater = false
        this.normalClearColor = '#ffffff'
        this.underwaterColor = '#0a4d5c'
        this.underwaterFogColor = new THREE.Color('#0a5566')
        this.underwaterFogNear = 1
        this.underwaterFogFar = 500
        
        // Store original fog settings
        this.originalFog = null
        this.originalBackground = null

        this.setInstance()
        this.createUnderwaterOverlay()
    }

    setInstance()
    {
        this.instance = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        })
        this.instance.toneMapping = THREE.CineonToneMapping
        this.instance.toneMappingExposure = 1.75
        this.instance.shadowMap.enabled = true
        this.instance.shadowMap.type = THREE.PCFSoftShadowMap
        this.instance.setClearColor('#ffffff')
        this.instance.setSize(this.sizes.width, this.sizes.height)
        this.instance.setPixelRatio(this.sizes.pixelRatio)
    }

    resize()
    {
        this.instance.setSize(this.sizes.width, this.sizes.height)
        this.instance.setPixelRatio(this.sizes.pixelRatio)
    }
    
    createUnderwaterOverlay()
    {
        // Create a subtle blue overlay that covers the screen when underwater
        const overlayGeometry = new THREE.PlaneGeometry(2, 2)
        const overlayMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color('#0a4d5c'),
            transparent: true,
            opacity: 0,
            depthTest: false,
            depthWrite: false
        })
        this.underwaterOverlay = new THREE.Mesh(overlayGeometry, overlayMaterial)
        this.underwaterOverlay.frustumCulled = false
        this.underwaterOverlay.renderOrder = 999
        
        // Add to camera so it moves with it
        this.underwaterOverlay.position.z = -0.5
        this.camera.instance.add(this.underwaterOverlay)
    }

    update()
    {
        // Check if camera is underwater
        const cameraY = this.camera.instance.position.y
        const shouldBeUnderwater = cameraY < this.seaLevel
        
        // Toggle underwater effect
        if(shouldBeUnderwater && !this.isUnderwater)
        {
            // Entering water
            this.isUnderwater = true
            
            // Store original settings
            this.originalFog = this.scene.fog
            this.originalBackground = this.scene.background
            
            // Apply underwater fog
            this.scene.fog = new THREE.Fog(this.underwaterFogColor, this.underwaterFogNear, this.underwaterFogFar)
            this.scene.background = this.underwaterFogColor
            this.instance.setClearColor(this.underwaterColor)
            
            // Show overlay
            if(this.underwaterOverlay)
            {
                this.underwaterOverlay.material.opacity = 0.3
            }
            
            console.log('Underwater effect: ON')
        }
        else if(!shouldBeUnderwater && this.isUnderwater)
        {
            // Exiting water
            this.isUnderwater = false
            
            // Restore original settings
            this.scene.fog = this.originalFog
            this.scene.background = this.originalBackground
            this.instance.setClearColor(this.normalClearColor)
            
            // Hide overlay
            if(this.underwaterOverlay)
            {
                this.underwaterOverlay.material.opacity = 0
            }
            
            console.log('Underwater effect: OFF')
        }
        
        this.instance.render(this.scene, this.camera.instance)
        
        // Render velocity graph overlay (if player exists)
        if(this.experience.world && this.experience.world.player) {
            this.experience.world.player.renderGraph()
        }
    }
}
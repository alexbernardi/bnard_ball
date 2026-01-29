import * as THREE from 'three'
import Experience from '../Experience.js'

export default class Environment
{
    constructor()
    {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.debug = this.experience.debug
        
        // Debug
        if(this.debug.active)
        {
            this.debugFolder = this.debug.ui.addFolder('environment')
            this.debugFolder.close()
        }

        this.setSunLight()
        this.setEnvironmentMap()
        this.setFog()
        // this.setSkybox() // Disabled - now using EXR environment map as background
    }

    setFog()
    {
        // White fog to hide ocean edges
        this.scene.fog = new THREE.Fog('#ffffff', 0, 4000)
        
        // Debug
        if(this.debug.active)
        {
            this.debugFolder
                .addColor({color: '#ffffff'}, 'color')
                .name('fogColor')
                .onChange((value) => {
                    this.scene.fog.color.set(value)
                })
            
            this.debugFolder
                .add(this.scene.fog, 'near')
                .min(0)
                .max(1000)
                .step(1)
                .name('fogNear')
            
            this.debugFolder
                .add(this.scene.fog, 'far')
                .min(0)
                .max(2000)
                .step(1)
                .name('fogFar')
        }
    }

    setSkybox()
    {
        // Create a simple gradient sky background
        const canvas = document.createElement('canvas')
        canvas.width = 2048
        canvas.height = 2048
        const context = canvas.getContext('2d')
        
        // Create gradient from light blue at top to white at horizon
        const gradient = context.createLinearGradient(0, 0, 0, canvas.height)
        gradient.addColorStop(0, '#87CEEB') // Sky blue at top
        gradient.addColorStop(0.7, '#B0D8F0') // Lighter blue
        gradient.addColorStop(1, '#FFFFFF') // White at horizon
        
        context.fillStyle = gradient
        context.fillRect(0, 0, canvas.width, canvas.height)
        
        const texture = new THREE.CanvasTexture(canvas)
        this.scene.background = texture
    }

    setSunLight()
    {
        this.sunLight = new THREE.DirectionalLight('#ffffff', 8.154)
        this.sunLight.castShadow = true
        this.sunLight.shadow.camera.far = 15
        this.sunLight.shadow.mapSize.set(1024, 1024)
        this.sunLight.shadow.normalBias = 0.05
        this.sunLight.position.set(3.5, 2, - 1.25)
        this.scene.add(this.sunLight)

        // Debug
        if(this.debug.active)
        {
            this.debugFolder
                .add(this.sunLight, 'intensity')
                .name('sunLightIntensity')
                .min(0)
                .max(10)
                .step(0.001)
            
            this.debugFolder
                .add(this.sunLight.position, 'x')
                .name('sunLightX')
                .min(- 5)
                .max(5)
                .step(0.001)
            
            this.debugFolder
                .add(this.sunLight.position, 'y')
                .name('sunLightY')
                .min(- 5)
                .max(5)
                .step(0.001)
            
            this.debugFolder
                .add(this.sunLight.position, 'z')
                .name('sunLightZ')
                .min(- 5)
                .max(5)
                .step(0.001)
        }
    }

    setEnvironmentMap()
    {
        this.environmentMap = {}
        this.environmentMap.intensity = 0.4
        this.environmentMap.texture = this.resources.items.environmentMapTexture
        this.environmentMap.texture.mapping = THREE.EquirectangularReflectionMapping
        this.environmentMap.texture.colorSpace = THREE.SRGBColorSpace
        
        this.environmentMap.showBackground = true
        this.environmentMap.backgroundBlurriness = 0.07
        this.environmentMap.backgroundIntensity = 2
        this.environmentMap.rotationX = 0
        this.environmentMap.rotationY = 0
        this.environmentMap.rotationZ = 0
        
        this.scene.environment = this.environmentMap.texture
        this.scene.background = this.environmentMap.texture
        this.scene.backgroundBlurriness = this.environmentMap.backgroundBlurriness
        this.scene.backgroundIntensity = this.environmentMap.backgroundIntensity
        this.scene.environmentRotation = new THREE.Euler(0, 0, 0)
        this.scene.backgroundRotation = new THREE.Euler(0, 0, 0)

        this.environmentMap.updateMaterials = () =>
        {
            this.scene.traverse((child) =>
            {
                if(child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial)
                {
                    child.material.envMap = this.environmentMap.texture
                    child.material.envMapIntensity = this.environmentMap.intensity
                    child.material.needsUpdate = true
                }
            })
        }
        this.environmentMap.updateMaterials()

        // Debug
        if(this.debug.active)
        {
            this.debugFolder
                .add(this.environmentMap, 'intensity')
                .name('envMapIntensity')
                .min(0)
                .max(4)
                .step(0.001)
                .onChange(this.environmentMap.updateMaterials)
            
            this.debugFolder
                .add(this.environmentMap, 'showBackground')
                .name('showBackground')
                .onChange((value) => {
                    this.scene.background = value ? this.environmentMap.texture : null
                })
            
            this.debugFolder
                .add(this.environmentMap, 'backgroundBlurriness')
                .name('backgroundBlur')
                .min(0)
                .max(1)
                .step(0.001)
                .onChange((value) => {
                    this.scene.backgroundBlurriness = value
                })
            
            this.debugFolder
                .add(this.environmentMap, 'backgroundIntensity')
                .name('backgroundIntensity')
                .min(0)
                .max(2)
                .step(0.001)
                .onChange((value) => {
                    this.scene.backgroundIntensity = value
                })
            
            this.debugFolder
                .add(this.environmentMap, 'rotationX')
                .name('envRotationX')
                .min(-Math.PI)
                .max(Math.PI)
                .step(0.001)
                .onChange((value) => {
                    this.scene.environmentRotation.x = value
                    this.scene.backgroundRotation.x = value
                })
            
            this.debugFolder
                .add(this.environmentMap, 'rotationY')
                .name('envRotationY')
                .min(-Math.PI)
                .max(Math.PI)
                .step(0.001)
                .onChange((value) => {
                    this.scene.environmentRotation.y = value
                    this.scene.backgroundRotation.y = value
                })
            
            this.debugFolder
                .add(this.environmentMap, 'rotationZ')
                .name('envRotationZ')
                .min(-Math.PI)
                .max(Math.PI)
                .step(0.001)
                .onChange((value) => {
                    this.scene.environmentRotation.z = value
                    this.scene.backgroundRotation.z = value
                })
            
            this.debugFolder
                .add(this.environmentMap, 'rotationX')
                .name('envRotationX (horizon)')
                .min(-Math.PI / 4)
                .max(Math.PI / 4)
                .step(0.001)
                .onChange((value) => {
                    this.scene.environmentRotation.x = value
                    this.scene.backgroundRotation.x = value
                })
            
            // Copy button
            this.debug.addCopyButton(this.debugFolder, 'environment', () => ({
                fogColor: this.scene.fog ? '#' + this.scene.fog.color.getHexString() : null,
                fogNear: this.scene.fog ? this.scene.fog.near : null,
                fogFar: this.scene.fog ? this.scene.fog.far : null,
                sunLightIntensity: this.sunLight.intensity,
                sunLightPosition: { x: this.sunLight.position.x, y: this.sunLight.position.y, z: this.sunLight.position.z },
                envMapIntensity: this.environmentMap.intensity,
                showBackground: this.environmentMap.showBackground,
                backgroundBlurriness: this.environmentMap.backgroundBlurriness,
                backgroundIntensity: this.environmentMap.backgroundIntensity,
                envRotation: { x: this.environmentMap.rotationX, y: this.environmentMap.rotationY, z: this.environmentMap.rotationZ }
            }))
        }
    }
}
import * as THREE from 'three'

import Debug from './Utils/Debug.js'
import Sizes from './Utils/Sizes.js'
import Time from './Utils/Time.js'
import Physics from './Utils/Physics.js'
import Camera from './Camera/Camera.js'
import Renderer from './Renderer.js'
import World from './World/World.js'
import Resources from './Utils/Resources.js'

import sources from './sources.js'

let instance = null

export default class Experience
{
    constructor(_canvas)
    {
        // Singleton
        if(instance)
        {
            return instance
        }
        instance = this
        
        // Global access
        window.experience = this

        // Options
        this.canvas = _canvas

        // Setup
        this.debug = new Debug()
        this.sizes = new Sizes()
        this.time = new Time()
        this.physics = new Physics()
        this.scene = new THREE.Scene()
        this.resources = new Resources(sources)
        this.camera = new Camera()
        this.renderer = new Renderer()
        this.world = new World()
        
        // Add axis helper
        this.setupAxisHelper()

        // Resize event
        this.sizes.on('resize', () =>
        {
            this.resize()
        })

        // Time tick event
        this.time.on('tick', () =>
        {
            this.update()
        })
    }

    setupAxisHelper()
    {
        // Add axes helper (Red = X, Green = Y, Blue = Z)
        const axesHelper = new THREE.AxesHelper(5)
        this.scene.add(axesHelper)

        // Create text labels for each axis
        const createTextSprite = (text, color) => {
            const canvas = document.createElement('canvas')
            const context = canvas.getContext('2d')
            canvas.width = 256
            canvas.height = 256
            
            context.font = 'Bold 120px Arial'
            context.fillStyle = color
            context.textAlign = 'center'
            context.textBaseline = 'middle'
            context.fillText(text, 128, 128)
            
            const texture = new THREE.CanvasTexture(canvas)
            const spriteMaterial = new THREE.SpriteMaterial({ map: texture })
            const sprite = new THREE.Sprite(spriteMaterial)
            sprite.scale.set(2, 2, 1)
            
            return sprite
        }

        // Add labels at the end of each axis
        const xLabel = createTextSprite('X', '#ff0000')
        xLabel.position.set(6, 0, 0)
        this.scene.add(xLabel)

        const yLabel = createTextSprite('Y', '#00ff00')
        yLabel.position.set(0, 6, 0)
        this.scene.add(yLabel)

        const zLabel = createTextSprite('Z', '#0000ff')
        zLabel.position.set(0, 0, 6)
        this.scene.add(zLabel)
    }

    resize()
    {
        this.camera.resize()
        this.renderer.resize()
    }

    update()
    {
        this.physics.update()
        this.camera.update()
        this.world.update()
        this.renderer.update()
    }

    destroy()
    {
        this.sizes.off('resize')
        this.time.off('tick')

        // Traverse the whole scene
        this.scene.traverse((child) =>
        {
            // Test if it's a mesh
            if(child instanceof THREE.Mesh)
            {
                child.geometry.dispose()

                // Loop through the material properties
                for(const key in child.material)
                {
                    const value = child.material[key]

                    // Test if there is a dispose function
                    if(value && typeof value.dispose === 'function')
                    {
                        value.dispose()
                    }
                }
            }
        })

        this.camera.controls.dispose()
        this.renderer.instance.dispose()

        if(this.debug.active)
            this.debug.ui.destroy()
    }
}
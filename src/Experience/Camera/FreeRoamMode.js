import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * FreeRoamMode - Free camera control mode
 * Allows orbit controls for debugging and exploration
 */
export default class FreeRoamMode
{
    constructor(camera)
    {
        this.camera = camera
        this.vars = camera.vars
        this.canvas = camera.canvas
        this.controls = null
        
        this.setupKeyboardControls()
    }

    setupKeyboardControls()
    {
        window.addEventListener('keydown', (event) => {
            if(event.key === 'r' || event.key === 'R')
            {
                this.toggle()
            }
        })
    }

    toggle()
    {
        this.vars.isFreeRoam = !this.vars.isFreeRoam
        
        if(this.vars.isFreeRoam)
        {
            this.enter()
        }
        else
        {
            this.exit()
        }
    }

    enter()
    {
        // Entering free roam mode
        this.vars.savedMode = this.vars.mode
        this.vars.savedPosition.copy(this.camera.instance.position)
        
        // Calculate current look-at point
        const forward = new THREE.Vector3()
        this.camera.instance.getWorldDirection(forward)
        this.vars.savedLookAt.copy(this.camera.instance.position).add(forward.multiplyScalar(10))
        
        // Create orbit controls if they don't exist
        if(!this.controls)
        {
            this.controls = new OrbitControls(this.camera.instance, this.canvas)
            this.controls.enableDamping = true
            this.controls.dampingFactor = 0.05
            this.controls.rotateSpeed = 0.5
            this.controls.panSpeed = 0.8
            this.controls.zoomSpeed = 1.2
            // Middle mouse button for panning (like Blender)
            this.controls.mouseButtons = {
                LEFT: THREE.MOUSE.ROTATE,
                MIDDLE: THREE.MOUSE.PAN,
                RIGHT: THREE.MOUSE.PAN
            }
        }
        
        // Set default free roam position and rotation
        this.camera.instance.position.set(44, 21, -70)
        this.camera.instance.quaternion.set(-0.035, 0.951, 0.117, 0.284)
        
        // Calculate the target based on the camera's direction
        const lookDirection = new THREE.Vector3(0, 0, -1)
        lookDirection.applyQuaternion(this.camera.instance.quaternion)
        const targetDistance = 100 // Distance to orbit target
        this.controls.target.copy(this.camera.instance.position).add(lookDirection.multiplyScalar(targetDistance))
        
        this.controls.enabled = true
        this.controls.update()
        
        // Store controls reference on camera for dev mode
        this.camera.controls = this.controls
        
        console.log('Free Roam Camera: ON (Press R to return)')
    }

    exit()
    {
        // Exiting free roam mode
        if(this.controls)
        {
            this.controls.enabled = false
        }
        
        // Restore previous mode
        this.vars.mode = this.vars.savedMode
        this.vars.currentPosition.copy(this.vars.savedPosition)
        
        console.log('Free Roam Camera: OFF')
    }

    update()
    {
        if(this.controls && this.controls.enabled)
        {
            this.controls.update()
        }
    }

    // For dev mode initialization
    initDevModeControls()
    {
        if(!this.controls)
        {
            this.controls = new OrbitControls(this.camera.instance, this.canvas)
            this.controls.enableDamping = true
            this.controls.dampingFactor = 0.05
        }
        this.controls.enabled = true
        this.camera.controls = this.controls
        return this.controls
    }
}

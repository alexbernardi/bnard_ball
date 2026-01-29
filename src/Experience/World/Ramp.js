
import * as THREE from 'three'
import Experience from '../Experience.js'

export default class Ramp {
    constructor() {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.physics = this.experience.physics
        this.resources = this.experience.resources
        this.debug = this.experience.debug
        
        // Validate required dependencies
        if(!this.scene) throw new Error('Ramp: scene is required')
        if(!this.physics) throw new Error('Ramp: physics is required')
        
        // Collision properties
        this.friction = 1
        this.restitution = 0
        this.collisionVisible = true
        
        this.colliderData = null
        this.colliders = []
        this.helpers = []
        
        // Wait for resources to load, then create ramp
        if(this.resources.items.rampColliders) {
            this.colliderData = this.resources.items.rampColliders
            this.createRamp()
            this.setDebug()
        } else {
            this.resources.on('ready', () => {
                this.colliderData = this.resources.items.rampColliders
                this.createRamp()
                this.setDebug()
            })
        }
    }

    createRamp() {
        const RAPIER = this.physics.getRAPIDER()
        
        // Create single fixed rigid body for all colliders
        const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed()
        this.rigidBody = this.physics.createRigidBody(rigidBodyDesc)
        
        // Create a collider for each entry in colliderData
        for(const [name, data] of Object.entries(this.colliderData)) {
            // Create cuboid collider descriptor with half-extents
            const colliderDesc = RAPIER.ColliderDesc.cuboid(
                data.h[0],  // half-width
                data.h[1],  // half-height
                data.h[2]   // half-depth
            )
                .setFriction(this.friction)
                .setRestitution(this.restitution)
                .setTranslation(data.p[0], data.p[1], data.p[2])
                .setRotation({ x: data.q[0], y: data.q[1], z: data.q[2], w: data.q[3] })
            
            // Create and attach collider to rigid body
            const collider = this.physics.createCollider(colliderDesc, this.rigidBody)
            this.colliders.push(collider)
            
            // Create visual helper (wireframe box)
            const helperGeometry = new THREE.BoxGeometry(
                data.h[0] * 2,  // full width
                data.h[1] * 2,  // full height
                data.h[2] * 2   // full depth
            )
            const helperMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ff00,
                wireframe: true,
                transparent: true,
                opacity: 0.6
            })
            const helper = new THREE.Mesh(helperGeometry, helperMaterial)
            
            // Apply position and rotation to helper
            helper.position.set(data.p[0], data.p[1], data.p[2])
            const quaternion = new THREE.Quaternion(data.q[0], data.q[1], data.q[2], data.q[3])
            helper.quaternion.copy(quaternion)
            helper.visible = this.collisionVisible
            
            this.helpers.push(helper)
            this.scene.add(helper)
            
        }
    }

    setDebug() {
        if(this.debug.active) {
            const rampFolder = this.debug.ui.addFolder('ramp')
            rampFolder.close()
            
            rampFolder
                .add(this, 'friction')
                .min(0)
                .max(2)
                .step(0.01)
                .name('friction')
                .onChange((value) => {
                    this.colliders.forEach(collider => {
                        collider.setFriction(value)
                    })
                })
            
            rampFolder
                .add(this, 'restitution')
                .min(0)
                .max(1)
                .step(0.01)
                .name('restitution (bounce)')
                .onChange((value) => {
                    this.colliders.forEach(collider => {
                        collider.setRestitution(value)
                    })
                })
            
            rampFolder
                .add(this, 'collisionVisible')
                .name('show collision boxes')
                .onChange((value) => {
                    this.helpers.forEach(helper => {
                        helper.visible = value
                    })
                })
            
            // Copy button
            this.debug.addCopyButton(rampFolder, 'ramp', () => ({
                friction: this.friction,
                restitution: this.restitution,
                collisionVisible: this.collisionVisible
            }))
        }
    }
}


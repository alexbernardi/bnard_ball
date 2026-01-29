import * as THREE from 'three'
import Experience from '../Experience.js'

export default class GeoNodes {
    constructor() {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.physics = this.experience.physics
        this.resources = this.experience.resources
        this.debug = this.experience.debug
        
        // Validate required dependencies
        if(!this.scene) throw new Error('GeoNodes: scene is required')
        if(!this.physics) throw new Error('GeoNodes: physics is required')
        
        // Collision properties
        this.friction = 0.8
        this.restitution = 0
        this.collisionVisible = true
        
        this.colliderData = null
        this.colliders = []
        this.meshes = []
        this.rigidBody = null
        
        // Wait for resources to load, then create geo nodes colliders
        if(this.resources.items.testGeoNodeColliders) {
            this.colliderData = this.resources.items.testGeoNodeColliders
            this.createGeoNodes()
            this.setDebug()
        } else {
            this.resources.on('ready', () => {
                this.colliderData = this.resources.items.testGeoNodeColliders
                this.createGeoNodes()
                this.setDebug()
            })
        }
    }

    createGeoNodes() {
        const RAPIER = this.physics.getRAPIDER()
        
        // Create single fixed rigid body for all colliders
        const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed()
        this.rigidBody = this.physics.createRigidBody(rigidBodyDesc)
        
        // Validate data structure
        if(!this.colliderData.items || !Array.isArray(this.colliderData.items)) {
            return
        }
        
        // Create a collider and mesh for each item
        let validCount = 0
        this.colliderData.items.forEach((item, index) => {
            // Validate item structure
            if(!item.position || item.position.length !== 3 || 
               !item.scale || item.scale.length !== 3 ||
               !item.quat || item.quat.length !== 4) {
                return
            }
            
            const [x, y, z] = item.position
            const [sx, sy, sz] = item.scale
            const [qx, qy] = item.quat  // Only take first two values
            
            // Blender to Three.js coordinate conversion: swap Y and Z
            const posX = x
            const posY = z  // Blender Z becomes Three.js Y
            const posZ = y  // Blender Y becomes Three.js Z
            
            // Convert quaternion from Blender (Z-up) to Three.js (Y-up)
            const quatX = 0
            const quatY = qy
            const quatZ = qx  // Set to 0
            const quatW = 0  // Set to 0
            
            // Convert full scale to half-extents for Rapier cuboid (scale values are already half-extents from Blender)
            const hx = sx
            const hy = sz  // Swap scale as well
            const hz = sy
            
            // Create cuboid collider descriptor with half-extents
            const colliderDesc = RAPIER.ColliderDesc.cuboid(hx, hy, hz)
                .setFriction(this.friction)
                .setRestitution(this.restitution)
                .setTranslation(posX, posY, posZ)
                .setRotation({ x: quatX, y: quatY, z: quatZ, w: quatW })
            
            // Create and attach collider to rigid body
            const collider = this.physics.createCollider(colliderDesc, this.rigidBody)
            this.colliders.push(collider)
            
            // Create visual mesh with individual geometry for each box (double the scale for full size)
            const geometry = new THREE.BoxGeometry(sx * 2, sz * 2, sy * 2)
            const material = new THREE.MeshStandardMaterial({
                color: 0x44aa88,
                wireframe: false,
                metalness: 0.3,
                roughness: 0.7,
                side: THREE.DoubleSide
            })
            
            const mesh = new THREE.Mesh(geometry, material)
            mesh.position.set(posX, posY, posZ)
            mesh.quaternion.set(quatX, quatY, quatZ, quatW)
            mesh.visible = this.collisionVisible
            mesh.castShadow = true
            mesh.receiveShadow = true
            
            this.meshes.push(mesh)
            this.scene.add(mesh)
            
            validCount++
        })
        
    }

    setDebug() {
        if(this.debug.active) {
            const geoNodesFolder = this.debug.ui.addFolder('GeoNodes')
            geoNodesFolder.close()
            
            geoNodesFolder
                .add(this, 'friction')
                .min(0)
                .max(2)
                .step(0.1)
                .name('Friction')
                .onChange(() => this.updateColliderProperties())
            
            geoNodesFolder
                .add(this, 'restitution')
                .min(0)
                .max(1)
                .step(0.1)
                .name('Restitution')
                .onChange(() => this.updateColliderProperties())
            
            geoNodesFolder
                .add(this, 'collisionVisible')
                .name('Show Colliders')
                .onChange(() => {
                    this.meshes.forEach(mesh => {
                        mesh.visible = this.collisionVisible
                    })
                })
            
            // Copy button
            this.debug.addCopyButton(geoNodesFolder, 'geoNodes', () => ({
                friction: this.friction,
                restitution: this.restitution,
                collisionVisible: this.collisionVisible
            }))
        }
    }

    updateColliderProperties() {
        // Update physics properties on all colliders
        this.colliders.forEach(collider => {
            collider.setFriction(this.friction)
            collider.setRestitution(this.restitution)
        })
    }

    update() {
        // Static colliders don't need updates
    }
}

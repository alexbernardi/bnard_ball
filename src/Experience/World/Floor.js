import * as THREE from 'three'
import Experience from '../Experience.js'

export default class Floor
{
    constructor()
    {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.physics = this.experience.physics

        // Properties
        this.size = 50
        this.body = null

        this.setGeometry()
        this.setTextures()
        this.setMaterial()
        this.setMesh()
        this.setPhysics()
    }

    setGeometry()
    {
        this.geometry = new THREE.PlaneGeometry(this.size, this.size)
    }

    setTextures()
    {
        this.textures = {}

        this.textures.color = this.resources.items.grassColorTexture
        this.textures.color.colorSpace = THREE.SRGBColorSpace
        this.textures.color.repeat.set(10, 10)
        this.textures.color.wrapS = THREE.RepeatWrapping
        this.textures.color.wrapT = THREE.RepeatWrapping

        this.textures.normal = this.resources.items.grassNormalTexture
        this.textures.normal.repeat.set(10, 10)
        this.textures.normal.wrapS = THREE.RepeatWrapping
        this.textures.normal.wrapT = THREE.RepeatWrapping
    }

    setMaterial()
    {
        this.material = new THREE.MeshStandardMaterial({
            map: this.textures.color,
            normalMap: this.textures.normal
        })
    }

    setMesh()
    {
        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.mesh.rotation.x = - Math.PI * 0.5
        this.mesh.receiveShadow = true
        this.scene.add(this.mesh)
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
        console.log('Creating physics body for floor')
        const RAPIER = this.physics.getRAPIDER()

        const rigidBodyDesc = RAPIER.RigidBodyDesc.fixed()
            .setTranslation(0, -0.5, 0)
        this.body = this.physics.createRigidBody(rigidBodyDesc)

        const colliderDesc = RAPIER.ColliderDesc.cuboid(this.size / 2, 0.5, this.size / 2)
            .setFriction(1.0)
        this.physics.createCollider(colliderDesc, this.body)
        
        console.log('Floor physics body created')
    }
}
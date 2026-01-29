import * as THREE from 'three'

/**
 * PlayerPhysics - Physics body creation and management
 * Handles RAPIER physics body and collider setup
 */
export default class PlayerPhysics
{
    constructor(player)
    {
        this.player = player
        this.physics = player.physics
        this.vars = player.vars
    }

    setup()
    {
        if(this.physics.isReady)
        {
            this.createBody()
        }
        else
        {
            this.physics.on('ready', () => {
                this.createBody()
            })
        }
    }

    createBody()
    {
        const RAPIER = this.physics.getRAPIDER()

        // Spawn at origin
        const spawnX = 0
        const spawnY = this.vars.radius
        const spawnZ = 0
        
        // Create rigid body (dynamic)
        const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(spawnX, spawnY, spawnZ)
            .setLinearDamping(this.vars.linearDamping)
            .setAngularDamping(this.vars.angularDamping)
            .setCanSleep(false)
            .setCcdEnabled(true)
        
        this.vars.body = this.physics.createRigidBody(rigidBodyDesc)

        // Create collider
        const colliderDesc = RAPIER.ColliderDesc.ball(this.vars.radius)
            .setFriction(this.vars.friction)
            .setRestitution(this.vars.restitution)
            .setDensity(this.vars.density)
            .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
        
        this.vars.collider = this.physics.createCollider(colliderDesc, this.vars.body)
        
        // Apply initial impulse
        this.vars.body.applyImpulse({ x: 3.0, y: 0, z: 0 }, true)
        
        // Create collision visualization
        this.createCollisionMesh()
    }

    createCollisionMesh()
    {
        const collisionGeometry = new THREE.SphereGeometry(this.vars.radius, 16, 16)
        const collisionMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            wireframe: true,
            transparent: true,
            opacity: 0.7
        })
        this.player.collisionMesh = new THREE.Mesh(collisionGeometry, collisionMaterial)
        this.player.collisionMesh.visible = false // Hidden by default
        this.player.group.add(this.player.collisionMesh)
    }

    checkGrounded()
    {
        if(!this.vars.collider) return
        
        const world = this.physics.world
        this.vars.isGrounded = false
        
        world.contactPairsWith(this.vars.collider, (otherCollider) => {
            this.vars.isGrounded = true
        })
    }

    updateVisuals(position, rotation)
    {
        // Update group position
        this.player.group.position.set(position.x, position.y, position.z)

        // Update mesh rotation (only when not flying - FlightMode handles rotation during flight)
        if(this.player.mesh && !this.vars.isFlying)
        {
            this.player.mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w)
        }
        
        // Update collision mesh
        if(this.player.collisionMesh)
        {
            this.player.collisionMesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w)
        }
    }
}

import RAPIER from '@dimforge/rapier3d'
import EventEmitter from './EventEmitter.js'

export default class Physics extends EventEmitter
{
    constructor()
    {
        super()

        this.RAPIER = null
        this.world = null
        this.isReady = false
        
        this.init()
    }

    async init()
    {
        // Import and initialize Rapier
        this.RAPIER = await import('@dimforge/rapier3d')
        
        // Create physics world with gravity
        const gravity = { x: 0.0, y: -9.81, z: 0.0 }
        this.world = new this.RAPIER.World(gravity)
        
        this.isReady = true
        
        // Trigger ready event
        this.trigger('ready')
    }

    update()
    {
        if(this.world)
        {
            this.world.step()
        }
    }

    createRigidBody(rigidBodyDesc)
    {
        if(!this.world)
        {
            return null
        }
        
        return this.world.createRigidBody(rigidBodyDesc)
    }

    createCollider(colliderDesc, rigidBody)
    {
        if(!this.world)
        {
            return null
        }
        
        return this.world.createCollider(colliderDesc, rigidBody)
    }

    removeRigidBody(rigidBody)
    {
        if(this.world && rigidBody)
        {
            this.world.removeRigidBody(rigidBody)
        }
    }

    getRAPIDER()
    {
        return this.RAPIER
    }
}

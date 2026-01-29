import Experience from '../Experience.js'
import Environment from './Environment.js'
import Ocean from './Ocean.js'
import TestFloor from './TestFloor.js'
import Player from './Player/Player.js'
import Ramp from './Ramp.js'
import RampL from './RampL.js'

export default class World
{
    constructor()
    {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.resources = this.experience.resources

        // Setup ocean (no resources needed)
        this.ocean = new Ocean()

        // Wait for resources
        this.resources.on('ready', () =>
        {
            // Setup
            // this.testFloor = new TestFloor()
            this.ramp = new Ramp()
            this.rampL = new RampL()
            this.player = new Player()
            this.environment = new Environment()
        })
    }

    update()
    {
        if(this.player)
            this.player.update()
        
        if(this.ocean)
            this.ocean.update()
        
        if(this.rampL)
            this.rampL.update()
    }
}
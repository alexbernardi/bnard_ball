/**
 * PlayerInput - Input handling for the player
 * Manages keyboard events and input state
 */
export default class PlayerInput
{
    constructor(player)
    {
        this.player = player
        this.vars = player.vars
        this.flightMode = player.flightMode
        
        this.setupListeners()
    }

    setupListeners()
    {
        window.addEventListener('keydown', (event) => {
            if(event.key === 'w' || event.key === 'W')
                this.vars.keys.w = true
            if(event.key === 's' || event.key === 'S')
                this.vars.keys.s = true
            if(event.key === 'a' || event.key === 'A')
                this.vars.keys.a = true
            if(event.key === 'd' || event.key === 'D')
                this.vars.keys.d = true
            if(event.key === ' ')
            {
                this.vars.keys.space = true
                this.flightMode.activate()
            }
        })

        window.addEventListener('keyup', (event) => {
            if(event.key === 'w' || event.key === 'W')
                this.vars.keys.w = false
            if(event.key === 's' || event.key === 'S')
                this.vars.keys.s = false
            if(event.key === 'a' || event.key === 'A')
                this.vars.keys.a = false
            if(event.key === 'd' || event.key === 'D')
                this.vars.keys.d = false
            if(event.key === ' ')
                this.vars.keys.space = false
        })
    }
}

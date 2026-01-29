/**
 * PlayerDebug - Debug UI controls for the player
 * Handles all lil-gui debug folder setup
 */
export default class PlayerDebug
{
    constructor(player)
    {
        this.player = player
        this.debug = player.experience.debug
        this.vars = player.vars
        
        if(this.debug.active)
        {
            this.setupDebugUI()
        }
    }

    setupDebugUI()
    {
        this.debugFolder = this.debug.ui.addFolder('player')
        this.debugFolder.open()
        
        // Physics controls
        this.debugFolder
            .add(this.vars, 'torqueStrength')
            .min(0)
            .max(20)
            .step(0.1)
            .name('torqueStrength')
        
        this.debugFolder
            .add(this.vars, 'friction')
            .min(0)
            .max(2)
            .step(0.01)
            .name('friction')
            .onChange((value) => {
                if(this.vars.collider) this.vars.collider.setFriction(value)
            })
        
        this.debugFolder
            .add(this.vars, 'restitution')
            .min(0)
            .max(1)
            .step(0.01)
            .name('restitution (bounce)')
            .onChange((value) => {
                if(this.vars.collider) this.vars.collider.setRestitution(value)
            })
        
        this.debugFolder
            .add(this.vars, 'linearDamping')
            .min(0)
            .max(5)
            .step(0.1)
            .name('linearDamping')
            .onChange((value) => {
                if(this.vars.body) this.vars.body.setLinearDamping(value)
            })
        
        this.debugFolder
            .add(this.vars, 'angularDamping')
            .min(0)
            .max(5)
            .step(0.1)
            .name('angularDamping')
            .onChange((value) => {
                if(this.vars.body) this.vars.body.setAngularDamping(value)
            })
        
        // Orientation debug controls
        this.debugFolder
            .add(this.vars, 'velocityThreshold')
            .min(0)
            .max(2)
            .step(0.01)
            .name('velocityThreshold')
        
        this.debugFolder
            .add(this.vars, 'orientationSmoothing')
            .min(0.01)
            .max(1)
            .step(0.01)
            .name('orientationSmoothing')
        
        this.debugFolder
            .add(this.vars, 'airControlStrength')
            .min(0)
            .max(2)
            .step(0.05)
            .name('airControlStrength')
        
        // Flight physics debug controls
        this.setupFlightDebug()
        
        // Ball animation debug controls
        this.setupAnimationDebug()
    }

    setupAnimationDebug()
    {
        const animFolder = this.debugFolder.addFolder('Ball Animation')
        
        const visuals = this.player.visuals
        const animationNames = Object.keys(visuals.animations)
        
        if(animationNames.length > 0)
        {
            // Animation controls state
            this.animControls = {
                selectedAnimation: animationNames.includes('BallToWings') ? 'BallToWings' : animationNames[0],
                timeScale: 1.0,
                loop: true
            }
            
            animFolder
                .add(this.animControls, 'selectedAnimation', animationNames)
                .name('Animation')
            
            animFolder
                .add({ play: () => visuals.playAnimation(this.animControls.selectedAnimation, {
                    loop: this.animControls.loop,
                    timeScale: this.animControls.timeScale
                }) }, 'play')
                .name('▶ Play')
            
            animFolder
                .add({ stop: () => visuals.stopAnimation() }, 'stop')
                .name('⏹ Stop')
            
            animFolder
                .add(this.animControls, 'timeScale')
                .min(0.1)
                .max(3)
                .step(0.1)
                .name('Speed')
                .onChange((value) => {
                    if(visuals.currentAction)
                    {
                        visuals.currentAction.timeScale = value
                    }
                })
            
            animFolder
                .add(this.animControls, 'loop')
                .name('Loop')
                .onChange((value) => {
                    if(visuals.currentAction)
                    {
                        visuals.currentAction.setLoop(value ? 2 : 0) // THREE.LoopRepeat = 2, THREE.LoopOnce = 0
                        visuals.currentAction.clampWhenFinished = !value
                    }
                })
        }
        else
        {
            console.warn('No ball animations available for debug controls')
        }
    }

    setupFlightDebug()
    {
        const flightFolder = this.debugFolder.addFolder('Flight Physics')
        
        flightFolder
            .add(this.vars, 'liftCoefficient')
            .min(0)
            .max(10)
            .step(0.1)
            .name('liftCoefficient')
        
        flightFolder
            .add(this.vars, 'flightLevelingSpeed')
            .min(0.01)
            .max(1)
            .step(0.01)
            .name('levelingSpeed')
        
        flightFolder
            .add(this.vars, 'flightTransitionDuration')
            .min(500)
            .max(10000)
            .step(100)
            .name('transitionDuration (ms)')
        
        flightFolder
            .add(this.vars, 'turbulenceAmplitude')
            .min(0)
            .max(5)
            .step(0.1)
            .name('turbulence amplitude')
        
        flightFolder
            .add(this.vars, 'turbulenceFrequency')
            .min(0.1)
            .max(10)
            .step(0.1)
            .name('turbulence frequency (Hz)')
        
        flightFolder
            .add(this.vars, 'flightGravity')
            .min(0)
            .max(10)
            .step(0.1)
            .name('post-stab gravity (m/s²)')
        
        flightFolder
            .add(this.vars, 'flightLift')
            .min(0)
            .max(0.5)
            .step(0.01)
            .name('post-stab lift coeff')
        
        flightFolder
            .add(this.vars, 'flightDrag')
            .min(0)
            .max(0.1)
            .step(0.001)
            .name('post-stab drag coeff')
        
        // Copy button for player values
        this.debug.addCopyButton(this.debugFolder, 'player', () => ({
            torqueStrength: this.vars.torqueStrength,
            friction: this.vars.friction,
            restitution: this.vars.restitution,
            linearDamping: this.vars.linearDamping,
            angularDamping: this.vars.angularDamping,
            velocityThreshold: this.vars.velocityThreshold,
            orientationSmoothing: this.vars.orientationSmoothing,
            airControlStrength: this.vars.airControlStrength,
            liftCoefficient: this.vars.liftCoefficient,
            flightLevelingSpeed: this.vars.flightLevelingSpeed,
            flightTransitionDuration: this.vars.flightTransitionDuration,
            turbulenceAmplitude: this.vars.turbulenceAmplitude,
            turbulenceFrequency: this.vars.turbulenceFrequency,
            flightGravity: this.vars.flightGravity,
            flightLift: this.vars.flightLift,
            flightDrag: this.vars.flightDrag
        }))
    }
}

# Three.js Project Organization Guide

## Project Overview
This is a Three.js standalone application using Vite as the build tool. It follows an object-oriented, class-based architecture with a singleton pattern for the main Experience class. The project features a high-speed physics-based ball rolling down a custom ramp track with dynamic camera systems, HUD display, and precise collision detection using the Rapier physics engine.

## Current Features (Jan 2026)
- **Physics Ball**: Lightweight (2.5 density) ball with controllable friction (1.0) and restitution (0.6)
- **Custom Ramp Track**: JSON-defined cuboid colliders (no trimesh edges to prevent bouncing on flat sections)
- **Dynamic Camera System**:
  - Default mode: Velocity-aligned following camera
  - Ramp mode: Activates at X > 10, animated height transition (2.5m → 1.0m over 3s), distance lerp (10m → 0.2m), velocity-based FOV (25° at 20 m/s → 100° at 120 m/s)
  - Flight mode: Activates when player hits space bar, wider angle (60° FOV), positioned 15m behind and 5m above ball
- **HUD Display**: Real-time velocity, FOV, and camera offset monitoring
- **Controls**: 
  - WASD for torque-based ball control (torque when grounded, impulses when airborne)
  - Space bar to toggle flight mode
- **Flight Physics**: Toggleable flight mode with visual indicator (green collision sphere) and separate camera mode

---

## Project Architecture Pattern

### Core Pattern: Singleton Experience + Dependency Access
- The main `Experience` class is a singleton that manages the entire application
- All other classes access the Experience singleton via `new Experience()` in their constructor
- Classes access shared resources through the Experience instance (scene, resources, debug, etc.)
- This creates a centralized state management system

---

## Directory Structure & Responsibilities

### `/src/` - Application Source
**Entry Point Flow:**
1. `index.html` - Defines canvas element `<canvas class="webgl">`
2. `script.js` - Instantiates Experience with canvas element
3. `style.css` - Global styles (full-screen canvas, no margins)

### `/src/Experience/` - Main Application Logic

#### Root Level Files (Core Systems)
- **`Experience.js`** - Main singleton controller
  - Instantiates all core systems (Debug, Sizes, Time, Physics, Scene, Resources, Camera, Renderer, World)
  - Manages resize and update loops
  - Handles cleanup/destruction
  - **Edit when:** Adding new global systems, modifying main update loop, changing initialization order

- **`Camera.js`** - Camera and controls with triple-mode system
  - Default mode: Velocity-aligned following camera
  - Ramp mode: Close tracking with dynamic FOV
  - Flight mode: Wide angle view for flight physics
  - Automatic mode switching based on ball X position and flight state
  - Smooth animations for height and distance transitions
  - **Edit when:** Changing camera behavior, FOV ranges, mode thresholds, or animation timings

- **`Renderer.js`** - WebGL renderer configuration
  - Configures tone mapping, shadows, clear color
  - **Edit when:** Changing visual rendering settings, post-processing, shadow quality

- **`sources.js`** - Asset definitions array
  - Defines all textures, models, and cube textures to load
  - **Edit when:** Adding/removing 3D models, textures, or other assets

#### `/src/Experience/Utils/` - Utility Classes
- **`Debug.js`** - lil-gui debug panel controller
  - Activated with `#debug` hash in URL
  - **Edit when:** Changing debug activation method

- **`EventEmitter.js`** - Custom event system
  - Base class for event-driven architecture
  - **Do NOT edit** - Core utility used by other classes

- **`Physics.js`** - Rapier physics engine wrapper (extends EventEmitter)
  - Initializes Rapier 3D physics world with gravity
  - Provides methods to create rigid bodies and colliders
  - Steps physics simulation each frame
  - Emits 'ready' event when physics world initialized
  - **Edit when:** Changing gravity, physics world settings, adding physics helper methods

- **`Resources.js`** - Asset loading manager (extends EventEmitter)
  - Manages GLTFLoader, TextureLoader, CubeTextureLoader
  - Emits 'ready' event when all assets loaded
  - **Edit when:** Adding new loader types, changing loading behavior

- **`Sizes.js`** - Viewport size manager (extends EventEmitter)
  - Tracks window dimensions and pixel ratio
  - Emits 'resize' event
  - **Edit when:** Changing responsive behavior

- **`Time.js`** - Animation loop manager (extends EventEmitter)
  - Provides delta time and elapsed time
  - Emits 'tick' event for animation frame
  - **Edit when:** Changing animation timing logic


#### `/src/Experience/World/` - World Entities

- **`Ramp.js`** - Main ramp surface (optimized, flat/edge-based)
  - Handles ramp geometry and collision (no curve/half-pipe/experimental code)
  - **Edit when:** Changing ramp shape, collision, or appearance
- **`Sphere.js`** - Player ball with physics
  - Spawns at start, applies impulse, handles input
  - **Edit when:** Changing ball physics, spawn, or controls
- **`World.js`** - Orchestrates all world objects
  - Instantiates Ramp, Environment, etc.
  - **Edit when:** Adding/removing world objects

#### `/src/Experience/World/` - World Entities

- **`World.js`** - Orchestrates all world objects
  - Instantiates Environment, Ramp, Sphere
  - Manages object lifecycle and updates
  - **Edit when:** Adding/removing world objects or changing update order

- **`Environment.js`** - Scene lighting and environment
  - DirectionalLight with shadows
  - Environment map from cube texture
  - **Edit when:** Changing lighting, shadows, or environment

- **`Ramp.js`** - Main ramp track with JSON-defined colliders
  - Creates cuboid colliders from JSON data structure (no GLTF loading)
  - Single fixed rigid body with multiple colliders attached
  - Collider format: `"name": { "p": [x,y,z], "q": [x,y,z,w], "h": [hx,hy,hz] }`
    - `p`: position in meters
    - `q`: quaternion rotation [x, y, z, w]
    - `h`: half-extents (full size = 2×h)
  - Physics properties: friction 0.4, restitution 0.2
  - Green wireframe helpers for visualization
  - Debug controls for friction, restitution, and collision visibility
  - **To add colliders:** Add entries to `colliderData` object in constructor
  - **Edit when:** Adding/removing colliders, changing ramp layout, or physics properties

- **`Sphere.js`** - Player ball with physics and controls
  - Spawns at origin with 1m radius
  - Physics: density 5, friction 1.0, restitution 0, torque strength 3, linear/angular damping 0.05
  - Dual control system:
    - Grounded: Torque-based rolling motion
    - Airborne: Impulse-based air control
  - Flight mode: Toggle with space bar
  - Velocity and orientation tracking for camera
  - Ground detection via Rapier contact pairs
  - **Edit when:** Changing ball physics, spawn position, control scheme, or flight behavior

- **`Ocean.js`** - Sea surface plane
  - 1000x1000 plane at Y = -500 (sea level)
  - Blue metallic/rough material for water appearance
  - Receives shadows
  - Debug controls for color, metalness, roughness, and sea level
  - **Edit when:** Changing ocean appearance or sea level height

- **`Floor.js`, `Fox.js`** - Legacy/example objects (may be removed)
  - Not currently used in main scene
  - **Edit when:** Removing unused code or repurposing

#### `/src/Experience/Utils/HUD.js` - Heads-Up Display
- Real-time overlay showing velocity, FOV, and camera offset
- Updates from camera debug info
- Canvas-based rendering with semi-transparent background
- **Edit when:** Adding/removing HUD elements or changing display format

---

## Camera System Details

The camera system has two distinct modes that automatically switch based on ball position:

### Default Mode (X ≤ 10)
- **Position**: Follows behind ball opposite to velocity direction
- **Distance**: 10 meters (configurable offsetDistance)
- **Height**: 2.5 meters above ball
- **FOV**: Dynamic 25-40° based on speed (0-8 m/s range)
- **Behavior**: Smooth angle interpolation with velocity-based alignment

### Ramp Mode (X > 10)
- **Activation**: Automatic when ball crosses X threshold
- **Height Animation**: Starts at 2.5m, smoothly animates to 1.0m over 3 seconds (ease-out cubic)
- **Distance Animation**: Starts at 10m, smoothly animates to 0.2m over 3 seconds
- **FOV**: Dynamic 25-100° based on velocity (20-120 m/s range)
- **Lerp Speed**: Dynamic 0.02-0.17 based on speed (faster at high speeds to keep up)
- **Camera Position**: Behind ball along velocity tangent

---

## Physics Configuration

### Rapier Physics World
- Gravity: -9.81 (downward)
- 3D physics simulation
- Stepped each frame in Experience update loop

### Sphere Physics
- **Type**: Dynamic rigid body
- **Shape**: Ball collider (1m radius)
- **Density**: 5 (metal ball)
- **Friction**: 1.0 (high grip)
- **Restitution**: 0 (no bounce for airtime control)
- **Damping**: Linear 0.05, Angular 0.05 (minimal resistance)
- **Control**: Dual system
  - **Grounded**: Torque-based rolling (strength 3)
  - **Airborne**: Camera-relative impulses (strength 1)
- **Ground Detection**: Rapier contact pair checks
- **CCD**: Enabled for high-speed collision accuracy

### Ramp Physics
- **Type**: Fixed rigid body (single body with multiple colliders)
- **Shape**: Cuboid colliders defined via JSON
- **Colliders**: 2 cuboids (rmp-col-1, rmp-col-2)
  - rmp-col-1: 20m×1m×20m flat section at origin
  - rmp-col-2: 1m×1m×20m edge/wall at X=10.47
- **Friction**: 0.4
- **Restitution**: 0.2
- **Format**: Position, quaternion rotation, half-extents
- **Advantage**: No internal triangle edges = no high-speed bouncing on flat sections

---

## File Editing Quick Reference

### "I want to add a new 3D object to the scene"
1. Add asset to `/static/models/` or `/static/textures/`
2. Register asset in `sources.js`
3. Create new class in `/src/Experience/World/` (e.g., `NewObject.js`)
4. Instantiate in `World.js` after resources ready
5. Add update method if animated and call it in `World.js` update()

### "I want to change how the scene looks visually"
- **Lighting:** Edit `Environment.js` → `setSunLight()` or add new lights
- **Post-processing/tone mapping:** Edit `Renderer.js` → `setInstance()`
- **Background color:** Edit `Renderer.js` → `setClearColor()`
- **Environment map:** Edit `Environment.js` → `setEnvironmentMap()`

### "I want to modify camera behavior"
- **Position/FOV:** Edit `Camera.js` → `setInstance()`
- **Controls (orbit, damping):** Edit `Camera.js` → `setControls()`

### "I want to add debug controls"
- Add to existing class using `if(this.debug.active)` block
- Use `this.debug.ui.addFolder()` and `.add()` methods
- See examples in `Environment.js` or `Sphere.js`

### "I want to add keyboard controls"
- **Input handling:** Edit object class (e.g., `Sphere.js`) → add keyboard event listeners
- Track key states in a `keys` object
- Apply forces/changes in `update()` method based on key states
- See `Sphere.js` for W/S movement example

### "I want to load new assets"
1. Add files to `/static/` directory
2. Define in `sources.js` with name, type, and path
3. Access via `this.resources.items.<name>` in any class

### "I want to modify the update loop"
- **Global update order:** Edit `Experience.js` → `update()`
- **Add object to loop:** Edit `World.js` → `update()` to call object's update method

### "I want to change responsive behavior"
- Edit `Sizes.js` for viewport tracking
- Resize handlers in `Camera.js` and `Renderer.js`

### "I want to add a new utility system"
1. Create class in `/src/Experience/Utils/`
2. Optionally extend `EventEmitter` if events needed
3. Instantiate in `Experience.js` constructor
4. Access via `this.experience.<utilityName>` in other classes

### "I want to add physics to objects"
1. Access physics via `this.experience.physics`
2. Wait for physics ready event: `this.experience.physics.on('ready', () => { })`
3. Get RAPIER API: `const RAPIER = this.experience.physics.getRAPIDER()`
4. Create rigid body: `this.experience.physics.createRigidBody(rigidBodyDesc)`
5. Create collider: `this.experience.physics.createCollider(colliderDesc, rigidBody)`
6. Sync Three.js mesh position with physics body in update loop
7. See `Physics.js` for available methods

---

## Configuration Files

- **`package.json`** - Dependencies and npm scripts
  - `npm run dev` - Start Vite dev server
  - `npm run build` - Build for production
  
- **`vite.config.js`** - Build configuration
  - Root: `src/`
  - Public: `static/`
  - Output: `dist/`
  - Hot reload on static file changes

---

## Key Dependencies
- `three` - Three.js 3D library
- `lil-gui` - Debug UI panel
- `@dimforge/rapier3d` - Rapier 3D physics engine
- `vite` - Build tool and dev server
- `vite-plugin-restart` - Auto-restart on static file changes
- `vite-plugin-wasm` - WASM file support for Rapier
- `vite-plugin-top-level-await` - Top-level await support

---

## Important Patterns to Follow

### Accessing the Experience Singleton
```javascript
import Experience from '../Experience.js' // or appropriate path

export default class YourClass {
    constructor() {
        this.experience = new Experience() // Returns singleton
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        // Access other shared properties
    }
}
```

### Adding Debug Controls
```javascript
if(this.debug.active) {
    this.debugFolder = this.debug.ui.addFolder('folderName')
    this.debugFolder
        .add(object, 'property')
        .name('displayName')
        .min(0).max(10).step(0.001)
}
```

### Event System Usage
```javascript
// Emit event
this.trigger('eventName', [args])

// Listen to event
this.experience.resources.on('ready', () => {
    // Do something when ready
})

// Clean up event
this.experience.sizes.off('resize')
```

---

## Static Assets Organization

### `/static/models/` - 3D Models
- `ramp/gltf/` - Ramp track models (rampFull, rampFull2, rampFull3)
  - Currently using: rampFull3.glb
- `Fox/` - Legacy example model (not used)

### `/static/textures/` - Texture Maps
- `dirt/` - Ground textures (color, normal) - may not be actively used
- `environmentMap/` - Cubemap faces (px, nx, py, ny, pz, nz)

### `/static/draco/` - Draco compression
- Decoder files for compressed GLTF models
- Separate gltf/ subfolder for GLTF-specific decoders

---

## Development Workflow

1. **Start dev server:** `npm run dev`
2. **Enable debug mode:** Add `#debug` to URL
3. **Hot reload:** Changes auto-reload (Vite + vite-plugin-restart)
4. **Build:** `npm run build` → outputs to `dist/`

---

## Sphere Flight Physics

### Overview
The sphere has a toggleable flight mode that allows free-flying movement independent of physics constraints. This system provides a distinct gameplay mode with its own camera behavior and visual feedback.

### Flight Mode Activation
- **Toggle Key**: Space bar
- **State Property**: `this.isFlying` (boolean)
- **Visual Indicator**: Collision sphere mesh changes color
  - Red: Normal physics mode
  - Green: Flight mode active

### Control Behavior by Mode

#### Normal Mode (isFlying = false)
1. **Grounded Control**:
   - Detected via `this.isGrounded` (Rapier contact pair checks)
   - WASD keys apply torque impulses for rolling motion
   - Torque calculated using camera-relative directions cross-producted with up vector
   - Torque strength: 3 (configurable via `this.torqueStrength`)

2. **Airborne Control**:
   - Active when not grounded and not flying
   - WASD keys apply linear impulses in camera-relative directions
   - Directions flattened to world XZ plane (no vertical component)
   - Impulse strength: 1 (configurable via `this.airControlStrength`)
   - Allows mid-air steering without modifying physics too drastically

#### Flight Mode (isFlying = true)
- **Current State**: Basic toggle system in place
- **Camera Integration**: Flight mode camera (60° FOV, 15m back, 5m up)
- **Physics Override**: To be implemented
- **Planned Features**:
  - Ignore gravity and collision responses
  - Free directional movement in 3D space
  - Smooth acceleration/deceleration
  - Potential boost mechanics

### Ground Detection System
- **Method**: Rapier's `world.contactPairsWith()` API
- **Check Location**: Sphere's update loop (every frame)
- **Implementation**:
  ```javascript
  world.contactPairsWith(this.collider, (otherCollider) => {
      this.isGrounded = true
  })
  ```
- **Reset**: `this.isGrounded = false` before each check
- **Usage**: Determines whether to apply torque (grounded) or impulses (airborne)

### Camera Integration
Flight mode triggers the camera's flight mode configuration:
- **FOV**: 60° (wider view for spatial awareness)
- **Position**: 15 meters behind, 5 meters above sphere
- **Purpose**: Better perspective for free-flying navigation

### Debug Visualization
1. **Velocity Arrow (Cyan)**: Shows current velocity direction and magnitude
2. **Tangent Arrow (Magenta)**: Shows perpendicular orientation to velocity
3. **Ground Ray (Yellow/Orange)**: 
   - Yellow: Grounded
   - Orange: Airborne
   - Points downward from sphere center

### Implementation Notes
- Flight physics currently only toggles visual state and camera mode
- Physics override (ignore collisions/gravity in flight) not yet implemented
- Air control system provides some in-flight maneuverability even without flight mode
- Flight mode designed to be expandable for future gameplay mechanics

### Key Properties in Sphere.js
```javascript
this.isFlying = false           // Flight mode toggle state
this.isGrounded = false         // Ground contact detection
this.torqueStrength = 3         // Grounded control strength
this.airControlStrength = 1     // Airborne control strength
```

### Future Development
- Implement physics override in flight mode
- Add flight-specific movement controls (vertical, boost, etc.)
- Consider stamina/fuel system for flight
- Add particle effects for flight activation
- Implement smooth transitions between modes

---

## Common Gotchas

- **Singleton Pattern:** Always use `new Experience()` to get the singleton instance, never store the instance separately
- **Resource Loading:** Objects in World/ must wait for `resources.on('ready')` event
- **Path References:** In `sources.js`, paths are relative to `/static/` directory
- **Debug Mode:** Debug UI only active with `#debug` hash in URL
- **Update Loop:** Only add update() method if object needs per-frame updates; call it from World.js
# Bnard Ball

A Three.js physics-based ball game with Rapier physics, dynamic camera systems, and custom ramp tracks.

## Setup

1. Install [Node.js](https://nodejs.org/en/download/)
2. Run these commands:

```bash
# Install dependencies (first time only)
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

3. Open http://localhost:5173 in your browser
4. Add `#debug` to the URL to enable the debug panel

## Controls

- **WASD** - Move ball (torque when grounded, impulses when airborne)
- **Space** - Toggle flight mode

---

## Importing 3D Objects

### 1. Add your model file

Place your `.glb` or `.gltf` file in `static/models/`:

```
static/models/your-model/model.glb
```

### 2. Register the asset

Add an entry to `src/Experience/sources.js`:

```javascript
{
    name: 'yourModel',
    type: 'gltfModel',
    path: 'models/your-model/model.glb'
}
```

### 3. Create a class for your object

Create a new file in `src/Experience/World/` (e.g., `YourObject.js`):

```javascript
import * as THREE from 'three'
import Experience from '../Experience.js'

export default class YourObject {
    constructor() {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.resources = this.experience.resources

        // Get the loaded model
        this.resource = this.resources.items.yourModel

        this.setModel()
    }

    setModel() {
        this.model = this.resource.scene
        this.model.position.set(0, 0, 0)
        this.model.scale.set(1, 1, 1)
        this.scene.add(this.model)
    }
}
```

### 4. Add to the World

In `src/Experience/World/World.js`, import and instantiate your object:

```javascript
import YourObject from './YourObject.js'

// Inside the resources ready callback:
this.yourObject = new YourObject()
```

---

## Importing Animations

If your model has animations, update your class:

```javascript
setModel() {
    this.model = this.resource.scene
    this.scene.add(this.model)

    // Set up animation mixer
    this.animation = {}
    this.animation.mixer = new THREE.AnimationMixer(this.model)

    // Create actions from clips
    this.animation.actions = {}
    this.resource.animations.forEach((clip) => {
        this.animation.actions[clip.name] = this.animation.mixer.clipAction(clip)
    })

    // Play an animation
    this.animation.actions['YourAnimationName'].play()
}

update() {
    // Update mixer each frame (deltaTime in seconds)
    this.animation.mixer.update(this.experience.time.delta * 0.001)
}
```

Then call `this.yourObject.update()` from `World.js` update method.

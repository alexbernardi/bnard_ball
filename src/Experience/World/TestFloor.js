import * as THREE from 'three'
import Experience from '../Experience.js'

export default class TestFloor
{
    constructor()
    {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.physics = this.experience.physics
        this.debug = this.experience.debug

        // Setup
        this.colliderMeshes = []
        
        this.setModels()
    }

    setModels()
    {
        // Get the loaded model
        const halfpipeModel = this.resources.items.testHalfpipeModel

        // Process halfpipe model
        if (halfpipeModel)
        {
            this.createTrimeshCollider(halfpipeModel.scene, 'halfpipe')
        }
    }

    createTrimeshCollider(model, name)
    {
        // Traverse the model to find meshes
        model.traverse((child) =>
        {
            if (child.isMesh)
            {
                // Get geometry data
                const geometry = child.geometry
                
                // Get world transform
                child.updateWorldMatrix(true, false)
                const worldMatrix = child.matrixWorld
                
                // Clone and apply world transform to geometry
                const transformedGeometry = geometry.clone()
                transformedGeometry.applyMatrix4(worldMatrix)
                
                const position = transformedGeometry.attributes.position
                
                // Create vertices array
                const vertices = new Float32Array(position.array)
                
                // Create indices array
                let indices
                if (transformedGeometry.index)
                {
                    indices = new Uint32Array(transformedGeometry.index.array)
                }
                else
                {
                    // If no indices, create them
                    indices = new Uint32Array(position.count)
                    for (let i = 0; i < position.count; i++)
                    {
                        indices[i] = i
                    }
                }

                // Create Rapier trimesh collider at world origin since vertices are already transformed
                const RAPIER = this.physics.RAPIER
                const colliderDesc = RAPIER.ColliderDesc.trimesh(vertices, indices)

                // Create collider (static, no rigid body needed)
                const collider = this.physics.createCollider(colliderDesc)

                // Create visual representation of the collider
                const colliderMesh = this.createColliderVisualization(geometry, worldMatrix, name)
                this.colliderMeshes.push(colliderMesh)
                this.scene.add(colliderMesh)

                console.log(`Created trimesh collider for ${name}:`, {
                    vertices: vertices.length / 3,
                    triangles: indices.length / 3
                })
            }
        })
    }

    createColliderVisualization(geometry, worldMatrix, name)
    {
        // Clone the geometry
        const visualGeometry = geometry.clone()
        visualGeometry.applyMatrix4(worldMatrix)

        // Create a wireframe material for visualization
        const material = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            wireframe: true,
            transparent: true,
            opacity: 0.5
        })

        const mesh = new THREE.Mesh(visualGeometry, material)
        mesh.name = `${name}_collider_visualization`
        
        return mesh
    }

    update()
    {
        // No update needed for static colliders
    }
}

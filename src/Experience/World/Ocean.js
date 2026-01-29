import * as THREE from 'three'
import Experience from '../Experience.js'
import waterVertexShader from '../../shaders/water/vertex.glsl'
import waterFragmentShader from '../../shaders/water/fragment.glsl'

export default class Ocean
{
    constructor()
    {
        this.experience = new Experience()
        this.scene = this.experience.scene
        this.resources = this.experience.resources
        this.debug = this.experience.debug
        this.time = this.experience.time

        // Ocean properties
        this.size = 10000 // Large plane size
        this.seaLevel = -230 // Y position at sea level
        
        // Wave properties
        this.waveParams = {
            amplitude: 1.3,
            frequency: 0.009,
            speed: 0.38,
            enabled: true
        }
        
        // Fade properties
        this.fadeParams = {
            start: 3350,
            end: 4500
        }
        
        // Foam properties
        this.foamParams = {
            enabled: true,
            scale: 0.021,
            intensity: 0.65,
            threshold: 0.23,
            speed: 0.57
        }
        
        // Debug colors
        this.debugObject = {}
        this.debugObject.depthColor = '#246689'
        this.debugObject.surfaceColor = '#5194d2'

        this.setGeometry()
        this.setMaterial()
        this.setMesh()
        this.setDebug()
    }

    setGeometry()
    {
        // Lower resolution for CPU-based waves (performance)
        this.geometry = new THREE.PlaneGeometry(this.size, this.size, 128, 128)
        
        // Store original positions for wave animation
        const positions = this.geometry.attributes.position.array
        this.originalPositions = new Float32Array(positions.length)
        this.originalPositions.set(positions)
    }

    setMaterial()
    {
        // Standard material for PBR reflections
        this.material = new THREE.MeshStandardMaterial({
            color: this.debugObject.surfaceColor,
            metalness: 0.10,
            roughness: 0.05,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide,
            envMapIntensity: 0.4
        })
        
        // Inject custom shader code for edge fade and foam
        this.material.onBeforeCompile = (shader) => {
            // Add uniforms
            shader.uniforms.uFadeStart = { value: this.fadeParams.start }
            shader.uniforms.uFadeEnd = { value: this.fadeParams.end }
            shader.uniforms.uFoamEnabled = { value: this.foamParams.enabled ? 1.0 : 0.0 }
            shader.uniforms.uFoamScale = { value: this.foamParams.scale }
            shader.uniforms.uFoamIntensity = { value: this.foamParams.intensity }
            shader.uniforms.uFoamThreshold = { value: this.foamParams.threshold }
            shader.uniforms.uFoamTime = { value: 0.0 }
            
            // Store reference to update later
            this.materialShader = shader
            
            // Add varying to vertex shader
            shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                `#include <common>
                varying vec2 vWorldXZ;`
            )
            
            shader.vertexShader = shader.vertexShader.replace(
                '#include <begin_vertex>',
                `#include <begin_vertex>
                vec4 worldPos = modelMatrix * vec4(position, 1.0);
                vWorldXZ = worldPos.xz;`
            )
            
            // Add fade and foam to fragment shader
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <common>',
                `#include <common>
                uniform float uFadeStart;
                uniform float uFadeEnd;
                uniform float uFoamEnabled;
                uniform float uFoamScale;
                uniform float uFoamIntensity;
                uniform float uFoamThreshold;
                uniform float uFoamTime;
                varying vec2 vWorldXZ;
                
                // Blue noise / voronoi-based foam pattern
                vec2 hash2(vec2 p) {
                    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
                }
                
                float voronoiNoise(vec2 p) {
                    vec2 n = floor(p);
                    vec2 f = fract(p);
                    float minDist = 1.0;
                    
                    for(int j = -1; j <= 1; j++) {
                        for(int i = -1; i <= 1; i++) {
                            vec2 g = vec2(float(i), float(j));
                            vec2 o = hash2(n + g);
                            // Animate the points slowly
                            o = 0.5 + 0.5 * sin(uFoamTime * 0.5 + 6.2831 * o);
                            vec2 r = g + o - f;
                            float d = dot(r, r);
                            minDist = min(minDist, d);
                        }
                    }
                    return sqrt(minDist);
                }
                
                float foamPattern(vec2 uv) {
                    // Multi-scale foam for natural look
                    float foam1 = voronoiNoise(uv * 1.0);
                    float foam2 = voronoiNoise(uv * 2.3 + vec2(100.0));
                    float foam3 = voronoiNoise(uv * 4.7 + vec2(200.0));
                    
                    // Combine scales
                    float foam = foam1 * 0.5 + foam2 * 0.3 + foam3 * 0.2;
                    
                    // Create sharp foam edges
                    foam = 1.0 - smoothstep(0.0, 0.3, foam);
                    
                    return foam;
                }`
            )
            
            shader.fragmentShader = shader.fragmentShader.replace(
                '#include <dithering_fragment>',
                `#include <dithering_fragment>
                float distFromCenter = length(vWorldXZ);
                float fadeAlpha = 1.0 - smoothstep(uFadeStart, uFadeEnd, distFromCenter);
                
                // Apply foam effect
                if(uFoamEnabled > 0.5) {
                    vec2 foamUV = vWorldXZ * uFoamScale;
                    float foam = foamPattern(foamUV);
                    
                    // Apply threshold to control foam density
                    foam = smoothstep(uFoamThreshold, 1.0, foam);
                    
                    // Mix white foam into the color
                    vec3 foamColor = vec3(1.0, 1.0, 1.0);
                    gl_FragColor.rgb = mix(gl_FragColor.rgb, foamColor, foam * uFoamIntensity);
                }
                
                gl_FragColor.a *= fadeAlpha;`
            )
        }

        /* Shader material - commented out
        this.material = new THREE.ShaderMaterial({
            vertexShader: waterVertexShader,
            fragmentShader: waterFragmentShader,
            side: THREE.DoubleSide,
            transparent: true,
            uniforms:
            {
                uTime: { value: 0 },
                
                uBigWavesElevation: { value: 0.028 },
                uBigWavesFrequency: { value: new THREE.Vector2(2.5, 1.5) },
                uBigWavesSpeed: { value: 0.21 },

                uSmallWavesElevation: { value: 0.188 },
                uSmallWavesFrequency: { value: 2 },
                uSmallWavesSpeed: { value: 0.2 },
                uSmallIterations: { value: 1 },

                uDepthColor: { value: new THREE.Color(this.debugObject.depthColor) },
                uSurfaceColor: { value: new THREE.Color(this.debugObject.surfaceColor) },
                uColorOffset: { value: 0.495 },
                uColorMultiplier: { value: 1.262 },
                
                uOpacity: { value: 0.8 },
                
                uFadeStart: { value: 1500 },
                uFadeEnd: { value: 2500 }
            }
        })
        */
    }

    setMesh()
    {
        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.mesh.rotation.x = -Math.PI * 0.5 // Rotate to be horizontal
        this.mesh.position.y = this.seaLevel
        this.mesh.receiveShadow = true
        this.scene.add(this.mesh)
    }

    setDebug()
    {
        if(this.debug.active)
        {
            const oceanFolder = this.debug.ui.addFolder('ocean')
            oceanFolder.close()
            
            oceanFolder
                .add(this, 'seaLevel')
                .min(-300)
                .max(100)
                .step(0.1)
                .name('seaLevel')
                .onChange(() => {
                    this.mesh.position.y = this.seaLevel
                })
            
            // Standard material controls
            oceanFolder.addColor(this.debugObject, 'surfaceColor').onChange(() => { 
                this.material.color.set(this.debugObject.surfaceColor) 
            })
            oceanFolder.add(this.material, 'roughness').min(0).max(1).step(0.01).name('roughness')
            oceanFolder.add(this.material, 'metalness').min(0).max(1).step(0.01).name('metalness')
            oceanFolder.add(this.material, 'opacity').min(0).max(1).step(0.01).name('opacity')
            oceanFolder.add(this.material, 'envMapIntensity').min(0).max(3).step(0.01).name('envMapIntensity')
            
            // Wave controls
            oceanFolder.add(this.waveParams, 'enabled').name('wavesEnabled')
            oceanFolder.add(this.waveParams, 'amplitude').min(0).max(10).step(0.1).name('waveAmplitude')
            oceanFolder.add(this.waveParams, 'frequency').min(0.001).max(0.1).step(0.001).name('waveFrequency')
            oceanFolder.add(this.waveParams, 'speed').min(0).max(2).step(0.01).name('waveSpeed')
            
            // Fade controls
            oceanFolder.add(this.fadeParams, 'start').min(0).max(6000).step(50).name('fadeStart').onChange((value) => {
                if(this.materialShader) this.materialShader.uniforms.uFadeStart.value = value
            })
            oceanFolder.add(this.fadeParams, 'end').min(0).max(6000).step(50).name('fadeEnd').onChange((value) => {
                if(this.materialShader) this.materialShader.uniforms.uFadeEnd.value = value
            })
            
            // Foam controls
            oceanFolder.add(this.foamParams, 'enabled').name('foamEnabled').onChange((value) => {
                if(this.materialShader) this.materialShader.uniforms.uFoamEnabled.value = value ? 1.0 : 0.0
            })
            oceanFolder.add(this.foamParams, 'scale').min(0.001).max(0.1).step(0.001).name('foamScale').onChange((value) => {
                if(this.materialShader) this.materialShader.uniforms.uFoamScale.value = value
            })
            oceanFolder.add(this.foamParams, 'intensity').min(0).max(1).step(0.01).name('foamIntensity').onChange((value) => {
                if(this.materialShader) this.materialShader.uniforms.uFoamIntensity.value = value
            })
            oceanFolder.add(this.foamParams, 'threshold').min(0).max(1).step(0.01).name('foamThreshold').onChange((value) => {
                if(this.materialShader) this.materialShader.uniforms.uFoamThreshold.value = value
            })
            oceanFolder.add(this.foamParams, 'speed').min(0).max(1).step(0.01).name('foamSpeed')
            
            // Copy button
            this.debug.addCopyButton(oceanFolder, 'ocean', () => ({
                seaLevel: this.seaLevel,
                waveParams: { ...this.waveParams },
                fadeParams: { ...this.fadeParams },
                foamParams: { ...this.foamParams },
                surfaceColor: this.debugObject.surfaceColor,
                roughness: this.material.roughness,
                metalness: this.material.metalness,
                opacity: this.material.opacity,
                envMapIntensity: this.material.envMapIntensity
            }))

            /* Shader material debug controls - commented out
            // Colors
            oceanFolder.addColor(this.debugObject, 'depthColor').onChange(() => { 
                this.material.uniforms.uDepthColor.value.set(this.debugObject.depthColor) 
            })
            oceanFolder.addColor(this.debugObject, 'surfaceColor').onChange(() => { 
                this.material.uniforms.uSurfaceColor.value.set(this.debugObject.surfaceColor) 
            })
            
            // Big waves
            oceanFolder.add(this.material.uniforms.uBigWavesElevation, 'value').min(0).max(1).step(0.001).name('uBigWavesElevation')
            oceanFolder.add(this.material.uniforms.uBigWavesFrequency.value, 'x').min(0).max(10).step(0.001).name('uBigWavesFrequencyX')
            oceanFolder.add(this.material.uniforms.uBigWavesFrequency.value, 'y').min(0).max(10).step(0.001).name('uBigWavesFrequencyY')
            oceanFolder.add(this.material.uniforms.uBigWavesSpeed, 'value').min(0).max(4).step(0.001).name('uBigWavesSpeed')
            
            // Small waves
            oceanFolder.add(this.material.uniforms.uSmallWavesElevation, 'value').min(0).max(1).step(0.001).name('uSmallWavesElevation')
            oceanFolder.add(this.material.uniforms.uSmallWavesFrequency, 'value').min(0).max(30).step(0.001).name('uSmallWavesFrequency')
            oceanFolder.add(this.material.uniforms.uSmallWavesSpeed, 'value').min(0).max(4).step(0.001).name('uSmallWavesSpeed')
            oceanFolder.add(this.material.uniforms.uSmallIterations, 'value').min(0).max(5).step(1).name('uSmallIterations')
            
            // Color mixing
            oceanFolder.add(this.material.uniforms.uColorOffset, 'value').min(0).max(1).step(0.001).name('uColorOffset')
            oceanFolder.add(this.material.uniforms.uColorMultiplier, 'value').min(0).max(10).step(0.001).name('uColorMultiplier')
            
            // Edge fade
            oceanFolder.add(this.material.uniforms.uFadeStart, 'value').min(0).max(3000).step(10).name('fadeStart')
            oceanFolder.add(this.material.uniforms.uFadeEnd, 'value').min(0).max(3000).step(10).name('fadeEnd')
            */
        }
    }
    
    update()
    {
        // Update foam animation time
        if(this.materialShader && this.foamParams.enabled) {
            this.materialShader.uniforms.uFoamTime.value = this.time.elapsed * 0.001 * this.foamParams.speed
        }
        
        if(!this.waveParams.enabled) return
        
        const time = this.time.elapsed * 0.001 * this.waveParams.speed
        const positions = this.geometry.attributes.position.array
        const freq = this.waveParams.frequency
        const amp = this.waveParams.amplitude
        
        // Animate vertices (z is "up" since plane is created in XY then rotated)
        for(let i = 0; i < positions.length; i += 3)
        {
            const x = this.originalPositions[i]
            const y = this.originalPositions[i + 1]
            
            // Combine multiple sine waves for more natural look
            const wave1 = Math.sin(x * freq + time) * Math.sin(y * freq * 0.8 + time * 0.9)
            const wave2 = Math.sin(x * freq * 2.3 + time * 1.2) * Math.sin(y * freq * 1.7 + time * 1.1) * 0.3
            
            positions[i + 2] = (wave1 + wave2) * amp
        }
        
        this.geometry.attributes.position.needsUpdate = true
        this.geometry.computeVertexNormals()
    }
}

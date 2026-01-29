uniform vec3 uDepthColor;
uniform vec3 uSurfaceColor;
uniform float uColorOffset;
uniform float uColorMultiplier;
uniform float uOpacity;

uniform float uFadeStart;
uniform float uFadeEnd;

varying float vElevation;
varying float vDistanceFromCenter;

void main()
{
    float mixStrength = (vElevation + uColorOffset) * uColorMultiplier;
    vec3 color = mix(uDepthColor, uSurfaceColor, mixStrength);
    
    // Fade out at edges based on distance from center
    float fadeAlpha = 1.0 - smoothstep(uFadeStart, uFadeEnd, vDistanceFromCenter);
    float finalAlpha = uOpacity * fadeAlpha;
    
    gl_FragColor = vec4(color, finalAlpha);
    #include <colorspace_fragment>
}
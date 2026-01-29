import GUI from 'lil-gui'

export default class Debug
{
    constructor()
    {
        this.active = window.location.hash === '#debug'

        if(this.active)
        {
            this.ui = new GUI()
        }
    }
    
    /**
     * Add a "Copy Values" button to a debug folder
     * @param {GUI} folder - The lil-gui folder to add the button to
     * @param {string} name - Name identifier for the export (e.g., 'ocean', 'camera')
     * @param {Function} getValuesCallback - Function that returns an object of current values
     */
    addCopyButton(folder, name, getValuesCallback)
    {
        if(!this.active) return
        
        const exportButton = {
            copyValues: () => {
                const values = getValuesCallback()
                const code = this.formatValuesAsCode(name, values)
                
                navigator.clipboard.writeText(code).then(() => {
                    console.log(`✅ ${name} values copied to clipboard!`)
                    console.log(code)
                }).catch(err => {
                    console.error('Failed to copy:', err)
                    console.log(code)
                })
            }
        }
        folder.add(exportButton, 'copyValues').name('📋 Copy Values')
    }
    
    /**
     * Format values object as pasteable code
     */
    formatValuesAsCode(name, values, indent = '')
    {
        let code = `// ${name} values\n`
        
        const formatValue = (val, depth = 0) => {
            const spaces = '    '.repeat(depth)
            
            if(val === null || val === undefined) {
                return String(val)
            }
            if(typeof val === 'string') {
                return `'${val}'`
            }
            if(typeof val === 'number') {
                // Round to reasonable precision
                return Number.isInteger(val) ? val : parseFloat(val.toFixed(6))
            }
            if(typeof val === 'boolean') {
                return val
            }
            if(Array.isArray(val)) {
                return `[${val.map(v => formatValue(v, depth)).join(', ')}]`
            }
            if(typeof val === 'object') {
                const entries = Object.entries(val)
                if(entries.length === 0) return '{}'
                
                const inner = entries
                    .map(([k, v]) => `${spaces}    ${k}: ${formatValue(v, depth + 1)}`)
                    .join(',\n')
                return `{\n${inner}\n${spaces}}`
            }
            return String(val)
        }
        
        for(const [key, value] of Object.entries(values)) {
            code += `${indent}${key}: ${formatValue(value)}\n`
        }
        
        return code
    }
}
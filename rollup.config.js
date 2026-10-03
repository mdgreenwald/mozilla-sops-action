import {nodeResolve} from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'

// Known, benign warnings from bundled dependencies: TypeScript's __awaiter
// helper in @actions/* references top-level `this`, and @actions/core and
// semver contain internal import cycles. Anything else fails the build.
const fromDeps = (id) => id?.includes('node_modules')

export default {
   input: 'build/index.js',
   output: {file: 'lib/index.js', format: 'es'},
   plugins: [
      nodeResolve({preferBuiltins: true, exportConditions: ['node']}),
      // undici wraps require('node:crypto') in try/catch; without this those
      // calls are left as bare require(), which is undefined in an ESM bundle.
      commonjs({ignoreTryCatch: false})
   ],
   onwarn(warning) {
      if (warning.code === 'THIS_IS_UNDEFINED' && fromDeps(warning.id)) return
      if (
         warning.code === 'CIRCULAR_DEPENDENCY' &&
         warning.ids?.every(fromDeps)
      )
         return
      throw new Error(`Unexpected Rollup warning: ${warning.message}`)
   }
}

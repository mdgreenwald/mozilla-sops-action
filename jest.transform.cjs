// Jest transformer for .ts files using Node's built-in type stripping.
//
// TypeScript 7 no longer exposes a JS compiler API, so ts-jest can't use it.
// Type stripping replaces type annotations with whitespace, so line/column
// positions are preserved and coverage needs no source maps. It only handles
// erasable syntax; tsconfig's `erasableSyntaxOnly` and `verbatimModuleSyntax`
// enforce that at typecheck time.
const {createHash} = require('node:crypto')
const {stripTypeScriptTypes} = require('node:module')

module.exports = {
   process(sourceText) {
      return {code: stripTypeScriptTypes(sourceText, {mode: 'strip'})}
   },
   // Jest instruments for coverage *after* this transform, but the instrumented
   // output is cached under this key, so `instrument` must be part of it.
   getCacheKey(sourceText, sourcePath, options) {
      return createHash('sha256')
         .update(process.version)
         .update('\0')
         .update(options.instrument ? 'instrument' : '')
         .update('\0')
         .update(sourcePath)
         .update('\0')
         .update(sourceText)
         .digest('hex')
   }
}

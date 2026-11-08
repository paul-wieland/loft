// Image imports resolve to their URL. Declared in an ambient file so they apply across the renderer.
declare module '*.svg' {
  const url: string
  export default url
}

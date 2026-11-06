export interface PackageGenerator {
  generate(requestId: string, instructions: string): Promise<void>
}

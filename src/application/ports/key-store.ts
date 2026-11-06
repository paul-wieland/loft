export interface KeyStore {
  read(): Promise<string | null>
  write(key: string): Promise<void>
}

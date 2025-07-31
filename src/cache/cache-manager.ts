import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { logger } from '../mcp-server.js'
import type { CacheEntry } from '../core/types.js'

export class CacheManager {
  private cache = new Map<string, CacheEntry<any>>()
  private cacheDir: string
  private defaultTtl = 1000 * 60 * 60 * 24 // 24 hours

  constructor(cacheDir = '.cache') {
    this.cacheDir = cacheDir
  }

  async init(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true })
    } catch (error) {
      // Directory already exists or other error, continue
    }
  }

  async get<T>(key: string): Promise<T | null> {
    // Check memory cache first
    const memoryEntry = this.cache.get(key)
    if (memoryEntry && !this.isExpired(memoryEntry)) {
      return memoryEntry.data
    }

    // Check disk cache
    try {
      const filePath = join(this.cacheDir, `${this.sanitizeKey(key)}.json`)
      const fileContent = await fs.readFile(filePath, 'utf-8')
      const entry: CacheEntry<T> = JSON.parse(fileContent, (key, value) => {
        // Revive Date objects
        if (key === 'timestamp' || key === 'lastModified') {
          return new Date(value)
        }
        return value
      })

      if (!this.isExpired(entry)) {
        // Cache in memory for faster access
        this.cache.set(key, entry)
        return entry.data
      } else {
        // Remove expired file
        await this.delete(key)
      }
    } catch (error) {
      // File doesn't exist or is corrupted
    }

    return null
  }

  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: new Date(),
      ttl: ttl || this.defaultTtl,
    }

    // Store in memory
    this.cache.set(key, entry)

    // Store on disk
    try {
      const filePath = join(this.cacheDir, `${this.sanitizeKey(key)}.json`)
      await fs.writeFile(filePath, JSON.stringify(entry, null, 2))
    } catch (error) {
      logger.error(`Failed to write cache file for key ${key}: ${error}`)
    }
  }

  async delete(key: string): Promise<void> {
    // Remove from memory
    this.cache.delete(key)

    // Remove from disk
    try {
      const filePath = join(this.cacheDir, `${this.sanitizeKey(key)}.json`)
      await fs.unlink(filePath)
    } catch (error) {
      // File doesn't exist, ignore
    }
  }

  async clear(): Promise<void> {
    // Clear memory cache
    this.cache.clear()

    // Clear disk cache
    try {
      const files = await fs.readdir(this.cacheDir)
      await Promise.all(
        files
          .filter(file => file.endsWith('.json'))
          .map(file => fs.unlink(join(this.cacheDir, file)))
      )
    } catch (error) {
      // Directory doesn't exist or other error
    }
  }

  async has(key: string): Promise<boolean> {
    const data = await this.get(key)
    return data !== null
  }

  async getFileChecksum(filePath: string): Promise<string | null> {
    try {
      const stats = await fs.stat(filePath)
      return `${stats.size}-${stats.mtime.getTime()}`
    } catch (error) {
      return null
    }
  }

  async isFileChanged(filePath: string, cachedChecksum: string): Promise<boolean> {
    const currentChecksum = await this.getFileChecksum(filePath)
    return currentChecksum !== cachedChecksum
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    if (!entry.ttl) return false
    const now = Date.now()
    const entryTime = entry.timestamp.getTime()
    return now - entryTime > entry.ttl
  }

  private sanitizeKey(key: string): string {
    return key
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 200) // Limit filename length
  }

  getStats() {
    return {
      memoryEntries: this.cache.size,
      cacheDir: this.cacheDir,
    }
  }
}

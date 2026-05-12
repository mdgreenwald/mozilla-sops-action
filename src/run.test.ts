import {jest} from '@jest/globals'
import * as path from 'node:path'

// ESM module mocking: declare mocks BEFORE the dynamic imports that consume
// them. Under ESM, jest.unstable_mockModule is the only way to replace a
// module's exports — spyOn against an imported module object fails because
// ESM bindings are immutable.

const actualOs = await import('node:os')
const actualFs = await import('node:fs')

jest.unstable_mockModule('node:os', () => ({
   ...actualOs,
   platform: jest.fn(actualOs.platform),
   arch: jest.fn(actualOs.arch),
   default: {...actualOs}
}))

jest.unstable_mockModule('node:fs', () => ({
   ...actualFs,
   chmodSync: jest.fn(),
   existsSync: jest.fn(actualFs.existsSync),
   default: {...actualFs}
}))

jest.unstable_mockModule('@actions/tool-cache', () => ({
   find: jest.fn(),
   downloadTool: jest.fn(),
   cacheFile: jest.fn()
}))

const os = await import('node:os')
const fs = await import('node:fs')
const toolCache = await import('@actions/tool-cache')
const run = await import('./run.js')

const mockPlatform = os.platform as jest.MockedFunction<typeof os.platform>
const mockArch = os.arch as jest.MockedFunction<typeof os.arch>
const mockChmodSync = fs.chmodSync as jest.MockedFunction<typeof fs.chmodSync>
const mockExistsSync = fs.existsSync as jest.MockedFunction<
   typeof fs.existsSync
>
const mockFind = toolCache.find as jest.MockedFunction<typeof toolCache.find>
const mockDownloadTool = toolCache.downloadTool as jest.MockedFunction<
   typeof toolCache.downloadTool
>
const mockCacheFile = toolCache.cacheFile as jest.MockedFunction<
   typeof toolCache.cacheFile
>

describe('run.ts', () => {
   const downloadBaseURL = 'https://test.tld/'

   test('getExecutableExtension() - return .exe when os is Windows', () => {
      mockPlatform.mockReturnValue('win32')

      expect(run.getExecutableExtension()).toBe('.exe')
      expect(mockPlatform).toHaveBeenCalled()
   })

   test('getExecutableExtension() - return empty string for non-windows OS', () => {
      mockPlatform.mockReturnValue('darwin')

      expect(run.getExecutableExtension()).toBe('')
      expect(mockPlatform).toHaveBeenCalled()
   })

   test('getSopsDownloadURL() - Linux amd64', () => {
      mockPlatform.mockReturnValue('linux')
      mockArch.mockReturnValue('x64')
      const expected = 'https://test.tld/v3.13.0/sops-v3.13.0.linux.amd64'

      expect(run.getSopsDownloadURL(downloadBaseURL, 'v3.13.0')).toBe(expected)
   })

   test('getSopsDownloadURL() - Linux arm64', () => {
      mockPlatform.mockReturnValue('linux')
      mockArch.mockReturnValue('arm64')
      const expected = 'https://test.tld/v3.13.0/sops-v3.13.0.linux.arm64'

      expect(run.getSopsDownloadURL(downloadBaseURL, 'v3.13.0')).toBe(expected)
   })

   test('getSopsDownloadURL() - Darwin amd64', () => {
      mockPlatform.mockReturnValue('darwin')
      mockArch.mockReturnValue('x64')
      const expected = 'https://test.tld/v3.13.0/sops-v3.13.0.darwin.amd64'

      expect(run.getSopsDownloadURL(downloadBaseURL, 'v3.13.0')).toBe(expected)
   })

   test('getSopsDownloadURL() - Darwin arm64', () => {
      mockPlatform.mockReturnValue('darwin')
      mockArch.mockReturnValue('arm64')
      const expected = 'https://test.tld/v3.13.0/sops-v3.13.0.darwin.arm64'

      expect(run.getSopsDownloadURL(downloadBaseURL, 'v3.13.0')).toBe(expected)
   })

   test('getSopsDownloadURL() - Windows amd64', () => {
      mockPlatform.mockReturnValue('win32')
      mockArch.mockReturnValue('x64')
      const expected = 'https://test.tld/v3.13.0/sops-v3.13.0.amd64.exe'

      expect(run.getSopsDownloadURL(downloadBaseURL, 'v3.13.0')).toBe(expected)
   })

   test('getSopsDownloadURL() - Windows arm64', () => {
      mockPlatform.mockReturnValue('win32')
      mockArch.mockReturnValue('arm64')
      const expected = 'https://test.tld/v3.13.0/sops-v3.13.0.arm64.exe'

      expect(run.getSopsDownloadURL(downloadBaseURL, 'v3.13.0')).toBe(expected)
   })

   test('getSopsDownloadURL() - base URL without trailing slash is normalized', () => {
      mockPlatform.mockReturnValue('linux')
      mockArch.mockReturnValue('x64')
      const expected = 'https://test.tld/v3.13.0/sops-v3.13.0.linux.amd64'

      expect(run.getSopsDownloadURL('https://test.tld', 'v3.13.0')).toBe(
         expected
      )
   })

   test('getLatestSopsVersion() - return the tag_name from the GitHub API', async () => {
      const res = {
         ok: true,
         status: 200,
         json: async () => ({tag_name: 'v9.99.999'})
      } as unknown as Response
      global.fetch = jest.fn<typeof fetch>().mockResolvedValue(res)
      expect(await run.getLatestSopsVersion()).toBe('v9.99.999')
   })

   test('getLatestSopsVersion() - fall back to stable on a non-OK response', async () => {
      const res = {
         ok: false,
         status: 503,
         json: async () => ({})
      } as unknown as Response
      global.fetch = jest.fn<typeof fetch>().mockResolvedValue(res)
      expect(await run.getLatestSopsVersion()).toBe(run.stableSopsVersion)
   })

   test('getLatestSopsVersion() - fall back to stable on network error', async () => {
      global.fetch = jest
         .fn<typeof fetch>()
         .mockRejectedValueOnce(new Error('Network Error'))
      expect(await run.getLatestSopsVersion()).toBe(run.stableSopsVersion)
   })

   test('getLatestSopsVersion() - fall back to stable when tag_name is missing', async () => {
      const res = {
         ok: true,
         status: 200,
         json: async () => ({})
      } as unknown as Response
      global.fetch = jest.fn<typeof fetch>().mockResolvedValue(res)
      expect(await run.getLatestSopsVersion()).toBe(run.stableSopsVersion)
   })

   test('getValidVersion() - return version with v prepended', () => {
      expect(run.getValidVersion('3.13.0')).toBe('v3.13.0')
   })

   test('downloadSops() - download SOPS and return path to it', async () => {
      mockFind.mockReturnValue('')
      mockDownloadTool.mockResolvedValue('pathToTool')
      mockCacheFile.mockResolvedValue('pathToCachedDir')
      mockPlatform.mockReturnValue('linux')
      mockArch.mockReturnValue('x64')
      mockChmodSync.mockImplementation(() => {})
      mockExistsSync.mockReturnValue(true)

      expect(await run.downloadSops(downloadBaseURL, 'v3.13.0')).toBe(
         path.join('pathToCachedDir', 'sops')
      )
      expect(mockFind).toHaveBeenCalledWith('sops', 'v3.13.0')
      expect(mockDownloadTool).toHaveBeenCalledWith(
         'https://test.tld/v3.13.0/sops-v3.13.0.linux.amd64'
      )
      expect(mockCacheFile).toHaveBeenCalledWith(
         'pathToTool',
         'sops',
         'sops',
         'v3.13.0'
      )
      expect(mockChmodSync).toHaveBeenCalledWith('pathToTool', '777')
      expect(mockChmodSync).toHaveBeenCalledWith(
         path.join('pathToCachedDir', 'sops'),
         '777'
      )
   })

   test('downloadSops() - Windows uses .exe suffix in cached filename', async () => {
      mockFind.mockReturnValue('')
      mockDownloadTool.mockResolvedValue('pathToTool')
      mockCacheFile.mockResolvedValue('pathToCachedDir')
      mockPlatform.mockReturnValue('win32')
      mockArch.mockReturnValue('x64')
      mockChmodSync.mockImplementation(() => {})
      mockExistsSync.mockReturnValue(true)

      expect(await run.downloadSops(downloadBaseURL, 'v3.13.0')).toBe(
         path.join('pathToCachedDir', 'sops.exe')
      )
      expect(mockDownloadTool).toHaveBeenCalledWith(
         'https://test.tld/v3.13.0/sops-v3.13.0.amd64.exe'
      )
      expect(mockCacheFile).toHaveBeenCalledWith(
         'pathToTool',
         'sops.exe',
         'sops',
         'v3.13.0'
      )
   })

   test('downloadSops() - throw error if unable to download', async () => {
      mockFind.mockReturnValue('')
      mockDownloadTool.mockImplementation(async () => {
         throw 'Unable to download'
      })
      mockPlatform.mockReturnValue('linux')
      mockArch.mockReturnValue('x64')

      const downloadUrl = 'https://test.tld/v3.13.0/sops-v3.13.0.linux.amd64'
      await expect(
         run.downloadSops(downloadBaseURL, 'v3.13.0')
      ).rejects.toThrow(`Failed to download SOPS from location ${downloadUrl}`)
      expect(mockFind).toHaveBeenCalledWith('sops', 'v3.13.0')
      expect(mockDownloadTool).toHaveBeenCalledWith(downloadUrl)
   })

   test('downloadSops() - return path to cached SOPS tool when present', async () => {
      mockFind.mockReturnValue('pathToCachedDir')
      mockDownloadTool.mockResolvedValue('pathToTool')
      mockCacheFile.mockResolvedValue('pathToCachedDir')
      mockPlatform.mockReturnValue('linux')
      mockArch.mockReturnValue('x64')
      mockChmodSync.mockImplementation(() => {})
      mockExistsSync.mockReturnValue(true)

      expect(await run.downloadSops(downloadBaseURL, 'v3.13.0')).toBe(
         path.join('pathToCachedDir', 'sops')
      )
      expect(mockFind).toHaveBeenCalledWith('sops', 'v3.13.0')
      expect(mockDownloadTool).not.toHaveBeenCalled()
      expect(mockChmodSync).toHaveBeenCalledWith(
         path.join('pathToCachedDir', 'sops'),
         '777'
      )
   })

   test('downloadSops() - throw if cached file is missing on disk', async () => {
      mockFind.mockReturnValue('')
      mockDownloadTool.mockResolvedValue('pathToTool')
      mockCacheFile.mockResolvedValue('pathToCachedDir')
      mockPlatform.mockReturnValue('linux')
      mockArch.mockReturnValue('x64')
      mockChmodSync.mockImplementation(() => {})
      mockExistsSync.mockReturnValue(false)

      await expect(
         run.downloadSops(downloadBaseURL, 'v3.13.0')
      ).rejects.toThrow('SOPS executable not found in path pathToCachedDir')
   })
})

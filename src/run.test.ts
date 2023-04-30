import * as run from './run'
import * as os from 'os'
import * as toolCache from '@actions/tool-cache'
import * as fs from 'fs'
import * as path from 'path'
import * as core from '@actions/core'

describe('run.ts', () => {
   test('getExecutableExtension() - return .exe when os is Windows', () => {
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')

      expect(run.getExecutableExtension()).toBe('.exe')
      expect(os.type).toBeCalled()
   })

   test('getExecutableExtension() - return empty string for non-windows OS', () => {
      jest.spyOn(os, 'type').mockReturnValue('Darwin')

      expect(run.getExecutableExtension()).toBe('')
      expect(os.type).toBeCalled()
   })

   test('getSopsDownloadURL() - return the URL to download sops for Linux', () => {
      jest.spyOn(os, 'type').mockReturnValue('Linux')
      jest.spyOn(os, 'arch').mockReturnValueOnce('unknown')
      const sopsLinuxUrl = 'https://github.com/mozilla/sops/releases/download/v3.7.3/sops-v3.7.3.linux.amd64'

      expect(run.getSopsDownloadURL('v3.7.3')).toBe(sopsLinuxUrl)
      expect(os.type).toBeCalled()
      expect(os.arch).toBeCalled()

      // arm64
      jest.spyOn(os, 'type').mockReturnValue('Linux')
      jest.spyOn(os, 'arch').mockReturnValueOnce('arm64')
      const sopsLinuxArm64Url =
         'https://github.com/mozilla/sops/releases/download/v3.7.3/sops-v3.7.3.linux.arm64'

      expect(run.getSopsDownloadURL('v3.7.3')).toBe(sopsLinuxArm64Url)
      expect(os.type).toBeCalled()
      expect(os.arch).toBeCalled()
   })

   test('getSopsDownloadURL() - return the URL to download sops for Darwin', () => {
      jest.spyOn(os, 'type').mockReturnValue('Darwin')
      jest.spyOn(os, 'arch').mockReturnValueOnce('unknown')
      const sopsDarwinUrl = 'https://github.com/mozilla/sops/releases/download/v3.7.3/sops-v3.7.3.darwin.amd64'

      expect(run.getSopsDownloadURL('v3.7.3')).toBe(sopsDarwinUrl)
      expect(os.type).toBeCalled()
      expect(os.arch).toBeCalled()

      // arm64
      jest.spyOn(os, 'type').mockReturnValue('Darwin')
      jest.spyOn(os, 'arch').mockReturnValueOnce('arm64')
      const sopsDarwinArm64Url =
         'https://github.com/mozilla/sops/releases/download/v3.7.3/sops-v3.7.3.darwin.arm64'

      expect(run.getSopsDownloadURL('v3.7.3')).toBe(sopsDarwinArm64Url)
      expect(os.type).toBeCalled()
      expect(os.arch).toBeCalled()
   })

   test('getValidVersion() - return version with v prepended', () => {
      expect(run.getValidVersion('v3.7.3')).toBe('v3.7.3')
   })

   test('getSopsDownloadURL() - return the URL to download sops for Windows', () => {
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')

      const sopsWindowsUrl = 'https://github.com/mozilla/sops/releases/download/v3.7.3/sops-v3.7.3.exe'
      expect(run.getSopsDownloadURL('v3.7.3')).toBe(sopsWindowsUrl)
      expect(os.type).toBeCalled()
   })

   test('getLatestSopsVersion() - return the stable version of HELM since its not authenticated', async () => {
      expect(await run.getLatestSopsVersion()).toBe('v3.7.3')
   })

   test('walkSync() - return path to the all files matching fileToFind in dir', () => {
      jest.spyOn(fs, 'readdirSync').mockImplementation((file, _) => {
         if (file == 'mainFolder')
            return [
               'file1' as unknown as fs.Dirent,
               'file2' as unknown as fs.Dirent,
               'folder1' as unknown as fs.Dirent,
               'folder2' as unknown as fs.Dirent
            ]
         if (file == path.join('mainFolder', 'folder1'))
            return [
               'file11' as unknown as fs.Dirent,
               'file12' as unknown as fs.Dirent
            ]
         if (file == path.join('mainFolder', 'folder2'))
            return [
               'file21' as unknown as fs.Dirent,
               'file22' as unknown as fs.Dirent
            ]
      })
      jest.spyOn(core, 'debug').mockImplementation()
      jest.spyOn(fs, 'statSync').mockImplementation((file) => {
         const isDirectory =
            (file as string).toLowerCase().indexOf('file') == -1 ? true : false
         return {isDirectory: () => isDirectory} as fs.Stats
      })

      expect(run.walkSync('mainFolder', null, 'file21')).toEqual([
         path.join('mainFolder', 'folder2', 'file21')
      ])
      expect(fs.readdirSync).toBeCalledTimes(3)
      expect(fs.statSync).toBeCalledTimes(8)
   })

   test('walkSync() - return empty array if no file with name fileToFind exists', () => {
      jest.spyOn(fs, 'readdirSync').mockImplementation((file, _) => {
         if (file == 'mainFolder')
            return [
               'file1' as unknown as fs.Dirent,
               'file2' as unknown as fs.Dirent,
               'folder1' as unknown as fs.Dirent,
               'folder2' as unknown as fs.Dirent
            ]
         if (file == path.join('mainFolder', 'folder1'))
            return [
               'file11' as unknown as fs.Dirent,
               'file12' as unknown as fs.Dirent
            ]
         if (file == path.join('mainFolder', 'folder2'))
            return [
               'file21' as unknown as fs.Dirent,
               'file22' as unknown as fs.Dirent
            ]
      })
      jest.spyOn(core, 'debug').mockImplementation()
      jest.spyOn(fs, 'statSync').mockImplementation((file) => {
         const isDirectory =
            (file as string).toLowerCase().indexOf('file') == -1 ? true : false
         return {isDirectory: () => isDirectory} as fs.Stats
      })

      expect(run.walkSync('mainFolder', null, 'sops.exe')).toEqual([])
      expect(fs.readdirSync).toBeCalledTimes(3)
      expect(fs.statSync).toBeCalledTimes(8)
   })

   test('findSops() - change access permissions and find the sops in given directory', () => {
      jest.spyOn(fs, 'chmodSync').mockImplementation(() => {})
      jest.spyOn(fs, 'readdirSync').mockImplementation((file, _) => {
         if (file == 'mainFolder') return ['sops.exe' as unknown as fs.Dirent]
      })
      jest.spyOn(fs, 'statSync').mockImplementation((file) => {
         const isDirectory =
            (file as string).indexOf('folder') == -1 ? false : true
         return {isDirectory: () => isDirectory} as fs.Stats
      })
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')

      expect(run.findSops('mainFolder')).toBe(
         path.join('mainFolder', 'sops.exe')
      )
   })

   test('findSops() - throw error if executable not found', () => {
      jest.spyOn(fs, 'chmodSync').mockImplementation(() => {})
      jest.spyOn(fs, 'readdirSync').mockImplementation((file, _) => {
         if (file == 'mainFolder') return []
      })
      jest.spyOn(fs, 'statSync').mockImplementation((file) => {
         return {isDirectory: () => true} as fs.Stats
      })
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')
      expect(() => run.findSops('mainFolder')).toThrow(
         'Sops executable not found in path mainFolder'
      )
   })

   test('downloadSops() - download sops and return path to it', async () => {
      jest.spyOn(toolCache, 'find').mockReturnValue('')
      jest.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool')
      const response = JSON.stringify([{tag_name: 'v4.0.0'}])
      jest.spyOn(fs, 'readFileSync').mockReturnValue(response)
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')
      jest.spyOn(fs, 'chmodSync').mockImplementation(() => {})
      jest
         .spyOn(toolCache, 'extractZip')
         .mockResolvedValue('pathToUnzippedSops')
      jest.spyOn(toolCache, 'cacheDir').mockResolvedValue('pathToCachedDir')
      jest
         .spyOn(fs, 'readdirSync')
         .mockImplementation((file, _) => ['sops.exe' as unknown as fs.Dirent])
      jest.spyOn(fs, 'statSync').mockImplementation((file) => {
         const isDirectory =
            (file as string).indexOf('folder') == -1 ? false : true
         return {isDirectory: () => isDirectory} as fs.Stats
      })

      expect(await run.downloadSops('v4.0.0')).toBe(
         path.join('pathToCachedDir', 'sops.exe')
      )
      expect(toolCache.find).toBeCalledWith('sops', 'v4.0.0')
      expect(toolCache.downloadTool).toBeCalledWith(
         'https://github.com/mozilla/sops/releases/download/v4.0.0/sops-v4.0.0.exe'
      )
      expect(fs.chmodSync).toBeCalledWith('pathToTool', '777')
      expect(toolCache.extractZip).toBeCalledWith('pathToTool')
      expect(fs.chmodSync).toBeCalledWith(
         path.join('pathToCachedDir', 'sops.exe'),
         '777'
      )
   })

   test('downloadSops() - throw error if unable to download', async () => {
      jest.spyOn(toolCache, 'find').mockReturnValue('')
      jest.spyOn(toolCache, 'downloadTool').mockImplementation(async () => {
         throw 'Unable to download'
      })
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')

      await expect(run.downloadSops('v3.2.1')).rejects.toThrow(
         'Failed to download Sops from location https://github.com/mozilla/sops/releases/download/v3.7.3/sops-v3.7.3.exe'
      )
      expect(toolCache.find).toBeCalledWith('sops', 'v3.2.1')
      expect(toolCache.downloadTool).toBeCalledWith(
         'https://github.com/mozilla/sops/releases/download/v3.7.3/sops-v3.2.1.exe'
      )
   })

   test('downloadSops() - return path to sops tool with same version from toolCache', async () => {
      jest.spyOn(toolCache, 'find').mockReturnValue('pathToCachedDir')
      jest.spyOn(fs, 'chmodSync').mockImplementation(() => {})

      expect(await run.downloadSops('v3.2.1')).toBe(
         path.join('pathToCachedDir', 'sops.exe')
      )
      expect(toolCache.find).toBeCalledWith('sops', 'v3.2.1')
      expect(fs.chmodSync).toBeCalledWith(
         path.join('pathToCachedDir', 'sops.exe'),
         '777'
      )
   })

   test('downloadSops() - throw error is sops is not found in path', async () => {
      jest.spyOn(toolCache, 'find').mockReturnValue('')
      jest.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool')
      jest.spyOn(os, 'type').mockReturnValue('Windows_NT')
      jest.spyOn(fs, 'chmodSync').mockImplementation()
      jest
         .spyOn(toolCache, 'extractZip')
         .mockResolvedValue('pathToUnzippedSops')
      jest.spyOn(toolCache, 'cacheDir').mockResolvedValue('pathToCachedDir')
      jest.spyOn(fs, 'readdirSync').mockImplementation((file, _) => [])
      jest.spyOn(fs, 'statSync').mockImplementation((file) => {
         const isDirectory =
            (file as string).indexOf('folder') == -1 ? false : true
         return {isDirectory: () => isDirectory} as fs.Stats
      })

      await expect(run.downloadSops('v3.2.1')).rejects.toThrow(
         'Sops executable not found in path pathToCachedDir'
      )
      expect(toolCache.find).toBeCalledWith('sops', 'v3.2.1')
      expect(toolCache.downloadTool).toBeCalledWith(
         'https://github.com/mozilla/sops/releases/download/v3.2.1/sops-v3.2.1.exe'
      )
      expect(fs.chmodSync).toBeCalledWith('pathToTool', '777')
      expect(toolCache.extractZip).toBeCalledWith('pathToTool')
   })
})

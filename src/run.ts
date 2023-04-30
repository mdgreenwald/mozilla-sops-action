// Copyright (c) Microsoft Corporation.
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from 'os'
import * as path from 'path'
import * as util from 'util'
import * as fs from 'fs'

import * as toolCache from '@actions/tool-cache'
import * as core from '@actions/core'
import {graphql} from '@octokit/graphql'
import {createActionAuth} from '@octokit/auth-action'

const sopsToolName = 'sops'
const stableSopsVersion = 'v3.11.1'

export async function run() {
   let version = core.getInput('version', {required: true})

   if (version !== 'latest' && version[0] !== 'v') {
      core.info('Getting latest Sops version')
      version = getValidVersion(version)
   }
   if (version.toLocaleLowerCase() === 'latest') {
      version = await getLatestSopsVersion()
   }

   core.startGroup(`Downloading ${version}`)
   const cachedPath = await downloadSops(version)
   core.endGroup()

   try {
      if (!process.env['PATH'].startsWith(path.dirname(cachedPath))) {
         core.addPath(path.dirname(cachedPath))
      }
   } catch {
      //do nothing, set as output variable
   }

   core.info(`Sops tool version '${version}' has been cached at ${cachedPath}`)
   core.setOutput('sops-path', cachedPath)
}

// Prefixes version with v
export function getValidVersion(version: string): string {
   return 'v' + version
}

// Gets the latest sops version or returns a default stable if getting latest fails
export async function getLatestSopsVersion(): Promise<string> {
   try {
      const auth = createActionAuth()
      const graphqlAuthenticated = graphql.defaults({
         request: {hook: auth.hook}
      })
      const {repository} = await graphqlAuthenticated(
         `
            {
               repository(name: "sops", owner: "mozilla") {
                  releases(first: 100, orderBy: {field: CREATED_AT, direction: DESC}) {
                     nodes {
                        tagName
                        isLatest
                        isDraft
                        isPrerelease
                     }
                  }
               }
            }
         `
      )
      const latestValidRelease: string = repository.releases.nodes.find(
         ({tagName, isLatest, isDraft, isPreRelease}) =>
            isValidVersion(tagName) && isLatest && !isDraft && !isPreRelease
      )?.tagName

      if (latestValidRelease) return latestValidRelease
   } catch (err) {
      core.warning(
         `Error while fetching latest Sops release: ${err.toString()}. Using default version ${stableSopsVersion}`
      )
      return stableSopsVersion
   }

   core.warning(
      `Could not find valid release. Using default version ${stableSopsVersion}`
   )
   return stableSopsVersion
}

// isValidVersion checks if verison is a stable release
function isValidVersion(version: string): boolean {
   return version.indexOf('rc') == -1
}

export function getExecutableExtension(): string {
   if (os.type().match(/^Win/)) {
      return '.exe'
   }
   return ''
}

const LINUX = 'Linux'
const MAC_OS = 'Darwin'
const WINDOWS = 'Windows_NT'
const ARM64 = 'arm64'
export function getSopsDownloadURL(version: string): string {
   const arch = os.arch()
   const operatingSystem = os.type()

   switch (true) {
      case operatingSystem == LINUX && arch == ARM64:
         return util.format(
            'https://github.com/mozilla/sops/releases/download/%s/sops-%s.linux.arm64',
            version
         )
      case operatingSystem == LINUX:
         return util.format(
            'https://github.com/mozilla/sops/releases/download/%s/sops-%s.linux.amd64',
            version
         )

      case operatingSystem == MAC_OS && arch == ARM64:
         return util.format(
            'https://github.com/mozilla/sops/releases/download/%s/sops-%s.darwin.arm64',
            version
         )
      case operatingSystem == MAC_OS:
         return util.format(
            'https://github.com/mozilla/sops/releases/download/%s/sops-%s.darwin.amd64',
            version
         )

      case operatingSystem == WINDOWS:
      default:
         return util.format(
            'https://github.com/mozilla/sops/releases/download/%s/sops-%s.exe',
            version
         )
   }
}

export async function downloadSops(version: string): Promise<string> {
   let cachedToolpath = toolCache.find(sopsToolName, version)
   if (!cachedToolpath) {
      let sopsDownloadPath
      try {
         sopsDownloadPath = await toolCache.downloadTool(
            getSopsDownloadURL(version)
         )
      } catch (exception) {
         throw new Error(
            `Failed to download Sops from location ${getSopsDownloadURL(
               version
            )}`
         )
      }

      fs.chmodSync(sopsDownloadPath, '777')
      const unzipedSopsPath = await toolCache.extractZip(sopsDownloadPath)
      cachedToolpath = await toolCache.cacheDir(
         unzipedSopsPath,
         sopsToolName,
         version
      )
   }

   const sopspath = findSops(cachedToolpath)
   if (!sopspath) {
      throw new Error(
         util.format('Sops executable not found in path', cachedToolpath)
      )
   }

   fs.chmodSync(sopspath, '777')
   return sopspath
}

export function findSops(rootFolder: string): string {
   fs.chmodSync(rootFolder, '777')
   var filelist: string[] = []
   walkSync(rootFolder, filelist, sopsToolName + getExecutableExtension())
   if (!filelist || filelist.length == 0) {
      throw new Error(
         util.format('Sops executable not found in path', rootFolder)
      )
   } else {
      return filelist[0]
   }
}

export var walkSync = function (dir, filelist, fileToFind) {
   var files = fs.readdirSync(dir)
   filelist = filelist || []
   files.forEach(function (file) {
      if (fs.statSync(path.join(dir, file)).isDirectory()) {
         filelist = walkSync(path.join(dir, file), filelist, fileToFind)
      } else {
         core.debug(file)
         if (file == fileToFind) {
            filelist.push(path.join(dir, file))
         }
      }
   })
   return filelist
}

run().catch(core.setFailed)

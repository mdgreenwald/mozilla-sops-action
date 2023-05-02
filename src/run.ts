// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import * as semver from 'semver';
import * as toolCache from '@actions/tool-cache';
import * as core from '@actions/core';

const sopsToolName = 'sops';
const stableSopsVersion = 'v3.7.3';
const sopsAllReleasesUrl = 'https://api.github.com/repos/mozilla/sops/releases';

function getExecutableExtension(): string {
    return os.type().match(/^Win/) ? '.exe' : '';
}

function getSopsDownloadURL(version: string): string {
    const baseUrl = `https://github.com/mozilla/sops/releases/download/${version}/sops-${version}`;

    switch (os.type()) {
        case 'Linux':
            return `${baseUrl}.linux.amd64`;
        case 'Darwin':
            return `${baseUrl}.darwin.amd64`;
        case 'Windows_NT':
        default:
            return `${baseUrl}.exe`;
    }
}

async function getStableSopsVersion(): Promise<string> {
    try {
        const downloadPath = await toolCache.downloadTool(sopsAllReleasesUrl);
        const responseArray = JSON.parse(fs.readFileSync(downloadPath, 'utf8').toString().trim());
        const latestSopsVersion = responseArray
            .map(response => response?.tag_name.toString())
            .filter(tag => tag && !tag.includes('rc'))
            .reduce((latest, current) => semver.gt(current, latest) ? current : latest, semver.clean(stableSopsVersion));
        
        return 'v' + latestSopsVersion;
    } catch (error) {
        core.warning(`Cannot get the latest Sops info from ${sopsAllReleasesUrl}. Error ${error}. Using default Sops version ${stableSopsVersion}`);
        return stableSopsVersion;
    }
}

function walkSync(dir: string, fileToFind: string): string[] {
    let files: string[];

    try {
        files = fs.readdirSync(dir);
    } catch (error) {
        core.warning(`Error reading directory "${dir}": ${error.message}`);
        return [];
    }

    let filelist: string[] = [];

    files.forEach(file => {
        const filePath = path.join(dir, file);
        let stat: fs.Stats;

        try {
            stat = fs.statSync(filePath);
        } catch (error) {
            core.warning(`Error getting stats of "${filePath}": ${error.message}`);
            return;
        }

        if (stat.isDirectory()) {
            filelist = filelist.concat(walkSync(filePath, fileToFind));
        } else if (file === fileToFind) {
            filelist.push(filePath);
        }
    });

    return filelist;
};


async function downloadSops(version?: string): Promise<string> {
    if (!version) version = await getStableSopsVersion();
    
    let cachedToolpath = toolCache.find(sopsToolName, version);

    if (!cachedToolpath) {
        let sopsDownloadPath;

        try {
            sopsDownloadPath = await toolCache.downloadTool(getSopsDownloadURL(version));
        } catch (exception) {
            throw new Error(`Failed to download Sops from location ${getSopsDownloadURL(version)}. Error: ${exception.message}`);
        }

        fs.chmodSync(sopsDownloadPath, '755');
        cachedToolpath = await toolCache.cacheFile(sopsDownloadPath, sopsToolName + getExecutableExtension(), sopsToolName, version);
    }

    const sopspath = findSops(cachedToolpath);
    if (!sopspath) {
        throw new Error(`Sops executable not found in path ${cachedToolpath}`);
    }

    fs.chmodSync(sopspath, '755');
    return sopspath;
}

function findSops(rootFolder: string): string {
    fs.chmodSync(rootFolder, '755');
    const filelist = walkSync(rootFolder, sopsToolName + getExecutableExtension());

    if (!filelist.length) {
        throw new Error(`Sops executable not found in path ${rootFolder}`);
    }

    return filelist[0];
}

async function run() {
    let version = core.getInput('version', { 'required': true });

    if (version.toLowerCase() === 'latest') {
        version = await getStableSopsVersion();
    } else if (!version.toLowerCase().startsWith('v')) {
        version = 'v' + version;
    }

    const cachedPath = await downloadSops(version);

    try {
        if (!process.env['PATH'].startsWith(path.dirname(cachedPath))) {
            core.addPath(path.dirname(cachedPath));
        }
    } catch {
        // do nothing, set as output variable
    }

    console.log(`Sops tool version: '${version}' has been cached at ${cachedPath}`);
    core.setOutput('sops-path', cachedPath);
}

run().catch(core.setFailed);

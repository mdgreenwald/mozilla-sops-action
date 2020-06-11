// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from 'os';
import * as path from 'path';
import * as util from 'util';
import * as fs from 'fs';
import * as semver from 'semver';

import * as toolCache from '@actions/tool-cache';
import * as core from '@actions/core';

const sopsToolName = 'sops';
const stableSopsVersion = 'v3.5.0';
const sopsAllReleasesUrl = 'https://api.github.com/repos/mozilla/sops/releases';

function getExecutableExtension(): string {
    if (os.type().match(/^Win/)) {
        return '.exe';
    }
    return '';
}

function getSopsDownloadURL(version: string): string {
    switch (os.type()) {
        case 'Linux':
            return util.format('https://github.com/mozilla/sops/releases/download/%s/sops-%s.linux', version, version);

        case 'Darwin':
            return util.format('https://github.com/mozilla/sops/releases/download/%s/sops-%s.darwin', version, version);

        case 'Windows_NT':
        default:
            return util.format('https://github.com/mozilla/sops/releases/download/%s/sops-%s.exe', version, version);
    }
}

async function getstableSopsVersion(): Promise<string> {
    try {
        const downloadPath = await toolCache.downloadTool(sopsAllReleasesUrl);
        const responseArray = JSON.parse(fs.readFileSync(downloadPath, 'utf8').toString().trim());
        let latestSopsVersion = semver.clean(stableSopsVersion);
        responseArray.forEach(response => {
            if (response && response.tag_name) {
                let currentSopsVerison = semver.clean(response.tag_name.toString());
                if (currentSopsVerison) {
                    if (currentSopsVerison.toString().indexOf('rc') == -1 && semver.gt(currentSopsVerison, latestSopsVersion)) {
                        //If current sops version is not a pre release and is greater than latest sops version
                        latestSopsVersion = currentSopsVerison;
                    }
                }
            }
        });
        latestSopsVersion = "v" + latestSopsVersion;
        return latestSopsVersion;
    } catch (error) {
        core.warning(util.format("Cannot get the latest Sops info from %s. Error %s. Using default Sops version %s.", sopsAllReleasesUrl, error, stableSopsVersion));
    }

    return stableSopsVersion;
}


var walkSync = function (dir, filelist, fileToFind) {
    var files = fs.readdirSync(dir);
    filelist = filelist || [];
    files.forEach(function (file) {
        if (fs.statSync(path.join(dir, file)).isDirectory()) {
            filelist = walkSync(path.join(dir, file), filelist, fileToFind);
        }
        else {
            core.debug(file);
            if (file == fileToFind) {
                filelist.push(path.join(dir, file));
            }
        }
    });
    return filelist;
};

async function downloadSops(version: string): Promise<string> {
    if (!version) { version = await getstableSopsVersion(); }
    let cachedToolpath = toolCache.find(sopsToolName, version);
    if (!cachedToolpath) {
        let sopsDownloadPath;
        try {
            sopsDownloadPath = await toolCache.downloadTool(getSopsDownloadURL(version));
        } catch (exception) {
            throw new Error(util.format("Failed to download Sops from location ", getSopsDownloadURL(version)));
        }

        fs.chmodSync(sopsDownloadPath, '777');
        const unzipedSopsPath = await toolCache.extractZip(sopsDownloadPath);
        cachedToolpath = await toolCache.cacheDir(unzipedSopsPath, sopsToolName, version);
    }

    const sopspath = findSops(cachedToolpath);
    if (!sopspath) {
        throw new Error(util.format("Sops executable not found in path ", cachedToolpath));
    }

    fs.chmodSync(sopspath, '777');
    return sopspath;
}

function findSops(rootFolder: string): string {
    fs.chmodSync(rootFolder, '777');
    var filelist: string[] = [];
    walkSync(rootFolder, filelist, sopsToolName + getExecutableExtension());
    if (!filelist) {
        throw new Error(util.format("Sops executable not found in path ", rootFolder));
    }
    else {
        return filelist[0];
    }
}

async function run() {
    let version = core.getInput('version', { 'required': true });
    if (version.toLocaleLowerCase() === 'latest') {
        version = await getstableSopsVersion();
    } else if (!version.toLocaleLowerCase().startsWith('v')) {
        version = 'v' + version;
    }

    let cachedPath = await downloadSops(version);

    try {

        if (!process.env['PATH'].startsWith(path.dirname(cachedPath))) {
            core.addPath(path.dirname(cachedPath));
        }
    }
    catch {
        //do nothing, set as output variable
    }

    console.log(`Sops tool version: '${version}' has been cached at ${cachedPath}`);
    core.setOutput('sops-path', cachedPath);
}

run().catch(core.setFailed);

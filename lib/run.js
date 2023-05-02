"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const semver = __importStar(require("semver"));
const toolCache = __importStar(require("@actions/tool-cache"));
const core = __importStar(require("@actions/core"));
const sopsToolName = 'sops';
const stableSopsVersion = 'v3.7.3';
const sopsAllReleasesUrl = 'https://api.github.com/repos/mozilla/sops/releases';
function getExecutableExtension() {
    return os.type().match(/^Win/) ? '.exe' : '';
}
function getSopsDownloadURL(version) {
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
function getStableSopsVersion() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const downloadPath = yield toolCache.downloadTool(sopsAllReleasesUrl);
            const responseArray = JSON.parse(fs.readFileSync(downloadPath, 'utf8').toString().trim());
            const latestSopsVersion = responseArray
                .map(response => response === null || response === void 0 ? void 0 : response.tag_name.toString())
                .filter(tag => tag && !tag.includes('rc'))
                .reduce((latest, current) => semver.gt(current, latest) ? current : latest, semver.clean(stableSopsVersion));
            return 'v' + latestSopsVersion;
        }
        catch (error) {
            core.warning(`Cannot get the latest Sops info from ${sopsAllReleasesUrl}. Error ${error}. Using default Sops version ${stableSopsVersion}`);
            return stableSopsVersion;
        }
    });
}
function walkSync(dir, fileToFind) {
    let files;
    try {
        files = fs.readdirSync(dir);
    }
    catch (error) {
        core.warning(`Error reading directory "${dir}": ${error.message}`);
        return [];
    }
    let filelist = [];
    files.forEach(file => {
        const filePath = path.join(dir, file);
        let stat;
        try {
            stat = fs.statSync(filePath);
        }
        catch (error) {
            core.warning(`Error getting stats of "${filePath}": ${error.message}`);
            return;
        }
        if (stat.isDirectory()) {
            filelist = filelist.concat(walkSync(filePath, fileToFind));
        }
        else if (file === fileToFind) {
            filelist.push(filePath);
        }
    });
    return filelist;
}
;
function downloadSops(version) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!version)
            version = yield getStableSopsVersion();
        let cachedToolpath = toolCache.find(sopsToolName, version);
        if (!cachedToolpath) {
            let sopsDownloadPath;
            try {
                sopsDownloadPath = yield toolCache.downloadTool(getSopsDownloadURL(version));
            }
            catch (exception) {
                throw new Error(`Failed to download Sops from location ${getSopsDownloadURL(version)}. Error: ${exception.message}`);
            }
            fs.chmodSync(sopsDownloadPath, '755');
            cachedToolpath = yield toolCache.cacheFile(sopsDownloadPath, sopsToolName + getExecutableExtension(), sopsToolName, version);
        }
        const sopspath = findSops(cachedToolpath);
        if (!sopspath) {
            throw new Error(`Sops executable not found in path ${cachedToolpath}`);
        }
        fs.chmodSync(sopspath, '755');
        return sopspath;
    });
}
function findSops(rootFolder) {
    fs.chmodSync(rootFolder, '755');
    const filelist = walkSync(rootFolder, sopsToolName + getExecutableExtension());
    if (!filelist.length) {
        throw new Error(`Sops executable not found in path ${rootFolder}`);
    }
    return filelist[0];
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        let version = core.getInput('version', { 'required': true });
        if (version.toLowerCase() === 'latest') {
            version = yield getStableSopsVersion();
        }
        else if (!version.toLowerCase().startsWith('v')) {
            version = 'v' + version;
        }
        const cachedPath = yield downloadSops(version);
        try {
            if (!process.env['PATH'].startsWith(path.dirname(cachedPath))) {
                core.addPath(path.dirname(cachedPath));
            }
        }
        catch (_a) {
            // do nothing, set as output variable
        }
        console.log(`Sops tool version: '${version}' has been cached at ${cachedPath}`);
        core.setOutput('sops-path', cachedPath);
    });
}
run().catch(core.setFailed);

"use strict";
// Licensed under the MIT license.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
const util = __importStar(require("util"));
const fs = __importStar(require("fs"));
const semver = __importStar(require("semver"));
const toolCache = __importStar(require("@actions/tool-cache"));
const core = __importStar(require("@actions/core"));
const sopsToolName = 'sops';
const stableSopsVersion = 'v3.5.0';
const sopsAllReleasesUrl = 'https://api.github.com/repos/mozilla/sops/releases';
function getExecutableExtension() {
    if (os.type().match(/^Win/)) {
        return '.exe';
    }
    return '';
}
function getSopsDownloadURL(version) {
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
function getstableSopsVersion() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const downloadPath = yield toolCache.downloadTool(sopsAllReleasesUrl);
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
        }
        catch (error) {
            core.warning(util.format("Cannot get the latest Sops info from %s. Error %s. Using default Sops version %s.", sopsAllReleasesUrl, error, stableSopsVersion));
        }
        return stableSopsVersion;
    });
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
function downloadSops(version) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!version) {
            version = yield getstableSopsVersion();
        }
        let cachedToolpath = toolCache.find(sopsToolName, version);
        if (!cachedToolpath) {
            let sopsDownloadPath;
            try {
                sopsDownloadPath = yield toolCache.downloadTool(getSopsDownloadURL(version));
            }
            catch (exception) {
                throw new Error(util.format("Failed to download Sops from location ", getSopsDownloadURL(version)));
            }
            fs.chmodSync(sopsDownloadPath, '777');
            const unzipedSopsPath = yield toolCache.extractZip(sopsDownloadPath);
            cachedToolpath = yield toolCache.cacheDir(unzipedSopsPath, sopsToolName, version);
        }
        const sopspath = findSops(cachedToolpath);
        if (!sopspath) {
            throw new Error(util.format("Sops executable not found in path ", cachedToolpath));
        }
        fs.chmodSync(sopspath, '777');
        return sopspath;
    });
}
function findSops(rootFolder) {
    fs.chmodSync(rootFolder, '777');
    var filelist = [];
    walkSync(rootFolder, filelist, sopsToolName + getExecutableExtension());
    if (!filelist) {
        throw new Error(util.format("Sops executable not found in path ", rootFolder));
    }
    else {
        return filelist[0];
    }
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        let version = core.getInput('version', { 'required': true });
        if (version.toLocaleLowerCase() === 'latest') {
            version = yield getstableSopsVersion();
        }
        else if (!version.toLocaleLowerCase().startsWith('v')) {
            version = 'v' + version;
        }
        let cachedPath = yield downloadSops(version);
        try {
            if (!process.env['PATH'].startsWith(path.dirname(cachedPath))) {
                core.addPath(path.dirname(cachedPath));
            }
        }
        catch (_a) {
            //do nothing, set as output variable
        }
        console.log(`Sops tool version: '${version}' has been cached at ${cachedPath}`);
        core.setOutput('sops-path', cachedPath);
    });
}
run().catch(core.setFailed);

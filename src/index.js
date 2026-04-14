"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.JasperUtils = exports.JasperParametersFolder = exports.JasperParameters = exports.JasperCompileFolder = exports.JasperConfig = exports.JasperCompile = exports.JasperTS = void 0;
const fs = __importStar(require("node:fs/promises"));
const path = __importStar(require("node:path"));
const node_os_1 = require("node:os");
const node_crypto_1 = require("node:crypto");
const JasperUtils = __importStar(require("./jasper-utils"));
exports.JasperUtils = JasperUtils;
function getTempPath(suffix = '') {
    const uniqueId = (0, node_crypto_1.randomBytes)(8).toString('hex');
    const fileName = `temp_${uniqueId}${suffix}`;
    return path.join((0, node_os_1.tmpdir)(), fileName);
}
var java = null, extend = require('extend');
var defaults = { reports: {}, drivers: {}, conns: {}, tmpPath: '/tmp' };
async function walk(dir) {
    let results = [];
    const list = await fs.readdir(dir);
    for (const file of list) {
        const filePath = path.join(dir, file);
        const fileStat = await fs.stat(filePath).catch(() => null);
        if (fileStat && fileStat.isDirectory()) {
            const res = await walk(filePath);
            results = results.concat(res);
        }
        else {
            results.push(filePath);
        }
    }
    return results;
}
class JasperTS {
    options;
    parentPath;
    dm;
    jreds;
    jrjsonef;
    jbais;
    jcm;
    jrp;
    jrl;
    hm;
    jfm;
    jem;
    loc;
    tmpPath;
    defaultConn;
    validConnections = {};
    drivers;
    conns = {};
    reports = {};
    _isInitialized = false;
    constructor(options) {
        this.options = options;
    }
    async init() {
        if (!this._isInitialized)
            return;
        if (this.options.javaInstance) {
            java = this.options.javaInstance;
        }
        else {
            java = require('java');
        }
        if (!this.options.path) {
            path.dirname(module.filename).split(path.sep).pop() === 'src' ?
                this.options.path = path.join(path.dirname(module.filename), '../jar') :
                this.options.path = path.join(__dirname, './jar');
        }
        else {
            this.options.path = path.resolve(process.cwd(), this.options.path);
        }
        if (this.options.java) {
            if (Array.isArray(this.options.java)) {
                for (const javaOption of this.options.java) {
                    java.options.push(javaOption);
                }
                ;
            }
            if (typeof this.options.java == 'string') {
                java.options.push(this.options.java);
            }
        }
        var self = this;
        var jrPath = path.resolve(this.options.path || path.dirname(module.filename));
        self.parentPath = jrPath;
        const [jrJars, driverJars] = await Promise.allSettled([
            (async () => {
                try {
                    const [statsLib, statsDist] = await Promise.all([
                        fs.stat(path.join(jrPath, 'lib')).catch(() => null),
                        fs.stat(path.join(jrPath, 'dist')).catch(() => null)
                    ]);
                    const hasLibAndDist = statsLib?.isDirectory() && statsDist?.isDirectory();
                    if (hasLibAndDist) {
                        const [distFiles, libFiles] = await Promise.all([
                            walk(path.join(jrPath, 'dist')),
                            walk(path.join(jrPath, 'lib'))
                        ]);
                        return [...distFiles, ...libFiles];
                    }
                    else {
                        return await walk(jrPath);
                    }
                }
                catch (err) {
                    console.error("Erro ao buscar JARs do Jasper:", err);
                    throw err;
                }
            })(),
            (async () => {
                if (!this.options.drivers || !Array.isArray(this.options.drivers)) {
                    return [];
                }
                return this.options.drivers.map(driver => path.resolve(this.parentPath, driver.path));
            })()
        ]);
        let jrJarsValue = [];
        if (jrJars.status === 'fulfilled') {
            jrJarsValue = jrJars.value;
        }
        let driverJarsValue = [];
        if (driverJars.status === 'fulfilled') {
            driverJarsValue = driverJars.value;
        }
        const allJars = [...jrJarsValue, ...driverJarsValue];
        for (const file of allJars) {
            if (path.extname(file) === '.jar') {
                java.classpath.push(path.resolve(file));
            }
        }
        if (!this.options.debug) {
            this.options.debug = 'off';
        }
        const levels = ['ALL', 'TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL', 'OFF'];
        const debugLevel = (this.options.debug + '').toUpperCase();
        if (!levels.includes(debugLevel)) {
            this.options.debug = 'DEBUG';
        }
        try {
            const systemClassLoader = java.callStaticMethodSync("java.lang.ClassLoader", "getSystemClassLoader");
            if (this.options.drivers && Array.isArray(this.options.drivers)) {
                for (const driver of this.options.drivers) {
                    if (driver.class) {
                        systemClassLoader.loadClassSync(driver.class).newInstanceSync();
                    }
                }
            }
        }
        catch (err) {
            console.error("Erro ao carregar classes dos drivers JDBC:", err);
            throw err;
        }
        self.dm = java.import('java.sql.DriverManager');
        self.jreds = java.import('net.sf.jasperreports.engine.JREmptyDataSource');
        self.jrjsonef = java.import('net.sf.jasperreports.engine.data.JsonDataSource');
        self.jbais = java.import('java.io.ByteArrayInputStream');
        self.jcm = java.import('net.sf.jasperreports.engine.JasperCompileManager');
        self.jrp = java.import('net.sf.jasperreports.engine.JRParameter');
        self.jrl = java.import('net.sf.jasperreports.engine.util.JRLoader');
        self.hm = java.import('java.util.HashMap');
        self.jfm = java.import('net.sf.jasperreports.engine.JasperFillManager');
        self.jem = java.import('net.sf.jasperreports.engine.JasperExportManager');
        self.loc = java.import('java.util.Locale');
        delete this.options.path;
        extend(self, defaults, this.options);
        this._isInitialized = true;
    }
    ready(f) {
        var self = this;
        self.ready = f;
    }
    add(name, def) {
        this.reports[name] = def;
    }
    parseBigDecimal(value) {
        java.import('java.math.BigDecimal');
        let vBD = java.newInstanceSync('java.math.BigDecimal', value.toString());
        return vBD;
    }
    docx(report) {
        return this.export(report, 'docx');
    }
    xlsx(report) {
        return this.export(report, 'xlsx');
    }
    pptx(report) {
        return this.export(report, 'pptx');
    }
    pdf(report) {
        return this.export(report, 'pdf');
    }
    html(report) {
        return this.export(report, 'html');
    }
    xml(report, embeddingImages = true) {
        return this.export(report, 'xml', embeddingImages);
    }
    export(report, type, embeddingImages = false) {
        return new Promise(async (resolve, reject) => {
            if (["pdf", "xml", "html", "docx", "xlsx", "pptx"].indexOf(type) === -1)
                reject('Invalid type');
            try {
                var self = this;
                if (!type)
                    return;
                var _type = type.charAt(0).toUpperCase() + type.toLowerCase().slice(1);
                var processReport = function (report) {
                    if (typeof report == 'string') {
                        return [extend({}, self.reports[report])];
                    }
                    else if (Array.isArray(report)) {
                        var ret = [];
                        for (const i of report) {
                            ret = ret.concat(processReport(i));
                        }
                        return ret;
                    }
                    else if (typeof report == 'function') {
                        return processReport(report());
                    }
                    else if (typeof report == 'object') {
                        if (!report.data && !report.override) {
                            report.data = {};
                        }
                        if (report.data || report.override) {
                            var reps = processReport(report.report);
                            return reps.map(function (i) {
                                if (report.override) {
                                    extend(i, report.override);
                                }
                                i.data = report.data;
                                i.dataset = report.dataset;
                                i.query = report.query;
                                return i;
                            });
                        }
                        else {
                            return [report];
                        }
                    }
                };
                var processConn = function (conn, item) {
                    if (conn == 'in_memory_json') {
                        var jsonString = JSON.stringify(item.dataset);
                        var byteArray = [];
                        var buffer = Buffer.from(jsonString);
                        for (var i = 0; i < buffer.length; i++) {
                            byteArray.push(buffer[i]);
                        }
                        byteArray = java.newArray('byte', byteArray);
                        return new self.jrjsonef(new self.jbais(byteArray), item.query || '');
                    }
                    else if (typeof conn == 'string') {
                        conn = self.conns[conn];
                    }
                    else if (typeof conn == 'function') {
                        conn = conn();
                    }
                    else if (conn !== false && self.defaultConn) {
                        conn = self.conns[self.defaultConn];
                    }
                    if (conn) {
                        if (typeof conn.driver == 'string') {
                            conn.driver = self.drivers[conn.driver];
                        }
                        var connStr = conn.jdbc ? conn.jdbc : 'jdbc:' + conn.driver.type + '://' + conn.host + ':' + conn.port + '/' + conn.dbname;
                        if (!self.validConnections[connStr] || !self.validConnections[connStr].isValidSync(conn.validationTimeout || 1)) {
                            self.validConnections[connStr] = self.dm.getConnectionSync(connStr, conn.user, conn.pass);
                        }
                        return self.validConnections[connStr];
                    }
                    else {
                        return new self.jreds();
                    }
                };
                var parseLocale = function (localeString) {
                    var tokens = localeString.split(/[_|-]/);
                    if (tokens.length > 1) {
                        return self.loc(tokens[0], tokens[1]);
                    }
                    else {
                        return self.loc(tokens[0]);
                    }
                };
                var reports = processReport(report);
                var prints = [];
                for (const report of reports) {
                    const item = report;
                    if (!item.jasper && item.jrxml) {
                        item.jasper = self.compileSync(item.jrxml, self.tmpPath);
                    }
                    if (item.jasper) {
                        var data = null;
                        if (item.data) {
                            let params = self.getParametersSync({ jrxml: item.jrxml, jasper: item.jasper });
                            data = new self.hm();
                            for (var j in item.data) {
                                if (j === 'REPORT_LOCALE') {
                                    item.data[j] = parseLocale(item.data[j]);
                                }
                                if (params[j] && params[j].type === 'java.math.BigDecimal') {
                                    data.putSync(j, self.parseBigDecimal(item.data[j]));
                                }
                                else {
                                    data.putSync(j, item.data[j]);
                                }
                            }
                        }
                        var conn = processConn(item.conn, item);
                        var p = self.jfm.fillReportSync(path.resolve(self.parentPath, item.jasper), data, conn);
                        prints.push(p);
                    }
                }
                if (prints.length) {
                    var master = prints.shift();
                    for (const print of prints) {
                        var s = print.getPagesSync().sizeSync();
                        for (let j = 0; j < s; j++) {
                            master.addPageSync(p.getPagesSync().getSync(j));
                        }
                    }
                    var tempName = getTempPath(`.${_type.toLowerCase()}`);
                    if (type === 'docx') {
                        let docx = java.newInstanceSync("net.sf.jasperreports.engine.export.ooxml.JRDocxExporter");
                        let parameters = java.import("net.sf.jasperreports.engine.JRExporterParameter");
                        docx.setParameterSync(parameters.JASPER_PRINT, master);
                        docx.setParameterSync(parameters.OUTPUT_FILE_NAME, tempName);
                        docx.exportReportSync();
                    }
                    else if (type === "xlsx") {
                        let xlsx = java.newInstanceSync("net.sf.jasperreports.engine.export.ooxml.JRXlsxExporter");
                        let parameters = java.import("net.sf.jasperreports.engine.JRExporterParameter");
                        xlsx.setParameterSync(parameters.JASPER_PRINT, master);
                        xlsx.setParameterSync(parameters.OUTPUT_FILE_NAME, tempName);
                        xlsx.exportReportSync();
                    }
                    else if (type === "pptx") {
                        let pptx = java.newInstanceSync("net.sf.jasperreports.engine.export.ooxml.JRPptxExporter");
                        let parameters = java.import("net.sf.jasperreports.engine.JRExporterParameter");
                        pptx.setParameterSync(parameters.JASPER_PRINT, master);
                        pptx.setParameterSync(parameters.OUTPUT_FILE_NAME, tempName);
                        pptx.exportReportSync();
                    }
                    else if (type === 'xml') {
                        self.jem['exportReportTo' + _type + 'FileSync'](master, tempName, embeddingImages);
                    }
                    else {
                        self.jem['exportReportTo' + _type + 'FileSync'](master, tempName);
                    }
                    var exp = fs.readFile(tempName);
                    await fs.unlink(tempName);
                    resolve(exp);
                }
                resolve('');
            }
            catch (error) {
                reject(error);
            }
        });
    }
    async compileJRXMLInDirSync(params) {
        for (const file of (await fs.readdir(path.resolve(process.cwd(), params.dir)))) {
            if (path.extname(file) == '.jrxml') {
                this.compileSync(path.resolve(process.cwd(), params.dir, file), params.dstFolder);
            }
        }
        ;
    }
    compileAllSync(dstFolder) {
        var self = this;
        for (var name in self.reports) {
            var report = self.reports[name];
            if (report.jrxml) {
                report.jasper = self.compileSync(report.jrxml, path.resolve(process.cwd(), dstFolder || self.tmpPath));
            }
        }
    }
    compileSync(jrxmlFile, dstFolder) {
        var self = this;
        var name = path.basename(jrxmlFile, '.jrxml');
        var file = path.resolve(process.cwd(), path.join(dstFolder || self.tmpPath, name + '.jasper'));
        java.callStaticMethodSync("net.sf.jasperreports.engine.JasperCompileManager", "compileReportToFile", path.resolve(process.cwd(), jrxmlFile), file);
        return file;
    }
    static async compileAllSync(params) {
        var filesCompiled = [];
        var files = await fs.readdir(params.path);
        for (const file of files) {
            if (path.extname(file) == '.jrxml') {
                var name = path.basename(file, '.jrxml');
                filesCompiled.push(await JasperTS.compileSync({ pathFile: params.path, jrxmlFile: `${name}.jrxml`, dstFolder: params.dstFolder }));
            }
        }
        return filesCompiled;
    }
    static async compileSync(params) {
        java = require('java');
        let pathJar = null;
        path.dirname(module.filename).split(path.sep).pop() === 'src' ?
            pathJar = path.join(path.dirname(module.filename), '../jar') :
            pathJar = path.join(__dirname, './jar');
        let results = await walk(pathJar);
        for (const file of results) {
            if (path.extname(file) == '.jar') {
                java.classpath.push(file);
            }
        }
        var name = path.basename(params.jrxmlFile, '.jrxml');
        var file = path.join(params.dstFolder || '/tmp', name + '.jasper');
        java.callStaticMethodSync("net.sf.jasperreports.engine.JasperCompileManager", "compileReportToFile", path.resolve(params.pathFile, path.join(params.pathFile, params.jrxmlFile)), file);
        return file;
    }
    getParametersSync(options) {
        var jasperReport = null;
        if (options.jasper) {
            jasperReport = java.callStaticMethodSync("net.sf.jasperreports.engine.util.JRLoader", "loadObjectFromFile", options.jasper);
        }
        else if (options.jrxml) {
            jasperReport = java.callStaticMethodSync("net.sf.jasperreports.engine.JasperCompileManager", "compileReport", options.jrxml);
        }
        var parameters = jasperReport.getParametersSync();
        var result = {};
        for (var i = 0; i < parameters.length; i++) {
            var parameter = parameters[i];
            let description = parameter.getDescriptionSync();
            let propertieNames = parameter.getPropertiesMapSync().getPropertyNamesSync();
            let defaultValue = parameter.getDefaultValueExpressionSync();
            let properties = {};
            for (var j = 0; j < propertieNames.length; j++) {
                properties[propertieNames[j]] = parameter.getPropertiesMapSync().getPropertySync(propertieNames[j]);
            }
            if (parameter.getValueClassSync().toStringSync().indexOf('class') > -1) {
                result[parameter.getNameSync()] = { type: parameter.getValueClassSync().toStringSync().replace('class', '').trim(), defaultValue, description, isForPrompting: parameter.isSystemDefinedSync() ? false : parameter.isForPromptingSync(), properties };
            }
        }
        return result;
    }
    static async getParametersSync(options) {
        java = require('java');
        let pathJar = null;
        path.dirname(module.filename).split(path.sep).pop() === 'src' ?
            pathJar = path.join(path.dirname(module.filename), '../jar') :
            pathJar = path.join(__dirname, './jar');
        let results = await walk(pathJar);
        for (const file of results) {
            if (path.extname(file) == '.jar') {
                java.classpath.push(file);
            }
        }
        var jasperReport = null;
        if (options.jasper) {
            jasperReport = java.callStaticMethodSync("net.sf.jasperreports.engine.util.JRLoader", "loadObjectFromFile", options.jasper);
        }
        else if (options.jrxml) {
            jasperReport = java.callStaticMethodSync("net.sf.jasperreports.engine.JasperCompileManager", "compileReport", options.jrxml);
        }
        var parameters = jasperReport.getParametersSync();
        var result = {};
        for (var i = 0; i < parameters.length; i++) {
            var parameter = parameters[i];
            if (parameter.getValueClassSync().toStringSync().indexOf('class') > -1) {
                let description = parameter.getDescriptionSync();
                let propertieNames = parameter.getPropertiesMapSync().getPropertyNamesSync();
                let defaultValue = parameter.getDefaultValueExpressionSync();
                let properties = {};
                for (var j = 0; j < propertieNames.length; j++) {
                    properties[propertieNames[j]] = parameter.getPropertiesMapSync().getPropertySync(propertieNames[j]);
                }
                result[parameter.getNameSync()] = { type: parameter.getValueClassSync().toStringSync().replace('class', '').trim(), defaultValue, description, isForPrompting: parameter.isSystemDefinedSync() ? false : parameter.isForPromptingSync(), properties };
            }
        }
        return result;
    }
    static async getParametersAll(options) {
        var files = await fs.readdir(options.path);
        var result = {};
        for (const file of files) {
            if (path.extname(file) == '.jrxml') {
                var name = path.basename(file, '.jrxml');
                var params = JasperTS.getParametersSync({ jrxml: path.join(options.path, file) });
                if (options.grouped) {
                    result = {
                        ...result,
                        ...params
                    };
                }
                else {
                    result[name] = params;
                }
            }
        }
        return result;
    }
    toJsonDataSource(dataset, query) {
        var self = this;
        var jsonString = JSON.stringify(dataset);
        var byteArray = java.newArray('byte', jsonString.split('').map(function (c, i) {
            return java.newByte(jsonString.charCodeAt(i));
        }));
        return new self.jrjsonef(new self.jbais(byteArray), query || '');
    }
}
exports.JasperTS = JasperTS;
const JasperConfig = (options) => new JasperTS(options);
exports.JasperConfig = JasperConfig;
const JasperParameters = JasperTS.getParametersSync;
exports.JasperParameters = JasperParameters;
const JasperParametersFolder = JasperTS.getParametersAll;
exports.JasperParametersFolder = JasperParametersFolder;
const JasperCompile = JasperTS.compileSync;
exports.JasperCompile = JasperCompile;
const JasperCompileFolder = JasperTS.compileAllSync;
exports.JasperCompileFolder = JasperCompileFolder;
//# sourceMappingURL=index.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JasperUtils = exports.JasperParametersFolder = exports.JasperParameters = exports.JasperCompileFolder = exports.JasperConfig = exports.JasperCompile = void 0;
const JasperUtils = require("./jasper-utils");
exports.JasperUtils = JasperUtils;
var java = null, fs = require('fs'), path = require('path'), extend = require('extend'), util = require('util'), temp = require('temp'), async = require('async');
var defaults = { reports: {}, drivers: {}, conns: {}, tmpPath: '/tmp' };
function walk(dir, done) {
    var results = [];
    let list = [];
    let err = undefined;
    try {
        list = fs.readdirSync(dir);
    }
    catch (error) {
        err = error;
    }
    if (err)
        return done(err);
    var pending = list.length;
    if (!pending)
        return done(null, results);
    list.forEach(function (file) {
        file = path.join(dir, file);
        let stat = undefined;
        try {
            stat = fs.statSync(file);
        }
        catch (error) {
            stat = undefined;
        }
        if (stat && stat.isDirectory()) {
            walk(file, function (err, res) {
                results = results.concat(res);
                if (!--pending)
                    done(null, results);
            });
        }
        else {
            results.push(file);
            if (!--pending)
                done(null, results);
        }
    });
}
;
class JasperTS {
    constructor(options) {
        this.validConnections = {};
        this.conns = {};
        this.reports = {};
        this.options = options;
        this.initilizeOptions();
    }
    initilizeOptions() {
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
                this.options.java.forEach(function (javaOption) {
                    java.options.push(javaOption);
                });
            }
            if (typeof this.options.java == 'string') {
                java.options.push(this.options.java);
            }
        }
        var self = this;
        self.parentPath = path.dirname(module.filename);
        var jrPath = path.resolve(this.options.path || self.parentPath);
        async.auto({
            jrJars: function (cb) {
                if (fs.statSync(path.join(jrPath, 'lib')).isDirectory() && fs.statSync(path.join(jrPath, 'dist')).isDirectory()) {
                    async.parallel([
                        function (cb) {
                            walk(path.join(jrPath, 'dist'), function (err, results) {
                                cb(err, results);
                            });
                        },
                        function (cb) {
                            walk(path.join(jrPath, 'lib'), function (err, results) {
                                cb(err, results);
                            });
                        }
                    ], function (err, results) {
                        if (err)
                            return cb(err);
                        var r = results.shift();
                        results.forEach(function (item) {
                            r = r.concat(item);
                        });
                        cb(null, r);
                    });
                }
                else {
                    walk(jrPath, function (err, results) {
                        cb(err, results);
                    });
                }
            },
            dirverJars: function (cb) {
                var results = [];
                if (self.options.drivers) {
                    for (var i in self.options.drivers) {
                        results.push(path.resolve(self.parentPath, self.options.drivers[i].path));
                    }
                }
                cb(null, results);
            },
            loadJars: ['jrJars', 'dirverJars', function (cb, jars) {
                    jars.jrJars.concat(jars.dirverJars).forEach(function (file) {
                        if (path.extname(file) == '.jar') {
                            java.classpath.push(file);
                        }
                    });
                    cb();
                }],
            debug: ['loadJars', function (cb, results) {
                    if (!self.options.debug)
                        self.options.debug = 'off';
                    var levels = ['ALL', 'TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL', 'OFF'];
                    if (levels.indexOf((self.options.debug + '').toUpperCase()) == -1)
                        self.options.debug = 'DEBUG';
                    cb();
                }],
            loadClass: ['loadJars', function (cb, results) {
                    var cl = java.callStaticMethodSync("java.lang.ClassLoader", "getSystemClassLoader");
                    for (var i in self.options.drivers) {
                        cl.loadClassSync(self.options.drivers[i].class).newInstanceSync();
                    }
                    cb();
                }],
            imports: ['loadClass', function (cb, results) {
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
                    cb();
                }]
        }, function () {
            if (self.ready) {
                self.ready();
            }
        });
        delete this.options.path;
        extend(self, defaults, this.options);
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
        return new Promise((resolve, reject) => {
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
                        report.forEach(function (i) {
                            ret = ret.concat(processReport(i));
                        });
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
                reports.forEach(function (item) {
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
                });
                if (prints.length) {
                    var master = prints.shift();
                    prints.forEach(function (p) {
                        var s = p.getPagesSync().sizeSync();
                        for (var j = 0; j < s; j++) {
                            master.addPageSync(p.getPagesSync().getSync(j));
                        }
                    });
                    var tempName = temp.path({ suffix: `.${_type.toLowerCase()}` });
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
                    var exp = fs.readFileSync(tempName);
                    fs.unlinkSync(tempName);
                    resolve(exp);
                }
                resolve('');
            }
            catch (error) {
                reject(error);
            }
        });
    }
    compileJRXMLInDirSync(params) {
        fs.readdirSync(path.resolve(process.cwd(), params.dir)).forEach((file) => {
            if (path.extname(file) == '.jrxml') {
                this.compileSync(path.resolve(process.cwd(), params.dir, file), params.dstFolder);
            }
        });
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
    static compileAllSync(params) {
        var filesCompiled = [];
        var files = fs.readdirSync(params.path);
        files.forEach(function (file) {
            if (path.extname(file) == '.jrxml') {
                var name = path.basename(file, '.jrxml');
                filesCompiled.push(JasperTS.compileSync({ pathFile: params.path, jrxmlFile: `${name}.jrxml`, dstFolder: params.dstFolder }));
            }
        });
        return filesCompiled;
    }
    static compileSync(params) {
        java = require('java');
        let pathJar = null;
        path.dirname(module.filename).split(path.sep).pop() === 'src' ?
            pathJar = path.join(path.dirname(module.filename), '../jar') :
            pathJar = path.join(__dirname, './jar');
        walk(pathJar, function (err, results) {
            if (err)
                throw err;
            results.forEach(function (file) {
                if (path.extname(file) == '.jar') {
                    java.classpath.push(file);
                }
            });
        });
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
    static getParametersSync(options) {
        java = require('java');
        let pathJar = null;
        path.dirname(module.filename).split(path.sep).pop() === 'src' ?
            pathJar = path.join(path.dirname(module.filename), '../jar') :
            pathJar = path.join(__dirname, './jar');
        walk(pathJar, function (err, results) {
            if (err)
                throw err;
            results.forEach(function (file) {
                if (path.extname(file) == '.jar') {
                    java.classpath.push(file);
                }
            });
        });
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
    static getParametersAllSync(options) {
        var files = fs.readdirSync(options.path);
        var result = {};
        files.forEach(function (file) {
            if (path.extname(file) == '.jrxml') {
                var name = path.basename(file, '.jrxml');
                var params = JasperTS.getParametersSync({ jrxml: path.join(options.path, file) });
                if (options.grouped) {
                    result = Object.assign(Object.assign({}, result), params);
                }
                else {
                    result[name] = params;
                }
            }
        });
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
const JasperConfig = (options) => new JasperTS(options);
exports.JasperConfig = JasperConfig;
const JasperParameters = JasperTS.getParametersSync;
exports.JasperParameters = JasperParameters;
const JasperParametersFolder = JasperTS.getParametersAllSync;
exports.JasperParametersFolder = JasperParametersFolder;
const JasperCompile = JasperTS.compileSync;
exports.JasperCompile = JasperCompile;
const JasperCompileFolder = JasperTS.compileAllSync;
exports.JasperCompileFolder = JasperCompileFolder;
//# sourceMappingURL=index.js.map
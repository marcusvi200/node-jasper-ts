import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from "node:crypto";
import * as xml2js from 'xml2js';

import * as JasperUtils from "./jasper-utils";


function getTempPath(suffix = '') {
    // Gera 8 bytes aleatórios e converte para string hexadecimal (ex: 'f3a2b1c4')
    const uniqueId = randomBytes(8).toString('hex');
    const fileName = `temp_${uniqueId}${suffix}`;

    return path.join(tmpdir(), fileName);
}

function buildHierarchy(params: { name: string, parent?: string, children?: any[], [key: string]: any }[]) {
    const map = {};
    const root = { value: null, children: [] };

    // Mapeia os nós pelo nome
    for (const item of params) {
        item.children = [];
        map[item.name] = item;
    }

    // Constrói a hierarquia
    for (const item of params) {
        const parent = map[item.parent || '-'];
        if (parent) {
            parent.children.push(item);
        } else {
            root.children.push(item);
        }
    }

    root.value = root.children[0];

    return root;
}

var java = null,
    extend = require('extend')

var defaults = { reports: {}, drivers: {}, conns: {}, tmpPath: '/tmp' };

async function walk(dir: string): Promise<string[]> {
    let results: string[] = [];

    // 1. Lendo o diretório (readdir já retorna Promise no node:fs/promises)
    const list = await fs.readdir(dir);

    // 2. Usamos for...of para que o await funcione corretamente
    for (const file of list) {
        const filePath = path.join(dir, file);
        const fileStat = await fs.stat(filePath).catch(() => null);

        if (fileStat && fileStat.isDirectory()) {
            // 3. Recursão: aguarda os resultados da subpasta e concatena
            const res = await walk(filePath);
            results = results.concat(res);
        } else {
            // 4. É um arquivo, adiciona à lista
            results.push(filePath);
        }
    }

    return results;
}

export interface HierarchyInterface {
    folderJrxml: string,
    hierarchy: { value: any, children: any[] },
    subReportsLoaded: string[],
    compile: {
        [key: string]: {
            jrxml: string,
            conn: string
        }
    }
}

export interface ParametersJASPER {
    [key: string]: {
        type: string,
        description: string | null,
        defaultValue: any,
        isForPrompting: boolean,
        properties: {
            [key: string]: string
        }
    }
}

export interface options_reports {
    jasper?: string, //Path to jasper file,
    jrxml?: string, //Path to jrxml file,
    conn?: string, //Connection name, definition object or false (if false defaultConn won't apply)
    data?: any, //Data to be applied to the report
}

export interface options_drivers {
    path: string, //Path to jdbc driver jar
    class: string, //Class name of the
    type: string //Type of database (mysql, postgres)
}

export interface options_conns {
    host?: string, //Database hostname or IP
    port?: string, //Database Port
    dbname?: string, //Database Name
    user: string, //User Name
    pass: string, //User Password
    jdbc?: string, //jdbc connection string
    driver: string//name or definition of the driver for this conn
}

export interface options {
    path?: string, //Path to jasperreports-x.x.x-project directory
    tmpPath?: string, // Path to a folder for storing compiled report files
    reports: {
        // Report Definition
        [key: string]: options_reports
    },
    drivers: {
        // Driver Definition
        [key: string]: options_drivers
    },
    conns: {
        // Connection Definition
        [key: string]: options_conns
    },
    defaultConn: string, //Default Connection name
    java: string[]//Array of java options, for example ["-Djava.awt.headless=true"]
    javaInstance?: any, //Instance of java
    debug?: 'ALL' | 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL' | 'OFF' | 'off' //Debug level
}

export interface options_report {
    report: string | options_reports | Function, //Report name, definition object or function that returns a report name or definition
    data?: any, //Data to be applied to the report
    override?: any, //Override report definition
    dataset?: any, //Dataset to be used in the report
    query?: string //Query to be used in the report
}

export class JasperTS {
    private options: options;
    private parentPath: string;
    private dm: any;
    private jreds: any;
    private jrjsonef: any;
    private jbais: any;
    private jcm: any;
    private jrp: any;
    private jrl: any;
    private hm: any;
    private jfm: any;
    private jem: any;
    private loc: any;
    private tmpPath: string;
    private defaultConn: string;
    private validConnections = {};
    private drivers: { [key: string]: options_drivers };
    private conns: { [key: string]: options_conns } = {};
    private reports: { [key: string]: options_reports } = {};
    private _isInitialized: boolean = false;

    constructor(options: options) {
        this.options = options;
    }

    async init() {
        if (!this._isInitialized) return;

        if (this.options.javaInstance) {
            java = this.options.javaInstance
        } else {
            java = require('java')
        }

        if (!this.options.path) {
            path.dirname(module.filename).split(path.sep).pop() === 'src' ?
                this.options.path = path.join(path.dirname(module.filename), '../jar') :
                this.options.path = path.join(__dirname, './jar');
        } else {
            this.options.path = path.resolve(process.cwd(), this.options.path);
        }

        if (this.options.java) {
            if (Array.isArray(this.options.java)) {
                for (const javaOption of this.options.java) {
                    java.options.push(javaOption);
                };
            }
            if (typeof this.options.java == 'string') {
                java.options.push(this.options.java);
            }
        }
        var self = this;
        var jrPath = path.resolve(this.options.path || path.dirname(module.filename));
        self.parentPath = jrPath;

        const [jrJars, driverJars] = await Promise.allSettled([
            (async (): Promise<string[]> => {
                try {
                    // 1. Verifica o status das pastas lib e dist
                    // Usamos catch() retornando null para o caso da pasta não existir
                    const [statsLib, statsDist] = await Promise.all([
                        fs.stat(path.join(jrPath, 'lib')).catch(() => null),
                        fs.stat(path.join(jrPath, 'dist')).catch(() => null)
                    ]);

                    const hasLibAndDist = statsLib?.isDirectory() && statsDist?.isDirectory();

                    if (hasLibAndDist) {
                        // 2. Varre as duas pastas em paralelo
                        const [distFiles, libFiles] = await Promise.all([
                            walk(path.join(jrPath, 'dist')),
                            walk(path.join(jrPath, 'lib'))
                        ]);

                        // 3. Junta os resultados (Flat array)
                        return [...distFiles, ...libFiles];
                    } else {
                        // 4. Fallback: varre apenas a raiz
                        return await walk(jrPath);
                    }
                } catch (err) {
                    console.error("Erro ao buscar JARs do Jasper:", err);
                    throw err; // Lança o erro para quem chamou tratar
                }
            })(),
            (async (): Promise<string[]> => {
                // 1. Se não houver drivers, retorna um array vazio imediatamente
                if (!this.options.drivers || !Array.isArray(this.options.drivers)) {
                    return [];
                }

                // 2. Usamos .map para transformar os caminhos de forma limpa
                // path.resolve garante que o caminho seja absoluto para o node-java
                return this.options.drivers.map(driver =>
                    path.resolve(this.parentPath, driver.path)
                );
            })()
        ]);

        // BEGIN: loadJars
        let jrJarsValue: string[] = [];
        if (jrJars.status === 'fulfilled') {
            jrJarsValue = jrJars.value;
        }

        let driverJarsValue: string[] = [];
        if (driverJars.status === 'fulfilled') {
            driverJarsValue = driverJars.value;
        }

        const allJars = [...jrJarsValue, ...driverJarsValue]; // Uso de Spread operator (mais moderno que concat)

        for (const file of allJars) {
            if (path.extname(file) === '.jar') {
                java.classpath.push(path.resolve(file)); // resolve garante o caminho absoluto
            }
        }
        // END: loadJars

        // BEGIN: debug e loadClass
        if (!this.options.debug) {
            this.options.debug = 'off';
        }

        const levels = ['ALL', 'TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL', 'OFF'];
        const debugLevel = (this.options.debug + '').toUpperCase();

        if (!levels.includes(debugLevel)) {
            this.options.debug = 'DEBUG';
        }

        // Nota: O código de Log4j continua comentado para evitar o SIGSEGV mencionado no seu legado.
        // Se um dia for reativar, use java.newInstanceSync moderno.

        // --- 2. Equivalente ao segundo bloco (Carga dos Drivers no ClassLoader) ---
        try {
            const systemClassLoader = java.callStaticMethodSync("java.lang.ClassLoader", "getSystemClassLoader");

            if (this.options.drivers && Array.isArray(this.options.drivers)) {
                for (const driver of this.options.drivers) {
                    if (driver.class) {
                        // Carrega a classe do driver e instancia para registrar no DriverManager do Java
                        systemClassLoader.loadClassSync(driver.class).newInstanceSync();
                    }
                }
            }
        } catch (err) {
            console.error("Erro ao carregar classes dos drivers JDBC:", err);
            throw err;
        }
        // END: debug e loadClass

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

    ready(f?: () => void) {
        var self = this;
        self.ready = f;
    }

    add(name: any, def: any) {
        this.reports[name] = def;
    }

    parseBigDecimal(value: number | string | null | undefined) {
        java.import('java.math.BigDecimal');
        let vBD = java.newInstanceSync('java.math.BigDecimal', value.toString());
        return vBD;
    }

    docx(report: options_report): Promise<any> {
        return this.export(report, 'docx');
    }

    xlsx(report: options_report): Promise<any> {
        return this.export(report, 'xlsx');
    }

    pptx(report: options_report): Promise<any> {
        return this.export(report, 'pptx');
    }

    pdf(report: options_report): Promise<any> {
        return this.export(report, 'pdf');
    }

    html(report: options_report): Promise<any> {
        return this.export(report, 'html');
    }

    xml(report: options_report, embeddingImages: boolean = true): Promise<any> {
        return this.export(report, 'xml', embeddingImages);
    }

    export(report: options_report, type: "pdf" | "xml" | "html" | "docx" | "xlsx" | "pptx", embeddingImages: boolean = false): Promise<any> {
        return new Promise(async (resolve: (result: any) => void, reject: (reason?: any) => void) => {
            if (["pdf", "xml", "html", "docx", "xlsx", "pptx"].indexOf(type) === -1) reject('Invalid type');

            try {
                var self = this;

                if (!type) return;

                var _type = type.charAt(0).toUpperCase() + type.toLowerCase().slice(1);

                var processReport = function (report: any) {
                    if (typeof report == 'string') {
                        return [extend({}, self.reports[report])];
                    } else if (Array.isArray(report)) {
                        var ret = [];
                        for (const i of report) {
                            ret = ret.concat(processReport(i));
                        }
                        return ret;
                    } else if (typeof report == 'function') {
                        return processReport(report());
                    } else if (typeof report == 'object') {
                        if (!report.data && !report.override) {
                            report.data = {};
                        }

                        if (report.data || report.override) {
                            var reps = processReport(report.report);
                            return reps.map(function (i: any) {
                                if (report.override) {
                                    extend(i, report.override);
                                }
                                i.data = report.data;
                                i.dataset = report.dataset;
                                i.query = report.query;
                                return i;
                            })
                        } else {
                            return [report];
                        }
                    }
                };

                var processConn = function (conn: any, item: any) {
                    if (conn == 'in_memory_json') {
                        var jsonString = JSON.stringify(item.dataset);

                        var byteArray = [];
                        var buffer = Buffer.from(jsonString);
                        for (var i = 0; i < buffer.length; i++) {
                            byteArray.push(buffer[i]);
                        }
                        byteArray = java.newArray('byte', byteArray);

                        return new self.jrjsonef(new self.jbais(byteArray), item.query || '');
                    } else if (typeof conn == 'string') {
                        conn = self.conns[conn];
                    } else if (typeof conn == 'function') {
                        conn = conn();
                    } else if (conn !== false && self.defaultConn) {
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
                    } else {

                        return new self.jreds();

                    }

                };

                var parseLocale = function (localeString: string) {
                    var tokens = localeString.split(/[_|-]/);

                    if (tokens.length > 1) {
                        return self.loc(tokens[0], tokens[1]);
                    }
                    else {
                        return self.loc(tokens[0]);
                    }
                }

                var reports = processReport(report);
                var prints = [];

                for (const report of reports) {
                    const item: options_reports = report;

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
                                } else {
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
                    } else if (type === "xlsx") {
                        let xlsx = java.newInstanceSync("net.sf.jasperreports.engine.export.ooxml.JRXlsxExporter");
                        let parameters = java.import("net.sf.jasperreports.engine.JRExporterParameter");

                        xlsx.setParameterSync(parameters.JASPER_PRINT, master);
                        xlsx.setParameterSync(parameters.OUTPUT_FILE_NAME, tempName);
                        xlsx.exportReportSync();
                    } else if (type === "pptx") {
                        let pptx = java.newInstanceSync("net.sf.jasperreports.engine.export.ooxml.JRPptxExporter");
                        let parameters = java.import("net.sf.jasperreports.engine.JRExporterParameter");

                        pptx.setParameterSync(parameters.JASPER_PRINT, master);
                        pptx.setParameterSync(parameters.OUTPUT_FILE_NAME, tempName);
                        pptx.exportReportSync();
                    } else if (type === 'xml') {
                        self.jem['exportReportTo' + _type + 'FileSync'](master, tempName, embeddingImages);
                    } else {
                        self.jem['exportReportTo' + _type + 'FileSync'](master, tempName);
                    }

                    var exp = fs.readFile(tempName);
                    await fs.unlink(tempName);
                    resolve(exp);
                }
                resolve('');
            } catch (error) {
                reject(error);
            }
        });
    }

    async compileJRXMLInDirSync(params: { dir: string, dstFolder?: string | undefined }) {
        for (const file of (await fs.readdir(path.resolve(process.cwd(), params.dir)))) {
            if (path.extname(file) == '.jrxml') {
                this.compileSync(path.resolve(process.cwd(), params.dir, file), params.dstFolder);
            }
        };
    }

    compileAllSync(dstFolder?: string | undefined) {
        var self = this;
        for (var name in self.reports) {
            var report = self.reports[name];
            if (report.jrxml) {
                report.jasper = self.compileSync(report.jrxml, path.resolve(process.cwd(), dstFolder || self.tmpPath));
            }
        }
    }

    compileSync(jrxmlFile: string, dstFolder?: string | undefined) {
        var self = this;
        var name = path.basename(jrxmlFile, '.jrxml');
        var file = path.resolve(process.cwd(), path.join(dstFolder || self.tmpPath, name + '.jasper'));
        java.callStaticMethodSync(
            "net.sf.jasperreports.engine.JasperCompileManager",
            "compileReportToFile",
            path.resolve(process.cwd(), jrxmlFile), file
        );
        return file;
    }

    static async compileAllSync(params: { path: string, dstFolder: string | undefined }) {
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

    static async compileSync(params: { pathFile: string, jrxmlFile: string, dstFolder: string | undefined }) {
        java = require('java');

        let pathJar: string | null = null;

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
        java.callStaticMethodSync(
            "net.sf.jasperreports.engine.JasperCompileManager",
            "compileReportToFile",
            path.resolve(params.pathFile, path.join(params.pathFile, params.jrxmlFile)), file
        );
        return file;
    }

    getParametersSync(options: { jrxml?: string, jasper?: string }): ParametersJASPER {
        var jasperReport = null;
        if (options.jasper) {
            jasperReport = java.callStaticMethodSync(
                "net.sf.jasperreports.engine.util.JRLoader",
                "loadObjectFromFile",
                options.jasper
            );
        } else if (options.jrxml) {
            jasperReport = java.callStaticMethodSync(
                "net.sf.jasperreports.engine.JasperCompileManager",
                "compileReport",
                options.jrxml
            );
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

    static async getParametersSync(options: { jrxml?: string, jasper?: string }): Promise<ParametersJASPER> {
        java = require('java');

        let pathJar: string | null = null;

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
            jasperReport = java.callStaticMethodSync(
                "net.sf.jasperreports.engine.util.JRLoader",
                "loadObjectFromFile",
                options.jasper
            );
        } else if (options.jrxml) {
            jasperReport = java.callStaticMethodSync(
                "net.sf.jasperreports.engine.JasperCompileManager",
                "compileReport",
                options.jrxml
            );
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

    static async getParametersAll(options: { path: string, grouped?: boolean }): Promise<ParametersJASPER> {
        var files = await fs.readdir(options.path);
        var result = {};
        for (const file of files) {
            if (path.extname(file) == '.jrxml') {
                var name = path.basename(file, '.jrxml');
                var params = await JasperTS.getParametersSync({ jrxml: path.join(options.path, file) });
                if (options.grouped) {
                    result = {
                        ...result,
                        ...params
                    };
                } else {
                    result[name] = params;
                }
            }
        }
        return result;
    }

    static async getReportsJRXML(options: { path: string, connDefault: string }) {
        let jrxmls: { jrxml: string, conn: string }[] = [];
        let files = await walk(options.path);
        for (const file of files) {
            if (path.extname(file) === '.jrxml') {
                jrxmls.push({ jrxml: file, conn: options.connDefault });
            }
        }

        return jrxmls;
    }

    toJsonDataSource(dataset: any, query: string) {
        var self = this;
        var jsonString = JSON.stringify(dataset);
        var byteArray = java.newArray('byte', jsonString.split('').map(function (c, i) {
            return java.newByte(jsonString.charCodeAt(i));
        }));
        return new self.jrjsonef(new self.jbais(byteArray), query || '');
    }

    static async mountHierarchy(options: { folder: string, conn: string }): Promise<HierarchyInterface> {
        let folderCompile = path.resolve(options.folder);

        let contentFolder = await fs.readdir(folderCompile);

        let reports = contentFolder.filter((item) => item.includes(".jrxml"));

        if (reports.length === 0) {
            throw new Error('No reports found');
        }

        let filesToCompile: { [key: string]: { jrxml: string, conn: string } } = {};
        let subReportsLoaded: string[] = [];
        let joinReports: { name: string, children: string[], parent: string }[] = [];

        for (let i = 0; i < reports.length; i++) {
            let filePath = path.resolve(folderCompile, reports[i]);
            let report = await xml2js.parseStringPromise(Buffer.from((await fs.readFile(filePath)).buffer));
            let reportName = reports[i].replace(".jrxml", "");
            let nameReport = report.jasperReport.$.name;
            let nameFormatted = `${nameReport || reportName}`;

            let subreports = await Promise.all((Buffer.from((await fs.readFile(filePath)).buffer).toString().match(/<subreport[\s\S]*?>[\s\S]*?<\/subreport>/g) || [])
                .map(async (sub: any) => {
                    return await xml2js.parseStringPromise(sub);
                })
            );

            if (!subReportsLoaded.includes(nameFormatted)) {
                subReportsLoaded.push(nameFormatted);
            }

            if (subreports.length > 0) {
                for (let j = 0; j < subreports.length; j++) {
                    let subreport = subreports[j];
                    let keySubreport = subreport.subreport.reportElement[0]['$']['key'];

                    if (!keySubreport) {
                        throw new Error(`Key not found in subreport ${nameFormatted}`);
                    } else {
                        let find = joinReports.find(jr => jr.name === nameFormatted);
                        if (!find) {
                            joinReports.push({ name: nameFormatted, children: [], parent: "" });
                            find = joinReports.find(jr => jr.name === nameFormatted);
                        }

                        find.children.push(keySubreport);

                        let findSub = joinReports.find(jr => jr.name === keySubreport);
                        if (!findSub) {
                            joinReports.push({ name: keySubreport, children: [], parent: nameFormatted });
                        } else {
                            findSub.parent = nameFormatted;
                        }
                    }
                }
            } else {
                let find = joinReports.find(jr => jr.name === nameFormatted);
                if (!find) {
                    joinReports.push({ name: nameFormatted, children: [], parent: "" });
                }
            }

            filesToCompile = {
                ...filesToCompile,
                [nameFormatted]: {
                    jrxml: filePath,
                    conn: options.conn
                }
            }
        }

        let hierarchy = buildHierarchy(joinReports);

        return { hierarchy: hierarchy, subReportsLoaded, compile: filesToCompile, folderJrxml: folderCompile };
    }
}

const JasperConfig = (options: options) => new JasperTS(options);

const JasperParameters = JasperTS.getParametersSync;
const JasperParametersFolder = JasperTS.getParametersAll;

const JasperCompile = JasperTS.compileSync;
const JasperCompileFolder = JasperTS.compileAllSync;
const JasperGetReportsJRXML = JasperTS.getReportsJRXML;
const JasperMountHierarchy = JasperTS.mountHierarchy;

export { JasperCompile, JasperConfig, JasperCompileFolder, JasperGetReportsJRXML, JasperParameters, JasperParametersFolder, JasperUtils, JasperMountHierarchy };
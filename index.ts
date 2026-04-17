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

    /**
     * Initializes the Java bridge, loads Jasper dependencies, and prepares the instance for report operations.
     */
    async init() {
        if (this._isInitialized) return;

        if (this.options.javaInstance) {
            java = this.options.javaInstance
        } else {
            java = require('java')
        }

        if (!this.options.path) {
            path.dirname(module.filename).split(path.sep).pop() === 'src' ?
                this.options.path = path.join(path.dirname(module.filename), '../jar') :
                this.options.path = path.join(__dirname, '../jar');
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
        this.parentPath = jrPath;

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

        this.dm = java.import('java.sql.DriverManager');
        this.jreds = java.import('net.sf.jasperreports.engine.JREmptyDataSource');
        this.jrjsonef = java.import('net.sf.jasperreports.engine.data.JsonDataSource');
        this.jbais = java.import('java.io.ByteArrayInputStream');
        this.jcm = java.import('net.sf.jasperreports.engine.JasperCompileManager');
        this.jrp = java.import('net.sf.jasperreports.engine.JRParameter');
        this.jrl = java.import('net.sf.jasperreports.engine.util.JRLoader');
        this.hm = java.import('java.util.HashMap');
        this.jfm = java.import('net.sf.jasperreports.engine.JasperFillManager');
        this.jem = java.import('net.sf.jasperreports.engine.JasperExportManager');
        this.loc = java.import('java.util.Locale');

        delete this.options.path;
        extend(self, defaults, this.options);

        this._isInitialized = true;
    }

    /**
     * Registers a callback intended to run when the instance is ready to be used.
     *
     * @param f Optional callback to be stored as the ready handler.
     */
    ready(f?: () => void) {
        var self = this;
        this.ready = f;
    }

    /**
     * Adds or replaces a report definition in the current Jasper instance.
     *
     * @param name Report key used later when exporting by report name.
     * @param def Report definition containing paths, connection, and optional data.
     */
    add(name: any, def: any) {
        this.reports[name] = def;
    }

    /**
     * Converts a JavaScript numeric value into a Java BigDecimal instance for Jasper parameters.
     *
     * @param value Number or numeric string to be converted before sending it to Java.
     */
    parseBigDecimal(value: number | string | null | undefined) {
        java.import('java.math.BigDecimal');
        let vBD = java.newInstanceSync('java.math.BigDecimal', value.toString());
        return vBD;
    }

    /**
     * Exports a report as DOCX.
     *
     * @param report Report name or report configuration used to render the output.
     */
    docx(report: options_report): Promise<Buffer> {
        return this.export(report, 'docx');
    }

    /**
     * Exports a report as XLSX.
     *
     * @param report Report name or report configuration used to render the output.
     */
    xlsx(report: options_report): Promise<Buffer> {
        return this.export(report, 'xlsx');
    }

    /**
     * Exports a report as PPTX.
     *
     * @param report Report name or report configuration used to render the output.
     */
    pptx(report: options_report): Promise<Buffer> {
        return this.export(report, 'pptx');
    }

    /**
     * Exports a report as PDF.
     *
     * @param report Report name or report configuration used to render the output.
     */
    pdf(report: options_report): Promise<Buffer> {
        return this.export(report, 'pdf');
    }

    /**
     * Exports a report as HTML.
     *
     * @param report Report name or report configuration used to render the output.
     */
    html(report: options_report): Promise<Buffer> {
        return this.export(report, 'html');
    }

    /**
     * Exports a report as XML.
     *
     * @param report Report name or report configuration used to render the output.
     * @param embeddingImages When true, embeds report images directly into the XML export.
     */
    xml(report: options_report, embeddingImages: boolean = true): Promise<Buffer> {
        return this.export(report, 'xml', embeddingImages);
    }

    /**
     * Renders one or more reports and exports the final result in the requested format.
     *
     * @param report Report name, definition, array of definitions, or wrapper object with data overrides.
     * @param type Output format to generate.
     * @param embeddingImages Applies only to XML export and controls whether images are embedded.
     */
    export(report: options_report, type: "pdf" | "xml" | "html" | "docx" | "xlsx" | "pptx", embeddingImages: boolean = false): Promise<Buffer> {
        return new Promise(async (resolve: (result: any) => void, reject: (reason?: any) => void) => {
            if (["pdf", "xml", "html", "docx", "xlsx", "pptx"].indexOf(type) === -1) reject('Invalid type');

            try {
                var self = this;

                if (!type) return;

                var _type = type.charAt(0).toUpperCase() + type.toLowerCase().slice(1);

                var processReport = (report: any) => {
                    if (typeof report == 'string') {
                        return [extend({}, this.reports[report])];
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

                var processConn = (conn: any, item: any) => {
                    if (conn == 'in_memory_json') {
                        var jsonString = JSON.stringify(item.dataset);

                        var byteArray = [];
                        var buffer = Buffer.from(jsonString);
                        for (var i = 0; i < buffer.length; i++) {
                            byteArray.push(buffer[i]);
                        }
                        byteArray = java.newArray('byte', byteArray);

                        return new this.jrjsonef(new this.jbais(byteArray), item.query || '');
                    } else if (typeof conn == 'string') {
                        conn = this.conns[conn];
                    } else if (typeof conn == 'function') {
                        conn = conn();
                    } else if (conn !== false && this.defaultConn) {
                        conn = this.conns[this.defaultConn];
                    }

                    if (conn) {
                        if (typeof conn.driver == 'string') {
                            conn.driver = this.drivers[conn.driver];
                        }
                        var connStr = conn.jdbc ? conn.jdbc : 'jdbc:' + conn.driver.type + '://' + conn.host + ':' + conn.port + '/' + conn.dbname;

                        if (!this.validConnections[connStr] || !this.validConnections[connStr].isValidSync(conn.validationTimeout || 1)) {
                            this.validConnections[connStr] = this.dm.getConnectionSync(connStr, conn.user, conn.pass);
                        }
                        return this.validConnections[connStr];
                    } else {

                        return new this.jreds();

                    }

                };

                var parseLocale = (localeString: string) => {
                    var tokens = localeString.split(/[_|-]/);

                    if (tokens.length > 1) {
                        return this.loc(tokens[0], tokens[1]);
                    }
                    else {
                        return this.loc(tokens[0]);
                    }
                }

                var reports = processReport(report);
                var prints = [];

                for (const report of reports) {
                    const item: options_reports = report;

                    if (!item.jasper && item.jrxml) {
                        item.jasper = this.compileSync(item.jrxml, this.options.tmpPath);
                    }

                    if (item.jasper) {
                        var data = null;
                        if (item.data) {

                            let params = this.getParametersSync({ jrxml: item.jrxml, jasper: item.jasper });
                            data = new this.hm();
                            for (var j in item.data) {
                                if (j === 'REPORT_LOCALE') {
                                    item.data[j] = parseLocale(item.data[j]);
                                }

                                if (params[j] && params[j].type === 'java.math.BigDecimal') {
                                    data.putSync(j, this.parseBigDecimal(item.data[j]));
                                } else {
                                    data.putSync(j, item.data[j]);
                                }
                            }
                        }

                        var conn = processConn(item.conn, item);
                        var p = this.jfm.fillReportSync(path.resolve(this.parentPath, item.jasper), data, conn);
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
                        this.jem['exportReportTo' + _type + 'FileSync'](master, tempName, embeddingImages);
                    } else {
                        this.jem['exportReportTo' + _type + 'FileSync'](master, tempName);
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

    /**
     * Compiles every .jrxml file found directly inside a directory.
     *
     * @param params.dir Folder containing the JRXML files to compile.
     * @param params.dstFolder Optional destination folder for generated .jasper files.
     */
    async compileJRXMLInDirSync(params: { dir: string, dstFolder?: string | undefined }) {
        for (const file of (await fs.readdir(path.resolve(process.cwd(), params.dir)))) {
            if (path.extname(file) == '.jrxml') {
                this.compileSync(path.resolve(process.cwd(), params.dir, file), params.dstFolder);
            }
        };
    }

    /**
     * Compiles all report definitions already registered in this instance.
     *
     * @param dstFolder Optional output folder for compiled .jasper files.
     */
    compileAllSync(dstFolder?: string | undefined) {
        var self = this;
        for (var name in this.reports) {
            var report = this.reports[name];
            if (report.jrxml) {
                report.jasper = this.compileSync(report.jrxml, path.resolve(process.cwd(), dstFolder || this.options.tmpPath || defaults.tmpPath));
            }
        }
    }

    /**
     * Compiles a single JRXML file into a Jasper file using the current instance configuration.
     *
     * @param jrxmlFile JRXML file path to compile.
     * @param dstFolder Optional destination folder for the generated .jasper file.
     */
    compileSync(jrxmlFile: string, dstFolder?: string | undefined) {
        var self = this;
        var name = path.basename(jrxmlFile, '.jrxml');
        var file = path.resolve(process.cwd(), path.join(dstFolder || this.options.tmpPath || defaults.tmpPath, name + '.jasper'));
        java.callStaticMethodSync(
            "net.sf.jasperreports.engine.JasperCompileManager",
            "compileReportToFile",
            path.resolve(process.cwd(), jrxmlFile), file
        );
        return file;
    }

    /**
     * Compiles every JRXML file found in the provided folder without needing an instance.
     *
     * @param params.path Folder that contains the JRXML files.
     * @param params.dstFolder Destination folder for generated .jasper files.
     */
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

    /**
     * Compiles a single JRXML file without creating a JasperTS instance.
     *
     * @param params.pathFile Base folder used to resolve the JRXML path.
     * @param params.jrxmlFile JRXML file name or relative path to compile.
     * @param params.dstFolder Destination folder for the generated .jasper file.
     */
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

    /**
     * Reads the declared Jasper parameters from a JRXML or compiled Jasper file.
     *
     * @param options.jrxml Optional JRXML file path to inspect.
     * @param options.jasper Optional compiled Jasper file path to inspect.
     */
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

    /**
     * Reads the declared Jasper parameters from a JRXML or compiled Jasper file without creating an instance.
     *
     * @param options.jrxml Optional JRXML file path to inspect.
     * @param options.jasper Optional compiled Jasper file path to inspect.
     */
    static async getParametersSync(options: { jrxml?: string, jasper?: string }): Promise<ParametersJASPER> {
        java = require('java');

        let pathJar: string | null = null;

        path.dirname(module.filename).split(path.sep).pop() === 'src' ?
            pathJar = path.join(path.dirname(module.filename), '../jar') :
            pathJar = path.join(__dirname, '../jar');


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

    /**
     * Reads parameters from all JRXML files in a folder.
     *
     * @param options.path Folder containing the JRXML files to inspect.
     * @param options.grouped When true, merges all parameters into a single object keyed by parameter name.
     */
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

    /**
     * Lists every JRXML file in a folder tree and associates each one with a default connection.
     *
     * @param options.path Root folder to scan recursively for JRXML files.
     * @param options.connDefault Connection key assigned to every discovered report.
     */
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

    /**
     * Converts a JavaScript dataset into a Jasper JSON data source.
     *
     * @param dataset Plain object or array that will be serialized to JSON.
     * @param query JSON query used by Jasper to read the serialized dataset.
     */
    toJsonDataSource(dataset: any, query: string) {
        var self = this;
        var jsonString = JSON.stringify(dataset);
        var byteArray = java.newArray('byte', jsonString.split('').map(function (c, i) {
            return java.newByte(jsonString.charCodeAt(i));
        }));
        return new this.jrjsonef(new this.jbais(byteArray), query || '');
    }

    /**
     * Builds the report hierarchy for a folder of JRXML files and prepares metadata used by the Nest service.
     *
     * @param options.folder Folder containing the JRXML files to analyze.
     * @param options.conn Connection key assigned to the discovered report definitions.
     */
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

/**
 * Creates a configured JasperTS instance.
 *
 * @param options Jasper initialization options such as report definitions, drivers, and connections.
 */
const JasperConfig = (options: options) => new JasperTS(options);

const JasperParameters = JasperTS.getParametersSync;
const JasperParametersFolder = JasperTS.getParametersAll;

const JasperCompile = JasperTS.compileSync;
const JasperCompileFolder = JasperTS.compileAllSync;
const JasperGetReportsJRXML = JasperTS.getReportsJRXML;
const JasperMountHierarchy = JasperTS.mountHierarchy;

export { JasperCompile, JasperConfig, JasperCompileFolder, JasperGetReportsJRXML, JasperParameters, JasperParametersFolder, JasperUtils, JasperMountHierarchy };
/// <reference types="node" />
/// <reference types="node" />
import * as JasperUtils from "./jasper-utils";
export interface HierarchyInterface {
    folderJrxml: string;
    hierarchy: {
        value: any;
        children: any[];
    };
    subReportsLoaded: string[];
    compile: {
        [key: string]: {
            jrxml: string;
            conn: string;
        };
    };
}
export interface ParametersJASPER {
    [key: string]: {
        type: string;
        description: string | null;
        defaultValue: any;
        isForPrompting: boolean;
        properties: {
            [key: string]: string;
        };
    };
}
export interface options_reports {
    jasper?: string;
    jrxml?: string;
    conn?: string;
    data?: any;
}
export interface options_drivers {
    path: string;
    class: string;
    type: string;
}
export interface options_conns {
    host?: string;
    port?: string;
    dbname?: string;
    user: string;
    pass: string;
    jdbc?: string;
    driver: string;
}
export interface options {
    path?: string;
    tmpPath?: string;
    reports: {
        [key: string]: options_reports;
    };
    drivers: {
        [key: string]: options_drivers;
    };
    conns: {
        [key: string]: options_conns;
    };
    defaultConn: string;
    java: string[];
    javaInstance?: any;
    debug?: 'ALL' | 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL' | 'OFF' | 'off';
}
export interface options_report {
    report: string | options_reports | Function;
    data?: any;
    override?: any;
    dataset?: any;
    query?: string;
}
export declare class JasperTS {
    private options;
    private parentPath;
    private dm;
    private jreds;
    private jrjsonef;
    private jbais;
    private jcm;
    private jrp;
    private jrl;
    private hm;
    private jfm;
    private jem;
    private loc;
    private tmpPath;
    private defaultConn;
    private validConnections;
    private drivers;
    private conns;
    private reports;
    private _isInitialized;
    constructor(options: options);
    /**
     * Initializes the Java bridge, loads Jasper dependencies, and prepares the instance for report operations.
     */
    init(): Promise<void>;
    /**
     * Registers a callback intended to run when the instance is ready to be used.
     *
     * @param f Optional callback to be stored as the ready handler.
     */
    ready(f?: () => void): void;
    /**
     * Adds or replaces a report definition in the current Jasper instance.
     *
     * @param name Report key used later when exporting by report name.
     * @param def Report definition containing paths, connection, and optional data.
     */
    add(name: any, def: any): void;
    /**
     * Converts a JavaScript numeric value into a Java BigDecimal instance for Jasper parameters.
     *
     * @param value Number or numeric string to be converted before sending it to Java.
     */
    parseBigDecimal(value: number | string | null | undefined): any;
    /**
     * Exports a report as DOCX.
     *
     * @param report Report name or report configuration used to render the output.
     */
    docx(report: options_report): Promise<Buffer>;
    /**
     * Exports a report as XLSX.
     *
     * @param report Report name or report configuration used to render the output.
     */
    xlsx(report: options_report): Promise<Buffer>;
    /**
     * Exports a report as PPTX.
     *
     * @param report Report name or report configuration used to render the output.
     */
    pptx(report: options_report): Promise<Buffer>;
    /**
     * Exports a report as PDF.
     *
     * @param report Report name or report configuration used to render the output.
     */
    pdf(report: options_report): Promise<Buffer>;
    /**
     * Exports a report as HTML.
     *
     * @param report Report name or report configuration used to render the output.
     */
    html(report: options_report): Promise<Buffer>;
    /**
     * Exports a report as XML.
     *
     * @param report Report name or report configuration used to render the output.
     * @param embeddingImages When true, embeds report images directly into the XML export.
     */
    xml(report: options_report, embeddingImages?: boolean): Promise<Buffer>;
    /**
     * Renders one or more reports and exports the final result in the requested format.
     *
     * @param report Report name, definition, array of definitions, or wrapper object with data overrides.
     * @param type Output format to generate.
     * @param embeddingImages Applies only to XML export and controls whether images are embedded.
     */
    export(report: options_report, type: "pdf" | "xml" | "html" | "docx" | "xlsx" | "pptx", embeddingImages?: boolean): Promise<Buffer>;
    /**
     * Compiles every .jrxml file found directly inside a directory.
     *
     * @param params.dir Folder containing the JRXML files to compile.
     * @param params.dstFolder Optional destination folder for generated .jasper files.
     */
    compileJRXMLInDirSync(params: {
        dir: string;
        dstFolder?: string | undefined;
    }): Promise<void>;
    /**
     * Compiles all report definitions already registered in this instance.
     *
     * @param dstFolder Optional output folder for compiled .jasper files.
     */
    compileAllSync(dstFolder?: string | undefined): void;
    /**
     * Compiles a single JRXML file into a Jasper file using the current instance configuration.
     *
     * @param jrxmlFile JRXML file path to compile.
     * @param dstFolder Optional destination folder for the generated .jasper file.
     */
    compileSync(jrxmlFile: string, dstFolder?: string | undefined): string;
    /**
     * Compiles every JRXML file found in the provided folder without needing an instance.
     *
     * @param params.path Folder that contains the JRXML files.
     * @param params.dstFolder Destination folder for generated .jasper files.
     */
    static compileAllSync(params: {
        path: string;
        dstFolder: string | undefined;
    }): Promise<any[]>;
    /**
     * Compiles a single JRXML file without creating a JasperTS instance.
     *
     * @param params.pathFile Base folder used to resolve the JRXML path.
     * @param params.jrxmlFile JRXML file name or relative path to compile.
     * @param params.dstFolder Destination folder for the generated .jasper file.
     */
    static compileSync(params: {
        pathFile: string;
        jrxmlFile: string;
        dstFolder: string | undefined;
    }): Promise<string>;
    /**
     * Reads the declared Jasper parameters from a JRXML or compiled Jasper file.
     *
     * @param options.jrxml Optional JRXML file path to inspect.
     * @param options.jasper Optional compiled Jasper file path to inspect.
     */
    getParametersSync(options: {
        jrxml?: string;
        jasper?: string;
    }): ParametersJASPER;
    /**
     * Reads the declared Jasper parameters from a JRXML or compiled Jasper file without creating an instance.
     *
     * @param options.jrxml Optional JRXML file path to inspect.
     * @param options.jasper Optional compiled Jasper file path to inspect.
     */
    static getParametersSync(options: {
        jrxml?: string;
        jasper?: string;
    }): Promise<ParametersJASPER>;
    /**
     * Reads parameters from all JRXML files in a folder.
     *
     * @param options.path Folder containing the JRXML files to inspect.
     * @param options.grouped When true, merges all parameters into a single object keyed by parameter name.
     */
    static getParametersAll(options: {
        path: string;
        grouped?: boolean;
    }): Promise<ParametersJASPER>;
    /**
     * Lists every JRXML file in a folder tree and associates each one with a default connection.
     *
     * @param options.path Root folder to scan recursively for JRXML files.
     * @param options.connDefault Connection key assigned to every discovered report.
     */
    static getReportsJRXML(options: {
        path: string;
        connDefault: string;
    }): Promise<{
        jrxml: string;
        conn: string;
    }[]>;
    /**
     * Converts a JavaScript dataset into a Jasper JSON data source.
     *
     * @param dataset Plain object or array that will be serialized to JSON.
     * @param query JSON query used by Jasper to read the serialized dataset.
     */
    toJsonDataSource(dataset: any, query: string): any;
    /**
     * Builds the report hierarchy for a folder of JRXML files and prepares metadata used by the Nest service.
     *
     * @param options.folder Folder containing the JRXML files to analyze.
     * @param options.conn Connection key assigned to the discovered report definitions.
     */
    static mountHierarchy(options: {
        folder: string;
        conn: string;
    }): Promise<HierarchyInterface>;
}
/**
 * Creates a configured JasperTS instance.
 *
 * @param options Jasper initialization options such as report definitions, drivers, and connections.
 */
declare const JasperConfig: (options: options) => JasperTS;
declare const JasperParameters: typeof JasperTS.getParametersSync;
declare const JasperParametersFolder: typeof JasperTS.getParametersAll;
declare const JasperCompile: typeof JasperTS.compileSync;
declare const JasperCompileFolder: typeof JasperTS.compileAllSync;
declare const JasperGetReportsJRXML: typeof JasperTS.getReportsJRXML;
declare const JasperMountHierarchy: typeof JasperTS.mountHierarchy;
export { JasperCompile, JasperConfig, JasperCompileFolder, JasperGetReportsJRXML, JasperParameters, JasperParametersFolder, JasperUtils, JasperMountHierarchy };
//# sourceMappingURL=index.d.ts.map
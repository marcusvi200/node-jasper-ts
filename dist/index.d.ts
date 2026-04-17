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
    init(): Promise<void>;
    ready(f?: () => void): void;
    add(name: any, def: any): void;
    parseBigDecimal(value: number | string | null | undefined): any;
    docx(report: options_report): Promise<BinaryType>;
    xlsx(report: options_report): Promise<BinaryType>;
    pptx(report: options_report): Promise<BinaryType>;
    pdf(report: options_report): Promise<BinaryType>;
    html(report: options_report): Promise<BinaryType>;
    xml(report: options_report, embeddingImages?: boolean): Promise<BinaryType>;
    export(report: options_report, type: "pdf" | "xml" | "html" | "docx" | "xlsx" | "pptx", embeddingImages?: boolean): Promise<BinaryType>;
    compileJRXMLInDirSync(params: {
        dir: string;
        dstFolder?: string | undefined;
    }): Promise<void>;
    compileAllSync(dstFolder?: string | undefined): void;
    compileSync(jrxmlFile: string, dstFolder?: string | undefined): string;
    static compileAllSync(params: {
        path: string;
        dstFolder: string | undefined;
    }): Promise<any[]>;
    static compileSync(params: {
        pathFile: string;
        jrxmlFile: string;
        dstFolder: string | undefined;
    }): Promise<string>;
    getParametersSync(options: {
        jrxml?: string;
        jasper?: string;
    }): ParametersJASPER;
    static getParametersSync(options: {
        jrxml?: string;
        jasper?: string;
    }): Promise<ParametersJASPER>;
    static getParametersAll(options: {
        path: string;
        grouped?: boolean;
    }): Promise<ParametersJASPER>;
    static getReportsJRXML(options: {
        path: string;
        connDefault: string;
    }): Promise<{
        jrxml: string;
        conn: string;
    }[]>;
    toJsonDataSource(dataset: any, query: string): any;
    static mountHierarchy(options: {
        folder: string;
        conn: string;
    }): Promise<HierarchyInterface>;
}
declare const JasperConfig: (options: options) => JasperTS;
declare const JasperParameters: typeof JasperTS.getParametersSync;
declare const JasperParametersFolder: typeof JasperTS.getParametersAll;
declare const JasperCompile: typeof JasperTS.compileSync;
declare const JasperCompileFolder: typeof JasperTS.compileAllSync;
declare const JasperGetReportsJRXML: typeof JasperTS.getReportsJRXML;
declare const JasperMountHierarchy: typeof JasperTS.mountHierarchy;
export { JasperCompile, JasperConfig, JasperCompileFolder, JasperGetReportsJRXML, JasperParameters, JasperParametersFolder, JasperUtils, JasperMountHierarchy };

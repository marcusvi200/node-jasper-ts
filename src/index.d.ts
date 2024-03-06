interface options_reports {
    jasper?: string;
    jrxml?: string;
    conn?: string;
    data?: any;
}
interface options_drivers {
    path: string;
    class: string;
    type: string;
}
interface options_conns {
    host?: string;
    port?: string;
    dbname?: string;
    user: string;
    pass: string;
    jdbc?: string;
    driver: string;
}
interface options {
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
declare class JasperTS {
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
    constructor(options: options);
    private initilizeOptions;
    ready(f?: () => void): void;
    add(name: any, def: any): void;
    parseBigDecimal(value: number | string | null | undefined): any;
    pdf(report: {
        report: any;
        data: any;
    }): Promise<any>;
    export(report: any, type: string): Promise<any>;
    compileAllSync(dstFolder?: string | undefined): void;
    compileSync(jrxmlFile: string, dstFolder?: string | undefined): any;
    static compileAllSync(params: {
        path: string;
        dstFolder: string | undefined;
    }): any[];
    static compileSync(params: {
        pathFile: string;
        jrxmlFile: string;
        dstFolder: string | undefined;
    }): any;
    getParametersSync(options: {
        jrxml?: string;
        jasper?: string;
    }): {};
    static getParametersSync(options: {
        jrxml?: string;
        jasper?: string;
    }): {};
    static getParametersAllSync(options: {
        path: string;
        grouped?: boolean;
    }): {};
    toJsonDataSource(dataset: any, query: string): any;
}
declare const JasperConfig: (options: options) => JasperTS;
declare const JasperParameters: typeof JasperTS.getParametersSync;
declare const JasperParametersFolder: typeof JasperTS.getParametersAllSync;
declare const JasperCompile: typeof JasperTS.compileSync;
declare const JasperCompileFolder: typeof JasperTS.compileAllSync;
export { JasperCompile, JasperConfig, JasperCompileFolder, JasperParameters, JasperParametersFolder };

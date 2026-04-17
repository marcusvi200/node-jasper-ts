/// <reference types="node" />
/// <reference types="node" />
import { HierarchyInterface, JasperTS, ParametersJASPER } from '../index';
import type { optionsJasperInitial } from './interfaces/jasper-options.interface';
export declare class JasperService {
    private readonly baseOptions;
    constructor(baseOptions: optionsJasperInitial);
    /**
     * Creates a report helper bound to a folder of JRXML files and a configured connection.
     *
     * @param options.dirReport Folder containing the main report and its subreports.
     * @param options.conn Connection key used to resolve the configured datasource.
     */
    createReport(options: {
        dirReport: string;
        conn: string;
    }): Promise<Report>;
    /**
     * Reads report parameters from a JRXML folder, excluding Jasper internal system parameters.
     *
     * @param options.dirReport Folder containing the JRXML files to inspect.
     * @param options.grouped When true, merges all parameters into a single object.
     */
    getParameters(options: {
        dirReport: string;
        grouped?: boolean;
    }): Promise<ParametersJASPER>;
}
declare class Report {
    jasperInstance: JasperTS;
    private hierarchy;
    private dirReport;
    data: any;
    constructor(jasperInstance: JasperTS, hierarchy: HierarchyInterface, dirReport: string);
    /**
     * Normalizes and stores report parameters before export.
     *
     * @param data Object containing the parameter values that should be formatted for Jasper.
     */
    loadParameters(data: {
        [key: string]: any;
    }): Promise<Report>;
    /**
     * Exports the current report as PDF using the loaded parameters.
     */
    pdf(): Promise<Buffer>;
    /**
     * Exports the current report as XLSX using the loaded parameters.
     */
    xlsx(): Promise<Buffer>;
    /**
     * Exports the current report as DOCX using the loaded parameters.
     */
    docx(): Promise<Buffer>;
    /**
     * Exports the current report as XML using the loaded parameters.
     *
     * @param embeddingImages When true, embeds report images directly into the XML output.
     */
    xml(embeddingImages?: boolean): Promise<Buffer>;
    /**
     * Exports the current report as HTML using the loaded parameters.
     */
    html(): Promise<Buffer>;
    /**
     * Exports the current report as PPTX using the loaded parameters.
     */
    pptx(): Promise<Buffer>;
}
export {};
//# sourceMappingURL=jasper.service.d.ts.map
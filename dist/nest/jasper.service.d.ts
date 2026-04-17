/// <reference types="node" />
/// <reference types="node" />
import { HierarchyInterface, JasperTS, ParametersJASPER } from '../index';
import type { optionsJasperInitial } from './interfaces/jasper-options.interface';
export declare class JasperService {
    private readonly baseOptions;
    constructor(baseOptions: optionsJasperInitial);
    createReport(options: {
        dirReport: string;
        conn: string;
    }): Promise<Report>;
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
    loadParameters(data: {
        [key: string]: any;
    }): Promise<Report>;
    pdf(): Promise<Buffer>;
    xlsx(): Promise<Buffer>;
    docx(): Promise<Buffer>;
    xml(embeddingImages?: boolean): Promise<Buffer>;
    html(): Promise<Buffer>;
    pptx(): Promise<Buffer>;
}
export {};

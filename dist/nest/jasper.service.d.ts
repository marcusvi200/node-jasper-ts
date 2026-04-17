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
    pdf(): Promise<BinaryType>;
    xlsx(): Promise<BinaryType>;
    docx(): Promise<BinaryType>;
    xml(embeddingImages?: boolean): Promise<BinaryType>;
    html(): Promise<BinaryType>;
    pptx(): Promise<BinaryType>;
}
export {};

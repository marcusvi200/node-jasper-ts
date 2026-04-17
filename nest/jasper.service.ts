import { Injectable, Inject } from '@nestjs/common';
import { HierarchyInterface, JasperConfig, JasperMountHierarchy, JasperParametersFolder, JasperTS, JasperUtils, options_reports, ParametersJASPER } from '../index';
import type { optionsJasperInitial } from './interfaces/jasper-options.interface';
import path from 'node:path';

const paramsDefaultIReport = [
    'REPORT_CLASS_LOADER',
    'REPORT_RESOURCE_BUNDLE',
    'REPORT_TIME_ZONE',
    'REPORT_LOCALE',
    'REPORT_MAX_COUNT',
    'REPORT_SCRIPTLET',
    'JASPER_REPORT',
    'IS_IGNORE_PAGINATION',
    'REPORT_CONNECTION',
    'REPORT_DATA_SOURCE',
    'REPORT_CONTEXT',
    'REPORT_PARAMETERS_MAP'
];

@Injectable()
export class JasperService {
    constructor(
        @Inject('JASPER_OPTIONS') private readonly baseOptions: optionsJasperInitial
    ) { }

    /**
     * Creates a report helper bound to a folder of JRXML files and a configured connection.
     *
     * @param options.dirReport Folder containing the main report and its subreports.
     * @param options.conn Connection key used to resolve the configured datasource.
     */
    async createReport(options: { dirReport: string, conn: string }): Promise<Report> {
        let tmpPath = this.baseOptions.tmpPath ?
            path.resolve(process.cwd(), this.baseOptions.tmpPath)
            : options.dirReport;

        let dirReport = path.resolve(process.cwd(), options.dirReport);

        let hierarchy = await JasperMountHierarchy({
            folder: options.dirReport,
            conn: options.conn
        });

        const fullConfig = {
            ...this.baseOptions,
            tmpPath: tmpPath,
            reports: hierarchy.compile,
        };

        const jasperInstance = JasperConfig(fullConfig);
        await jasperInstance.init();

        jasperInstance.compileAllSync(dirReport);

        return new Report(
            jasperInstance,
            hierarchy,
            dirReport
        );
    }

    /**
     * Reads report parameters from a JRXML folder, excluding Jasper internal system parameters.
     *
     * @param options.dirReport Folder containing the JRXML files to inspect.
     * @param options.grouped When true, merges all parameters into a single object.
     */
    async getParameters(options: { dirReport: string, grouped?: boolean }): Promise<ParametersJASPER> {
        let params = await JasperParametersFolder({ path: options.dirReport, grouped: options.grouped });
        for (const param in params) {
            if (paramsDefaultIReport.indexOf(param) !== -1) {
                delete params[param];
            }
        }
        return params;
    }
}

class Report {
    data: any = {};

    constructor(
        public jasperInstance: JasperTS,
        private hierarchy: HierarchyInterface,
        private dirReport: string
    ) { }

    /**
     * Normalizes and stores report parameters before export.
     *
     * @param data Object containing the parameter values that should be formatted for Jasper.
     */
    async loadParameters(data: { [key: string]: any }): Promise<Report> {
        let params = await JasperParametersFolder({ path: this.dirReport, grouped: true });
        for (const key of Object.keys(data)) {
            if (paramsDefaultIReport.indexOf(key) === -1 && params[key]) {
                if (data && data[key] !== undefined) {
                    data[key] = JasperUtils.formatValue(data[key], JasperUtils.typeParam(params[key].type), null);
                } else {
                    data[key] = params[key].defaultValue;
                }
            } else {
                delete data[key];
            }
        }

        this.data = data;

        return this;
    }

    /**
     * Exports the current report as PDF using the loaded parameters.
     */
    async pdf() {
        const pdfBuffer = await this.jasperInstance.pdf({
            report: this.hierarchy.hierarchy.value.name,
            data: {
                ...this.data
            }
        });

        return pdfBuffer;
    }

    /**
     * Exports the current report as XLSX using the loaded parameters.
     */
    async xlsx() {
        const xlsxBuffer = await this.jasperInstance.xlsx({
            report: this.hierarchy.hierarchy.value.name,
            data: {
                ...this.data
            }
        });

        return xlsxBuffer;
    }

    /**
     * Exports the current report as DOCX using the loaded parameters.
     */
    async docx() {
        const docxBuffer = await this.jasperInstance.docx({
            report: this.hierarchy.hierarchy.value.name,
            data: {
                ...this.data
            }
        });
        return docxBuffer;
    }

    /**
     * Exports the current report as XML using the loaded parameters.
     *
     * @param embeddingImages When true, embeds report images directly into the XML output.
     */
    async xml(embeddingImages?: boolean) {
        const xmlBuffer = await this.jasperInstance.xml({
            report: this.hierarchy.hierarchy.value.name,
            data: {
                ...this.data
            }
        }, embeddingImages);
        return xmlBuffer;
    }

    /**
     * Exports the current report as HTML using the loaded parameters.
     */
    async html() {
        const htmlBuffer = await this.jasperInstance.html({
            report: this.hierarchy.hierarchy.value.name,
            data: {
                ...this.data
            }
        });
        return htmlBuffer;
    }

    /**
     * Exports the current report as PPTX using the loaded parameters.
     */
    async pptx() {
        const pptxBuffer = await this.jasperInstance.pptx({
            report: this.hierarchy.hierarchy.value.name,
            data: {
                ...this.data
            }
        });
        return pptxBuffer;
    }

}
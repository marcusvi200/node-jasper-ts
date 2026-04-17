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

    async pdf() {
        const pdfBuffer = await this.jasperInstance.pdf({
            report: this.hierarchy.hierarchy.value.name,
            data: {
                ...this.data
            }
        });

        return pdfBuffer;
    }

    async xlsx() {
        const xlsxBuffer = await this.jasperInstance.xlsx({
            report: this.hierarchy.hierarchy.value.name,
            data: {
                ...this.data
            }
        });

        return xlsxBuffer;
    }

    async docx() {
        const docxBuffer = await this.jasperInstance.docx({
            report: this.hierarchy.hierarchy.value.name,
            data: {
                ...this.data
            }
        });
        return docxBuffer;
    }

    async xml(embeddingImages?: boolean) {
        const xmlBuffer = await this.jasperInstance.xml({
            report: this.hierarchy.hierarchy.value.name,
            data: {
                ...this.data
            }
        }, embeddingImages);
        return xmlBuffer;
    }

    async html() {
        const htmlBuffer = await this.jasperInstance.html({
            report: this.hierarchy.hierarchy.value.name,
            data: {
                ...this.data
            }
        });
        return htmlBuffer;
    }

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
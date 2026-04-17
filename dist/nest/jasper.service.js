"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JasperService = void 0;
const common_1 = require("@nestjs/common");
const index_1 = require("../index");
const node_path_1 = __importDefault(require("node:path"));
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
let JasperService = class JasperService {
    baseOptions;
    constructor(baseOptions) {
        this.baseOptions = baseOptions;
    }
    /**
     * Creates a report helper bound to a folder of JRXML files and a configured connection.
     *
     * @param options.dirReport Folder containing the main report and its subreports.
     * @param options.conn Connection key used to resolve the configured datasource.
     */
    async createReport(options) {
        let tmpPath = this.baseOptions.tmpPath ?
            node_path_1.default.resolve(process.cwd(), this.baseOptions.tmpPath)
            : options.dirReport;
        let dirReport = node_path_1.default.resolve(process.cwd(), options.dirReport);
        let hierarchy = await (0, index_1.JasperMountHierarchy)({
            folder: options.dirReport,
            conn: options.conn
        });
        const fullConfig = {
            ...this.baseOptions,
            tmpPath: tmpPath,
            reports: hierarchy.compile,
        };
        const jasperInstance = (0, index_1.JasperConfig)(fullConfig);
        await jasperInstance.init();
        jasperInstance.compileAllSync(dirReport);
        return new Report(jasperInstance, hierarchy, dirReport);
    }
    /**
     * Reads report parameters from a JRXML folder, excluding Jasper internal system parameters.
     *
     * @param options.dirReport Folder containing the JRXML files to inspect.
     * @param options.grouped When true, merges all parameters into a single object.
     */
    async getParameters(options) {
        let params = await (0, index_1.JasperParametersFolder)({ path: options.dirReport, grouped: options.grouped });
        for (const param in params) {
            if (paramsDefaultIReport.indexOf(param) !== -1) {
                delete params[param];
            }
        }
        return params;
    }
};
JasperService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('JASPER_OPTIONS')),
    __metadata("design:paramtypes", [Object])
], JasperService);
exports.JasperService = JasperService;
class Report {
    jasperInstance;
    hierarchy;
    dirReport;
    data = {};
    constructor(jasperInstance, hierarchy, dirReport) {
        this.jasperInstance = jasperInstance;
        this.hierarchy = hierarchy;
        this.dirReport = dirReport;
    }
    /**
     * Normalizes and stores report parameters before export.
     *
     * @param data Object containing the parameter values that should be formatted for Jasper.
     */
    async loadParameters(data) {
        let params = await (0, index_1.JasperParametersFolder)({ path: this.dirReport, grouped: true });
        for (const key of Object.keys(data)) {
            if (paramsDefaultIReport.indexOf(key) === -1 && params[key]) {
                if (data && data[key] !== undefined) {
                    data[key] = index_1.JasperUtils.formatValue(data[key], index_1.JasperUtils.typeParam(params[key].type), null);
                }
                else {
                    data[key] = params[key].defaultValue;
                }
            }
            else {
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
    async xml(embeddingImages) {
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
//# sourceMappingURL=jasper.service.js.map
export declare enum TypeParam {
    'String' = "String",
    'Float' = "Float",
    'Integer' = "Integer",
    'Boolean' = "Boolean",
    'Date' = "Date",
    'DateTime' = "DateTime",
    'Time' = "Time",
    'Object' = "Object"
}
declare class JasperUtils {
    static convertDateToTime(value: Date): any;
    static convertDateToTimestamp(value: Date): any;
    static formatValue(value: any, typeParam: TypeParam, whenNull?: any): any;
    static typeParam(type: string): TypeParam;
}
declare const convertDateToTime: typeof JasperUtils.convertDateToTime;
declare const convertDateToTimestamp: typeof JasperUtils.convertDateToTimestamp;
declare const formatValue: typeof JasperUtils.formatValue;
declare const typeParam: typeof JasperUtils.typeParam;
export { convertDateToTime, convertDateToTimestamp, formatValue, typeParam };

export declare const JasperUtils: {
    convertDateToTime: (value: Date) => any;
    convertDateToTimestamp: (value: Date) => any;
    formatValue: (value: any, typeParam: string, whenNull?: any) => any;
    typeParam: (type: string) => 'String' | 'Float' | 'Integer' | 'Boolean' | 'Date' | 'DateTime' | 'Time' | 'Object';
};

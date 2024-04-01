import * as moment from 'moment';
const java = require('java');

export const JasperUtils = {
    convertDateToTime: function (value: Date) {
        let time = java.callStaticMethodSync("java.time.LocalTime", "parse", moment(value).format("HH:mm:ss"));

        return java.callStaticMethodSync("java.sql.Time", "valueOf", time);
    },

    convertDateToTimestamp: function (value: Date) {
        let dtSimpleDateFormat = java.newInstanceSync("java.text.SimpleDateFormat", "yyyy-MM-dd HH:mm:ss");
        let data = dtSimpleDateFormat.parseSync(moment(value).format("YYYY-MM-DD HH:mm:ss"));

        return java.newInstanceSync("java.sql.Timestamp", data.getTimeSync());
    },

    formatValue: function (value: any, typeParam: string, whenNull: any = undefined) {
        if (value === null || value === undefined) {
            return whenNull;
        }

        switch (typeParam) {
            case 'String':
                return value.toString();
            case 'Float':
                return parseFloat(value);
            case 'Integer':
                return parseInt(value);
            case 'Boolean':
                return Boolean(value);
            case 'Date':
                return JasperUtils.convertDateToTimestamp(value);
            case 'DateTime':
                return JasperUtils.convertDateToTimestamp(value);
            case 'Time':
                return JasperUtils.convertDateToTime(value);
            default:
                return value;
        }
    },

    typeParam: function (type: string): 'String' | 'Float' | 'Integer' | 'Boolean' | 'Date' | 'DateTime' | 'Time' | 'Object' {
        switch (type) {
            case 'java.lang.String':
                return "String";
            case 'java.lang.Double':
                return "Float";
            case 'java.lang.Float':
                return "Float";
            case 'java.math.BigDecimal':
                return "Float";
            case 'java.lang.Number':
                return "Float";
            case 'java.lang.Integer':
                return "Integer";
            case 'java.lang.Long':
                return "Integer";
            case 'java.lang.Short':
                return "Integer";
            case 'java.lang.Byte':
                return "Integer";
            case 'java.lang.Boolean':
                return "Boolean";
            case 'java.util.Date':
                return "Date";
            case 'java.sql.Timestamp':
                return "DateTime";
            case 'java.sql.Time':
                return "Time";
            default:
                return "Object";
        }
    }
}
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JasperUtils = void 0;
const moment = require("moment");
const java = require('java');
exports.JasperUtils = {
    convertDateToTime: function (value) {
        let time = java.callStaticMethodSync("java.time.LocalTime", "parse", moment(value).format("HH:mm:ss"));
        return java.callStaticMethodSync("java.sql.Time", "valueOf", time);
    },
    convertDateToTimestamp: function (value) {
        let dtSimpleDateFormat = java.newInstanceSync("java.text.SimpleDateFormat", "yyyy-MM-dd HH:mm:ss");
        let data = dtSimpleDateFormat.parseSync(moment(value).format("YYYY-MM-DD HH:mm:ss"));
        return java.newInstanceSync("java.sql.Timestamp", data.getTimeSync());
    },
    formatValue: function (value, typeParam, whenNull = undefined) {
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
                return exports.JasperUtils.convertDateToTimestamp(value);
            case 'DateTime':
                return exports.JasperUtils.convertDateToTimestamp(value);
            case 'Time':
                return exports.JasperUtils.convertDateToTime(value);
            default:
                return value;
        }
    },
    typeParam: function (type) {
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
};
//# sourceMappingURL=jasper_utils.js.map
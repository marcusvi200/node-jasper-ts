"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeParam = exports.formatValue = exports.convertDateToTimestamp = exports.convertDateToTime = exports.TypeParam = void 0;
const moment = require("moment");
const java = require('java');
var TypeParam;
(function (TypeParam) {
    TypeParam["String"] = "String";
    TypeParam["Float"] = "Float";
    TypeParam["Integer"] = "Integer";
    TypeParam["Boolean"] = "Boolean";
    TypeParam["Date"] = "Date";
    TypeParam["DateTime"] = "DateTime";
    TypeParam["Time"] = "Time";
    TypeParam["Object"] = "Object";
})(TypeParam = exports.TypeParam || (exports.TypeParam = {}));
class JasperUtils {
    static convertDateToTime(value) {
        let time = java.callStaticMethodSync("java.time.LocalTime", "parse", moment(value).format("HH:mm:ss"));
        return java.callStaticMethodSync("java.sql.Time", "valueOf", time);
    }
    static convertDateToTimestamp(value) {
        let dtSimpleDateFormat = java.newInstanceSync("java.text.SimpleDateFormat", "yyyy-MM-dd HH:mm:ss");
        let data = dtSimpleDateFormat.parseSync(moment(value).format("YYYY-MM-DD HH:mm:ss"));
        return java.newInstanceSync("java.sql.Timestamp", data.getTimeSync());
    }
    static formatValue(value, typeParam, whenNull = undefined) {
        if (value === null || value === undefined) {
            return whenNull;
        }
        switch (typeParam) {
            case 'String':
                return value.toString();
            case 'Float':
                try {
                    return parseFloat(value);
                }
                catch (error) {
                    return whenNull;
                }
            case 'Integer':
                try {
                    let num = parseInt(value);
                    if (isNaN(num)) {
                        return whenNull;
                    }
                    return num;
                }
                catch (error) {
                    return whenNull;
                }
            case 'Boolean':
                try {
                    return Boolean(value);
                }
                catch (error) {
                    return whenNull;
                }
            case 'Date':
                return JasperUtils.convertDateToTimestamp(value);
            case 'DateTime':
                return JasperUtils.convertDateToTimestamp(value);
            case 'Time':
                return JasperUtils.convertDateToTime(value);
            default:
                return value;
        }
    }
    static typeParam(type) {
        switch (type) {
            case 'java.lang.String':
                return TypeParam.String;
            case 'java.lang.Double':
                return TypeParam.Float;
            case 'java.lang.Float':
                return TypeParam.Float;
            case 'java.math.BigDecimal':
                return TypeParam.Float;
            case 'java.lang.Number':
                return TypeParam.Float;
            case 'java.lang.Integer':
                return TypeParam.Integer;
            case 'java.lang.Long':
                return TypeParam.Integer;
            case 'java.lang.Short':
                return TypeParam.Integer;
            case 'java.lang.Byte':
                return TypeParam.Integer;
            case 'java.lang.Boolean':
                return TypeParam.Boolean;
            case 'java.util.Date':
                return TypeParam.Date;
            case 'java.sql.Timestamp':
                return TypeParam.DateTime;
            case 'java.sql.Time':
                return TypeParam.Time;
            default:
                return TypeParam.Object;
        }
    }
}
const convertDateToTime = JasperUtils.convertDateToTime;
exports.convertDateToTime = convertDateToTime;
const convertDateToTimestamp = JasperUtils.convertDateToTimestamp;
exports.convertDateToTimestamp = convertDateToTimestamp;
const formatValue = JasperUtils.formatValue;
exports.formatValue = formatValue;
const typeParam = JasperUtils.typeParam;
exports.typeParam = typeParam;
//# sourceMappingURL=jasper-utils.js.map
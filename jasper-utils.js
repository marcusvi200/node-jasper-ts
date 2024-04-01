"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeParam = exports.formatValue = exports.convertDateToTimestamp = exports.convertDateToTime = exports.TypeParam = void 0;
var moment = require("moment");
var java = require('java');
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
})(TypeParam || (exports.TypeParam = TypeParam = {}));
var JasperUtils = /** @class */ (function () {
    function JasperUtils() {
    }
    JasperUtils.convertDateToTime = function (value) {
        var time = java.callStaticMethodSync("java.time.LocalTime", "parse", moment(value).format("HH:mm:ss"));
        return java.callStaticMethodSync("java.sql.Time", "valueOf", time);
    };
    JasperUtils.convertDateToTimestamp = function (value) {
        var dtSimpleDateFormat = java.newInstanceSync("java.text.SimpleDateFormat", "yyyy-MM-dd HH:mm:ss");
        var data = dtSimpleDateFormat.parseSync(moment(value).format("YYYY-MM-DD HH:mm:ss"));
        return java.newInstanceSync("java.sql.Timestamp", data.getTimeSync());
    };
    JasperUtils.formatValue = function (value, typeParam, whenNull) {
        if (whenNull === void 0) { whenNull = undefined; }
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
    };
    JasperUtils.typeParam = function (type) {
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
    };
    return JasperUtils;
}());
var convertDateToTime = JasperUtils.convertDateToTime;
exports.convertDateToTime = convertDateToTime;
var convertDateToTimestamp = JasperUtils.convertDateToTimestamp;
exports.convertDateToTimestamp = convertDateToTimestamp;
var formatValue = JasperUtils.formatValue;
exports.formatValue = formatValue;
var typeParam = JasperUtils.typeParam;
exports.typeParam = typeParam;

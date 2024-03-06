var java = null,
    fs = require('fs'),
    path = require('path'),
    extend = require('extend'),
    util = require('util'),
    temp = require('temp'),
    async = require('async');

var defaults = { reports: {}, drivers: {}, conns: {}, tmpPath: '/tmp' };

function walk(dir: string, done: (err: any, results?: string[]) => void) {

    var results = [];
    let list = [];
    let err = undefined;
    try {
        list = fs.readdirSync(dir);
    } catch (error) {
        err = error;
    }

    // console.log('list', list);

    if (err) return done(err);
    var pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(function (file) {
        file = path.join(dir, file);
        let stat = undefined;
        try {
            stat = fs.statSync(file);
        } catch (error) {
            stat = undefined;
        }

        if (stat && stat.isDirectory()) {
            walk(file, function (err, res) {
                results = results.concat(res);
                if (!--pending) done(null, results);
            });
        } else {
            results.push(file);
            if (!--pending) done(null, results);
        }
    });
};

interface options_reports {
    jasper?: string, //Path to jasper file,
    jrxml?: string, //Path to jrxml file,
    conn?: string, //Connection name, definition object or false (if false defaultConn won't apply)
    data?: any, //Data to be applied to the report
}

interface options_drivers {
    path: string, //Path to jdbc driver jar
    class: string, //Class name of the
    type: string //Type of database (mysql, postgres)
}

interface options_conns {
    host?: string, //Database hostname or IP
    port?: string, //Database Port
    dbname?: string, //Database Name
    user: string, //User Name
    pass: string, //User Password
    jdbc?: string, //jdbc connection string
    driver: string//name or definition of the driver for this conn
}

interface options {
    path?: string, //Path to jasperreports-x.x.x-project directory
    tmpPath?: string, // Path to a folder for storing compiled report files
    reports: {
        // Report Definition
        [key: string]: options_reports
    },
    drivers: {
        // Driver Definition
        [key: string]: options_drivers
    },
    conns: {
        // Connection Definition
        [key: string]: options_conns
    },
    defaultConn: string, //Default Connection name
    java: string[]//Array of java options, for example ["-Djava.awt.headless=true"]
    javaInstance?: any, //Instance of java
    debug?: 'ALL' | 'TRACE' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL' | 'OFF' | 'off' //Debug level
}

class JasperTS {
    private options: options;
    private parentPath: string;
    private dm: any;
    private jreds: any;
    private jrjsonef: any;
    private jbais: any;
    private jcm: any;
    private jrp: any;
    private jrl: any;
    private hm: any;
    private jfm: any;
    private jem: any;
    private loc: any;
    private tmpPath: string;
    private defaultConn: string;
    private validConnections = {};
    private drivers: { [key: string]: options_drivers };
    private conns: { [key: string]: options_conns } = {};
    private reports: { [key: string]: options_reports } = {};

    constructor(options: options) {
        this.options = options;
        this.initilizeOptions();
    }

    private initilizeOptions() {
        if (this.options.javaInstance) {
            java = this.options.javaInstance
        } else {
            java = require('java')
        }

        if (!this.options.path) {
            this.options.path = path.join(path.dirname(module.filename), 'jar');
        }

        if (this.options.java) {
            if (Array.isArray(this.options.java)) {
                this.options.java.forEach(function (javaOption) {
                    java.options.push(javaOption);
                });
            }
            if (typeof this.options.java == 'string') {
                java.options.push(this.options.java);
            }
        }
        var self = this;
        self.parentPath = path.dirname(module.filename);
        var jrPath = path.resolve(self.parentPath, this.options.path || '.');
        async.auto({
            jrJars: function (cb: (err: any, results?: string[]) => void) {
                if (fs.statSync(path.join(jrPath, 'lib')).isDirectory() && fs.statSync(path.join(jrPath, 'dist')).isDirectory()) {
                    async.parallel([
                        function (cb: (err: any, results?: string[]) => void) {
                            walk(path.join(jrPath, 'dist'), function (err, results) {
                                cb(err, results);
                            });
                        },
                        function (cb: (err: any, results?: string[]) => void) {
                            walk(path.join(jrPath, 'lib'), function (err, results) {
                                cb(err, results);
                            });
                        }
                    ], function (err: any, results: string[][]) {
                        if (err) return cb(err);
                        var r = results.shift();
                        results.forEach(function (item) {
                            r = r.concat(item);
                        });
                        cb(null, r);
                    })
                } else {
                    walk(jrPath, function (err, results) {
                        cb(err, results);
                    });
                }
            },
            dirverJars: function (cb: (err: any, results?: string[]) => void) {
                var results = [];
                if (self.options.drivers) {
                    for (var i in self.options.drivers) {
                        results.push(path.resolve(self.parentPath, self.options.drivers[i].path));
                    }
                }
                cb(null, results);
            },
            loadJars: ['jrJars', 'dirverJars', function (cb: () => void, jars: { jrJars: string[], dirverJars: string[] }) {
                jars.jrJars.concat(jars.dirverJars).forEach(function (file) {
                    if (path.extname(file) == '.jar') {
                        java.classpath.push(file)
                    }
                }
                );
                cb();
            }],
            debug: ['loadJars', function (cb: () => void, results: { debug?: string }) {
                if (!self.options.debug) self.options.debug = 'off';
                var levels = ['ALL', 'TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL', 'OFF'];
                if (levels.indexOf((self.options.debug + '').toUpperCase()) == -1) self.options.debug = 'DEBUG';

                /*
                commented because in java 1.8 this causes
            
                #
                # A fatal error has been detected by the Java Runtime Environment:
                #
                #  SIGSEGV (0xb) at pc=0x00007f5caeacbac2, pid=7, tid=0x00007f5caf3c8ae8
                #
                # JRE version: OpenJDK Runtime Environment (8.0_181-b13) (build 1.8.0_181-b13)
                # Java VM: OpenJDK 64-Bit Server VM (25.181-b13 mixed mode linux-amd64 compressed oops)
                # Derivative: IcedTea 3.9.0
                # Distribution: Custom build (Tue Oct 23 12:48:04 GMT 2018)
                # Problematic frame:
                # C  [nodejavabridge_bindings.node+0x20ac2]  javaGetEnv(JavaVM_*, _jobject*)+0xa2
                */

                /*
                var appender  = java.newInstanceSync('org.apache.log4j.ConsoleAppender');
                var pattern = java.newInstanceSync('org.apache.log4j.PatternLayout', "%d [%p|%c|%C{1}] %m%n");
                appender.setLayout(pattern);
                appender.setThreshold(java.getStaticFieldValue("org.apache.log4j.Level", (options.debug+'').toUpperCase()));
                appender.activateOptions();
                var root = java.callStaticMethodSync("org.apache.log4j.Logger", "getRootLogger");
                root.addAppender(appender);
                */
                cb();
            }],
            loadClass: ['loadJars', function (cb: () => void, results: { loadJars: string[] }) {
                var cl = java.callStaticMethodSync("java.lang.ClassLoader", "getSystemClassLoader")
                for (var i in self.options.drivers) {
                    cl.loadClassSync(self.options.drivers[i].class).newInstanceSync();
                }
                cb();
            }],
            imports: ['loadClass', function (cb: () => void, results: { loadClass: string[] }) {
                self.dm = java.import('java.sql.DriverManager');
                self.jreds = java.import('net.sf.jasperreports.engine.JREmptyDataSource');
                self.jrjsonef = java.import('net.sf.jasperreports.engine.data.JsonDataSource');
                self.jbais = java.import('java.io.ByteArrayInputStream');
                self.jcm = java.import('net.sf.jasperreports.engine.JasperCompileManager');
                self.jrp = java.import('net.sf.jasperreports.engine.JRParameter');
                self.jrl = java.import('net.sf.jasperreports.engine.util.JRLoader');
                self.hm = java.import('java.util.HashMap');
                self.jfm = java.import('net.sf.jasperreports.engine.JasperFillManager');
                self.jem = java.import('net.sf.jasperreports.engine.JasperExportManager');
                self.loc = java.import('java.util.Locale');

                cb();
            }]
        }, function () {
            if (self.ready) {
                self.ready();
            }
        }
        );

        delete this.options.path;
        extend(self, defaults, this.options);
    }

    ready(f?: () => void) {
        var self = this;
        self.ready = f;
    }

    add(name: any, def: any) {
        this.reports[name] = def;
    }

    parseBigDecimal(value: number | string | null | undefined) {
        java.import('java.math.BigDecimal');
        let vBD = java.newInstanceSync('java.math.BigDecimal', value.toString());
        return vBD;
    }

    pdf(report: { report: any, data: any }) {
        return this.export(report, 'pdf');
    }

    export(report: any, type: string) {
        return new Promise((resolve: (result: any) => void, reject: (reason?: any) => void) => {
            try {
                var self = this;

                if (!type) return;

                type = type.charAt(0).toUpperCase() + type.toLowerCase().slice(1);

                var processReport = function (report: any) {
                    if (typeof report == 'string') {
                        return [extend({}, self.reports[report])];
                    } else if (Array.isArray(report)) {
                        var ret = [];
                        report.forEach(function (i) {
                            ret = ret.concat(processReport(i));
                        });
                        return ret;
                    } else if (typeof report == 'function') {
                        return processReport(report());
                    } else if (typeof report == 'object') {
                        if (report.data || report.override) {
                            var reps = processReport(report.report);
                            return reps.map(function (i: any) {
                                if (report.override) {
                                    extend(i, report.override);
                                }
                                i.data = report.data;
                                i.dataset = report.dataset;
                                i.query = report.query;
                                return i;
                            })
                        } else {
                            return [report];
                        }
                    }
                };

                var processConn = function (conn: any, item: any) {
                    if (conn == 'in_memory_json') {
                        var jsonString = JSON.stringify(item.dataset);

                        var byteArray = [];
                        var buffer = Buffer.from(jsonString);
                        for (var i = 0; i < buffer.length; i++) {
                            byteArray.push(buffer[i]);
                        }
                        byteArray = java.newArray('byte', byteArray);

                        return new self.jrjsonef(new self.jbais(byteArray), item.query || '');
                    } else if (typeof conn == 'string') {
                        conn = self.conns[conn];
                    } else if (typeof conn == 'function') {
                        conn = conn();
                    } else if (conn !== false && self.defaultConn) {
                        conn = self.conns[self.defaultConn];
                    }

                    if (conn) {
                        if (typeof conn.driver == 'string') {
                            conn.driver = self.drivers[conn.driver];
                        }
                        var connStr = conn.jdbc ? conn.jdbc : 'jdbc:' + conn.driver.type + '://' + conn.host + ':' + conn.port + '/' + conn.dbname;

                        if (!self.validConnections[connStr] || !self.validConnections[connStr].isValidSync(conn.validationTimeout || 1)) {
                            self.validConnections[connStr] = self.dm.getConnectionSync(connStr, conn.user, conn.pass);
                        }
                        return self.validConnections[connStr];
                    } else {

                        return new self.jreds();

                    }

                };

                var parseLocale = function (localeString: string) {
                    var tokens = localeString.split(/[_|-]/);

                    if (tokens.length > 1) {
                        return self.loc(tokens[0], tokens[1]);
                    }
                    else {
                        return self.loc(tokens[0]);
                    }
                }

                var reports = processReport(report);
                var prints = [];

                reports.forEach(function (item: options_reports) {
                    if (!item.jasper && item.jrxml) {
                        item.jasper = self.compileSync(item.jrxml, self.tmpPath);
                    }

                    if (item.jasper) {
                        var data = null;
                        if (item.data) {

                            let params = self.getParametersSync({ jrxml: item.jrxml, jasper: item.jasper });
                            data = new self.hm();
                            for (var j in item.data) {
                                if (j === 'REPORT_LOCALE') {
                                    item.data[j] = parseLocale(item.data[j]);
                                }

                                if (params[j] && params[j].type === 'java.math.BigDecimal') {
                                    data.putSync(j, self.parseBigDecimal(item.data[j]));
                                } else {
                                    data.putSync(j, item.data[j]);
                                }
                            }
                        }

                        var conn = processConn(item.conn, item);
                        var p = self.jfm.fillReportSync(path.resolve(self.parentPath, item.jasper), data, conn);
                        prints.push(p);
                    }
                });

                if (prints.length) {
                    var master = prints.shift();
                    prints.forEach(function (p) {
                        var s = p.getPagesSync().sizeSync();
                        for (var j = 0; j < s; j++) {
                            master.addPageSync(p.getPagesSync().getSync(j));
                        }
                    });
                    var tempName = temp.path({ suffix: '.pdf' });
                    self.jem['exportReportTo' + type + 'FileSync'](master, tempName);
                    var exp = fs.readFileSync(tempName);
                    fs.unlinkSync(tempName);
                    resolve(exp);
                }
                resolve('');
            } catch (error) {
                reject(error);
            }
        });
    }

    compileAllSync(dstFolder: string | undefined) {
        var self = this;
        for (var name in self.reports) {
            var report = self.reports[name];
            if (report.jrxml) {
                report.jasper = self.compileSync(report.jrxml, dstFolder || self.tmpPath);
            }
        }
    }

    compileSync(jrxmlFile: string, dstFolder: string | undefined) {
        var self = this;
        var name = path.basename(jrxmlFile, '.jrxml');
        var file = path.join(dstFolder || self.tmpPath, name + '.jasper');
        java.callStaticMethodSync(
            "net.sf.jasperreports.engine.JasperCompileManager",
            "compileReportToFile",
            path.resolve(self.parentPath, jrxmlFile), file
        );
        return file;
    }

    static compileAllSync(params: { path: string, dstFolder: string | undefined }) {
        var filesCompiled = [];
        var files = fs.readdirSync(params.path);
        files.forEach(function (file: string) {
            if (path.extname(file) == '.jrxml') {
                var name = path.basename(file, '.jrxml');
                filesCompiled.push(JasperTS.compileSync({ pathFile: params.path, jrxmlFile: `${name}.jrxml`, dstFolder: params.dstFolder }));
            }
        });
        return filesCompiled;
    }

    static compileSync(params: { pathFile: string, jrxmlFile: string, dstFolder: string | undefined }) {
        var self = this;
        var name = path.basename(params.jrxmlFile, '.jrxml');
        var file = path.join(params.dstFolder || '/tmp', name + '.jasper');
        java.callStaticMethodSync(
            "net.sf.jasperreports.engine.JasperCompileManager",
            "compileReportToFile",
            path.resolve(params.pathFile, path.join(params.pathFile, params.jrxmlFile)), file
        );
        return file;
    }

    getParametersSync(options: { jrxml?: string, jasper?: string }) {
        var jasperReport = null;
        if (options.jasper) {
            jasperReport = java.callStaticMethodSync(
                "net.sf.jasperreports.engine.util.JRLoader",
                "loadObjectFromFile",
                options.jasper
            );
        } else if (options.jrxml) {
            jasperReport = java.callStaticMethodSync(
                "net.sf.jasperreports.engine.JasperCompileManager",
                "compileReport",
                options.jrxml
            );
        }

        var parameters = jasperReport.getParametersSync();
        var result = {};
        for (var i = 0; i < parameters.length; i++) {
            var parameter = parameters[i];
            if (parameter.getValueClassSync().toStringSync().indexOf('class') > -1) {
                result[parameter.getNameSync()] = { type: parameter.getValueClassSync().toStringSync().replace('class', '').trim(), isForPrompting: parameter.isSystemDefinedSync() ? false : parameter.isForPromptingSync() };
            }
        }
        return result;
    }

    static getParametersSync(options: { jrxml?: string, jasper?: string }) {
        var jasperReport = null;
        if (options.jasper) {
            jasperReport = java.callStaticMethodSync(
                "net.sf.jasperreports.engine.util.JRLoader",
                "loadObjectFromFile",
                options.jasper
            );
        } else if (options.jrxml) {
            jasperReport = java.callStaticMethodSync(
                "net.sf.jasperreports.engine.JasperCompileManager",
                "compileReport",
                options.jrxml
            );
        }

        var parameters = jasperReport.getParametersSync();
        var result = {};
        for (var i = 0; i < parameters.length; i++) {
            var parameter = parameters[i];
            if (parameter.getValueClassSync().toStringSync().indexOf('class') > -1) {
                result[parameter.getNameSync()] = { type: parameter.getValueClassSync().toStringSync().replace('class', '').trim(), isForPrompting: parameter.isSystemDefinedSync() ? false : parameter.isForPromptingSync() };
            }
        }
        return result;
    }

    static getParametersAllSync(options: { path: string, grouped?: boolean }) {
        var files = fs.readdirSync(options.path);
        var result = {};
        files.forEach(function (file: string) {
            if (path.extname(file) == '.jrxml') {
                var name = path.basename(file, '.jrxml');
                var params = JasperTS.getParametersSync({ jrxml: path.join(options.path, file) });
                if (options.grouped) {
                    result = {
                        ...result,
                        ...params
                    };
                } else {
                    result[name] = params;
                }
            }
        });
        return result;
    }

    toJsonDataSource(dataset: any, query: string) {
        var self = this;
        var jsonString = JSON.stringify(dataset);
        var byteArray = java.newArray('byte', jsonString.split('').map(function (c, i) {
            return java.newByte(jsonString.charCodeAt(i));
        }));
        return new self.jrjsonef(new self.jbais(byteArray), query || '');
    }
}

const JasperConfig = (options: options) => new JasperTS(options);

const JasperParameters = JasperTS.getParametersSync;
const JasperParametersFolder = JasperTS.getParametersAllSync;

const JasperCompile = JasperTS.compileSync
const JasperCompileFolder = JasperTS.compileAllSync

export { JasperCompile, JasperConfig, JasperCompileFolder, JasperParameters, JasperParametersFolder };
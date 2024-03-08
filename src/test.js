"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const fs = require("fs");
require('dotenv').config();
var jasperReport = (0, index_1.JasperConfig)({
    reports: {
        'main': {
            jrxml: 'jrxml/test/rel_teste.jrxml',
            conn: 'default',
        }
    },
    drivers: {
        'oracle': {
            path: 'jar/dist/ojdbc11g.jar',
            class: 'oracle.jdbc.driver.OracleDriver',
            type: 'oracle'
        }
    },
    conns: {
        'default': {
            user: process.env.ORACLE_JDBC_USER || '',
            pass: process.env.ORACLE_JDBC_PASS || '',
            jdbc: process.env.ORACLE_JDBC_URL || '',
            driver: 'oracle'
        }
    },
    defaultConn: 'default',
    tmpPath: 'jrxml/test',
    java: ["-Djava.awt.headless=true"]
});
jasperReport.compileJRXMLInDirSync({ dir: "jrxml/test" });
jasperReport.docx({
    report: 'main',
    data: {
        id: 1
    },
}).then((result) => {
    fs.writeFileSync("exported/test.docx", Buffer.from(result, 'binary'));
    console.log("Arquivo gerado com sucesso!");
    process.exit(0);
}).catch((err) => {
    console.log(err);
    process.exit(1);
});
//# sourceMappingURL=test.js.map
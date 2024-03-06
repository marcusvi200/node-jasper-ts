import { JasperCompileFolder, JasperConfig, JasperParametersFolder } from './index';
import * as fs from 'fs';
require('dotenv').config();

var jasperReport = JasperConfig({
    reports: {
        'main': {
            jrxml: 'jrxml/test/rel_teste.jrxml',
            conn: 'default',
        },
        'sub': {
            jrxml: 'jrxml/test/rel_teste_subreport1.jrxml',
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
})

jasperReport.compileAllSync("jrxml/test");

jasperReport.pdf({
    report: 'main',
    data: {
        id: 1
    },
}).then((result: any) => {
    fs.writeFileSync("exported/test.pdf", Buffer.from(result, 'binary'));
    console.log("Arquivo gerado com sucesso!");
    process.exit(0);
}).catch((err: any) => {
    console.log(err);
    process.exit(1);
})
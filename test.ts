import { JasperCompileFolder, JasperConfig, JasperParametersFolder } from './index';
import * as fs from 'node:fs/promises';
import * as dotenv from 'dotenv';
dotenv.config();

var jasperReport = JasperConfig({
    reports: {
        'main': {
            jrxml: 'jrxml/test/rel_teste.jrxml',
            conn: 'default',
        }
    },
    // Need to be absolute path and inside should have the folders "lib" and "dist" with all jars
    path: `${process.cwd()}/jar`,
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

jasperReport.init().then(async () => {
    await jasperReport.compileJRXMLInDirSync({ dir: "jrxml/test" });

    jasperReport.pdf({
        report: 'main',
        data: {
            id: 1
        },
    }).then(async (result) => {
        await fs.writeFile("exported/test.pdf", Buffer.from(result, 'binary'));
        console.log("Arquivo gerado com sucesso!");
        process.exit(0);
    }).catch((err: any) => {
        console.log(err);
        process.exit(1);
    })
}).catch((error) => {
    console.error(error);
});
